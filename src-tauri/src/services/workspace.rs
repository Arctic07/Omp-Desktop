use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::{
    ffi::{OsStr, OsString},
    fs::{self, File, OpenOptions},
    io::{BufReader, Read, Write},
    path::{Component, Path, PathBuf},
    process::{Command, Stdio},
    sync::atomic::{AtomicU64, Ordering},
};

use crate::models::{
    FileEntry, FileReadResult, ListWorkspaceEntriesResult, RevealWorkspaceFileResult,
    WorkspaceSearchMatch, WorkspaceSearchResult,
};

const TEXT_LIMIT: usize = 512 * 1024;
const IMAGE_LIMIT: usize = 5 * 1024 * 1024;
const SEARCH_RESULT_DEFAULT_LIMIT: usize = 200;
const SEARCH_RESULT_MAX_LIMIT: usize = 500;
const SEARCH_FILE_LIMIT: usize = 10_000;
const SEARCH_ENTRY_LIMIT: usize = 50_000;
const SEARCH_FILE_BYTES_LIMIT: usize = 2 * 1024 * 1024;
const SEARCH_LINE_BYTES_LIMIT: usize = 64 * 1024;
const SEARCH_SNIPPET_BYTES_LIMIT: usize = 4 * 1024;
const SEARCH_GIT_OUTPUT_LIMIT: usize = 8 * 1024 * 1024;
const WORKSPACE_ENTRY_LIMIT: usize = 10_000;
const SEARCH_BUFFER_BYTES: usize = 8 * 1024;

static WRITE_SEQUENCE: AtomicU64 = AtomicU64::new(0);
const IGNORED_NAMES: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    "build",
    "out",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".DS_Store",
];

struct WorkspaceSearchState {
    query: String,
    max_results: usize,
    matches: Vec<WorkspaceSearchMatch>,
    truncated: bool,
    scanned_files: usize,
}

impl WorkspaceSearchState {
    fn new(query: String, max_results: usize) -> Self {
        Self {
            query,
            max_results,
            matches: Vec::with_capacity(
                max_results
                    .saturating_add(1)
                    .min(SEARCH_RESULT_DEFAULT_LIMIT + 1),
            ),
            truncated: false,
            scanned_files: 0,
        }
    }

    fn at_limit(&self) -> bool {
        self.matches.len() > self.max_results
    }

    fn push_match(&mut self, search_match: WorkspaceSearchMatch) {
        if self.at_limit() {
            self.truncated = true;
            return;
        }
        self.matches.push(search_match);
    }

    fn into_result(mut self) -> WorkspaceSearchResult {
        let overflowed = self.matches.len() > self.max_results;
        self.matches.truncate(self.max_results);
        WorkspaceSearchResult {
            matches: self.matches,
            truncated: self.truncated || overflowed,
            scanned_files: self.scanned_files,
        }
    }
}

pub(crate) fn current_working_directory() -> Result<String, String> {
    std::env::current_dir()
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|error| error.to_string())
}

fn ignored_name(name: &OsStr) -> bool {
    match name.to_str() {
        Some(name) => IGNORED_NAMES
            .iter()
            .any(|ignored| name.eq_ignore_ascii_case(ignored)),
        None => false,
    }
}

fn validate_relative_path(path: &Path) -> Result<(), String> {
    if path.is_absolute() {
        return Err("Workspace path must be relative".to_owned());
    }

    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::Normal(name) => {
                if ignored_name(name) {
                    return Err("Workspace path is ignored".to_owned());
                }
            }
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("Workspace path escapes workspace root".to_owned());
            }
        }
    }

    Ok(())
}

pub(crate) fn canonical_workspace_root(root: &str) -> Result<PathBuf, String> {
    let canonical = Path::new(root)
        .canonicalize()
        .map_err(|_| "Workspace root is invalid".to_owned())?;
    if !canonical.is_dir() {
        return Err("Workspace root is not a directory".to_owned());
    }
    Ok(canonical)
}

fn resolve_workspace_path(root: &str, relative: &str) -> Result<(PathBuf, PathBuf), String> {
    let canonical_root = canonical_workspace_root(root)?;
    let relative_path = Path::new(relative);
    validate_relative_path(relative_path)?;

    let target = canonical_root
        .join(relative_path)
        .canonicalize()
        .map_err(|_| "Workspace path does not exist".to_owned())?;
    if !target.starts_with(&canonical_root) {
        return Err("Workspace path escapes workspace root".to_owned());
    }

    Ok((canonical_root, target))
}

fn path_is_within_root(root: &Path, relative: &Path) -> bool {
    let candidate = root.join(relative);
    let mut probe = candidate.as_path();

    loop {
        if let Ok(canonical) = probe.canonicalize() {
            return canonical.starts_with(root);
        }

        if let Ok(metadata) = fs::symlink_metadata(probe) {
            if metadata.file_type().is_symlink() {
                return false;
            }
        }

        let Some(parent) = probe.parent() else {
            return false;
        };
        if parent == probe {
            return false;
        }
        probe = parent;
    }
}

pub(crate) fn safe_git_path(root: &Path, path: &str) -> bool {
    let relative = Path::new(path);
    validate_relative_path(relative).is_ok() && path_is_within_root(root, relative)
}

fn image_mime(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_str()?;
    if extension.eq_ignore_ascii_case("png") {
        Some("image/png")
    } else if extension.eq_ignore_ascii_case("jpg") || extension.eq_ignore_ascii_case("jpeg") {
        Some("image/jpeg")
    } else if extension.eq_ignore_ascii_case("gif") {
        Some("image/gif")
    } else if extension.eq_ignore_ascii_case("webp") {
        Some("image/webp")
    } else if extension.eq_ignore_ascii_case("svg") {
        Some("image/svg+xml")
    } else if extension.eq_ignore_ascii_case("ico") {
        Some("image/x-icon")
    } else if extension.eq_ignore_ascii_case("bmp") {
        Some("image/bmp")
    } else if extension.eq_ignore_ascii_case("avif") {
        Some("image/avif")
    } else {
        None
    }
}

fn bytes_are_binary(bytes: &[u8]) -> bool {
    bytes.contains(&0) || std::str::from_utf8(bytes).is_err()
}

fn read_file_limited(path: &Path, limit: usize) -> Result<(Vec<u8>, bool), String> {
    let file = File::open(path).map_err(|_| "Workspace file cannot be read".to_owned())?;
    let mut bytes = Vec::new();
    let mut limited = file.take((limit + 1) as u64);
    limited
        .read_to_end(&mut bytes)
        .map_err(|_| "Workspace file cannot be read".to_owned())?;
    let exceeded = bytes.len() > limit;
    if exceeded {
        bytes.truncate(limit);
    }
    Ok((bytes, exceeded))
}

fn read_result(kind: &str, size: u64) -> FileReadResult {
    FileReadResult {
        kind: kind.to_owned(),
        content: None,
        data_url: None,
        size,
    }
}

fn normalized_search_relative_path(path: &Path) -> Option<String> {
    let mut normalized = String::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::Normal(name) => {
                let name = name.to_str()?;
                if !normalized.is_empty() {
                    normalized.push('/');
                }
                normalized.push_str(name);
            }
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => return None,
        }
    }
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

fn bounded_git_file_list(root: &Path) -> Option<(Vec<u8>, bool)> {
    let mut child = Command::new("git")
        .args(["ls-files", "-co", "--exclude-standard", "-z"])
        .current_dir(root)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;
    let Some(stdout) = child.stdout.take() else {
        let _ = child.kill();
        let _ = child.wait();
        return None;
    };

    let mut reader = BufReader::with_capacity(
        SEARCH_BUFFER_BYTES,
        stdout.take((SEARCH_GIT_OUTPUT_LIMIT + 1) as u64),
    );
    let mut data = Vec::with_capacity(SEARCH_GIT_OUTPUT_LIMIT.min(64 * 1024));
    if reader.read_to_end(&mut data).is_err() {
        let _ = child.kill();
        let _ = child.wait();
        return None;
    }

    let exceeded = data.len() > SEARCH_GIT_OUTPUT_LIMIT;
    if exceeded {
        let _ = child.kill();
    }
    let status = child.wait().ok()?;
    data.truncate(SEARCH_GIT_OUTPUT_LIMIT);

    if status.success() || exceeded {
        Some((data, exceeded))
    } else {
        None
    }
}

fn search_line_text(bytes: &[u8]) -> Result<&str, ()> {
    let text_bytes = if bytes.last().copied() == Some(b'\r') {
        &bytes[..bytes.len().saturating_sub(1)]
    } else {
        bytes
    };
    match std::str::from_utf8(text_bytes) {
        Ok(text) => Ok(text),
        Err(error) if error.error_len().is_none() => {
            std::str::from_utf8(&text_bytes[..error.valid_up_to()]).map_err(|_| ())
        }
        Err(_) => Err(()),
    }
}

fn original_byte_index_for_lowered(text: &str, lowered_index: usize) -> usize {
    let mut lowered_offset = 0;
    for (original_index, character) in text.char_indices() {
        for lowered_character in character.to_lowercase() {
            let lowered_length = lowered_character.len_utf8();
            if lowered_index < lowered_offset + lowered_length {
                return original_index;
            }
            lowered_offset += lowered_length;
        }
    }
    text.len()
}

fn bounded_search_snippet(text: &str) -> String {
    if text.len() <= SEARCH_SNIPPET_BYTES_LIMIT {
        return text.to_owned();
    }

    let mut end = SEARCH_SNIPPET_BYTES_LIMIT.saturating_sub('…'.len_utf8());
    while end > 0 && !text.is_char_boundary(end) {
        end -= 1;
    }
    let mut snippet = String::with_capacity(end + '…'.len_utf8());
    snippet.push_str(&text[..end]);
    snippet.push('…');
    snippet
}

fn content_search_match(
    path: &str,
    line_number: usize,
    line: &[u8],
    query: &str,
) -> Result<Option<WorkspaceSearchMatch>, ()> {
    let text = search_line_text(line)?;
    let lowered = text.to_lowercase();
    let Some(lowered_index) = lowered.find(query) else {
        return Ok(None);
    };
    let original_index = original_byte_index_for_lowered(text, lowered_index);
    let column = text[..original_index].chars().count() + 1;

    Ok(Some(WorkspaceSearchMatch {
        kind: "content".to_owned(),
        path: path.to_owned(),
        line: Some(line_number),
        column: Some(column),
        snippet: Some(bounded_search_snippet(text)),
    }))
}

fn scan_workspace_file(
    path: &Path,
    relative_path: &str,
    file_size: u64,
    state: &mut WorkspaceSearchState,
) {
    let remaining = state
        .max_results
        .saturating_add(1)
        .saturating_sub(state.matches.len());
    if remaining == 0 {
        return;
    }

    let file = match File::open(path) {
        Ok(file) => file,
        Err(_) => return,
    };
    let limited_file = file.take(SEARCH_FILE_BYTES_LIMIT as u64);
    let mut reader = BufReader::with_capacity(SEARCH_BUFFER_BYTES, limited_file);
    let mut buffer = [0_u8; SEARCH_BUFFER_BYTES];
    let mut line = Vec::with_capacity(SEARCH_LINE_BYTES_LIMIT.min(4096));
    let mut line_number = 1;
    let mut pending_matches = Vec::with_capacity(remaining.min(16));
    let mut stop_at_result_limit = false;

    'scan: loop {
        let read = match reader.read(&mut buffer) {
            Ok(read) => read,
            Err(_) => return,
        };
        if read == 0 {
            break;
        }

        for byte in &buffer[..read] {
            if *byte == 0 {
                return;
            }
            if *byte == b'\n' {
                match content_search_match(relative_path, line_number, &line, &state.query) {
                    Ok(Some(search_match)) => {
                        pending_matches.push(search_match);
                        if pending_matches.len() >= remaining {
                            stop_at_result_limit = true;
                            break 'scan;
                        }
                    }
                    Ok(None) => {}
                    Err(_) => return,
                }
                line.clear();
                line_number = line_number.saturating_add(1);
            } else if line.len() < SEARCH_LINE_BYTES_LIMIT {
                line.push(*byte);
            }
        }
    }

    if !stop_at_result_limit && !line.is_empty() {
        match content_search_match(relative_path, line_number, &line, &state.query) {
            Ok(Some(search_match)) => pending_matches.push(search_match),
            Ok(None) => {}
            Err(_) => return,
        }
    }

    for search_match in pending_matches {
        state.push_match(search_match);
    }
    if file_size > SEARCH_FILE_BYTES_LIMIT as u64 {
        state.truncated = true;
    }
}

fn search_workspace_candidate(
    root: &Path,
    raw_path: &str,
    state: &mut WorkspaceSearchState,
) -> bool {
    if state.at_limit() {
        return false;
    }

    let relative = Path::new(raw_path);
    if !safe_git_path(root, raw_path) {
        return true;
    }
    let Some(relative_path) = normalized_search_relative_path(relative) else {
        return true;
    };
    let candidate = root.join(relative);
    let link_metadata = match fs::symlink_metadata(&candidate) {
        Ok(metadata) => metadata,
        Err(_) => return true,
    };
    if link_metadata.file_type().is_symlink() {
        return true;
    }

    let canonical = match candidate.canonicalize() {
        Ok(path) => path,
        Err(_) => return true,
    };
    if !canonical.starts_with(root) {
        return true;
    }
    let metadata = match fs::metadata(&canonical) {
        Ok(metadata) => metadata,
        Err(_) => return true,
    };
    if !metadata.is_file() {
        return true;
    }
    if state.scanned_files >= SEARCH_FILE_LIMIT {
        state.truncated = true;
        return false;
    }
    state.scanned_files += 1;

    if relative_path.to_lowercase().contains(&state.query) {
        state.push_match(WorkspaceSearchMatch {
            kind: "path".to_owned(),
            path: relative_path.clone(),
            line: None,
            column: None,
            snippet: None,
        });
        if state.at_limit() {
            return false;
        }
    }

    if image_mime(&canonical).is_none() {
        scan_workspace_file(&canonical, &relative_path, metadata.len(), state);
    }
    !state.at_limit()
}

fn search_workspace_fallback(root: &Path, state: &mut WorkspaceSearchState) {
    let mut directories = vec![root.to_path_buf()];
    let mut entries_seen = 0;

    while let Some(directory) = directories.pop() {
        let entries = match fs::read_dir(&directory) {
            Ok(entries) => entries,
            Err(_) => continue,
        };
        for entry in entries {
            if state.at_limit() {
                return;
            }
            entries_seen += 1;
            if entries_seen > SEARCH_ENTRY_LIMIT {
                state.truncated = true;
                return;
            }
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => continue,
            };
            let name = entry.file_name();
            if ignored_name(&name) {
                continue;
            }
            let child = entry.path();
            let metadata = match fs::symlink_metadata(&child) {
                Ok(metadata) => metadata,
                Err(_) => continue,
            };
            if metadata.file_type().is_symlink() {
                continue;
            }

            let Ok(relative) = child.strip_prefix(root) else {
                continue;
            };
            let Some(relative_path) = normalized_search_relative_path(relative) else {
                continue;
            };
            if !path_is_within_root(root, relative) {
                continue;
            }
            if metadata.is_dir() {
                directories.push(child);
            } else if metadata.is_file() && !search_workspace_candidate(root, &relative_path, state)
            {
                return;
            }
        }
    }
}

fn search_workspace_files_blocking(
    root: String,
    query: String,
    max_results: Option<usize>,
) -> Result<WorkspaceSearchResult, String> {
    let normalized_query = query.trim().to_lowercase();
    if normalized_query.is_empty() {
        return Ok(WorkspaceSearchResult {
            matches: Vec::new(),
            truncated: false,
            scanned_files: 0,
        });
    }

    let canonical_root = canonical_workspace_root(&root)?;
    let max_results = max_results
        .unwrap_or(SEARCH_RESULT_DEFAULT_LIMIT)
        .min(SEARCH_RESULT_MAX_LIMIT);
    if max_results == 0 {
        return Ok(WorkspaceSearchResult {
            matches: Vec::new(),
            truncated: true,
            scanned_files: 0,
        });
    }

    let mut state = WorkspaceSearchState::new(normalized_query, max_results);
    if let Some((data, output_truncated)) = bounded_git_file_list(&canonical_root) {
        let complete_end = data
            .iter()
            .rposition(|byte| *byte == 0)
            .map(|index| index + 1)
            .unwrap_or(0);
        for raw_path in data[..complete_end].split(|byte| *byte == 0) {
            let Ok(raw_path) = std::str::from_utf8(raw_path) else {
                continue;
            };
            if raw_path.is_empty() {
                continue;
            }
            if !search_workspace_candidate(&canonical_root, raw_path, &mut state) {
                break;
            }
        }
        if output_truncated {
            state.truncated = true;
        }
    } else {
        search_workspace_fallback(&canonical_root, &mut state);
    }

    Ok(state.into_result())
}

pub(crate) async fn search_workspace_files(
    root: String,
    query: String,
    max_results: Option<usize>,
) -> Result<WorkspaceSearchResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        search_workspace_files_blocking(root, query, max_results)
    })
    .await
    .map_err(|_| "Workspace search task failed".to_owned())?
}

pub(crate) fn list_workspace_entries(
    root: String,
    path: String,
) -> Result<ListWorkspaceEntriesResult, String> {
    let (canonical_root, target) = resolve_workspace_path(&root, &path)?;
    let metadata =
        fs::metadata(&target).map_err(|_| "Workspace directory cannot be read".to_owned())?;
    if !metadata.is_dir() {
        return Err("Workspace path is not a directory".to_owned());
    }

    let mut entries = Vec::new();
    let directory =
        fs::read_dir(&target).map_err(|_| "Workspace directory cannot be read".to_owned())?;
    for entry in directory {
        if entries.len() >= WORKSPACE_ENTRY_LIMIT {
            break;
        }
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        let name = entry.file_name();
        if ignored_name(&name) {
            continue;
        }
        let Some(name_string) = name.to_str() else {
            continue;
        };

        let child = entry.path();
        let canonical_child = match child.canonicalize() {
            Ok(path) => path,
            Err(_) => continue,
        };
        if !canonical_child.starts_with(&canonical_root) {
            continue;
        }

        let child_metadata = match fs::metadata(&canonical_child) {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        let (kind, size) = if child_metadata.is_dir() {
            ("dir", 0)
        } else if child_metadata.is_file() {
            ("file", child_metadata.len())
        } else {
            continue;
        };
        entries.push(FileEntry {
            name: name_string.to_owned(),
            kind: kind.to_owned(),
            size,
        });
    }

    entries.sort_by(|left, right| {
        let left_directory = left.kind == "dir";
        let right_directory = right.kind == "dir";
        right_directory
            .cmp(&left_directory)
            .then_with(|| left.name.cmp(&right.name))
    });

    Ok(ListWorkspaceEntriesResult { entries })
}

pub(crate) fn read_workspace_file(root: String, path: String) -> Result<FileReadResult, String> {
    let (_canonical_root, target) = resolve_workspace_path(&root, &path)?;
    let metadata = fs::metadata(&target).map_err(|_| "Workspace file cannot be read".to_owned())?;
    if !metadata.is_file() {
        return Err("Workspace path is not a file".to_owned());
    }
    let size = metadata.len();

    if let Some(mime) = image_mime(&target) {
        if size > IMAGE_LIMIT as u64 {
            return Ok(read_result("tooLarge", size));
        }
        let (bytes, exceeded) = read_file_limited(&target, IMAGE_LIMIT)?;
        if exceeded {
            return Ok(read_result("tooLarge", size));
        }
        let actual_size = bytes.len() as u64;
        return Ok(FileReadResult {
            kind: "image".to_owned(),
            content: None,
            data_url: Some(format!("data:{mime};base64,{}", STANDARD.encode(&bytes))),
            size: actual_size,
        });
    }

    if size > TEXT_LIMIT as u64 {
        return Ok(read_result("tooLarge", size));
    }

    let (bytes, exceeded) = read_file_limited(&target, TEXT_LIMIT)?;
    if exceeded {
        return if bytes_are_binary(&bytes) {
            Ok(read_result("binary", size))
        } else {
            Ok(read_result("tooLarge", size))
        };
    }
    let actual_size = bytes.len() as u64;
    if bytes_are_binary(&bytes) {
        Ok(read_result("binary", actual_size))
    } else {
        let content = String::from_utf8(bytes)
            .map_err(|_| "Workspace file cannot be read as text".to_owned())?;
        Ok(FileReadResult {
            kind: "text".to_owned(),
            content: Some(content),
            data_url: None,
            size: actual_size,
        })
    }
}

fn replace_file(temp: &Path, target: &Path) -> std::io::Result<()> {
    #[cfg(target_os = "windows")]
    {
        use std::{iter::once, os::windows::ffi::OsStrExt};
        use windows_sys::Win32::Storage::FileSystem::{
            MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
        };

        let source: Vec<u16> = temp.as_os_str().encode_wide().chain(once(0)).collect();
        let destination: Vec<u16> = target.as_os_str().encode_wide().chain(once(0)).collect();
        let result = unsafe {
            MoveFileExW(
                source.as_ptr(),
                destination.as_ptr(),
                MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
            )
        };
        if result == 0 {
            return Err(std::io::Error::last_os_error());
        }
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        fs::rename(temp, target)
    }
}

fn write_file_atomically(target: &Path, content: &[u8]) -> Result<(), String> {
    let parent = target
        .parent()
        .ok_or_else(|| "Workspace file cannot be written".to_owned())?;
    let name = target
        .file_name()
        .and_then(OsStr::to_str)
        .ok_or_else(|| "Workspace file cannot be written".to_owned())?;
    let sequence = WRITE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let temporary = parent.join(format!(".{name}.omp-{}-{sequence}.tmp", std::process::id()));

    let result = (|| -> std::io::Result<()> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)?;
        file.write_all(content)?;
        file.sync_all()?;
        drop(file);
        replace_file(&temporary, target)
    })();

    match result {
        Ok(()) => Ok(()),
        Err(_) => {
            let _ = fs::remove_file(&temporary);
            Err("Workspace file cannot be written".to_owned())
        }
    }
}

pub(crate) fn write_workspace_file(
    root: String,
    path: String,
    content: String,
) -> Result<(), String> {
    let canonical_root = canonical_workspace_root(&root)?;
    if !safe_git_path(&canonical_root, &path) {
        return Err("Workspace path is invalid".to_owned());
    }
    if content.len() > TEXT_LIMIT {
        return Err("Workspace file content is too large".to_owned());
    }

    let target = canonical_root
        .join(Path::new(&path))
        .canonicalize()
        .map_err(|_| "Workspace file cannot be written".to_owned())?;
    if !target.starts_with(&canonical_root) {
        return Err("Workspace path escapes workspace root".to_owned());
    }
    let metadata =
        fs::metadata(&target).map_err(|_| "Workspace file cannot be written".to_owned())?;
    if !metadata.is_file() {
        return Err("Workspace path is not a file".to_owned());
    }

    write_file_atomically(&target, content.as_bytes())
}

pub(crate) fn reveal_workspace_file(
    root: String,
    path: String,
) -> Result<RevealWorkspaceFileResult, String> {
    let (_canonical_root, target) = resolve_workspace_path(&root, &path)?;
    #[cfg(target_os = "windows")]
    let status = {
        let mut select_argument = OsString::from("/select,");
        select_argument.push(target.as_os_str());
        Command::new("explorer").arg(select_argument).status()
    };

    #[cfg(target_os = "macos")]
    let status = Command::new("open").arg("-R").arg(&target).status();

    #[cfg(all(unix, not(target_os = "macos")))]
    let status = {
        let reveal_target = if target.is_dir() {
            target.as_path()
        } else {
            match target.parent() {
                Some(parent) => parent,
                None => target.as_path(),
            }
        };
        Command::new("xdg-open").arg(reveal_target).status()
    };

    Ok(RevealWorkspaceFileResult {
        ok: status.is_ok_and(|status| status.success()),
    })
}
