use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::{
    fs::{self, File, OpenOptions},
    io::{ErrorKind, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

use crate::models::{ComposerAttachment, ComposerPasteFile, ImportComposerFilesResult};

const SAFE_SESSION_ID_MAX: usize = 64;
const MAX_FILE_BYTES: u64 = 24 * 1024 * 1024;
const MAX_TOTAL_BYTES: u64 = 48 * 1024 * 1024;
const OUTPUT_ATTEMPTS: usize = 8;
const INVALID_SESSION_ID: &str = "invalid session id";
const WRITE_FAILED: &str = "attachment file could not be written";

static OUTPUT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

const IMAGE_EXTENSIONS: &[&str] = &[
    ".avif", ".bmp", ".gif", ".heic", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp",
];

struct PreparedPaste {
    bytes: Vec<u8>,
    name: String,
    mime_type: String,
}

struct PreparedImport {
    source: PathBuf,
    name: String,
    mime_type: String,
    size: u64,
}

fn is_safe_session_id(session_id: &str) -> bool {
    !session_id.is_empty()
        && session_id.chars().count() <= SAFE_SESSION_ID_MAX
        && session_id
            .chars()
            .all(|value| value.is_ascii_alphanumeric() || value == '-' || value == '_')
}

/// Session scratch directory. `session_id` is validated before this is used, so
/// the joined path can never escape the scratch root.
fn scratch_root(session_id: &str) -> PathBuf {
    std::env::temp_dir()
        .join("omp-desktop")
        .join("scratch")
        .join(session_id)
        .join("pasted")
}

fn lowercase_extension(value: &str) -> Option<String> {
    Path::new(value)
        .extension()
        .and_then(|extension| extension.to_str())
        .filter(|extension| !extension.is_empty())
        .map(|extension| format!(".{}", extension.to_ascii_lowercase()))
}

fn extension_for_mime(mime_type: &str) -> &'static str {
    match mime_type {
        "image/gif" => ".gif",
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/tiff" => ".tiff",
        "image/webp" => ".webp",
        "text/csv" => ".csv",
        "text/html" => ".html",
        "text/plain" => ".txt",
        "application/json" => ".json",
        "application/pdf" => ".pdf",
        "application/zip" => ".zip",
        _ => ".bin",
    }
}

fn mime_type_for_path(path: &Path) -> String {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| format!(".{}", value.to_ascii_lowercase()));
    match extension.as_deref() {
        Some(".avif") => "image/avif",
        Some(".bmp") => "image/bmp",
        Some(".gif") => "image/gif",
        Some(".heic") => "image/heic",
        Some(".jpeg") | Some(".jpg") => "image/jpeg",
        Some(".png") => "image/png",
        Some(".tif") | Some(".tiff") => "image/tiff",
        Some(".webp") => "image/webp",
        Some(".csv") => "text/csv",
        Some(".html") => "text/html",
        Some(".txt") => "text/plain",
        Some(".json") => "application/json",
        Some(".pdf") => "application/pdf",
        Some(".zip") => "application/zip",
        _ => "application/octet-stream",
    }
    .to_owned()
}

fn normalize_mime_type(mime_type: Option<&str>) -> String {
    match mime_type.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => value.to_ascii_lowercase(),
        None => "application/octet-stream".to_owned(),
    }
}

fn has_image_extension(name: &str) -> bool {
    lowercase_extension(name)
        .is_some_and(|extension| IMAGE_EXTENSIONS.contains(&extension.as_str()))
}

fn attachment_kind(name: &str, mime_type: &str) -> String {
    if mime_type.starts_with("image/") || has_image_extension(name) {
        "image".to_owned()
    } else {
        "file".to_owned()
    }
}

/// Reduce renderer-provided metadata to a leaf name that cannot escape the
/// scratch directory or collide with another entry.
fn sanitize_file_name(name: Option<&str>, mime_type: &str, index: usize) -> String {
    let normalized = name.unwrap_or("").replace('\\', "/");
    let leaf = Path::new(&normalized)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("");
    let mut sanitized = String::with_capacity(leaf.len());
    for value in leaf.chars() {
        if value.is_alphanumeric() || value == '.' || value == '_' || value == '-' {
            sanitized.push(value);
        } else {
            sanitized.push('_');
        }
    }
    if !sanitized.is_empty() && sanitized.chars().all(|value| value == '.') {
        sanitized.clear();
    }
    let candidate = if sanitized.is_empty() {
        format!("pasted-file-{}", index + 1)
    } else {
        sanitized
    };
    if lowercase_extension(&candidate).is_some() {
        candidate
    } else {
        format!("{candidate}{}", extension_for_mime(mime_type))
    }
}

fn plain_path_string(path: &Path) -> String {
    let value = path.to_string_lossy().into_owned();
    if let Some(stripped) = value.strip_prefix("\\\\?\\") {
        return stripped.to_owned();
    }
    value
}

/// Create the attachment file under `root`, preferring the caller's leaf name.
/// `create_new` guarantees exclusivity, so an existing file is never
/// overwritten: a collision retries with the next sequence value appended
/// before the extension.
fn create_output_file(root: &Path, name: &str) -> Result<(PathBuf, File), String> {
    let direct = root.join(name);
    match OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&direct)
    {
        Ok(file) => return Ok((direct, file)),
        Err(error) if error.kind() == ErrorKind::AlreadyExists => {}
        Err(_) => return Err(WRITE_FAILED.to_owned()),
    }
    for _ in 0..OUTPUT_ATTEMPTS {
        let sequence = OUTPUT_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let candidate = match name.rsplit_once('.') {
            Some((stem, extension)) if !stem.is_empty() && !extension.is_empty() => {
                format!("{stem}-{sequence}.{extension}")
            }
            _ => format!("{name}-{sequence}"),
        };
        let path = root.join(candidate);
        match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(file) => return Ok((path, file)),
            Err(error) if error.kind() == ErrorKind::AlreadyExists => continue,
            Err(_) => return Err(WRITE_FAILED.to_owned()),
        }
    }
    Err(WRITE_FAILED.to_owned())
}

fn cleanup_written(paths: &[PathBuf]) {
    for path in paths {
        let _ = fs::remove_file(path);
    }
}

fn prepare_root(session_id: &str) -> Result<PathBuf, String> {
    let root = scratch_root(session_id);
    fs::create_dir_all(&root)
        .map_err(|_| "attachment directory could not be created".to_owned())?;
    Ok(root)
}

/// Materialize renderer clipboard bytes in the session scratch directory.
/// Names are reduced to leaf names and every output receives a unique prefix,
/// so renderer-provided metadata cannot escape or overwrite another paste.
pub(crate) fn save_composer_paste(
    session_id: &str,
    files: Vec<ComposerPasteFile>,
) -> Result<Vec<ComposerAttachment>, String> {
    if !is_safe_session_id(session_id) {
        return Err(INVALID_SESSION_ID.to_owned());
    }
    if files.is_empty() {
        return Ok(Vec::new());
    }

    let mut total_bytes: u64 = 0;
    let mut prepared: Vec<PreparedPaste> = Vec::with_capacity(files.len());
    for (index, file) in files.into_iter().enumerate() {
        let bytes = STANDARD
            .decode(file.data.as_bytes())
            .map_err(|_| "pasted file data is invalid".to_owned())?;
        let size = bytes.len() as u64;
        if size > MAX_FILE_BYTES {
            return Err(format!(
                "pasted file is too large (maximum {MAX_FILE_BYTES} bytes)"
            ));
        }
        total_bytes = total_bytes.saturating_add(size);
        if total_bytes > MAX_TOTAL_BYTES {
            return Err(format!(
                "pasted files are too large (maximum {MAX_TOTAL_BYTES} bytes)"
            ));
        }
        let mime_type = normalize_mime_type(file.mime_type.as_deref());
        let name = sanitize_file_name(file.name.as_deref(), &mime_type, index);
        prepared.push(PreparedPaste {
            bytes,
            name,
            mime_type,
        });
    }

    let root = prepare_root(session_id)?;
    let mut written: Vec<PathBuf> = Vec::with_capacity(prepared.len());
    let mut attachments: Vec<ComposerAttachment> = Vec::with_capacity(prepared.len());
    for item in prepared {
        let (path, mut file) = match create_output_file(&root, &item.name) {
            Ok(value) => value,
            Err(error) => {
                cleanup_written(&written);
                return Err(error);
            }
        };
        written.push(path.clone());
        if file.write_all(&item.bytes).is_err() {
            cleanup_written(&written);
            return Err(WRITE_FAILED.to_owned());
        }
        let kind = attachment_kind(&item.name, &item.mime_type);
        attachments.push(ComposerAttachment {
            path: plain_path_string(&path),
            name: item.name,
            kind,
            mime_type: item.mime_type,
            size: item.bytes.len() as u64,
        });
    }
    Ok(attachments)
}

/// Copy native-picker selections into the owning session scratch directory.
/// The renderer only receives the resulting safe paths; source paths never
/// become prompt references, so arbitrary files remain inside the attachment
/// roots enforced by the main-process prompt boundary.
pub(crate) fn import_composer_files(
    session_id: &str,
    paths: Vec<String>,
) -> Result<ImportComposerFilesResult, String> {
    if !is_safe_session_id(session_id) {
        return Err(INVALID_SESSION_ID.to_owned());
    }
    if paths.is_empty() {
        return Ok(ImportComposerFilesResult {
            files: Vec::new(),
            skipped_directories: 0,
        });
    }

    let mut skipped_directories: usize = 0;
    let mut total_bytes: u64 = 0;
    let mut prepared: Vec<PreparedImport> = Vec::with_capacity(paths.len());
    for (index, raw_path) in paths.iter().enumerate() {
        let requested = raw_path.trim();
        if requested.is_empty() {
            return Err("import file path is invalid".to_owned());
        }
        let source = Path::new(requested);
        if !source.is_absolute() {
            return Err("import file path must be absolute".to_owned());
        }
        let metadata = match fs::metadata(source) {
            Ok(value) => value,
            Err(_) => return Err("import file was not found".to_owned()),
        };
        if metadata.is_dir() {
            skipped_directories += 1;
            continue;
        }
        if !metadata.is_file() {
            return Err("selected path is not a file".to_owned());
        }
        let size = metadata.len();
        if size > MAX_FILE_BYTES {
            return Err(format!(
                "imported file is too large (maximum {MAX_FILE_BYTES} bytes)"
            ));
        }
        total_bytes = total_bytes.saturating_add(size);
        if total_bytes > MAX_TOTAL_BYTES {
            return Err(format!(
                "imported files are too large (maximum {MAX_TOTAL_BYTES} bytes)"
            ));
        }
        let mime_type = mime_type_for_path(source);
        let name = sanitize_file_name(
            source.file_name().and_then(|value| value.to_str()),
            &mime_type,
            index,
        );
        prepared.push(PreparedImport {
            source: source.to_path_buf(),
            name,
            mime_type,
            size,
        });
    }

    if prepared.is_empty() {
        return Ok(ImportComposerFilesResult {
            files: Vec::new(),
            skipped_directories,
        });
    }

    let root = prepare_root(session_id)?;
    let mut written: Vec<PathBuf> = Vec::with_capacity(prepared.len());
    let mut files: Vec<ComposerAttachment> = Vec::with_capacity(prepared.len());
    for item in prepared {
        let (path, file) = match create_output_file(&root, &item.name) {
            Ok(value) => value,
            Err(error) => {
                cleanup_written(&written);
                return Err(error);
            }
        };
        drop(file);
        written.push(path.clone());
        if fs::copy(&item.source, &path).is_err() {
            cleanup_written(&written);
            return Err("attachment file could not be copied".to_owned());
        }
        let kind = attachment_kind(&item.name, &item.mime_type);
        files.push(ComposerAttachment {
            path: plain_path_string(&path),
            name: item.name,
            kind,
            mime_type: item.mime_type,
            size: item.size,
        });
    }
    Ok(ImportComposerFilesResult {
        files,
        skipped_directories,
    })
}
#[cfg(test)]
mod output_name_tests {
    use super::create_output_file;

    #[test]
    fn keeps_leaf_name_and_suffixes_collisions() {
        let root = std::env::temp_dir().join(format!("omp-attach-probe-{}", std::process::id()));
        std::fs::create_dir_all(&root).expect("probe dir");
        let (first, _) = create_output_file(&root, "image.png").expect("first");
        let (second, _) = create_output_file(&root, "image.png").expect("second");
        let (third, _) = create_output_file(&root, "image.png").expect("third");
        assert_eq!(first.file_name().unwrap(), "image.png");
        assert_ne!(second.file_name().unwrap(), "image.png");
        assert!(second.to_string_lossy().ends_with(".png"));
        assert_ne!(second.file_name().unwrap(), third.file_name().unwrap());
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn accepts_more_files_than_the_old_count_limit() {
        let session = format!("probe-{}", std::process::id());
        let files = (0..40)
            .map(|index| crate::models::ComposerPasteFile {
                name: Some(format!("file-{index}.png")),
                mime_type: Some("image/png".to_owned()),
                data: "YWJj".to_owned(),
            })
            .collect::<Vec<_>>();
        let saved = super::save_composer_paste(&session, files).expect("40 pasted files");
        assert_eq!(saved.len(), 40);
        let directory = super::scratch_root(&session);
        let _ = std::fs::remove_dir_all(&directory);
    }
}
