use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

use crate::{AppState, Registry, InstallMethod, ConfigService, get_j_skills_dir};
use crate::{merge_skill_hooks, has_skill_hooks, has_skill_hooks_in_settings, remove_skill_hooks};

use super::skills::env_path;

// ── 类型定义 ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSkills {
    pub include: Vec<String>,
    pub exclude: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileMetadata {
    pub author: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub workflow: String,
    pub skills: ProfileSkills,
    pub metadata: Option<ProfileMetadata>,
}

/// 前端展示用的 Profile 摘要
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInfo {
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub workflow: String,
    pub skills: ProfileSkills,
    pub is_active: bool,
    pub skill_count: usize,
    pub metadata: Option<ProfileMetadata>,
}

/// 活跃 Profile 引用
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveProfileRef {
    pub name: String,
    pub scope: String,
    pub activated_at: String,
}

/// 冲突组
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictGroup {
    pub category: String,
    pub skills: Vec<String>,
}

/// 安装结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallProfileResult {
    pub installed: Vec<String>,
    pub skipped: Vec<SkippedSkill>,
    pub conflicts: Vec<ConflictGroup>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedSkill {
    pub name: String,
    pub reason: String,
}

// ── 路径辅助 ──────────────────────────────────────────────

fn get_profiles_dir() -> Result<PathBuf, String> {
    let base = get_j_skills_dir().map_err(|e| e.to_string())?;
    Ok(base.join("profiles"))
}

fn get_profile_path(name: &str) -> Result<PathBuf, String> {
    let dir = get_profiles_dir()?;
    Ok(dir.join(format!("{}.json", name)))
}

fn get_active_profile_path() -> Result<PathBuf, String> {
    let base = get_j_skills_dir().map_err(|e| e.to_string())?;
    Ok(base.join("active-profile.json"))
}

fn ensure_profiles_dir() -> Result<(), String> {
    let dir = get_profiles_dir()?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Profile 读写 ──────────────────────────────────────────

fn read_profile(name: &str) -> Result<Profile, String> {
    let path = get_profile_path(name)?;
    if !path.exists() {
        return Err(format!("Profile '{}' not found", name));
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let profile: Profile = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(profile)
}

fn write_profile(profile: &Profile) -> Result<(), String> {
    ensure_profiles_dir()?;
    let path = get_profile_path(&profile.name)?;
    let content = serde_json::to_string_pretty(profile).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

fn read_active_profile_ref() -> Result<Option<ActiveProfileRef>, String> {
    let path = get_active_profile_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let reff: ActiveProfileRef = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(Some(reff))
}

fn write_active_profile_ref(reff: &ActiveProfileRef) -> Result<(), String> {
    let path = get_active_profile_path()?;
    let content = serde_json::to_string_pretty(reff).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// 将 Profile 转为前端展示的 ProfileInfo
fn to_profile_info(profile: &Profile, is_active: bool) -> ProfileInfo {
    ProfileInfo {
        name: profile.name.clone(),
        description: profile.description.clone(),
        version: profile.version.clone(),
        workflow: profile.workflow.clone(),
        skills: profile.skills.clone(),
        is_active,
        skill_count: profile.skills.include.len(),
        metadata: profile.metadata.clone(),
    }
}

/// 从 registry 获取 skill 的 category
fn get_skill_category(name: &str, registry: &Registry) -> Option<String> {
    registry.get_skill(name).and_then(|s| s.category.clone())
}

// ── Tauri 命令 ────────────────────────────────────────────

#[tauri::command]
pub async fn list_profiles(_state: State<'_, AppState>) -> Result<Vec<ProfileInfo>, String> {
    let profiles_dir = get_profiles_dir()?;
    if !profiles_dir.exists() {
        return Ok(Vec::new());
    }

    let active_name = read_active_profile_ref()?
        .map(|r| r.name);

    let mut result = Vec::new();
    let entries = fs::read_dir(&profiles_dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        match serde_json::from_str::<Profile>(&content) {
            Ok(profile) => {
                let is_active = active_name.as_ref() == Some(&profile.name);
                result.push(to_profile_info(&profile, is_active));
            }
            Err(e) => {
                log::warn!("跳过无效 profile 文件 {:?}: {}", path, e);
            }
        }
    }

    // 活跃的排前面
    result.sort_by(|a, b| {
        b.is_active.cmp(&a.is_active)
            .then(a.name.cmp(&b.name))
    });

    Ok(result)
}

#[tauri::command]
pub async fn get_profile(name: String) -> Result<ProfileInfo, String> {
    let profile = read_profile(&name)?;
    let active_name = read_active_profile_ref()?
        .map(|r| r.name);
    let is_active = active_name.as_ref() == Some(&name);
    Ok(to_profile_info(&profile, is_active))
}

#[tauri::command]
pub async fn create_profile(
    name: String,
    description: Option<String>,
    workflow: Option<String>,
) -> Result<ProfileInfo, String> {
    let path = get_profile_path(&name)?;
    if path.exists() {
        return Err(format!("Profile '{}' already exists", name));
    }

    ensure_profiles_dir()?;

    let now = Utc::now().to_rfc3339();
    let profile = Profile {
        name: name.clone(),
        description,
        version: "1.0.0".to_string(),
        workflow: workflow.unwrap_or_else(|| "superpowers".to_string()),
        skills: ProfileSkills {
            include: Vec::new(),
            exclude: None,
        },
        metadata: Some(ProfileMetadata {
            author: None,
            tags: None,
            created_at: Some(now),
            updated_at: None,
        }),
    };

    write_profile(&profile)?;
    Ok(to_profile_info(&profile, false))
}

#[tauri::command]
pub async fn rename_profile(
    name: String,
    new_name: String,
) -> Result<ProfileInfo, String> {
    if new_name.trim().is_empty() {
        return Err("New name cannot be empty".to_string());
    }

    let old_path = get_profile_path(&name)?;
    if !old_path.exists() {
        return Err(format!("Profile '{}' not found", name));
    }

    let new_path = get_profile_path(&new_name)?;
    if new_path.exists() {
        return Err(format!("Profile '{}' already exists", new_name));
    }

    // 读取、修改 name、写入新文件
    let mut profile = read_profile(&name)?;
    profile.name = new_name.clone();
    let content = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
    fs::write(&new_path, content).map_err(|e| e.to_string())?;

    // 删除旧文件
    fs::remove_file(&old_path).map_err(|e| e.to_string())?;

    // 如果是活跃 profile，更新引用
    let active = read_active_profile_ref()?;
    if let Some(reff) = active {
        if reff.name == name {
            let new_ref = ActiveProfileRef {
                name: new_name.clone(),
                scope: reff.scope,
                activated_at: reff.activated_at,
            };
            write_active_profile_ref(&new_ref)?;
        }
    }

    let is_active = read_active_profile_ref()?
        .map(|r| r.name == new_name)
        .unwrap_or(false);
    Ok(to_profile_info(&profile, is_active))
}

#[tauri::command]
pub async fn update_profile(
    name: String,
    description: Option<String>,
    workflow: Option<String>,
    skills: Option<ProfileSkills>,
) -> Result<ProfileInfo, String> {
    let mut profile = read_profile(&name)?;

    if let Some(desc) = description {
        profile.description = Some(desc);
    }
    if let Some(wf) = workflow {
        profile.workflow = wf;
    }
    if let Some(s) = skills {
        profile.skills = s;
    }

    // 更新 updatedAt
    if let Some(ref mut meta) = profile.metadata {
        meta.updated_at = Some(Utc::now().to_rfc3339());
    } else {
        profile.metadata = Some(ProfileMetadata {
            author: None,
            tags: None,
            created_at: None,
            updated_at: Some(Utc::now().to_rfc3339()),
        });
    }

    write_profile(&profile)?;

    let active_name = read_active_profile_ref()?
        .map(|r| r.name);
    let is_active = active_name.as_ref() == Some(&name);
    Ok(to_profile_info(&profile, is_active))
}

#[tauri::command]
pub async fn delete_profile(name: String) -> Result<String, String> {
    if name == "default" {
        return Err("Cannot delete default profile".to_string());
    }

    let path = get_profile_path(&name)?;
    if !path.exists() {
        return Err(format!("Profile '{}' not found", name));
    }

    fs::remove_file(&path).map_err(|e| e.to_string())?;

    // 如果是活跃 profile，清除活跃状态
    let active = read_active_profile_ref()?;
    if let Some(reff) = active {
        if reff.name == name {
            let active_path = get_active_profile_path()?;
            let _ = fs::remove_file(&active_path);
        }
    }

    Ok(name)
}

#[tauri::command]
pub async fn set_active_profile(name: String) -> Result<ActiveProfileRef, String> {
    // 先确认 profile 存在
    let _profile = read_profile(&name)?;

    let reff = ActiveProfileRef {
        name: name.clone(),
        scope: "global".to_string(),
        activated_at: Utc::now().to_rfc3339(),
    };

    write_active_profile_ref(&reff)?;
    Ok(reff)
}

#[tauri::command]
pub async fn get_active_profile() -> Result<Option<ActiveProfileRef>, String> {
    read_active_profile_ref()
}

#[tauri::command]
pub async fn add_skill_to_profile(
    profile: String,
    skill: String,
) -> Result<ProfileInfo, String> {
    let mut prof = read_profile(&profile)?;

    if prof.skills.include.contains(&skill) {
        return Err(format!("Skill '{}' already in profile '{}'", skill, profile));
    }

    prof.skills.include.push(skill);

    // 更新 updatedAt
    if let Some(ref mut meta) = prof.metadata {
        meta.updated_at = Some(Utc::now().to_rfc3339());
    }

    write_profile(&prof)?;

    let active_name = read_active_profile_ref()?
        .map(|r| r.name);
    let is_active = active_name.as_ref() == Some(&profile);
    Ok(to_profile_info(&prof, is_active))
}

#[tauri::command]
pub async fn remove_skill_from_profile(
    profile: String,
    skill: String,
) -> Result<ProfileInfo, String> {
    let mut prof = read_profile(&profile)?;

    prof.skills.include.retain(|s| s != &skill);
    if let Some(ref mut exclude) = prof.skills.exclude {
        exclude.retain(|s| s != &skill);
    }

    // 更新 updatedAt
    if let Some(ref mut meta) = prof.metadata {
        meta.updated_at = Some(Utc::now().to_rfc3339());
    }

    write_profile(&prof)?;

    let active_name = read_active_profile_ref()?
        .map(|r| r.name);
    let is_active = active_name.as_ref() == Some(&profile);
    Ok(to_profile_info(&prof, is_active))
}

#[tauri::command]
pub async fn install_profile(
    name: String,
    env: String,
    _global: Option<bool>,
    conflict_resolution: Option<HashMap<String, String>>,
    state: State<'_, AppState>,
) -> Result<InstallProfileResult, String> {
    let profile = read_profile(&name)?;
    let registry = state.registry.lock().map_err(|e| e.to_string())?;

    // 收集 category 信息
    let mut category_map: HashMap<String, Vec<String>> = HashMap::new();
    for skill_name in &profile.skills.include {
        if let Some(cat) = get_skill_category(skill_name, &registry) {
            category_map.entry(cat).or_default().push(skill_name.clone());
        }
    }

    // 检测冲突：同 category 下多个 skill
    let conflicts: Vec<ConflictGroup> = category_map
        .iter()
        .filter(|(_, skills)| skills.len() > 1)
        .map(|(cat, skills)| ConflictGroup {
            category: cat.clone(),
            skills: skills.clone(),
        })
        .collect();

    // 决定每个冲突组中保留哪个
    let resolved: HashMap<String, String> = conflict_resolution.unwrap_or_default();

    // 确定要跳过的 skill
    let mut skip_set = HashSet::new();
    for group in &conflicts {
        if let Some(keep) = resolved.get(&group.category) {
            for skill in &group.skills {
                if skill != keep {
                    skip_set.insert(skill.clone());
                }
            }
        } else {
            // 没有指定解决方案，全部跳过
            for skill in &group.skills {
                skip_set.insert(skill.clone());
            }
        }
    }

    // 释放锁，后续逐个安装时会重新获取
    drop(registry);

    let (_label, env_dir) = env_path(&env)?;
    let config = ConfigService::load().map_err(|e| e.to_string())?;

    let mut installed = Vec::new();
    let mut skipped = Vec::new();

    for skill_name in &profile.skills.include {
        if skip_set.contains(skill_name) {
            skipped.push(SkippedSkill {
                name: skill_name.clone(),
                reason: "conflict".to_string(),
            });
            continue;
        }

        // 获取 skill 信息并执行安装
        let install_result = {
            let mut reg = state.registry.lock().map_err(|e| e.to_string())?;
            let skill = match reg.get_skill(skill_name) {
                Some(s) => s,
                None => {
                    skipped.push(SkippedSkill {
                        name: skill_name.clone(),
                        reason: "not found".to_string(),
                    });
                    continue;
                }
            };

            let src = Path::new(&skill.path);
            if !src.is_dir() {
                skipped.push(SkippedSkill {
                    name: skill_name.clone(),
                    reason: "source path invalid".to_string(),
                });
                continue;
            }

            fs::create_dir_all(&env_dir).map_err(|e| e.to_string())?;
            let target = env_dir.join(skill_name);

            // 清除旧安装
            if target.exists() || target.is_symlink() {
                if target.is_dir() && !target.is_symlink() {
                    fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
                } else {
                    fs::remove_file(&target).map_err(|e| e.to_string())?;
                }
            }

            // 安装（symlink 或 copy）
            let install_result = match config.install_method {
                InstallMethod::Symlink => {
                    #[cfg(unix)]
                    { std::os::unix::fs::symlink(src, &target).map_err(|e| e.to_string()) }
                    #[cfg(windows)]
                    { std::os::windows::fs::symlink_dir(src, &target).map_err(|e| e.to_string()) }
                }
                InstallMethod::Copy => copy_dir_all(src, &target),
            };

            match install_result {
                Ok(()) => {
                    // 更新 registry 的安装环境列表
                    let mut envs: HashSet<String> = skill
                        .installed_environments
                        .unwrap_or_default()
                        .into_iter()
                        .collect();
                    envs.insert(env.clone());
                    reg.update_skill_environments(skill_name, envs.into_iter().collect())
                        .map_err(|e| e.to_string())?;

                    // 处理 hooks（仅 claude-code）
                    if env == "claude-code" && has_skill_hooks(src) {
                        let _ = merge_skill_hooks(src, skill_name);
                    }

                    Ok(())
                }
                Err(e) => Err(e),
            }
        };

        match install_result {
            Ok(()) => installed.push(skill_name.clone()),
            Err(e) => {
                skipped.push(SkippedSkill {
                    name: skill_name.clone(),
                    reason: format!("install failed: {}", e),
                });
            }
        }
    }

    Ok(InstallProfileResult {
        installed,
        skipped,
        conflicts,
    })
}

/// 递归复制目录
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

// ── switch_profile: 环境整体切换 ─────────────────────────

/// switch_profile 结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchProfileResult {
    pub installed: Vec<String>,
    pub uninstalled: Vec<String>,
    pub skipped: Vec<SkippedSkill>,
    pub failed: Vec<SkippedSkill>,
    pub conflicts: Vec<ConflictGroup>,
}

/// switch_profile diff 预览
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchDiff {
    pub to_install: Vec<String>,
    pub to_uninstall: Vec<String>,
    pub conflicts: Vec<ConflictGroup>,
}

/// 扫描环境目录，获取已安装的 skill name 列表
fn scan_installed_skills(env_dir: &Path) -> Result<Vec<String>, String> {
    if !env_dir.exists() {
        return Ok(Vec::new());
    }
    let mut names = Vec::new();
    for entry in fs::read_dir(env_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        // 跳过隐藏文件和非目录
        if name.starts_with('.') {
            continue;
        }
        let path = entry.path();
        if path.is_dir() || path.is_symlink() {
            names.push(name);
        }
    }
    Ok(names)
}

/// 删除目录或符号链接
fn remove_path(path: &Path) -> Result<(), String> {
    if !path.exists() && !path.is_symlink() {
        return Ok(());
    }
    if path.is_dir() && !path.is_symlink() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn switch_profile(
    name: String,
    environments: Vec<String>,
    preview: Option<bool>,
    conflict_resolution: Option<HashMap<String, String>>,
    state: State<'_, AppState>,
) -> Result<SwitchProfileResult, String> {
    let profile = read_profile(&name)?;
    let is_preview = preview.unwrap_or(false);

    let target_skills: HashSet<String> = profile.skills.include.iter().cloned().collect();

    // 对每个环境执行 diff + 操作
    let mut all_installed: Vec<String> = Vec::new();
    let mut all_uninstalled: Vec<String> = Vec::new();
    let mut all_skipped: Vec<SkippedSkill> = Vec::new();
    let mut all_failed: Vec<SkippedSkill> = Vec::new();
    let mut all_conflicts: Vec<ConflictGroup> = Vec::new();

    // 先收集冲突信息（跨环境通用）
    {
        let registry = state.registry.lock().map_err(|e| e.to_string())?;
        let mut category_map: HashMap<String, Vec<String>> = HashMap::new();
        for skill_name in &profile.skills.include {
            if let Some(cat) = get_skill_category(skill_name, &registry) {
                category_map.entry(cat).or_default().push(skill_name.clone());
            }
        }
        all_conflicts = category_map
            .iter()
            .filter(|(_, skills)| skills.len() > 1)
            .map(|(cat, skills)| ConflictGroup {
                category: cat.clone(),
                skills: skills.clone(),
            })
            .collect();
    }

    // 计算冲突跳过集
    let resolved: HashMap<String, String> = conflict_resolution.unwrap_or_default();
    let mut conflict_skip = HashSet::new();
    for group in &all_conflicts {
        if let Some(keep) = resolved.get(&group.category) {
            for skill in &group.skills {
                if skill != keep {
                    conflict_skip.insert(skill.clone());
                }
            }
        } else {
            for skill in &group.skills {
                conflict_skip.insert(skill.clone());
            }
        }
    }

    for env_name in &environments {
        let (_label, env_dir) = env_path(env_name)?;

        // 扫描当前环境已安装的 skills
        let current_skills: HashSet<String> = scan_installed_skills(&env_dir)?
            .into_iter()
            .collect();

        // Diff 计算
        let to_install: Vec<String> = target_skills
            .iter()
            .filter(|s| !current_skills.contains(*s))
            .cloned()
            .collect();

        let to_uninstall: Vec<String> = current_skills
            .iter()
            .filter(|s| !target_skills.contains(*s))
            .cloned()
            .collect();

        // 预览模式：只返回 diff，不执行
        if is_preview {
            all_installed = to_install.clone();
            all_uninstalled = to_uninstall.clone();
            all_conflicts = all_conflicts.clone();
            continue;
        }

        let config = ConfigService::load().map_err(|e| e.to_string())?;

        // 执行卸载
        for skill_name in &to_uninstall {
            let target = env_dir.join(skill_name);
            match remove_path(&target) {
                Ok(()) => {
                    all_uninstalled.push(skill_name.clone());
                    // 卸载时清理 hooks（仅 claude-code）
                    if env_name == "claude-code" && has_skill_hooks_in_settings(skill_name) {
                        let _ = remove_skill_hooks(skill_name);
                    }
                }
                Err(e) => {
                    all_failed.push(SkippedSkill {
                        name: skill_name.clone(),
                        reason: format!("uninstall failed: {}", e),
                    });
                }
            }
        }

        // 执行安装
        for skill_name in &to_install {
            // 冲突跳过
            if conflict_skip.contains(skill_name) {
                all_skipped.push(SkippedSkill {
                    name: skill_name.clone(),
                    reason: "conflict".to_string(),
                });
                continue;
            }

            let install_result = {
                let mut reg = state.registry.lock().map_err(|e| e.to_string())?;
                let skill = match reg.get_skill(skill_name) {
                    Some(s) => s,
                    None => {
                        all_skipped.push(SkippedSkill {
                            name: skill_name.clone(),
                            reason: "not found".to_string(),
                        });
                        continue;
                    }
                };

                let src = Path::new(&skill.path);
                if !src.is_dir() {
                    all_skipped.push(SkippedSkill {
                        name: skill_name.clone(),
                        reason: "source path invalid".to_string(),
                    });
                    continue;
                }

                fs::create_dir_all(&env_dir).map_err(|e| e.to_string())?;
                let target = env_dir.join(skill_name);

                // 清除旧安装
                let _ = remove_path(&target);

                // 安装
                let result = match config.install_method {
                    InstallMethod::Symlink => {
                        #[cfg(unix)]
                        { std::os::unix::fs::symlink(src, &target).map_err(|e| e.to_string()) }
                        #[cfg(windows)]
                        { std::os::windows::fs::symlink_dir(src, &target).map_err(|e| e.to_string()) }
                    }
                    InstallMethod::Copy => copy_dir_all(src, &target),
                };

                match result {
                    Ok(()) => {
                        // 更新 registry 安装环境列表
                        let mut envs: HashSet<String> = skill
                            .installed_environments
                            .unwrap_or_default()
                            .into_iter()
                            .collect();
                        envs.insert(env_name.clone());
                        let _ = reg.update_skill_environments(skill_name, envs.into_iter().collect());

                        // hooks（仅 claude-code）
                        if env_name == "claude-code" && has_skill_hooks(src) {
                            let _ = merge_skill_hooks(src, skill_name);
                        }
                        Ok(())
                    }
                    Err(e) => Err(e),
                }
            };

            match install_result {
                Ok(()) => all_installed.push(skill_name.clone()),
                Err(e) => {
                    all_failed.push(SkippedSkill {
                        name: skill_name.clone(),
                        reason: format!("install failed: {}", e),
                    });
                }
            }
        }
    }

    Ok(SwitchProfileResult {
        installed: all_installed,
        uninstalled: all_uninstalled,
        skipped: all_skipped,
        failed: all_failed,
        conflicts: all_conflicts,
    })
}
