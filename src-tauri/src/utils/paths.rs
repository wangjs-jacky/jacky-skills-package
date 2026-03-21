use std::path::PathBuf;
use crate::Result;

pub fn get_home_dir() -> Result<PathBuf> {
    dirs::home_dir()
        .ok_or_else(|| crate::AppError::InvalidPath("Cannot determine home directory".to_string()))
}

pub fn get_j_skills_dir() -> Result<PathBuf> {
    let home = get_home_dir()?;
    Ok(home.join(".j-skills"))
}

pub fn get_linked_dir() -> Result<PathBuf> {
    let base = get_j_skills_dir()?;
    Ok(base.join("linked"))
}

pub fn get_registry_path() -> Result<PathBuf> {
    let base = get_j_skills_dir()?;
    Ok(base.join("registry.json"))
}

pub fn get_config_path() -> Result<PathBuf> {
    let base = get_j_skills_dir()?;
    Ok(base.join("config.json"))
}

pub fn get_global_skills_dir() -> Result<PathBuf> {
    let base = get_j_skills_dir()?;
    Ok(base.join("global"))
}

pub fn ensure_j_skills_dir() -> Result<()> {
    let dir = get_j_skills_dir()?;
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(())
}

pub fn ensure_linked_dir() -> Result<()> {
    ensure_j_skills_dir()?;
    let dir = get_linked_dir()?;
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(())
}

/// 获取 Claude Code settings.json 路径
pub fn get_claude_settings_path() -> Result<PathBuf> {
    let home = get_home_dir()?;
    Ok(home.join(".claude").join("settings.json"))
}
