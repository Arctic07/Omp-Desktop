use crate::errors::IpcError;
use crate::models::ModelCatalog;
use crate::services::models;

#[tauri::command]
pub(crate) async fn fetch_model_candidates(
    endpoint: String,
    api_key: String,
) -> Result<ModelCatalog, IpcError> {
    models::fetch_model_candidates(&endpoint, &api_key).await
}
