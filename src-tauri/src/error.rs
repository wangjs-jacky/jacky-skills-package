use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Skill not found: {0}")]
    SkillNotFound(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Registry error: {0}")]
    Registry(String),

    #[error("Config error: {0}")]
    Config(String),

    #[error("Environment not found: {0}")]
    EnvironmentNotFound(String),
}

impl From<AppError> for String {
    fn from(error: AppError) -> String {
        error.to_string()
    }
}

impl From<AppError> for tauri::ipc::InvokeError {
    fn from(error: AppError) -> Self {
        tauri::ipc::InvokeError::from(error.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
