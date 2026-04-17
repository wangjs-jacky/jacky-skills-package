use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::{SkillInfo, Result, get_registry_path, ensure_j_skills_dir};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Registry {
    pub skills: HashMap<String, SkillInfo>,
}

impl Registry {
    pub fn load() -> Result<Self> {
        let registry_path = get_registry_path()?;

        if !registry_path.exists() {
            return Ok(Self::default());
        }

        let content = std::fs::read_to_string(&registry_path)?;
        let registry: Registry = serde_json::from_str(&content)?;
        Ok(registry)
    }

    pub fn save(&self) -> Result<()> {
        ensure_j_skills_dir()?;
        let registry_path = get_registry_path()?;
        let content = serde_json::to_string_pretty(self)?;
        let temp_path = registry_path.with_extension("tmp");
        std::fs::write(&temp_path, content)?;
        std::fs::rename(&temp_path, &registry_path)?;
        Ok(())
    }

    pub fn list_skills(&self) -> Vec<SkillInfo> {
        self.skills.values().cloned().collect()
    }

    pub fn get_skill(&self, name: &str) -> Option<SkillInfo> {
        self.skills.get(name).cloned()
    }

    pub fn register(&mut self, skill: SkillInfo) -> Result<()> {
        self.skills.insert(skill.name.clone(), skill);
        self.save()
    }

    pub fn unregister(&mut self, name: &str) -> Result<()> {
        self.skills.remove(name);
        self.save()
    }

    pub fn update_skill_environments(&mut self, name: &str, environments: Vec<String>) -> Result<()> {
        if let Some(skill) = self.skills.get_mut(name) {
            skill.installed_environments = Some(environments);
            self.save()?;
        }
        Ok(())
    }
}
