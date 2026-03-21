use chrono::Utc;
use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

use crate::{
    AppConfig, ConfigService, InstallMethod, Registry, SkillInfo, SkillSource, SourceFolder,
    get_home_dir, get_linked_dir,
    merge_skill_hooks, remove_skill_hooks, has_skill_hooks, has_skill_hooks_in_settings,
};

pub struct AppState {
    pub registry: Mutex<Registry>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub name: String,
    #[serde(rename = "type")]
    pub file_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub name: String,
    pub env: String,
    pub path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallResult {
    pub name: String,
    pub env: String,
    pub removed: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub exported: Vec<String>,
    pub errors: Vec<String>,
    pub target_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentInfo {
    pub name: String,
    pub label: String,
    pub global_path: String,
    pub project_paths: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentStatus {
    pub name: String,
    pub label: String,
    pub global_exists: bool,
}

fn remove_path(path: &Path) -> std::io::Result<()> {
    if !path.exists() && !path.is_symlink() {
        return Ok(());
    }

    if path.is_dir() && !path.is_symlink() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    }
}

fn create_symlink_dir(src: &Path, dst: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(src, dst).map_err(|e| e.to_string())
    }
    #[cfg(windows)]
    {
        std::os::windows::fs::symlink_dir(src, dst).map_err(|e| e.to_string())
    }
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    if !dst.exists() {
        fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    }

    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ty = entry.file_type().map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if ty.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn find_skill_dirs(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut results = Vec::new();
    let mut stack = vec![root.to_path_buf()];

    while let Some(current) = stack.pop() {
        if !current.is_dir() {
            continue;
        }

        let skill_file = current.join("SKILL.md");
        if skill_file.is_file() {
            results.push(current.clone());
            continue;
        }

        for entry in fs::read_dir(&current).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            }
        }
    }

    Ok(results)
}

fn expand_tilde(path: &str) -> Result<PathBuf, String> {
    if path == "~" || path.starts_with("~/") {
        let home = get_home_dir().map_err(|e| e.to_string())?;
        let suffix = path.trim_start_matches('~').trim_start_matches('/');
        return Ok(home.join(suffix));
    }
    Ok(PathBuf::from(path))
}

fn env_definitions(home: &Path) -> Vec<EnvironmentInfo> {
    vec![
        EnvironmentInfo {
            name: "claude-code".to_string(),
            label: "Claude Code".to_string(),
            global_path: home.join(".claude/skills").to_string_lossy().to_string(),
            project_paths: vec![".claude/skills".to_string()],
        },
        EnvironmentInfo {
            name: "cursor".to_string(),
            label: "Cursor".to_string(),
            global_path: home.join(".cursor/skills").to_string_lossy().to_string(),
            project_paths: vec![".cursor/skills".to_string()],
        },
        EnvironmentInfo {
            name: "windsurf".to_string(),
            label: "Windsurf".to_string(),
            global_path: home
                .join(".codeium/windsurf/skills")
                .to_string_lossy()
                .to_string(),
            project_paths: vec![".windsurf/skills".to_string()],
        },
        EnvironmentInfo {
            name: "cline".to_string(),
            label: "Cline".to_string(),
            global_path: home.join(".cline/skills").to_string_lossy().to_string(),
            project_paths: vec![".cline/skills".to_string()],
        },
        EnvironmentInfo {
            name: "aider".to_string(),
            label: "Aider".to_string(),
            global_path: home.join(".aider/skills").to_string_lossy().to_string(),
            project_paths: vec![".aider/skills".to_string()],
        },
        EnvironmentInfo {
            name: "copilot".to_string(),
            label: "GitHub Copilot".to_string(),
            global_path: home.join(".copilot/skills").to_string_lossy().to_string(),
            project_paths: vec![".copilot/skills".to_string()],
        },
    ]
}

fn env_path(env: &str) -> Result<(String, PathBuf), String> {
    let home = get_home_dir().map_err(|e| e.to_string())?;
    let envs = env_definitions(&home);
    let found = envs
        .into_iter()
        .find(|item| item.name == env)
        .ok_or_else(|| format!("Unsupported environment: {env}"))?;
    Ok((found.label, PathBuf::from(found.global_path)))
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
    let skill_path = Path::new(&path);
    if !skill_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let linked_dir = get_linked_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&linked_dir).map_err(|e| e.to_string())?;

    let mut skill_dirs = if skill_path.is_dir() {
        find_skill_dirs(skill_path)?
    } else {
        Vec::new()
    };
    if skill_dirs.is_empty() && skill_path.is_file() && skill_path.file_name().and_then(|n| n.to_str()) == Some("SKILL.md")
    {
        let parent = skill_path
            .parent()
            .ok_or_else(|| "Invalid skill file path".to_string())?;
        skill_dirs.push(parent.to_path_buf());
    }

    if skill_dirs.is_empty() {
        return Err("No SKILL.md found under provided path".to_string());
    }

    let mut linked_names = Vec::new();
    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;

    for dir in &skill_dirs {
        let skill_name = dir
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid skill name".to_string())?
            .to_string();
        let link_path = linked_dir.join(&skill_name);

        remove_path(&link_path).map_err(|e| e.to_string())?;
        create_symlink_dir(dir, &link_path)?;

        let existing = registry.get_skill(&skill_name);
        let skill_info = SkillInfo {
            name: skill_name.clone(),
            path: dir.to_string_lossy().to_string(),
            source: SkillSource::Linked,
            installed_environments: existing.and_then(|s| s.installed_environments),
            installed_at: Some(Utc::now().to_rfc3339()),
        };
        registry.register(skill_info).map_err(|e| e.to_string())?;
        linked_names.push(skill_name);
    }

    let source_path = skill_path.to_string_lossy().to_string();
    let now = Utc::now().to_rfc3339();
    ConfigService::update(|cfg: &mut AppConfig| {
        let new_record = SourceFolder {
            path: source_path.clone(),
            added_at: now.clone(),
            last_scanned: Some(now.clone()),
            skill_names: linked_names.clone(),
        };

        if let Some(existing) = cfg.source_folders.iter_mut().find(|item| item.path == source_path) {
            existing.last_scanned = new_record.last_scanned.clone();
            existing.skill_names = new_record.skill_names.clone();
            if existing.added_at.is_empty() {
                existing.added_at = now.clone();
            }
        } else {
            cfg.source_folders.push(new_record);
        }
    })
    .map_err(|e| e.to_string())?;

    Ok(linked_names)
}

#[tauri::command]
pub async fn unlink_skill(name: String, state: State<'_, AppState>) -> Result<(), String> {
    let linked_dir = get_linked_dir().map_err(|e| e.to_string())?;
    let link_path = linked_dir.join(&name);

    remove_path(&link_path).map_err(|e| e.to_string())?;

    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    registry.unregister(&name).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_skill_files(name: String, state: State<'_, AppState>) -> Result<Vec<FileInfo>, String> {
    let registry = state.registry.lock().map_err(|e| e.to_string())?;
    let skill = registry
        .get_skill(&name)
        .ok_or_else(|| format!("Skill '{name}' not found"))?;

    let root = Path::new(&skill.path);
    if !root.is_dir() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    for entry in fs::read_dir(root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            file_type: if metadata.is_dir() {
                "directory".to_string()
            } else {
                "file".to_string()
            },
        });
    }

    files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(files)
}

#[tauri::command]
pub async fn get_skill_file_content(
    name: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<FileContent, String> {
    if path.contains("..") {
        return Err("Path traversal is not allowed".to_string());
    }

    let registry = state.registry.lock().map_err(|e| e.to_string())?;
    let skill = registry
        .get_skill(&name)
        .ok_or_else(|| format!("Skill '{name}' not found"))?;
    let target = Path::new(&skill.path).join(&path);
    let content = fs::read_to_string(&target).map_err(|e| e.to_string())?;

    Ok(FileContent { path, content })
}

#[tauri::command]
pub async fn list_source_folders() -> Result<Vec<SourceFolder>, String> {
    let config = ConfigService::load().map_err(|e| e.to_string())?;
    Ok(config.source_folders)
}

#[tauri::command]
pub async fn remove_source_folder(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut removed_skill_names = Vec::new();
    ConfigService::update(|cfg: &mut AppConfig| {
        if let Some(index) = cfg.source_folders.iter().position(|item| item.path == path) {
            removed_skill_names = cfg.source_folders[index].skill_names.clone();
            cfg.source_folders.remove(index);
        }
    })
    .map_err(|e| e.to_string())?;

    if removed_skill_names.is_empty() {
        return Ok(());
    }

    let linked_dir = get_linked_dir().map_err(|e| e.to_string())?;
    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    for skill_name in removed_skill_names {
        let link_path = linked_dir.join(&skill_name);
        let _ = remove_path(&link_path);
        let _ = registry.unregister(&skill_name);
    }

    Ok(())
}

#[tauri::command]
pub async fn install_skill(
    name: String,
    env: String,
    _global: bool,
    state: State<'_, AppState>,
) -> Result<InstallResult, String> {
    let (_label, env_dir) = env_path(&env)?;
    fs::create_dir_all(&env_dir).map_err(|e| e.to_string())?;

    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    let skill = registry
        .get_skill(&name)
        .ok_or_else(|| format!("Skill '{name}' not found"))?;

    let src = Path::new(&skill.path);
    if !src.is_dir() {
        return Err(format!("Skill path is not a directory: {}", skill.path));
    }

    let target = env_dir.join(&name);
    remove_path(&target).map_err(|e| e.to_string())?;

    let config = ConfigService::load().map_err(|e| e.to_string())?;
    match config.install_method {
        InstallMethod::Symlink => create_symlink_dir(src, &target)?,
        InstallMethod::Copy => copy_dir_all(src, &target)?,
    }

    let mut envs: HashSet<String> = skill
        .installed_environments
        .unwrap_or_default()
        .into_iter()
        .collect();
    envs.insert(env.clone());
    registry
        .update_skill_environments(&name, envs.into_iter().collect())
        .map_err(|e| e.to_string())?;

    // 处理 hooks（仅在安装到 claude-code 时）
    if env == "claude-code" {
        let skill_path = Path::new(&skill.path);
        if has_skill_hooks(skill_path) {
            let _ = merge_skill_hooks(skill_path, &name);
        }
    }

    Ok(InstallResult {
        name,
        env,
        path: target.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn uninstall_skill(
    name: String,
    env: String,
    _global: bool,
    state: State<'_, AppState>,
) -> Result<UninstallResult, String> {
    let (_label, env_dir) = env_path(&env)?;
    let target = env_dir.join(&name);
    let existed = target.exists() || target.is_symlink();

    if existed {
        remove_path(&target).map_err(|e| e.to_string())?;
    }

    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    if let Some(skill) = registry.get_skill(&name) {
        let envs = skill
            .installed_environments
            .unwrap_or_default()
            .into_iter()
            .filter(|item| item != &env)
            .collect::<Vec<_>>();
        registry
            .update_skill_environments(&name, envs)
            .map_err(|e| e.to_string())?;
    }

    // 移除 hooks（仅在从 claude-code 卸载时）
    if env == "claude-code" && has_skill_hooks_in_settings(&name) {
        let _ = remove_skill_hooks(&name);
    }

    Ok(UninstallResult {
        name,
        env,
        removed: existed,
    })
}

#[tauri::command]
pub async fn export_skills(
    skill_names: Vec<String>,
    target_path: String,
    state: State<'_, AppState>,
) -> Result<ExportResult, String> {
    let target = expand_tilde(&target_path)?;
    fs::create_dir_all(&target).map_err(|e| e.to_string())?;

    let registry = state.registry.lock().map_err(|e| e.to_string())?;
    let mut exported = Vec::new();
    let mut errors = Vec::new();

    for skill_name in skill_names {
        match registry.get_skill(&skill_name) {
            Some(skill) => {
                let src = Path::new(&skill.path);
                let dst = target.join(&skill_name);
                let result = remove_path(&dst).and_then(|_| {
                    copy_dir_all(src, &dst).map_err(std::io::Error::other)
                });

                match result {
                    Ok(()) => exported.push(skill_name),
                    Err(e) => errors.push(format!("Failed to export {}: {}", skill.name, e)),
                }
            }
            None => errors.push(format!("Skill not found: {skill_name}")),
        }
    }

    Ok(ExportResult {
        exported,
        errors,
        target_path: target.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn list_environments() -> Result<Vec<EnvironmentInfo>, String> {
    let home = get_home_dir().map_err(|e| e.to_string())?;
    Ok(env_definitions(&home))
}

#[tauri::command]
pub async fn environment_status() -> Result<Vec<EnvironmentStatus>, String> {
    let home = get_home_dir().map_err(|e| e.to_string())?;
    let envs = env_definitions(&home);
    Ok(envs
        .into_iter()
        .map(|env| EnvironmentStatus {
            name: env.name,
            label: env.label,
            global_exists: Path::new(&env.global_path).exists(),
        })
        .collect())
}
