use serde::Serialize;

#[derive(Serialize)]
pub(crate) struct FileEntry {
    pub(crate) name: String,
    pub(crate) kind: String,
    pub(crate) size: u64,
}

#[derive(Serialize)]
pub(crate) struct ListWorkspaceEntriesResult {
    pub(crate) entries: Vec<FileEntry>,
}

#[derive(Serialize)]
pub(crate) struct FileReadResult {
    pub(crate) kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) content: Option<String>,
    #[serde(rename = "dataUrl", skip_serializing_if = "Option::is_none")]
    pub(crate) data_url: Option<String>,
    pub(crate) size: u64,
}

#[derive(Serialize)]
pub(crate) struct ReviewLine {
    #[serde(rename = "type")]
    pub(crate) line_type: String,
    pub(crate) text: String,
}

#[derive(Serialize)]
pub(crate) struct ReviewHunk {
    pub(crate) header: String,
    pub(crate) lines: Vec<ReviewLine>,
}

#[derive(Serialize)]
pub(crate) struct ReviewFile {
    pub(crate) path: String,
    #[serde(rename = "oldPath", skip_serializing_if = "Option::is_none")]
    pub(crate) old_path: Option<String>,
    pub(crate) status: String,
    pub(crate) additions: usize,
    pub(crate) deletions: usize,
    pub(crate) binary: bool,
    #[serde(rename = "tooLarge")]
    pub(crate) too_large: bool,
    pub(crate) hunks: Vec<ReviewHunk>,
}

#[derive(Serialize)]
pub(crate) struct WorkspaceReview {
    pub(crate) repo: bool,
    pub(crate) clean: bool,
    #[serde(rename = "stagedFiles")]
    pub(crate) staged_files: Vec<ReviewFile>,
    #[serde(rename = "unstagedFiles")]
    pub(crate) unstaged_files: Vec<ReviewFile>,
    pub(crate) truncated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) error: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct WorkspaceReviewDelta {
    #[serde(rename = "stagedFiles")]
    pub(crate) staged_files: Vec<ReviewFile>,
    #[serde(rename = "unstagedFiles")]
    pub(crate) unstaged_files: Vec<ReviewFile>,
}

#[derive(Serialize)]
pub(crate) struct WorkspaceSearchMatch {
    pub(crate) kind: String,
    pub(crate) path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) line: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) column: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) snippet: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct WorkspaceSearchResult {
    pub(crate) matches: Vec<WorkspaceSearchMatch>,
    pub(crate) truncated: bool,
    #[serde(rename = "scannedFiles")]
    pub(crate) scanned_files: usize,
}

#[derive(Serialize)]
pub(crate) struct RevealWorkspaceFileResult {
    pub(crate) ok: bool,
}

#[derive(Serialize)]
pub(crate) struct ModelCandidate {
    pub(crate) id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) name: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct ModelCatalog {
    pub(crate) models: Vec<ModelCandidate>,
}
