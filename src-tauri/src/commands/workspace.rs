use crate::errors::IpcError;
use crate::models::{
    FileReadResult, ListWorkspaceEntriesResult, RevealWorkspaceFileResult, WorkspaceSearchResult,
};
use crate::services::workspace;

fn workspace_error(message: String) -> IpcError {
    IpcError::from_message("WORKSPACE_OPERATION_FAILED", message)
}

#[tauri::command]
pub(crate) async fn current_working_directory() -> Result<String, IpcError> {
    tauri::async_runtime::spawn_blocking(workspace::current_working_directory)
        .await
        .map_err(|_| IpcError::new("WORKSPACE_TASK_FAILED", "Workspace task failed."))?
        .map_err(workspace_error)
}

#[tauri::command]
pub(crate) async fn search_workspace_files(
    root: String,
    query: String,
    max_results: Option<usize>,
) -> Result<WorkspaceSearchResult, IpcError> {
    workspace::search_workspace_files(root, query, max_results)
        .await
        .map_err(workspace_error)
}

#[tauri::command]
pub(crate) async fn list_workspace_entries(
    root: String,
    path: String,
) -> Result<ListWorkspaceEntriesResult, IpcError> {
    tauri::async_runtime::spawn_blocking(move || workspace::list_workspace_entries(root, path))
        .await
        .map_err(|_| IpcError::new("WORKSPACE_TASK_FAILED", "Workspace listing task failed."))?
        .map_err(workspace_error)
}

#[tauri::command]
pub(crate) async fn read_workspace_file(
    root: String,
    path: String,
) -> Result<FileReadResult, IpcError> {
    tauri::async_runtime::spawn_blocking(move || workspace::read_workspace_file(root, path))
        .await
        .map_err(|_| IpcError::new("WORKSPACE_TASK_FAILED", "Workspace read task failed."))?
        .map_err(workspace_error)
}

#[tauri::command]
pub(crate) async fn write_workspace_file(
    root: String,
    path: String,
    content: String,
) -> Result<(), IpcError> {
    tauri::async_runtime::spawn_blocking(move || {
        workspace::write_workspace_file(root, path, content)
    })
    .await
    .map_err(|_| IpcError::new("WORKSPACE_TASK_FAILED", "Workspace write task failed."))?
    .map_err(workspace_error)
}

#[tauri::command]
pub(crate) async fn reveal_workspace_file(
    root: String,
    path: String,
) -> Result<RevealWorkspaceFileResult, IpcError> {
    tauri::async_runtime::spawn_blocking(move || workspace::reveal_workspace_file(root, path))
        .await
        .map_err(|_| IpcError::new("WORKSPACE_TASK_FAILED", "Workspace reveal task failed."))?
        .map_err(workspace_error)
}
