use chrono::Utc;
use serde::Serialize;
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::State;

use crate::{
    AppConfig, ConfigService, InstallMethod, InstalledVia, Registry, SkillInfo, SkillSource, SourceFolder,
    get_home_dir, get_linked_dir,
    merge_skill_hooks, remove_skill_hooks, has_skill_hooks, has_skill_hooks_in_settings,
};

pub struct AppState {
    pub registry: Arc<Mutex<Registry>>,
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
pub struct ListSkillsResult {
    pub skills: Vec<SkillInfo>,
    pub cleaned_count: u32,
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

/// 从 SKILL.md 的 YAML frontmatter 中提取 description 字段
/// 使用 BufReader 逐行读取，遇到第二个 --- 即停止，不加载整个文件
fn extract_description(skill_path: &Path) -> Option<String> {
    let skill_file = skill_path.join("SKILL.md");
    let file = File::open(&skill_file).ok()?;
    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    // 首行必须是 ---
    let first = lines.next()?.ok()?;
    if first.trim() != "---" {
        return None;
    }
    // 逐行扫描 frontmatter，遇到 --- 结束
    for line in lines {
        let line = line.ok()?;
        if line.trim() == "---" {
            break;
        }
        if let Some(desc) = line.strip_prefix("description:") {
            let desc = desc.trim().trim_matches('"').trim();
            if !desc.is_empty() {
                return Some(desc.to_string());
            }
        }
    }
    None
}

/// 从 SKILL.md 的 YAML frontmatter 中提取 category 字段
fn extract_category(skill_path: &Path) -> Option<String> {
    let skill_file = skill_path.join("SKILL.md");
    let file = File::open(&skill_file).ok()?;
    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    let first = lines.next()?.ok()?;
    if first.trim() != "---" {
        return None;
    }
    for line in lines {
        let line = line.ok()?;
        if line.trim() == "---" {
            break;
        }
        if let Some(cat) = line.strip_prefix("category:") {
            let cat = cat.trim().trim_matches('"').trim();
            if !cat.is_empty() {
                return Some(cat.to_string());
            }
        }
    }
    None
}

/// 解析 skill 路径，支持 ~ 展开为家目录
fn resolve_skill_path(path_str: &str) -> PathBuf {
    if path_str.starts_with("~") {
        if let Ok(home) = get_home_dir() {
            let suffix = path_str.trim_start_matches('~').trim_start_matches('/');
            return home.join(suffix);
        }
    }
    PathBuf::from(path_str)
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
    let mut seen_names = std::collections::HashSet::new();
    let mut stack = vec![root.to_path_buf()];

    while let Some(current) = stack.pop() {
        if !current.is_dir() {
            continue;
        }

        let skill_file = current.join("SKILL.md");
        if skill_file.is_file() {
            if let Some(name) = current.file_name().and_then(|n| n.to_str()) {
                if seen_names.insert(name.to_string()) {
                    results.push(current.clone());
                }
            }
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
            name: "amp".to_string(),
            label: "Amp".to_string(),
            global_path: home.join(".config/agents/skills").to_string_lossy().to_string(),
            project_paths: vec![".agents/skills".to_string()],
        },
        EnvironmentInfo {
            name: "antigravity".to_string(),
            label: "Antigravity".to_string(),
            global_path: home.join(".gemini/antigravity/skills").to_string_lossy().to_string(),
            project_paths: vec![".agent/skills".to_string()],
        },
        EnvironmentInfo {
            name: "augment".to_string(),
            label: "Augment".to_string(),
            global_path: home.join(".augment/skills").to_string_lossy().to_string(),
            project_paths: vec![".augment/skills".to_string()],
        },
        EnvironmentInfo {
            name: "claude-code".to_string(),
            label: "Claude Code".to_string(),
            global_path: home.join(".claude/skills").to_string_lossy().to_string(),
            project_paths: vec![".claude/skills".to_string()],
        },
        EnvironmentInfo {
            name: "openclaw".to_string(),
            label: "OpenClaw".to_string(),
            global_path: home.join(".moltbot/skills").to_string_lossy().to_string(),
            project_paths: vec!["skills".to_string()],
        },
        EnvironmentInfo {
            name: "cline".to_string(),
            label: "Cline".to_string(),
            global_path: home.join(".cline/skills").to_string_lossy().to_string(),
            project_paths: vec![".cline/skills".to_string()],
        },
        EnvironmentInfo {
            name: "codebuddy".to_string(),
            label: "CodeBuddy".to_string(),
            global_path: home.join(".codebuddy/skills").to_string_lossy().to_string(),
            project_paths: vec![".codebuddy/skills".to_string()],
        },
        EnvironmentInfo {
            name: "codex".to_string(),
            label: "Codex".to_string(),
            global_path: home.join(".codex/skills").to_string_lossy().to_string(),
            project_paths: vec![".agents/skills".to_string()],
        },
        EnvironmentInfo {
            name: "command-code".to_string(),
            label: "Command Code".to_string(),
            global_path: home.join(".commandcode/skills").to_string_lossy().to_string(),
            project_paths: vec![".commandcode/skills".to_string()],
        },
        EnvironmentInfo {
            name: "continue".to_string(),
            label: "Continue".to_string(),
            global_path: home.join(".continue/skills").to_string_lossy().to_string(),
            project_paths: vec![".continue/skills".to_string()],
        },
        EnvironmentInfo {
            name: "crush".to_string(),
            label: "Crush".to_string(),
            global_path: home.join(".config/crush/skills").to_string_lossy().to_string(),
            project_paths: vec![".crush/skills".to_string()],
        },
        EnvironmentInfo {
            name: "cursor".to_string(),
            label: "Cursor".to_string(),
            global_path: home.join(".cursor/skills").to_string_lossy().to_string(),
            project_paths: vec![".cursor/skills".to_string()],
        },
        EnvironmentInfo {
            name: "droid".to_string(),
            label: "Droid".to_string(),
            global_path: home.join(".factory/skills").to_string_lossy().to_string(),
            project_paths: vec![".factory/skills".to_string()],
        },
        EnvironmentInfo {
            name: "gemini-cli".to_string(),
            label: "Gemini CLI".to_string(),
            global_path: home.join(".gemini/skills").to_string_lossy().to_string(),
            project_paths: vec![".agents/skills".to_string()],
        },
        EnvironmentInfo {
            name: "github-copilot".to_string(),
            label: "GitHub Copilot".to_string(),
            global_path: home.join(".copilot/skills").to_string_lossy().to_string(),
            project_paths: vec![".agents/skills".to_string()],
        },
        EnvironmentInfo {
            name: "goose".to_string(),
            label: "Goose".to_string(),
            global_path: home.join(".config/goose/skills").to_string_lossy().to_string(),
            project_paths: vec![".goose/skills".to_string()],
        },
        EnvironmentInfo {
            name: "junie".to_string(),
            label: "Junie".to_string(),
            global_path: home.join(".junie/skills").to_string_lossy().to_string(),
            project_paths: vec![".junie/skills".to_string()],
        },
        EnvironmentInfo {
            name: "iflow-cli".to_string(),
            label: "iFlow CLI".to_string(),
            global_path: home.join(".iflow/skills").to_string_lossy().to_string(),
            project_paths: vec![".iflow/skills".to_string()],
        },
        EnvironmentInfo {
            name: "kilo".to_string(),
            label: "Kilo Code".to_string(),
            global_path: home.join(".kilocode/skills").to_string_lossy().to_string(),
            project_paths: vec![".kilocode/skills".to_string()],
        },
        EnvironmentInfo {
            name: "kiro-cli".to_string(),
            label: "Kiro CLI".to_string(),
            global_path: home.join(".kiro/skills").to_string_lossy().to_string(),
            project_paths: vec![".kiro/skills".to_string()],
        },
        EnvironmentInfo {
            name: "kode".to_string(),
            label: "Kode".to_string(),
            global_path: home.join(".kode/skills").to_string_lossy().to_string(),
            project_paths: vec![".kode/skills".to_string()],
        },
        EnvironmentInfo {
            name: "mcpjam".to_string(),
            label: "MCPJam".to_string(),
            global_path: home.join(".mcpjam/skills").to_string_lossy().to_string(),
            project_paths: vec![".mcpjam/skills".to_string()],
        },
        EnvironmentInfo {
            name: "mistral-vibe".to_string(),
            label: "Mistral Vibe".to_string(),
            global_path: home.join(".vibe/skills").to_string_lossy().to_string(),
            project_paths: vec![".vibe/skills".to_string()],
        },
        EnvironmentInfo {
            name: "mux".to_string(),
            label: "Mux".to_string(),
            global_path: home.join(".mux/skills").to_string_lossy().to_string(),
            project_paths: vec![".mux/skills".to_string()],
        },
        EnvironmentInfo {
            name: "opencode".to_string(),
            label: "OpenCode".to_string(),
            global_path: home.join(".config/opencode/skills").to_string_lossy().to_string(),
            project_paths: vec![".agents/skills".to_string()],
        },
        EnvironmentInfo {
            name: "openhands".to_string(),
            label: "OpenHands".to_string(),
            global_path: home.join(".openhands/skills").to_string_lossy().to_string(),
            project_paths: vec![".openhands/skills".to_string()],
        },
        EnvironmentInfo {
            name: "pi".to_string(),
            label: "Pi".to_string(),
            global_path: home.join(".pi/agent/skills").to_string_lossy().to_string(),
            project_paths: vec![".pi/skills".to_string()],
        },
        EnvironmentInfo {
            name: "qoder".to_string(),
            label: "Qoder".to_string(),
            global_path: home.join(".qoder/skills").to_string_lossy().to_string(),
            project_paths: vec![".qoder/skills".to_string()],
        },
        EnvironmentInfo {
            name: "qwen-code".to_string(),
            label: "Qwen Code".to_string(),
            global_path: home.join(".qwen/skills").to_string_lossy().to_string(),
            project_paths: vec![".qwen/skills".to_string()],
        },
        EnvironmentInfo {
            name: "roo".to_string(),
            label: "Roo Code".to_string(),
            global_path: home.join(".roo/skills").to_string_lossy().to_string(),
            project_paths: vec![".roo/skills".to_string()],
        },
        EnvironmentInfo {
            name: "trae".to_string(),
            label: "Trae".to_string(),
            global_path: home.join(".trae/skills").to_string_lossy().to_string(),
            project_paths: vec![".trae/skills".to_string()],
        },
        EnvironmentInfo {
            name: "trae-cn".to_string(),
            label: "Trae CN".to_string(),
            global_path: home.join(".trae-cn/skills").to_string_lossy().to_string(),
            project_paths: vec![".trae/skills".to_string()],
        },
        EnvironmentInfo {
            name: "windsurf".to_string(),
            label: "Windsurf".to_string(),
            global_path: home.join(".codeium/windsurf/skills").to_string_lossy().to_string(),
            project_paths: vec![".windsurf/skills".to_string()],
        },
        EnvironmentInfo {
            name: "zencoder".to_string(),
            label: "Zencoder".to_string(),
            global_path: home.join(".zencoder/skills").to_string_lossy().to_string(),
            project_paths: vec![".zencoder/skills".to_string()],
        },
        EnvironmentInfo {
            name: "neovate".to_string(),
            label: "Neovate".to_string(),
            global_path: home.join(".neovate/skills").to_string_lossy().to_string(),
            project_paths: vec![".neovate/skills".to_string()],
        },
        EnvironmentInfo {
            name: "pochi".to_string(),
            label: "Pochi".to_string(),
            global_path: home.join(".pochi/skills").to_string_lossy().to_string(),
            project_paths: vec![".pochi/skills".to_string()],
        },
        EnvironmentInfo {
            name: "adal".to_string(),
            label: "AdaL".to_string(),
            global_path: home.join(".adal/skills").to_string_lossy().to_string(),
            project_paths: vec![".adal/skills".to_string()],
        },
        EnvironmentInfo {
            name: "kimi-cli".to_string(),
            label: "Kimi Code CLI".to_string(),
            global_path: home.join(".config/agents/skills").to_string_lossy().to_string(),
            project_paths: vec![".agents/skills".to_string()],
        },
        EnvironmentInfo {
            name: "replit".to_string(),
            label: "Replit".to_string(),
            global_path: home.join(".config/agents/skills").to_string_lossy().to_string(),
            project_paths: vec![".agents/skills".to_string()],
        },
    ]
}

pub fn env_path(env: &str) -> Result<(String, PathBuf), String> {
    let home = get_home_dir().map_err(|e| e.to_string())?;
    let envs = env_definitions(&home);
    let found = envs
        .into_iter()
        .find(|item| item.name == env)
        .ok_or_else(|| format!("Unsupported environment: {env}"))?;
    Ok((found.label, PathBuf::from(found.global_path)))
}

#[tauri::command]
pub async fn list_skills(state: State<'_, AppState>) -> Result<ListSkillsResult, String> {
    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    let all_skills = registry.list_skills();

    let mut valid_names = Vec::new();
    let mut cleaned_names = Vec::new();

    for skill in all_skills {
        let path = resolve_skill_path(&skill.path);
        if path.is_dir() {
            valid_names.push(skill.name.clone());
        } else {
            cleaned_names.push(skill.name.clone());
        }
    }

    // 统一清理失效的 skill，避免循环中多次 save()
    for name in &cleaned_names {
        if let Some(skill) = registry.get_skill(name) {
            // 清理：从环境目录删除安装文件
            if let Some(ref envs) = skill.installed_environments {
                for env in envs {
                    if let Ok((_label, env_dir)) = env_path(env) {
                        let target = env_dir.join(&skill.name);
                        let _ = remove_path(&target);
                    }
                }
            }
            // 清理：移除 hooks
            if has_skill_hooks_in_settings(&skill.name) {
                let _ = remove_skill_hooks(&skill.name);
            }
        }
        registry.skills.remove(name);
    }

    let mut changed = !cleaned_names.is_empty();

    // 同步安装状态：扫描各环境目录，更新 installed_environments
    let home = get_home_dir().map_err(|e| e.to_string())?;
    let envs = env_definitions(&home);
    for name in &valid_names {
        let mut actual_envs = Vec::new();
        for env in &envs {
            if Path::new(&env.global_path).join(name).exists() {
                actual_envs.push(env.name.clone());
            }
        }
        if let Some(skill) = registry.skills.get_mut(name) {
            let current = skill.installed_environments.clone().unwrap_or_default();
            if current != actual_envs {
                skill.installed_environments = if actual_envs.is_empty() { None } else { Some(actual_envs) };
                changed = true;
            }
        }
    }

    if changed {
        registry.save().map_err(|e| e.to_string())?;
    }

    // 从 registry 重新读取 valid skills，确保 installed_environments 已同步
    let mut skills = registry
        .list_skills()
        .into_iter()
        .filter(|s| valid_names.contains(&s.name))
        .collect::<Vec<_>>();

    // 补充 description、category 和 marketplace 健康状态
    for skill in &mut skills {
        let path = resolve_skill_path(&skill.path);
        skill.description = extract_description(&path);
        if skill.category.is_none() {
            skill.category = extract_category(&path);
        }

        // marketplace skill 检测原始路径有效性
        if skill.source == SkillSource::Marketplace {
            let origin = skill.origin_path.as_deref().map(PathBuf::from);
            let origin_valid = origin.as_ref().map_or(false, |p| p.is_dir());
            skill.invalid = if origin_valid { None } else { Some(true) };
        }
    }

    Ok(ListSkillsResult {
        skills,
        cleaned_count: cleaned_names.len() as u32,
    })
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
            description: extract_description(dir),
            category: extract_category(dir),
            origin_path: None,
            remote_url: None,
            installed_via: None,
            invalid: None,
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

// ==================== 外部 Skill 管理 ====================

/// 扫描结果中的单个 skill 信息
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedSkillInfo {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub action: String, // "registered" | "updated" | "skipped"
}

/// 扫描结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanAgentsResult {
    pub scanned: u32,
    pub registered: u32,
    pub skipped: u32,
    pub skills: Vec<ScannedSkillInfo>,
}

/// 扫描 .agents/skills/ 目录，注册外部 skill
#[tauri::command]
pub async fn scan_agents_directory(
    force: Option<bool>,
    state: State<'_, AppState>,
) -> Result<ScanAgentsResult, String> {
    // .agents/skills/ 固定在用户主目录下
    let home = get_home_dir().map_err(|e| e.to_string())?;
    let agents_path = home.join(".agents").join("skills");
    log::info!("scan_agents_directory: agents_path={:?}", agents_path);
    let force = force.unwrap_or(false);

    let mut result = ScanAgentsResult {
        scanned: 0,
        registered: 0,
        skipped: 0,
        skills: Vec::new(),
    };

    if !agents_path.is_dir() {
        return Ok(result);
    }

    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;

    let entries = fs::read_dir(&agents_path).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        // 检查是否包含 SKILL.md
        if !path.join("SKILL.md").is_file() && !path.join("skill.md").is_file() {
            continue;
        }

        result.scanned += 1;

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid skill name".to_string())?
            .to_string();

        let description = extract_description(&path);
        let category = extract_category(&path);

        // 去重：linked skill 不覆盖
        if let Some(existing) = registry.get_skill(&name) {
            if existing.source == SkillSource::Linked {
                result.skipped += 1;
                result.skills.push(ScannedSkillInfo {
                    name,
                    path: path.to_string_lossy().to_string(),
                    description,
                    category,
                    action: "skipped-linked".to_string(),
                });
                continue;
            }

            if !force {
                result.skipped += 1;
                result.skills.push(ScannedSkillInfo {
                    name,
                    path: path.to_string_lossy().to_string(),
                    description,
                    category,
                    action: "skipped-duplicate".to_string(),
                });
                continue;
            }
        }

        // 注册
        let skill_info = SkillInfo {
            name: name.clone(),
            path: path.to_string_lossy().to_string(),
            source: SkillSource::Marketplace,
            installed_environments: registry.get_skill(&name).and_then(|s| s.installed_environments),
            installed_at: Some(Utc::now().to_rfc3339()),
            description: description.clone(),
            category: category.clone(),
            origin_path: Some(path.to_string_lossy().to_string()),
            remote_url: None,
            installed_via: Some(InstalledVia::Scan),
            invalid: None,
        };
        registry.register(skill_info).map_err(|e| e.to_string())?;

        result.registered += 1;
        result.skills.push(ScannedSkillInfo {
            name,
            path: path.to_string_lossy().to_string(),
            description,
            category,
            action: "registered".to_string(),
        });
    }

    Ok(result)
}

/// 移除外部 skill（仅取消管理，不删源文件）
#[tauri::command]
pub async fn remove_external_skill(
    name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    let skill = registry
        .get_skill(&name)
        .ok_or_else(|| format!("Skill '{}' not found", name))?;

    if skill.source != SkillSource::Marketplace {
        return Err(format!("Skill '{}' is not an external skill", name));
    }

    // 从所有已安装环境卸载
    if let Some(ref envs) = skill.installed_environments {
        for env in envs {
            if let Ok((_label, env_dir)) = env_path(env) {
                let target = env_dir.join(&name);
                let _ = remove_path(&target);
            }
        }
    }

    // 移除 hooks
    if has_skill_hooks_in_settings(&name) {
        let _ = remove_skill_hooks(&name);
    }

    // 从 registry 注销（不删原始文件）
    registry.unregister(&name).map_err(|e| e.to_string())?;

    Ok(())
}
