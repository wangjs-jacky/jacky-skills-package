use serde::{Deserialize, Deserializer, Serialize};
use super::skill::SourceFolder;

/// 自定义反序列化：兼容 "a,b" 字符串和 ["a","b"] 数组两种格式
fn deserialize_string_or_vec<'de, D>(deserializer: D) -> std::result::Result<Vec<String>, D::Error>
where
    D: Deserializer<'de>,
{
    use serde::de;

    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrVec {
        Vec(Vec<String>),
        String(String),
    }

    match StringOrVec::deserialize(deserializer)? {
        StringOrVec::Vec(v) => Ok(v),
        StringOrVec::String(s) => {
            if s.trim().is_empty() {
                return Ok(vec![]);
            }
            Ok(s.split(',')
                .map(|item| item.trim().to_string())
                .filter(|item| !item.is_empty())
                .collect())
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default, deserialize_with = "deserialize_string_or_vec")]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialize_array_format() {
        let json = r#"{"defaultEnvironments": ["claude-code", "cursor"]}"#;
        let config: AppConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.default_environments, vec!["claude-code", "cursor"]);
    }

    #[test]
    fn deserialize_comma_string_format() {
        let json = r#"{"defaultEnvironments": "claude-code,codex"}"#;
        let config: AppConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.default_environments, vec!["claude-code", "codex"]);
    }

    #[test]
    fn deserialize_single_value_string() {
        let json = r#"{"defaultEnvironments": "claude-code"}"#;
        let config: AppConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.default_environments, vec!["claude-code"]);
    }

    #[test]
    fn deserialize_empty_string() {
        let json = r#"{"defaultEnvironments": ""}"#;
        let config: AppConfig = serde_json::from_str(json).unwrap();
        assert!(config.default_environments.is_empty());
    }

    #[test]
    fn deserialize_string_with_spaces() {
        let json = r#"{"defaultEnvironments": "claude-code, cursor , codex"}"#;
        let config: AppConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.default_environments, vec!["claude-code", "cursor", "codex"]);
    }

    #[test]
    fn deserialize_empty_array() {
        let json = r#"{"defaultEnvironments": []}"#;
        let config: AppConfig = serde_json::from_str(json).unwrap();
        assert!(config.default_environments.is_empty());
    }

    #[test]
    fn deserialize_missing_field_uses_default() {
        let json = r#"{}"#;
        let config: AppConfig = serde_json::from_str(json).unwrap();
        assert!(config.default_environments.is_empty());
    }

    #[test]
    fn full_config_backward_compat() {
        // 模拟 CLI 写入的旧格式 config
        let json = r#"{
            "defaultEnvironments": "claude-code,codex",
            "autoConfirm": false,
            "installMethod": "symlink",
            "autoLaunch": false,
            "sourceFolders": [],
            "enableWatcher": false,
            "theme": "dark"
        }"#;
        let config: AppConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.default_environments, vec!["claude-code", "codex"]);
        assert!(matches!(config.install_method, InstallMethod::Symlink));
        assert_eq!(config.theme, "dark");
    }

    #[test]
    fn serialize_always_produces_array() {
        let config = AppConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        // 序列化结果应该是数组格式，不是字符串
        assert!(json.contains(r#""defaultEnvironments":["#));
    }
}
