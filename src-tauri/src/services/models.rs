use std::{collections::HashSet, time::Duration};

use reqwest::{header::ACCEPT, Client, Url};
use serde_json::Value;

use crate::{
    errors::IpcError,
    models::{ModelCandidate, ModelCatalog},
};

const ENDPOINT_LIMIT: usize = 2 * 1024;
const API_KEY_LIMIT: usize = 8 * 1024;
const RESPONSE_LIMIT: usize = 1024 * 1024;
const CANDIDATE_LIMIT: usize = 500;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

pub(crate) async fn fetch_model_candidates(
    endpoint: &str,
    api_key: &str,
) -> Result<ModelCatalog, IpcError> {
    let endpoint = endpoint.trim();
    let api_key = api_key.trim();
    if endpoint.is_empty() || endpoint.len() > ENDPOINT_LIMIT || api_key.len() > API_KEY_LIMIT {
        return Err(IpcError::new(
            "MODEL_ENDPOINT_INVALID",
            "The model endpoint is invalid.",
        ));
    }

    let mut url = Url::parse(endpoint)
        .map_err(|_| IpcError::new("MODEL_ENDPOINT_INVALID", "The model endpoint is invalid."))?;
    if (url.scheme() != "http" && url.scheme() != "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(IpcError::new(
            "MODEL_ENDPOINT_INVALID",
            "The model endpoint is invalid.",
        ));
    }

    let path = url.path().trim_end_matches('/');
    let normalized_path = if path.to_ascii_lowercase().ends_with("/models") {
        if path.is_empty() {
            "/models".to_owned()
        } else {
            path.to_owned()
        }
    } else if path.is_empty() {
        "/models".to_owned()
    } else {
        format!("{path}/models")
    };
    url.set_path(&normalized_path);

    let client = Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|_| {
            IpcError::new(
                "MODEL_CLIENT_UNAVAILABLE",
                "The model service is unavailable.",
            )
        })?;
    let mut request = client.get(url).header(ACCEPT, "application/json");
    if !api_key.is_empty() {
        request = request.bearer_auth(api_key);
    }

    let mut response = request.send().await.map_err(|_| {
        IpcError::new(
            "MODEL_FETCH_FAILED",
            "Could not fetch models from the configured endpoint.",
        )
    })?;
    if !response.status().is_success() {
        return Err(IpcError::new(
            "MODEL_FETCH_FAILED",
            "Could not fetch models from the configured endpoint.",
        ));
    }
    if response
        .content_length()
        .is_some_and(|size| size > RESPONSE_LIMIT as u64)
    {
        return Err(IpcError::new(
            "MODEL_RESPONSE_TOO_LARGE",
            "The model response is too large.",
        ));
    }

    let mut body = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| {
        IpcError::new(
            "MODEL_FETCH_FAILED",
            "Could not fetch models from the configured endpoint.",
        )
    })? {
        if body.len().saturating_add(chunk.len()) > RESPONSE_LIMIT {
            return Err(IpcError::new(
                "MODEL_RESPONSE_TOO_LARGE",
                "The model response is too large.",
            ));
        }
        body.extend_from_slice(&chunk);
    }

    let payload: Value = serde_json::from_slice(&body).map_err(|_| {
        IpcError::new(
            "MODEL_FETCH_FAILED",
            "Could not fetch models from the configured endpoint.",
        )
    })?;
    let mut entries: Vec<&Value> = Vec::new();
    match &payload {
        Value::Array(values) => entries.extend(values.iter()),
        Value::Object(object) => {
            if let Some(Value::Array(values)) = object.get("data") {
                entries.extend(values.iter());
            } else if let Some(Value::Array(values)) = object.get("models") {
                entries.extend(values.iter());
            }
        }
        _ => {}
    }

    let mut seen_ids = HashSet::new();
    let mut models = Vec::new();
    for entry in entries {
        if models.len() >= CANDIDATE_LIMIT {
            break;
        }
        let Value::Object(object) = entry else {
            continue;
        };
        let Some(id) = object.get("id").and_then(Value::as_str) else {
            continue;
        };
        let id = id.trim();
        if id.is_empty() || !seen_ids.insert(id.to_owned()) {
            continue;
        }
        let name = object
            .get("name")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|name| !name.is_empty())
            .map(str::to_owned);
        models.push(ModelCandidate {
            id: id.to_owned(),
            name,
        });
    }

    if models.is_empty() {
        return Err(IpcError::new(
            "MODEL_RESPONSE_EMPTY",
            "The API returned no usable models.",
        ));
    }
    Ok(ModelCatalog { models })
}
