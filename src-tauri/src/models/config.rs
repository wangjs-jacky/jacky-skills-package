use serde::{Deserialize, Serialize};
use super::skill::SourceFolder;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default)]
    pub default_environments: Vec<String>,
    #[serde(default)]
    pub auto_confirm: bool,
    #[serde(default = "default_install_method")]
    pub install_method: InstallMethod,
    #[serde(default)]
    pub auto_launch: bool,
    #[serde(default)]
    pub source_folders: Vec<SourceFolder>,
    #[serde(default)]
    pub enable_watcher: bool,
    #[serde(default = "default_theme")]
    pub theme: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InstallMethod {
    Copy,
    Symlink,
}

fn default_install_method() -> InstallMethod {
    InstallMethod::Copy
}

fn default_theme() -> String {
    "system".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            default_environments: vec!["claude-code".to_string(), "cursor".to_string()],
            auto_confirm: false,
            install_method: InstallMethod::Copy,
            auto_launch: false,
            source_folders: vec![],
            enable_watcher: false,
            theme: "system".to_string(),
        }
    }
}
