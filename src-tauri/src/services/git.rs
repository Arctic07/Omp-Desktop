use std::{
    ffi::OsStr,
    io::Read,
    path::Path,
    process::{Child, Command, ExitStatus, Output, Stdio},
    thread,
    time::{Duration, Instant},
};

use crate::models::{ReviewFile, ReviewHunk, ReviewLine, WorkspaceReview, WorkspaceReviewDelta};
use crate::services::workspace::{canonical_workspace_root, safe_git_path};

const GIT_COMMAND_OUTPUT_LIMIT: usize = 8 * 1024 * 1024;
const GIT_COMMAND_TIMEOUT: Duration = Duration::from_secs(120);
const COMMIT_MESSAGE_LIMIT: usize = 64 * 1024;
const PATCH_LIMIT: usize = 200 * 1024;
const REVIEW_FILE_LIMIT: usize = 100;

const WORKSPACE_PATH_LIMIT: usize = REVIEW_FILE_LIMIT * 2;

#[derive(Clone, Copy)]
enum ReviewStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
    Untracked,
}

impl ReviewStatus {
    fn from_git_code(code: u8) -> Self {
        match code {
            b'A' => Self::Added,
            b'D' => Self::Deleted,
            b'R' | b'C' => Self::Renamed,
            b'M' | b'T' | b'U' => Self::Modified,
            _ => Self::Modified,
        }
    }

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

struct BatchPatch {
    header: Vec<u8>,
    parsed: ParsedPatch,
    too_large: bool,
}
type BatchStat = (String, Option<String>, usize, usize, bool);

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

fn run_git<T: AsRef<OsStr>>(root: &Path, args: &[T]) -> Result<Output, String> {
    let mut command = Command::new("git");
    for arg in args {
        command.arg(arg.as_ref());
    }
    let child = command
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

fn parse_status_changes(data: &[u8]) -> (Vec<ChangedPath>, Vec<ChangedPath>) {
    let mut fields = data.split(|byte| *byte == 0);
    let mut staged_changes = Vec::new();
    let mut unstaged_changes = Vec::new();

    while let Some(record) = fields.next() {
        if record.len() < 4 || record[2] != b' ' {
            continue;
        }

        let index_status = record[0];
        let worktree_status = record[1];
        let Some(path) = std::str::from_utf8(&record[3..]).ok() else {
            continue;
        };
        if path.is_empty() {
            continue;
        }

        let has_index_rename = matches!(index_status, b'R' | b'C');
        let has_worktree_rename = matches!(worktree_status, b'R' | b'C');
        let old_path = if has_index_rename || has_worktree_rename {
            let Some(old_path_bytes) = fields.next() else {
                continue;
            };
            let Ok(old_path) = std::str::from_utf8(old_path_bytes) else {
                continue;
            };
            if old_path.is_empty() {
                continue;
            }
            Some(old_path.to_owned())
        } else {
            None
        };

        if index_status != b' ' && index_status != b'?' && index_status != b'!' {
            staged_changes.push(ChangedPath {
                path: path.to_owned(),
                old_path: if has_index_rename {
                    old_path.clone()
                } else {
                    None
                },
                status: ReviewStatus::from_git_code(index_status),
                source: PatchSource::Cached,
            });
        }

        if worktree_status != b' ' && worktree_status != b'?' && worktree_status != b'!' {
            unstaged_changes.push(ChangedPath {
                path: path.to_owned(),
                old_path: if has_worktree_rename { old_path } else { None },
                status: ReviewStatus::from_git_code(worktree_status),
                source: PatchSource::Worktree,
            });
        } else if index_status == b'?' && worktree_status == b'?' {
            unstaged_changes.push(ChangedPath {
                path: path.to_owned(),
                old_path: None,
                status: ReviewStatus::Untracked,
                source: PatchSource::NoIndex,
            });
        }
    }

    (staged_changes, unstaged_changes)
}

fn run_git_patch(root: &Path, path: &str) -> Result<LimitedOutput, String> {
    let mut command = Command::new("git");
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
    command.arg(path);

    let child = command
        .current_dir(root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Unable to read git changes".to_owned())?;
    collect_git_output(child, PATCH_LIMIT, "Unable to read git changes")
}

fn run_git_patch_batch(
    root: &Path,
    source: PatchSource,
    paths: Option<&[String]>,
    numstat: bool,
) -> Result<LimitedOutput, String> {
    let mut command = Command::new("git");
    match source {
        PatchSource::Cached => {
            command.args(["diff", "--cached"]);
        }
        PatchSource::Worktree => {
            command.args(["diff"]);
        }
        PatchSource::NoIndex => return Err("Unable to read git changes".to_owned()),
    }
    if numstat {
        command.args([
            "--numstat",
            "-z",
            "--no-color",
            "--no-ext-diff",
            "--find-renames",
        ]);
    } else {
        command.args([
            "--binary",
            "--no-color",
            "--no-ext-diff",
            "--unified=3",
            "--find-renames",
        ]);
    }
    command.arg("--");
    if let Some(paths) = paths {
        for path in paths {
            command.arg(path);
        }
    }

    let child = command
        .current_dir(root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Unable to read git changes".to_owned())?;
    collect_git_output(
        child,
        GIT_COMMAND_OUTPUT_LIMIT,
        "Unable to read git changes",
    )
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

fn is_patch_header(line: &[u8]) -> bool {
    line.starts_with(b"diff --git ")
}

fn parse_batch_patches(output: &LimitedOutput) -> Vec<BatchPatch> {
    let mut starts = Vec::new();
    let mut line_start = 0;
    for (index, byte) in output.stdout.iter().enumerate() {
        if *byte == b'\n' {
            if is_patch_header(&output.stdout[line_start..index]) {
                starts.push(line_start);
            }
            line_start = index + 1;
        }
    }
    if line_start < output.stdout.len() && is_patch_header(&output.stdout[line_start..]) {
        starts.push(line_start);
    }

    let mut patches = Vec::with_capacity(starts.len());
    for (index, start) in starts.iter().copied().enumerate() {
        let end = starts
            .get(index + 1)
            .copied()
            .unwrap_or(output.stdout.len());
        let bytes = &output.stdout[start..end];
        let limited_len = bytes.len().min(PATCH_LIMIT);
        let parsed = parse_patch(&bytes[..limited_len]);
        let incomplete =
            output.exceeded && end == output.stdout.len() && bytes.last().copied() != Some(b'\n');
        let header_end = bytes
            .iter()
            .position(|byte| *byte == b'\n')
            .unwrap_or(bytes.len());
        let header = bytes[..header_end].to_vec();
        patches.push(BatchPatch {
            header,
            parsed,
            too_large: bytes.len() > PATCH_LIMIT || incomplete,
        });
    }
    patches
}

fn parse_batch_stats(output: &LimitedOutput) -> Vec<BatchStat> {
    let mut records = output.stdout.split(|byte| *byte == 0);
    let mut pending = None;
    let mut stats = Vec::new();
    let parse_count = |field: &[u8]| -> usize {
        std::str::from_utf8(field)
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(0)
    };
    while let Some(record) = pending.take().or_else(|| records.next()) {
        let mut columns = record.splitn(3, |byte| *byte == b'\t');
        let (Some(additions), Some(deletions), Some(path)) =
            (columns.next(), columns.next(), columns.next())
        else {
            continue;
        };
        let Ok(mut path) = String::from_utf8(path.to_vec()) else {
            continue;
        };
        let binary = additions == b"-" || deletions == b"-";
        let additions = if binary { 0 } else { parse_count(additions) };
        let deletions = if binary { 0 } else { parse_count(deletions) };
        if path.is_empty() {
            let (Some(old_path), Some(new_path)) = (records.next(), records.next()) else {
                continue;
            };
            let (Ok(old_path), Ok(path)) = (
                String::from_utf8(old_path.to_vec()),
                String::from_utf8(new_path.to_vec()),
            ) else {
                continue;
            };
            stats.push((path, Some(old_path), additions, deletions, binary));
            continue;
        }
        let mut old_path = None;
        if let Some(next) = records.next().filter(|next| !next.is_empty()) {
            if next.contains(&b'\t') {
                pending = Some(next);
            } else {
                old_path = Some(path);
                let Ok(new_path) = String::from_utf8(next.to_vec()) else {
                    continue;
                };
                path = new_path;
            }
        }
        stats.push((path, old_path, additions, deletions, binary));
    }
    stats
}

fn take_batch_stat(stats: &mut [Option<BatchStat>], change: &ChangedPath) -> Option<BatchStat> {
    let index = stats.iter().position(|stat| {
        stat.as_ref().map_or(false, |(path, old_path, _, _, _)| {
            path == &change.path
                && old_path.as_deref().map_or(true, |old_path| {
                    old_path == change.old_path.as_deref().unwrap_or(change.path.as_str())
                })
        })
    })?;
    stats[index].take()
}

fn quote_git_path(path: &str) -> String {
    let mut quoted = String::with_capacity(path.len() + 2);
    quoted.push('"');
    for byte in path.bytes() {
        match byte {
            b'"' => quoted.push_str("\\\""),
            b'\\' => quoted.push_str("\\\\"),
            b'\x07' => quoted.push_str("\\a"),
            b'\x08' => quoted.push_str("\\b"),
            b'\t' => quoted.push_str("\\t"),
            b'\n' => quoted.push_str("\\n"),
            b'\x0b' => quoted.push_str("\\v"),
            b'\x0c' => quoted.push_str("\\f"),
            b'\r' => quoted.push_str("\\r"),
            0x20..=0x7e => quoted.push(byte as char),
            byte => {
                const OCTAL: &[u8; 8] = b"01234567";
                quoted.push('\\');
                quoted.push(OCTAL[((byte >> 6) & 0x07) as usize] as char);
                quoted.push(OCTAL[((byte >> 3) & 0x07) as usize] as char);
                quoted.push(OCTAL[(byte & 0x07) as usize] as char);
            }
        }
    }
    quoted.push('"');
    quoted
}

fn patch_matches_change(patch: &BatchPatch, change: &ChangedPath) -> bool {
    let header = patch.header.strip_suffix(b"\r").unwrap_or(&patch.header);
    let old_path = change.old_path.as_deref().unwrap_or(change.path.as_str());
    let expected = format!("diff --git a/{old_path} b/{}", change.path);
    if header == expected.as_bytes() {
        return true;
    }

    let quoted = format!("diff --git \"a/{old_path}\" \"b/{}\"", change.path);
    if header == quoted.as_bytes() {
        return true;
    }

    let quoted_old = quote_git_path(&format!("a/{old_path}"));
    let quoted_new = quote_git_path(&format!("b/{}", change.path));
    let quoted_escaped = format!("diff --git {quoted_old} {quoted_new}");
    header == quoted_escaped.as_bytes()
}

fn take_batch_patch(
    patches: &mut [Option<BatchPatch>],
    change: &ChangedPath,
    missing_too_large: bool,
) -> BatchPatch {
    let selected = patches.iter().enumerate().find_map(|(index, patch)| {
        patch
            .as_ref()
            .filter(|patch| patch_matches_change(patch, change))
            .map(|_| index)
    });

    if let Some(index) = selected {
        if let Some(patch) = patches[index].take() {
            return patch;
        }
    }

    BatchPatch {
        header: Vec::new(),
        parsed: ParsedPatch {
            binary: false,
            additions: 0,
            deletions: 0,
            hunks: Vec::new(),
        },
        too_large: missing_too_large,
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

fn change_matches_paths(change: &ChangedPath, paths: &[String]) -> bool {
    paths
        .iter()
        .any(|path| path == &change.path || change.old_path.as_deref() == Some(path.as_str()))
}

fn patch_paths_for_changes(changes: &[ChangedPath]) -> Vec<String> {
    let mut paths = Vec::with_capacity(changes.len() * 2);
    for change in changes {
        if let Some(old_path) = change.old_path.as_ref() {
            if !paths.iter().any(|path| path == old_path) {
                paths.push(old_path.clone());
            }
        }
        if !paths.iter().any(|path| path == &change.path) {
            paths.push(change.path.clone());
        }
    }
    paths
}

fn changed_paths_for_review(
    root: &Path,
    status_data: &[u8],
    requested_paths: Option<&[String]>,
) -> Result<(Vec<ChangedPath>, Vec<ChangedPath>, bool), String> {
    let (mut staged_changes, mut unstaged_changes) = parse_status_changes(status_data);
    retain_safe_changed_paths(root, &mut staged_changes);
    retain_safe_changed_paths(root, &mut unstaged_changes);

    if let Some(requested_paths) = requested_paths {
        staged_changes.retain(|change| change_matches_paths(change, requested_paths));
        unstaged_changes.retain(|change| change_matches_paths(change, requested_paths));
        sort_changed_paths(&mut staged_changes);
        sort_changed_paths(&mut unstaged_changes);
        return Ok((staged_changes, unstaged_changes, false));
    }

    sort_changed_paths(&mut staged_changes);
    sort_changed_paths(&mut unstaged_changes);
    let truncated =
        staged_changes.len() > REVIEW_FILE_LIMIT || unstaged_changes.len() > REVIEW_FILE_LIMIT;
    staged_changes.truncate(REVIEW_FILE_LIMIT);
    unstaged_changes.truncate(REVIEW_FILE_LIMIT);

    Ok((staged_changes, unstaged_changes, truncated))
}

fn read_workspace_changes(
    root: &Path,
    requested_paths: Option<&[String]>,
) -> Result<(Vec<ChangedPath>, Vec<ChangedPath>, bool), String> {
    let status = run_git(
        root,
        &[
            "status",
            "--porcelain=v1",
            "--renames",
            "-z",
            "--untracked-files=all",
        ],
    )?;
    if !status.status.success() {
        return Err("Unable to inspect git status".to_owned());
    }
    changed_paths_for_review(root, &status.stdout, requested_paths)
}

fn update_git_index<T: AsRef<OsStr>>(
    root: &Path,
    args: &[T],
    error: &'static str,
) -> Result<(), String> {
    let output = run_git(root, args)?;
    if output.status.success() {
        Ok(())
    } else {
        Err(error.to_owned())
    }
}

fn validate_workspace_paths(root: &Path, paths: Vec<String>) -> Result<Vec<String>, String> {
    if paths.is_empty() {
        return Err("Workspace paths cannot be empty".to_owned());
    }

    let mut safe_paths = Vec::with_capacity(paths.len().min(WORKSPACE_PATH_LIMIT));
    for path in paths {
        if path.is_empty() || path.contains('\0') || !safe_git_path(root, &path) {
            return Err("Workspace path is invalid".to_owned());
        }
        if !safe_paths.iter().any(|existing| existing == &path) {
            safe_paths.push(path);
        }
    }
    if safe_paths.len() > WORKSPACE_PATH_LIMIT {
        return Err("Too many workspace paths".to_owned());
    }
    if safe_paths.is_empty() {
        return Err("Workspace paths cannot be empty".to_owned());
    }
    Ok(safe_paths)
}

pub(crate) fn update_workspace_files(
    root: String,
    paths: Vec<String>,
    stage: bool,
) -> Result<WorkspaceReviewDelta, String> {
    let canonical_root = canonical_workspace_root(&root)?;
    let paths = validate_workspace_paths(&canonical_root, paths)?;

    if stage {
        let mut args = vec!["add".to_owned(), "--".to_owned()];
        args.extend(paths.iter().cloned());
        update_git_index(&canonical_root, &args, "Unable to stage workspace file")?;
    } else {
        let head = run_git(&canonical_root, &["rev-parse", "--verify", "HEAD"])?;
        let mut args = if head.status.success() {
            vec!["restore".to_owned(), "--staged".to_owned(), "--".to_owned()]
        } else {
            vec![
                "rm".to_owned(),
                "--cached".to_owned(),
                "--ignore-unmatch".to_owned(),
                "--".to_owned(),
            ]
        };
        args.extend(paths.iter().cloned());
        update_git_index(&canonical_root, &args, "Unable to unstage workspace file")?;
    }

    let (staged_changes, unstaged_changes, _) =
        read_workspace_changes(&canonical_root, Some(&paths))?;
    let staged_patch_paths = patch_paths_for_changes(&staged_changes);
    let unstaged_patch_paths = patch_paths_for_changes(&unstaged_changes);
    let staged_files =
        build_review_files(&canonical_root, staged_changes, Some(&staged_patch_paths))?;
    let unstaged_files = build_review_files(
        &canonical_root,
        unstaged_changes,
        Some(&unstaged_patch_paths),
    )?;

    Ok(WorkspaceReviewDelta {
        staged_files,
        unstaged_files,
    })
}

pub(crate) fn stage_workspace_files(
    root: String,
    paths: Vec<String>,
) -> Result<WorkspaceReviewDelta, String> {
    update_workspace_files(root, paths, true)
}

pub(crate) fn unstage_workspace_files(
    root: String,
    paths: Vec<String>,
) -> Result<WorkspaceReviewDelta, String> {
    update_workspace_files(root, paths, false)
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

fn review_file_from_patch(change: ChangedPath, parsed: ParsedPatch, too_large: bool) -> ReviewFile {
    ReviewFile {
        path: change.path,
        old_path: change.old_path,
        status: change.status.as_str().to_owned(),
        additions: parsed.additions,
        deletions: parsed.deletions,
        binary: parsed.binary,
        too_large,
        hunks: parsed.hunks,
    }
}

fn build_review_files(
    root: &Path,
    changes: Vec<ChangedPath>,
    patch_paths: Option<&[String]>,
) -> Result<Vec<ReviewFile>, String> {
    let Some(source) = changes.first().map(|change| change.source) else {
        return Ok(Vec::new());
    };

    match source {
        PatchSource::Cached | PatchSource::Worktree => {
            let batch = run_git_patch_batch(root, source, patch_paths, false)?;
            if !batch.status.success() && !batch.exceeded {
                return Err("Unable to read git patch".to_owned());
            }
            let stat_batch = run_git_patch_batch(root, source, patch_paths, true)?;
            if !stat_batch.status.success() && !stat_batch.exceeded {
                return Err("Unable to read git numstat".to_owned());
            }
            let mut stats: Vec<Option<BatchStat>> = parse_batch_stats(&stat_batch)
                .into_iter()
                .map(Some)
                .collect();
            let mut patches: Vec<Option<BatchPatch>> =
                parse_batch_patches(&batch).into_iter().map(Some).collect();
            let mut files = Vec::with_capacity(changes.len());
            for change in changes {
                let patch = take_batch_patch(&mut patches, &change, batch.exceeded);
                let stat = take_batch_stat(&mut stats, &change);
                let mut file = review_file_from_patch(
                    change,
                    patch.parsed,
                    patch.too_large || stat_batch.exceeded,
                );
                if let Some((_, _, additions, deletions, binary)) = stat {
                    file.additions = additions;
                    file.deletions = deletions;
                    file.binary = binary;
                }
                files.push(file);
            }
            Ok(files)
        }
        PatchSource::NoIndex => {
            let mut files = Vec::with_capacity(changes.len());
            for change in changes {
                let patch = run_git_patch(root, &change.path)?;
                if !patch.status.success() && !patch.exceeded && patch.status.code() != Some(1) {
                    return Err("Unable to read git patch".to_owned());
                }
                let parsed = parse_patch(&patch.stdout);
                files.push(review_file_from_patch(change, parsed, patch.exceeded));
            }
            Ok(files)
        }
    }
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
        &[
            "status",
            "--porcelain=v1",
            "--renames",
            "-z",
            "--untracked-files=all",
        ],
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
        match changed_paths_for_review(&canonical_root, &status.stdout, None) {
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

    let staged_patch_paths = patch_paths_for_changes(&staged_changes);
    let unstaged_patch_paths = patch_paths_for_changes(&unstaged_changes);
    let staged_files =
        match build_review_files(&canonical_root, staged_changes, Some(&staged_patch_paths)) {
            Ok(files) => files,
            Err(error) => {
                return Ok(WorkspaceReview {
                    repo: true,
                    clean: !dirty,
                    staged_files: Vec::new(),
                    unstaged_files: Vec::new(),
                    truncated,
                    error: Some(error),
                });
            }
        };
    let unstaged_files = match build_review_files(
        &canonical_root,
        unstaged_changes,
        Some(&unstaged_patch_paths),
    ) {
        Ok(files) => files,
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
    };

    Ok(WorkspaceReview {
        repo: true,
        clean: !dirty,
        staged_files,
        unstaged_files,
        truncated,
        error: None,
    })
}
