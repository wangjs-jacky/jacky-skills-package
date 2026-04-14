use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

use crate::utils::paths::get_claude_settings_path;
use crate::Result;

const MONITOR_MARKER: &str = "# monitor: claude-monitor";
const SKILL_MARKER: &str = "# skill: claude-monitor";
const MONITOR_HOOKS_DIR: &str = ".claude-monitor/hooks";
const MONITOR_PORT: u16 = 17530;
const MONITOR_DAEMON_URL: &str = "http://127.0.0.1:17530/api/health";
const MONITOR_CONFIG_DIR: &str = ".config/j-skills";
const MONITOR_CONFIG_FILE: &str = "monitor-config.json";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorCheckResult {
    pub installed: bool,
    pub hooks_dir_exists: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaemonCheckResult {
    pub running: bool,
    pub pid: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorOperationResult {
    pub success: bool,
}

fn get_home_dir() -> Result<PathBuf> {
    dirs::home_dir()
        .ok_or_else(|| crate::AppError::InvalidPath("Cannot determine home directory".to_string()))
}

fn get_hooks_dir() -> Result<PathBuf> {
    let home = get_home_dir()?;
    Ok(home.join(MONITOR_HOOKS_DIR))
}

fn get_monitor_config_path() -> Result<PathBuf> {
    let home = get_home_dir()?;
    Ok(home.join(MONITOR_CONFIG_DIR).join(MONITOR_CONFIG_FILE))
}

fn ensure_monitor_config_dir() -> Result<PathBuf> {
    let home = get_home_dir()?;
    let dir = home.join(MONITOR_CONFIG_DIR);
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

/// 读取监控配置（悬浮弹窗开关等）
#[tauri::command]
pub fn monitor_get_config() -> Result<serde_json::Value> {
    let config_path = get_monitor_config_path()?;

    if !config_path.exists() {
        // 默认配置：悬浮弹窗关闭
        return Ok(serde_json::json!({
            "floatingWindow": { "enabled": false }
        }));
    }

    let content = fs::read_to_string(&config_path)?;
    let config: serde_json::Value = serde_json::from_str(&content)?;
    Ok(config)
}

/// 写入监控配置
#[tauri::command]
pub fn monitor_set_config(config: serde_json::Value) -> Result<serde_json::Value> {
    ensure_monitor_config_dir()?;

    let config_path = get_monitor_config_path()?;
    let content = serde_json::to_string_pretty(&config)?;
    fs::write(&config_path, content)?;

    Ok(config)
}

/// Monitor hooks 定义：与 claude-monitor CLI showHooksConfig() 一致
fn get_monitor_hooks_definition() -> serde_json::Value {
    serde_json::json!({
        "SessionStart": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/session-start.sh" }] }
        ],
        "SessionEnd": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/session-end.sh" }] }
        ],
        "UserPromptSubmit": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/prompt-submit.sh" }] }
        ],
        "PreToolUse": [
            { "matcher": "AskUserQuestion", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/waiting-input.sh" }] },
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/tool-start.sh" }] }
        ],
        "PostToolUse": [
            { "matcher": "AskUserQuestion", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/input-answered.sh" }] },
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/tool-end.sh" }] }
        ],
        "PostToolUseFailure": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/tool-failure.sh" }] }
        ],
        "Stop": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/response-end.sh" }] }
        ],
        "Notification": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/notification.sh" }] }
        ],
        "PreCompact": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/pre-compact.sh" }] }
        ],
        "SubagentStart": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/subagent-start.sh" }] }
        ],
        "SubagentStop": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/subagent-stop.sh" }] }
        ]
    })
}

/// 检查 monitor hooks 是否已注入
#[tauri::command]
pub fn monitor_check_hooks() -> Result<MonitorCheckResult> {
    let hooks_dir = get_hooks_dir()?;
    let hooks_dir_exists = hooks_dir.exists();

    let settings_path = get_claude_settings_path()?;
    let installed = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)?;
        content.contains(MONITOR_MARKER) || content.contains(SKILL_MARKER)
    } else {
        false
    };

    Ok(MonitorCheckResult {
        installed,
        hooks_dir_exists,
    })
}

/// 注入 monitor hooks 到 settings.json
#[tauri::command]
pub fn monitor_install_hooks() -> Result<MonitorOperationResult> {
    let settings_path = get_claude_settings_path()?;

    // 确保 settings.json 存在
    if let Some(parent) = settings_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    // 读取或创建 settings
    let mut settings: serde_json::Value = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)?;
        serde_json::from_str(&content)?
    } else {
        serde_json::json!({})
    };

    // 获取或创建 hooks 对象
    if settings.get("hooks").is_none() {
        settings["hooks"] = serde_json::json!({});
    }

    // 先清理旧标记（# skill: claude-monitor）的 hooks，避免重复
    if let Some(hooks) = settings.get_mut("hooks").and_then(|h| h.as_object_mut()) {
        let hook_types: Vec<String> = hooks.keys().cloned().collect();
        for hook_type in &hook_types {
            if let Some(matchers) = hooks.get_mut(hook_type).and_then(|m| m.as_array_mut()) {
                let mut i = matchers.len();
                while i > 0 {
                    i -= 1;
                    if let Some(hooks_arr) = matchers[i].get_mut("hooks").and_then(|h| h.as_array_mut()) {
                        hooks_arr.retain(|h| {
                            h.get("command")
                                .and_then(|c| c.as_str())
                                .map(|c| !c.contains(SKILL_MARKER))
                                .unwrap_or(true)
                        });
                        if hooks_arr.is_empty() {
                            matchers.remove(i);
                        }
                    }
                }
                if matchers.is_empty() {
                    hooks.remove(hook_type);
                }
            }
        }
    }

    let monitor_hooks = get_monitor_hooks_definition();

    // 遍历每个 hook 类型，注入带标记的 command
    if let Some(hooks_obj) = settings["hooks"].as_object_mut() {
        if let Some(monitor_hooks_obj) = monitor_hooks.as_object() {
            for (hook_type, matchers) in monitor_hooks_obj {
                if let Some(matchers_arr) = matchers.as_array() {
                    // 确保该 hook 类型存在
                    if !hooks_obj.contains_key(hook_type) {
                        hooks_obj.insert(hook_type.clone(), serde_json::json!([]));
                    }

                    if let Some(existing_matchers) = hooks_obj[hook_type].as_array_mut() {
                        for matcher_val in matchers_arr {
                            if let Some(m) = matcher_val.as_object() {
                                let matcher_str = m.get("matcher")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("");
                                let empty_hooks = Vec::new();
                                let hooks_arr = m.get("hooks")
                                    .and_then(|v| v.as_array())
                                    .unwrap_or(&empty_hooks);

                                // 添加标记后的 hooks
                                let mut tagged_hooks: Vec<serde_json::Value> = Vec::new();
                                for hook in hooks_arr {
                                    let mut tagged = hook.clone();
                                    if let Some(cmd) = tagged.get_mut("command") {
                                        if let Some(cmd_str) = cmd.as_str() {
                                            let tagged_cmd = format!("{} {}", cmd_str, MONITOR_MARKER);
                                            *cmd = serde_json::Value::String(tagged_cmd);
                                        }
                                    }
                                    tagged_hooks.push(tagged);
                                }

                                // 查找已有 matcher
                                let found = existing_matchers.iter_mut().find(|em| {
                                    em.get("matcher")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("") == matcher_str
                                });

                                if let Some(existing) = found {
                                    // 合并 hooks（避免重复）
                                    if let Some(existing_hooks) = existing.get_mut("hooks") {
                                        if let Some(eh_arr) = existing_hooks.as_array_mut() {
                                            for th in tagged_hooks {
                                                let exists = eh_arr.iter().any(|h| {
                                                    h.get("command") == th.get("command")
                                                });
                                                if !exists {
                                                    eh_arr.push(th);
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    // 新增 matcher
                                    existing_matchers.push(serde_json::json!({
                                        "matcher": matcher_str,
                                        "hooks": tagged_hooks
                                    }));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 写回 settings.json
    let content = serde_json::to_string_pretty(&settings)?;
    fs::write(&settings_path, content)?;

    Ok(MonitorOperationResult { success: true })
}

/// 从 settings.json 移除 monitor hooks
#[tauri::command]
pub fn monitor_uninstall_hooks() -> Result<MonitorOperationResult> {
    let settings_path = get_claude_settings_path()?;

    if !settings_path.exists() {
        return Ok(MonitorOperationResult { success: true });
    }

    let content = fs::read_to_string(&settings_path)?;
    let mut settings: serde_json::Value = serde_json::from_str(&content)?;

    let mut removed = false;

    if let Some(hooks) = settings.get_mut("hooks").and_then(|h| h.as_object_mut()) {
        let hook_types: Vec<String> = hooks.keys().cloned().collect();

        for hook_type in hook_types {
            if let Some(matchers) = hooks.get_mut(&hook_type).and_then(|m| m.as_array_mut()) {
                let mut i = matchers.len();
                while i > 0 {
                    i -= 1;
                    if let Some(hooks_arr) = matchers[i].get_mut("hooks").and_then(|h| h.as_array_mut()) {
                        hooks_arr.retain(|h| {
                            h.get("command")
                                .and_then(|c| c.as_str())
                                .map(|c| !c.contains(MONITOR_MARKER) && !c.contains(SKILL_MARKER))
                                .unwrap_or(true)
                        });
                        if hooks_arr.is_empty() {
                            matchers.remove(i);
                            removed = true;
                        }
                    }
                }
                if matchers.is_empty() {
                    hooks.remove(&hook_type);
                }
            }
        }
    }

    if removed {
        let content = serde_json::to_string_pretty(&settings)?;
        fs::write(&settings_path, content)?;
    }

    Ok(MonitorOperationResult { success: true })
}

/// 检测 daemon 是否在运行
#[tauri::command]
pub fn monitor_check_daemon() -> Result<DaemonCheckResult> {
    let running = is_daemon_running();
    Ok(DaemonCheckResult {
        running,
        pid: None,
    })
}

fn is_daemon_running() -> bool {
    // 通过 curl 检测 daemon 是否响应（避免引入 HTTP 依赖）
    Command::new("curl")
        .args(["-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "2", MONITOR_DAEMON_URL])
        .output()
        .map(|o| {
            let code = String::from_utf8_lossy(&o.stdout);
            code.trim().starts_with("200")
        })
        .unwrap_or(false)
}

/// 启动 daemon 进程
#[tauri::command]
pub fn monitor_start_daemon() -> Result<DaemonCheckResult> {
    if is_daemon_running() {
        return Ok(DaemonCheckResult { running: true, pid: None });
    }

    // 使用 npx 启动 daemon（后台运行）
    let child = Command::new("npx")
        .args(["@wangjs-jacky/claude-monitor", "start"])
        .spawn();

    match child {
        Ok(_) => {
            // 等待 daemon 启动
            std::thread::sleep(std::time::Duration::from_secs(2));
            let running = is_daemon_running();
            Ok(DaemonCheckResult { running, pid: None })
        }
        Err(e) => {
            eprintln!("Failed to start daemon: {}", e);
            Ok(DaemonCheckResult { running: false, pid: None })
        }
    }
}

/// 停止 daemon 进程
#[tauri::command]
pub fn monitor_stop_daemon() -> Result<MonitorOperationResult> {
    // 通过 Unix Socket 发送停止请求
    let socket_path = get_home_dir()?.join(".claude-monitor").join("monitor.sock");

    if socket_path.exists() {
        // 用 curl 通过 Unix Socket 发送请求
        let _ = Command::new("curl")
            .args([
                "-s",
                "--unix-socket",
                socket_path.to_str().unwrap_or(""),
                "-X", "POST",
                "http://localhost/api/shutdown",
            ])
            .output();
    }

    // 备选：通过 npx stop
    let _ = Command::new("npx")
        .args(["@wangjs-jacky/claude-monitor", "stop"])
        .output();

    Ok(MonitorOperationResult { success: true })
}

// ========== 通用 HTTP 代理（绕过 CORS） ==========

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchParams {
    pub method: String,
    pub path: String,
    #[serde(default)]
    pub body: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchResult {
    pub ok: bool,
    pub status: u16,
    pub data: serde_json::Value,
}

/// 通用 daemon HTTP 代理 — 前端通过 Tauri invoke 调用，Rust 侧 curl 转发，绕过 CORS
#[tauri::command]
pub fn monitor_fetch(params: FetchParams) -> Result<FetchResult> {
    let url = format!("http://127.0.0.1:{}{}", MONITOR_PORT, params.path);

    let mut cmd = Command::new("curl");
    cmd.args(["-s", "-w", "\n__HTTP_CODE__%{http_code}"]);

    match params.method.to_uppercase().as_str() {
        "GET" => {
            cmd.args(["-X", "GET", &url]);
        }
        "DELETE" => {
            cmd.args(["-X", "DELETE", &url]);
        }
        "POST" | "PUT" => {
            cmd.args(["-X", &params.method.to_uppercase(), &url]);
            if let Some(ref body) = params.body {
                let body_str = serde_json::to_string(body)?;
                cmd.args(["-H", "Content-Type: application/json", "-d", &body_str]);
            }
        }
        _ => {
            return Err(crate::AppError::InvalidPath(format!(
                "Unsupported HTTP method: {}",
                params.method
            )));
        }
    }

    cmd.arg("--max-time").arg("5");

    let output = cmd.output()?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    // curl 输出格式: <response body>\n__HTTP_CODE__<status code>
    let (body, status) = if let Some(idx) = stdout.rfind("\n__HTTP_CODE__") {
        let body_part = &stdout[..idx];
        let status_part = &stdout[idx + "__HTTP_CODE__".len() + 1..];
        let status: u16 = status_part.trim().parse().unwrap_or(0);
        (body_part.to_string(), status)
    } else {
        (stdout.to_string(), 0)
    };

    let data: serde_json::Value = serde_json::from_str(&body).unwrap_or(serde_json::json!({
        "raw": body
    }));

    Ok(FetchResult {
        ok: status >= 200 && status < 300,
        status,
        data,
    })
}
