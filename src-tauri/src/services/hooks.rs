//! Hooks 管理模块
//! 负责 skill hooks 与 .claude/settings.json 的合并和移除

use crate::utils::paths::get_claude_settings_path;
use crate::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Hook 配置项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookConfig {
    #[serde(rename = "type")]
    pub hook_type: String,
    pub command: String,
}

/// Hook 匹配器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookMatcher {
    #[serde(default)]
    pub matcher: Option<String>,
    pub hooks: Vec<HookConfig>,
}

/// Hooks 配置结构（按 hook 类型分组）
pub type HooksConfig = HashMap<String, Vec<HookMatcher>>;

/// Skill 的 hooks.json 结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillHooksJson {
    pub hooks: HooksConfig,
}

/// 获取 skill 标识符（用于 command 注释）
fn get_skill_marker(skill_name: &str) -> String {
    format!("# skill: {}", skill_name)
}

/// 检查 command 是否来自指定 skill
fn is_command_from_skill(command: &str, skill_name: &str) -> bool {
    command.contains(&get_skill_marker(skill_name))
}

/// 读取 settings.json 为通用 JSON Value（保留所有字段）
fn read_claude_settings_json() -> Result<Value> {
    let settings_path = get_claude_settings_path()?;

    if !settings_path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = fs::read_to_string(&settings_path)?;
    let settings: Value = serde_json::from_str(&content)?;
    Ok(settings)
}

/// 写入 settings.json（保留所有字段）
fn write_claude_settings_json(settings: &Value) -> Result<()> {
    let settings_path = get_claude_settings_path()?;

    // 确保目录存在
    if let Some(parent) = settings_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    let content = serde_json::to_string_pretty(settings)?;
    fs::write(&settings_path, content)?;
    Ok(())
}

/// 从 JSON Value 中获取 hooks 配置
fn get_hooks_from_value(value: &Value) -> Option<HooksConfig> {
    value.get("hooks").and_then(|h| serde_json::from_value(h.clone()).ok())
}

/// 设置 JSON Value 中的 hooks 配置
fn set_hooks_in_value(value: &mut Value, hooks: &HooksConfig) {
    if let Ok(hooks_value) = serde_json::to_value(hooks) {
        value["hooks"] = hooks_value;
    }
}

/// 读取 skill 的 hooks.json
pub fn read_skill_hooks(skill_path: &Path) -> Result<Option<SkillHooksJson>> {
    let hooks_path = skill_path.join("hooks").join("hooks.json");

    if !hooks_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&hooks_path)?;
    let hooks: SkillHooksJson = serde_json::from_str(&content)?;
    Ok(Some(hooks))
}

/// 检查 skill 是否有 hooks
pub fn has_skill_hooks(skill_path: &Path) -> bool {
    read_skill_hooks(skill_path).map_or(false, |h| h.is_some())
}

/// 替换 hooks.json 中的变量
/// ${CLAUDE_PLUGIN_ROOT} -> skill 实际路径
fn resolve_hook_variables(command: &str, skill_path: &Path) -> String {
    let skill_path_str = skill_path.to_string_lossy();
    command.replace("${CLAUDE_PLUGIN_ROOT}", &skill_path_str)
}

/// 合并 skill hooks 到 settings.json
pub fn merge_skill_hooks(skill_path: &Path, skill_name: &str) -> Result<bool> {
    let skill_hooks = match read_skill_hooks(skill_path)? {
        Some(h) => h,
        None => return Ok(false),
    };

    // 读取完整的 settings.json（保留所有字段）
    let mut settings = read_claude_settings_json()?;

    // 获取或创建 hooks 配置
    let mut hooks: HooksConfig = get_hooks_from_value(&settings).unwrap_or_default();

    let skill_marker = get_skill_marker(skill_name);

    // 遍历 skill 的所有 hook 类型
    for (hook_type, matchers) in skill_hooks.hooks {
        // 确保该 hook 类型存在
        let entry = hooks.entry(hook_type.clone()).or_insert_with(Vec::new);

        // 遍历每个 matcher 配置
        for matcher in matchers {
            // 转换 hooks 中的 command
            let resolved_hooks: Vec<HookConfig> = matcher
                .hooks
                .iter()
                .map(|hook| HookConfig {
                    hook_type: hook.hook_type.clone(),
                    command: format!(
                        "{} {}",
                        resolve_hook_variables(&hook.command, skill_path),
                        skill_marker
                    ),
                })
                .collect();

            // 查找是否已有相同 matcher 的配置
            let matcher_value = matcher.matcher.as_deref().unwrap_or("");
            let existing_matcher = entry
                .iter_mut()
                .find(|m| m.matcher.as_deref().unwrap_or("") == matcher_value);

            if let Some(existing) = existing_matcher {
                // 合并 hooks（避免重复）
                for resolved_hook in resolved_hooks {
                    let exists = existing
                        .hooks
                        .iter()
                        .any(|h| h.command == resolved_hook.command);
                    if !exists {
                        existing.hooks.push(resolved_hook);
                    }
                }
            } else {
                // 添加新的 matcher 配置
                entry.push(HookMatcher {
                    matcher: matcher.matcher,
                    hooks: resolved_hooks,
                });
            }
        }
    }

    // 更新 settings 中的 hooks（保留其他字段）
    set_hooks_in_value(&mut settings, &hooks);
    write_claude_settings_json(&settings)?;
    Ok(true)
}

/// 从 settings.json 移除 skill hooks
pub fn remove_skill_hooks(skill_name: &str) -> Result<bool> {
    // 读取完整的 settings.json（保留所有字段）
    let mut settings = read_claude_settings_json()?;

    let mut hooks = match get_hooks_from_value(&settings) {
        Some(h) => h,
        None => return Ok(false),
    };

    let mut removed = false;

    // 遍历所有 hook 类型
    let hook_types: Vec<String> = hooks.keys().cloned().collect();
    for hook_type in hook_types {
        if let Some(matchers) = hooks.get_mut(&hook_type) {
            // 遍历每个 matcher 配置
            let mut i = matchers.len();
            while i > 0 {
                i -= 1;
                let matcher = &mut matchers[i];

                // 过滤掉来自该 skill 的 hooks
                matcher.hooks.retain(|hook| !is_command_from_skill(&hook.command, skill_name));

                if matcher.hooks.is_empty() {
                    // 如果没有剩余的 hooks，移除整个 matcher
                    matchers.remove(i);
                    removed = true;
                } else if matcher.hooks.len() != matcher.hooks.len() {
                    removed = true;
                }
            }

            // 如果该 hook 类型没有 matchers 了，移除整个 hook 类型
            if matchers.is_empty() {
                hooks.remove(&hook_type);
            }
        }
    }

    if removed {
        set_hooks_in_value(&mut settings, &hooks);
        write_claude_settings_json(&settings)?;
    }

    Ok(removed)
}

/// 检查 settings.json 中是否包含指定 skill 的 hooks
pub fn has_skill_hooks_in_settings(skill_name: &str) -> bool {
    let settings = match read_claude_settings_json() {
        Ok(s) => s,
        Err(_) => return false,
    };

    if let Some(hooks) = get_hooks_from_value(&settings) {
        for matchers in hooks.values() {
            for matcher in matchers {
                for hook in &matcher.hooks {
                    if is_command_from_skill(&hook.command, skill_name) {
                        return true;
                    }
                }
            }
        }
    }

    false
}

/// 列出 settings.json 中所有 skill hooks
pub fn list_installed_skill_hooks() -> Result<Vec<String>> {
    let settings = read_claude_settings_json()?;
    let mut skills = std::collections::HashSet::new();

    if let Some(hooks) = get_hooks_from_value(&settings) {
        let marker_regex = regex::Regex::new(r"# skill: (\S+)").unwrap();

        for matchers in hooks.values() {
            for matcher in matchers {
                for hook in &matcher.hooks {
                    if let Some(caps) = marker_regex.captures(&hook.command) {
                        if let Some(name) = caps.get(1) {
                            skills.insert(name.as_str().to_string());
                        }
                    }
                }
            }
        }
    }

    Ok(skills.into_iter().collect())
}
