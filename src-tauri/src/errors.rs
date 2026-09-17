use serde::Serialize;

#[derive(Debug, Serialize)]
pub(crate) struct IpcError {
    pub(crate) code: &'static str,
    pub(crate) message: String,
}

impl IpcError {
    pub(crate) fn new(code: &'static str, message: &'static str) -> Self {
        Self {
            code,
            message: message.to_owned(),
        }
    }

    pub(crate) fn from_message(code: &'static str, message: String) -> Self {
        Self { code, message }
    }
}
