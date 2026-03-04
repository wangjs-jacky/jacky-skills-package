use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillInfo {
    pub name: String,
    pub path: String,
    pub source: SkillSource,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installed_environments: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SkillSource {
    Linked,
    Global,
    Marketplace,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceFolder {
    pub path: String,
    pub added_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_scanned: Option<String>,
    pub skill_names: Vec<String>,
}
