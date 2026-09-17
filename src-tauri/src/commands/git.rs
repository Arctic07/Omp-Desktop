use crate::errors::IpcError;
use crate::models::WorkspaceReview;
use crate::services::git;

fn git_error(message: String) -> IpcError {
    IpcError::from_message("GIT_OPERATION_FAILED", message)
}

#[tauri::command]
pub(crate) async fn get_workspace_review(root: String) -> Result<WorkspaceReview, IpcError> {
    tauri::async_runtime::spawn_blocking(move || git::get_workspace_review(root))
        .await
        .map_err(|_| IpcError::new("GIT_TASK_FAILED", "Git review task failed."))?
        .map_err(git_error)
}

#[tauri::command]
pub(crate) async fn stage_workspace_file(root: String, path: String) -> Result<(), IpcError> {
    tauri::async_runtime::spawn_blocking(move || git::stage_workspace_file(root, path))
        .await
        .map_err(|_| IpcError::new("GIT_TASK_FAILED", "Git stage task failed."))?
        .map_err(git_error)
}

#[tauri::command]
pub(crate) async fn unstage_workspace_file(root: String, path: String) -> Result<(), IpcError> {
    tauri::async_runtime::spawn_blocking(move || git::unstage_workspace_file(root, path))
        .await
        .map_err(|_| IpcError::new("GIT_TASK_FAILED", "Git unstage task failed."))?
        .map_err(git_error)
}

#[tauri::command]
pub(crate) async fn commit_workspace(root: String, message: String) -> Result<(), IpcError> {
    tauri::async_runtime::spawn_blocking(move || git::commit_workspace(root, message))
        .await
        .map_err(|_| IpcError::new("GIT_TASK_FAILED", "Git commit task failed."))?
        .map_err(git_error)
}

#[tauri::command]
pub(crate) async fn pull_workspace(root: String) -> Result<(), IpcError> {
    tauri::async_runtime::spawn_blocking(move || git::pull_workspace(root))
        .await
        .map_err(|_| IpcError::new("GIT_TASK_FAILED", "Git pull task failed."))?
        .map_err(git_error)
}
