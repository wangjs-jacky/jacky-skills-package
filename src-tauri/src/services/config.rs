use crate::{AppConfig, Result, get_config_path, ensure_j_skills_dir};

pub struct ConfigService;

impl ConfigService {
    pub fn load() -> Result<AppConfig> {
        let config_path = get_config_path()?;

        if !config_path.exists() {
            return Ok(AppConfig::default());
        }

        let content = std::fs::read_to_string(&config_path)?;
        let config: AppConfig = serde_json::from_str(&content)?;
        Ok(config)
    }

    pub fn save(config: &AppConfig) -> Result<()> {
        ensure_j_skills_dir()?;
        let config_path = get_config_path()?;
        let content = serde_json::to_string_pretty(config)?;
        std::fs::write(&config_path, content)?;
        Ok(())
    }

    pub fn update<F>(updater: F) -> Result<AppConfig>
    where
        F: FnOnce(&mut AppConfig),
    {
        let mut config = Self::load()?;
        updater(&mut config);
        Self::save(&config)?;
        Ok(config)
    }
}
