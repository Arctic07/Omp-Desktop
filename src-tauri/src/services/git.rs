use std::{
    io::Read,
    path::Path,
    process::{Child, Command, ExitStatus, Output, Stdio},
    thread,
    time::{Duration, Instant},
};

use crate::models::{ReviewFile, ReviewHunk, ReviewLine, WorkspaceReview};
use crate::services::workspace::{canonical_workspace_root, safe_git_path};

const GIT_COMMAND_OUTPUT_LIMIT: usize = 8 * 1024 * 1024;
const GIT_COMMAND_TIMEOUT: Duration = Duration::from_secs(120);
const COMMIT_MESSAGE_LIMIT: usize = 64 * 1024;
const PATCH_LIMIT: usize = 200 * 1024;
const REVIEW_FILE_LIMIT: usize = 100;

#[derive(Clone, Copy)]
enum ReviewStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
    Untracked,
}

impl ReviewStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Added => "added",
            Self::Modified => "modified",
            Self::Deleted => "deleted",
            Self::Renamed => "renamed",
            Self::Untracked => "untracked",
        }
    }
}

#[derive(Clone, Copy)]
enum PatchSource {
    Cached,
    Worktree,
    NoIndex,
}

struct ChangedPath {
    path: String,
    old_path: Option<String>,
    status: ReviewStatus,
    source: PatchSource,
}

struct LimitedOutput {
    status: ExitStatus,
    stdout: Vec<u8>,
    exceeded: bool,
}

struct ParsedPatch {
    binary: bool,
    additions: usize,
    deletions: usize,
    hunks: Vec<ReviewHunk>,
}

fn wait_for_git(mut child: Child, timeout_message: &'static str) -> Result<ExitStatus, String> {
    let deadline = Instant::now() + GIT_COMMAND_TIMEOUT;
    loop {
        match child.try_wait() {
            Ok(Some(status)) => return Ok(status),
            Ok(None) if Instant::now() < deadline => thread::sleep(Duration::from_millis(25)),
            Ok(None) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(timeout_message.to_owned());
            }
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(timeout_message.to_owned());
            }
        }
    }
}

fn read_bounded_stdout(mut stdout: impl Read, limit: usize) -> std::io::Result<(Vec<u8>, bool)> {
    let mut bytes = Vec::with_capacity(limit.min(8192));
    let mut buffer = [0_u8; 8192];
    let mut exceeded = false;
    loop {
        let read = stdout.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        let remaining = limit.saturating_sub(bytes.len());
        if remaining > 0 {
            bytes.extend_from_slice(&buffer[..read.min(remaining)]);
        }
        if read > remaining {
            exceeded = true;
        }
    }
    Ok((bytes, exceeded))
}

fn collect_git_output(
    mut child: Child,
    limit: usize,
    error_message: &'static str,
) -> Result<LimitedOutput, String> {
    let Some(stdout) = child.stdout.take() else {
        let _ = child.kill();
        let _ = child.wait();
        return Err(error_message.to_owned());
    };
    let reader = thread::spawn(move || read_bounded_stdout(stdout, limit));
    let status = match wait_for_git(child, error_message) {
        Ok(status) => status,
        Err(error) => {
            let _ = reader.join();
            return Err(error);
        }
    };
    let (stdout, exceeded) = reader
        .join()
        .map_err(|_| error_message.to_owned())?
        .map_err(|_| error_message.to_owned())?;
    Ok(LimitedOutput {
        status,
        stdout,
        exceeded,
    })
}

fn run_git(root: &Path, args: &[&str]) -> Result<Output, String> {
    let child = Command::new("git")
        .args(args)
        .current_dir(root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Git is unavailable".to_owned())?;
    let result = collect_git_output(child, GIT_COMMAND_OUTPUT_LIMIT, "Git command failed")?;
    if result.exceeded {
        return Err("Git output is too large".to_owned());
    }
    Ok(Output {
        status: result.status,
        stdout: result.stdout,
        stderr: Vec::new(),
    })
}

fn parse_tracked_changes(data: &[u8], source: PatchSource) -> Vec<ChangedPath> {
    let mut fields = data.split(|byte| *byte == 0);
    let mut changes = Vec::new();

    while let Some(status_bytes) = fields.next() {
        if status_bytes.is_empty() {
            continue;
        }
        let Some(first_path_bytes) = fields.next() else {
            break;
        };
        let Ok(status) = std::str::from_utf8(status_bytes) else {
            continue;
        };
        let status_code = status.as_bytes().first().copied().unwrap_or(b'M');
        if status_code == b'R' || status_code == b'C' {
            let Some(new_path_bytes) = fields.next() else {
                break;
            };
            let (Ok(old_path), Ok(path)) = (
                std::str::from_utf8(first_path_bytes),
                std::str::from_utf8(new_path_bytes),
            ) else {
                continue;
            };
            changes.push(ChangedPath {
                path: path.to_owned(),
                old_path: Some(old_path.to_owned()),
                status: ReviewStatus::Renamed,
                source,
            });
            continue;
        }

        let Ok(path) = std::str::from_utf8(first_path_bytes) else {
            continue;
        };
        let review_status = match status_code {
            b'A' => ReviewStatus::Added,
            b'D' => ReviewStatus::Deleted,
            b'M' | b'T' | b'U' => ReviewStatus::Modified,
            _ => ReviewStatus::Modified,
        };
        changes.push(ChangedPath {
            path: path.to_owned(),
            old_path: None,
            status: review_status,
            source,
        });
    }

    changes
}

fn parse_untracked_paths(data: &[u8]) -> Vec<String> {
    data.split(|byte| *byte == 0)
        .filter(|path| !path.is_empty())
        .filter_map(|path| std::str::from_utf8(path).ok().map(str::to_owned))
        .collect()
}

fn run_git_patch(
    root: &Path,
    paths: &[String],
    source: PatchSource,
) -> Result<LimitedOutput, String> {
    let mut command = Command::new("git");
    match source {
        PatchSource::Cached => {
            command.args([
                "diff",
                "--cached",
                "--binary",
                "--no-color",
                "--no-ext-diff",
                "--unified=3",
                "--find-renames",
                "--",
            ]);
            for path in paths {
                command.arg(path);
            }
        }
        PatchSource::Worktree => {
            command.args([
                "diff",
                "--binary",
                "--no-color",
                "--no-ext-diff",
                "--unified=3",
                "--find-renames",
                "--",
            ]);
            for path in paths {
                command.arg(path);
            }
        }
        PatchSource::NoIndex => {
            command.args([
                "diff",
                "--no-index",
                "--binary",
                "--no-color",
                "--no-ext-diff",
                "--unified=3",
                "--",
            ]);
            #[cfg(target_os = "windows")]
            command.arg("NUL");
            #[cfg(not(target_os = "windows"))]
            command.arg("/dev/null");
            if let Some(path) = paths.first() {
                command.arg(path);
            }
        }
    }

    let child = command
        .current_dir(root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Unable to read git changes".to_owned())?;
    collect_git_output(child, PATCH_LIMIT, "Unable to read git changes")
}

fn parse_patch(data: &[u8]) -> ParsedPatch {
    let text = String::from_utf8_lossy(data);
    let mut binary = false;
    let mut additions = 0;
    let mut deletions = 0;
    let mut hunks = Vec::new();
    let mut current_hunk: Option<ReviewHunk> = None;

    for raw_line in text.split('\n') {
        let line = raw_line.strip_suffix('\r').unwrap_or(raw_line);
        if line.starts_with("Binary files ") || line == "GIT binary patch" {
            binary = true;
            continue;
        }
        if line.starts_with("literal ") || line.starts_with("delta ") {
            binary = true;
            continue;
        }

        if line.starts_with("@@ ") || line.starts_with("@@@ ") {
            if let Some(hunk) = current_hunk.take() {
                hunks.push(hunk);
            }
            current_hunk = Some(ReviewHunk {
                header: line.to_owned(),
                lines: Vec::new(),
            });
            continue;
        }

        let Some(hunk) = current_hunk.as_mut() else {
            continue;
        };
        if line == "\\ No newline at end of file" {
            continue;
        }
        let Some(prefix) = line.as_bytes().first().copied() else {
            continue;
        };
        let Some(content) = line.get(1..) else {
            continue;
        };
        let line_type = match prefix {
            b'+' => {
                additions += 1;
                "add"
            }
            b'-' => {
                deletions += 1;
                "del"
            }
            b' ' => "context",
            _ => continue,
        };
        hunk.lines.push(ReviewLine {
            line_type: line_type.to_owned(),
            text: content.to_owned(),
        });
    }
    if let Some(hunk) = current_hunk {
        hunks.push(hunk);
    }

    ParsedPatch {
        binary,
        additions,
        deletions,
        hunks,
    }
}

fn sort_changed_paths(changes: &mut Vec<ChangedPath>) {
    changes.sort_by(|left, right| {
        left.path
            .cmp(&right.path)
            .then_with(|| left.status.as_str().cmp(right.status.as_str()))
    });
}

fn retain_safe_changed_paths(root: &Path, changes: &mut Vec<ChangedPath>) {
    changes.retain(|change| {
        safe_git_path(root, &change.path)
            && change
                .old_path
                .as_deref()
                .map(|old_path| safe_git_path(root, old_path))
                .unwrap_or(true)
    });
}

fn changed_paths_for_review(
    root: &Path,
) -> Result<(Vec<ChangedPath>, Vec<ChangedPath>, bool), String> {
    let staged_args = [
        "diff",
        "--cached",
        "--name-status",
        "--find-renames",
        "--no-ext-diff",
        "-z",
        "--",
    ];
    let staged = run_git(root, &staged_args)?;
    if !staged.status.success() {
        return Err("Unable to inspect staged changes".to_owned());
    }
    let mut staged_changes = parse_tracked_changes(&staged.stdout, PatchSource::Cached);

    let unstaged_args = [
        "diff",
        "--name-status",
        "--find-renames",
        "--no-ext-diff",
        "-z",
        "--",
    ];
    let unstaged = run_git(root, &unstaged_args)?;
    if !unstaged.status.success() {
        return Err("Unable to inspect unstaged changes".to_owned());
    }
    let mut unstaged_changes = parse_tracked_changes(&unstaged.stdout, PatchSource::Worktree);

    let untracked = run_git(root, &["ls-files", "--others", "--exclude-standard", "-z"])?;
    if !untracked.status.success() {
        return Err("Unable to inspect untracked files".to_owned());
    }
    for path in parse_untracked_paths(&untracked.stdout) {
        unstaged_changes.push(ChangedPath {
            path,
            old_path: None,
            status: ReviewStatus::Untracked,
            source: PatchSource::NoIndex,
        });
    }

    retain_safe_changed_paths(root, &mut staged_changes);
    retain_safe_changed_paths(root, &mut unstaged_changes);
    sort_changed_paths(&mut staged_changes);
    sort_changed_paths(&mut unstaged_changes);

    let truncated =
        staged_changes.len() > REVIEW_FILE_LIMIT || unstaged_changes.len() > REVIEW_FILE_LIMIT;
    staged_changes.truncate(REVIEW_FILE_LIMIT);
    unstaged_changes.truncate(REVIEW_FILE_LIMIT);

    Ok((staged_changes, unstaged_changes, truncated))
}

fn update_git_index(root: &Path, args: &[&str], error: &'static str) -> Result<(), String> {
    let output = run_git(root, args)?;
    if output.status.success() {
        Ok(())
    } else {
        Err(error.to_owned())
    }
}

pub(crate) fn stage_workspace_file(root: String, path: String) -> Result<(), String> {
    let canonical_root = canonical_workspace_root(&root)?;
    if !safe_git_path(&canonical_root, &path) {
        return Err("Workspace path is invalid".to_owned());
    }
    let args = ["add", "--", path.as_str()];
    update_git_index(&canonical_root, &args, "Unable to stage workspace file")
}

pub(crate) fn unstage_workspace_file(root: String, path: String) -> Result<(), String> {
    let canonical_root = canonical_workspace_root(&root)?;
    if !safe_git_path(&canonical_root, &path) {
        return Err("Workspace path is invalid".to_owned());
    }

    let head = run_git(&canonical_root, &["rev-parse", "--verify", "HEAD"])?;
    if head.status.success() {
        let args = ["restore", "--staged", "--", path.as_str()];
        return update_git_index(&canonical_root, &args, "Unable to unstage workspace file");
    }

    let args = ["rm", "--cached", "--ignore-unmatch", "--", path.as_str()];
    update_git_index(&canonical_root, &args, "Unable to unstage workspace file")
}

pub(crate) fn commit_workspace(root: String, message: String) -> Result<(), String> {
    let canonical_root = canonical_workspace_root(&root)?;
    let message = message.trim();
    if message.is_empty() {
        return Err("Commit message cannot be empty".to_owned());
    }
    if message.contains('\0') || message.len() > COMMIT_MESSAGE_LIMIT {
        return Err("Commit message is invalid".to_owned());
    }

    let child = Command::new("git")
        .args(["commit", "-m"])
        .arg(message)
        .current_dir(&canonical_root)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Git is unavailable".to_owned())?;
    let status = wait_for_git(child, "Git commit timed out")?;
    if status.success() {
        Ok(())
    } else {
        Err("Unable to commit workspace changes".to_owned())
    }
}

pub(crate) fn pull_workspace(root: String) -> Result<(), String> {
    let canonical_root = canonical_workspace_root(&root)?;
    let child = Command::new("git")
        .args(["pull", "--ff-only"])
        .env("GIT_TERMINAL_PROMPT", "0")
        .current_dir(&canonical_root)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Git is unavailable".to_owned())?;
    let status = wait_for_git(child, "Git pull timed out")?;
    if status.success() {
        Ok(())
    } else {
        Err("Unable to pull workspace changes".to_owned())
    }
}

fn build_review_file(root: &Path, change: ChangedPath) -> Result<ReviewFile, String> {
    let mut patch_paths = Vec::with_capacity(2);
    if let Some(old_path) = change.old_path.as_ref() {
        patch_paths.push(old_path.clone());
    }
    patch_paths.push(change.path.clone());
    let patch = run_git_patch(root, &patch_paths, change.source)?;
    let parsed = parse_patch(&patch.stdout);
    let expected_no_index_status = matches!(change.source, PatchSource::NoIndex);
    if !patch.status.success()
        && !patch.exceeded
        && !(expected_no_index_status && patch.status.code() == Some(1))
    {
        return Err("Unable to read git patch".to_owned());
    }

    Ok(ReviewFile {
        path: change.path,
        old_path: change.old_path,
        status: change.status.as_str().to_owned(),
        additions: parsed.additions,
        deletions: parsed.deletions,
        binary: parsed.binary,
        too_large: patch.exceeded,
        hunks: parsed.hunks,
    })
}

pub(crate) fn get_workspace_review(root: String) -> Result<WorkspaceReview, String> {
    let canonical_root = canonical_workspace_root(&root)?;
    let repository_probe = run_git(&canonical_root, &["rev-parse", "--is-inside-work-tree"]);
    let repository_probe = match repository_probe {
        Ok(output) => output,
        Err(_) => {
            return Ok(WorkspaceReview {
                repo: false,
                clean: true,
                staged_files: Vec::new(),
                unstaged_files: Vec::new(),
                truncated: false,
                error: Some("Git is unavailable".to_owned()),
            });
        }
    };
    let repository_value = std::str::from_utf8(&repository_probe.stdout)
        .map(str::trim)
        .unwrap_or_default();
    if !repository_probe.status.success() || !repository_value.eq_ignore_ascii_case("true") {
        return Ok(WorkspaceReview {
            repo: false,
            clean: true,
            staged_files: Vec::new(),
            unstaged_files: Vec::new(),
            truncated: false,
            error: None,
        });
    }

    let status = run_git(
        &canonical_root,
        &["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    )
    .map_err(|_| "Unable to inspect git status".to_owned())?;
    if !status.status.success() {
        return Ok(WorkspaceReview {
            repo: true,
            clean: false,
            staged_files: Vec::new(),
            unstaged_files: Vec::new(),
            truncated: false,
            error: Some("Unable to inspect git status".to_owned()),
        });
    }
    let dirty = !status.stdout.is_empty();

    let (staged_changes, unstaged_changes, truncated) =
        match changed_paths_for_review(&canonical_root) {
            Ok(changes) => changes,
            Err(error) => {
                return Ok(WorkspaceReview {
                    repo: true,
                    clean: !dirty,
                    staged_files: Vec::new(),
                    unstaged_files: Vec::new(),
                    truncated: false,
                    error: Some(error),
                });
            }
        };

    let mut staged_files = Vec::with_capacity(staged_changes.len());
    for change in staged_changes {
        match build_review_file(&canonical_root, change) {
            Ok(file) => staged_files.push(file),
            Err(error) => {
                return Ok(WorkspaceReview {
                    repo: true,
                    clean: !dirty,
                    staged_files,
                    unstaged_files: Vec::new(),
                    truncated,
                    error: Some(error),
                });
            }
        }
    }

    let mut unstaged_files = Vec::with_capacity(unstaged_changes.len());
    for change in unstaged_changes {
        match build_review_file(&canonical_root, change) {
            Ok(file) => unstaged_files.push(file),
            Err(error) => {
                return Ok(WorkspaceReview {
                    repo: true,
                    clean: !dirty,
                    staged_files,
                    unstaged_files,
                    truncated,
                    error: Some(error),
                });
            }
        }
    }

    Ok(WorkspaceReview {
        repo: true,
        clean: !dirty,
        staged_files,
        unstaged_files,
        truncated,
        error: None,
    })
}
