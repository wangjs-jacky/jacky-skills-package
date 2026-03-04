use tauri::State;
use std::sync::Mutex;
use crate::{SkillInfo, Registry, get_linked_dir, SkillSource};

pub struct AppState {
    pub registry: Mutex<Registry>,
}

#[tauri::command]
pub async fn list_skills(state: State<'_, AppState>) -> Result<Vec<SkillInfo>, String> {
    let registry = state.registry.lock().map_err(|e| e.to_string())?;
    Ok(registry.list_skills())
}

#[tauri::command]
pub async fn get_skill(name: String, state: State<'_, AppState>) -> Result<SkillInfo, String> {
    let registry = state.registry.lock().map_err(|e| e.to_string())?;
    registry.get_skill(&name)
        .ok_or_else(|| format!("Skill '{}' not found", name))
}

#[tauri::command]
pub async fn link_skill(path: String, state: State<'_, AppState>) -> Result<Vec<String>, String> {
    use std::path::Path;
    use std::fs;

    let skill_path = Path::new(&path);
    if !skill_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let linked_dir = get_linked_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&linked_dir).map_err(|e| e.to_string())?;

    let skill_name = skill_path.file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid skill name".to_string())?;

    let link_path = linked_dir.join(skill_name);

    // Remove existing link if present
    if link_path.exists() || link_path.is_symlink() {
        fs::remove_file(&link_path).or_else(|_| fs::remove_dir_all(&link_path))
            .map_err(|e| e.to_string())?;
    }

    // Create symlink
    #[cfg(unix)]
    std::os::unix::fs::symlink(skill_path, &link_path).map_err(|e| e.to_string())?;

    #[cfg(windows)]
    std::os::windows::fs::symlink_dir(skill_path, &link_path).map_err(|e| e.to_string())?;

    // Register skill
    let skill_info = SkillInfo {
        name: skill_name.to_string(),
        path: path.clone(),
        source: SkillSource::Linked,
        installed_environments: None,
        installed_at: None,
    };

    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    registry.register(skill_info).map_err(|e| e.to_string())?;

    Ok(vec![skill_name.to_string()])
}

#[tauri::command]
pub async fn unlink_skill(name: String, state: State<'_, AppState>) -> Result<(), String> {
    use std::fs;

    let linked_dir = get_linked_dir().map_err(|e| e.to_string())?;
    let link_path = linked_dir.join(&name);

    if link_path.exists() || link_path.is_symlink() {
        fs::remove_file(&link_path).or_else(|_| fs::remove_dir_all(&link_path))
            .map_err(|e| e.to_string())?;
    }

    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    registry.unregister(&name).map_err(|e| e.to_string())?;

    Ok(())
}
