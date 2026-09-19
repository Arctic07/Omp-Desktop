use crate::errors::IpcError;
use crate::models::{ComposerAttachment, ComposerPasteFile, ImportComposerFilesResult};
use crate::services::attachments;

fn attachment_error(message: String) -> IpcError {
    IpcError::from_message("ATTACHMENT_OPERATION_FAILED", message)
}

#[tauri::command]
pub(crate) async fn save_composer_paste(
    session_id: String,
    files: Vec<ComposerPasteFile>,
) -> Result<Vec<ComposerAttachment>, IpcError> {
    tauri::async_runtime::spawn_blocking(move || {
        attachments::save_composer_paste(&session_id, files)
    })
    .await
    .map_err(|_| IpcError::new("ATTACHMENT_TASK_FAILED", "Attachment task failed."))?
    .map_err(attachment_error)
}

#[tauri::command]
pub(crate) async fn import_composer_files(
    session_id: String,
    paths: Vec<String>,
) -> Result<ImportComposerFilesResult, IpcError> {
    tauri::async_runtime::spawn_blocking(move || {
        attachments::import_composer_files(&session_id, paths)
    })
    .await
    .map_err(|_| IpcError::new("ATTACHMENT_TASK_FAILED", "Attachment task failed."))?
    .map_err(attachment_error)
}