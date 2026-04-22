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

/// 必需的 hook 脚本文件列表
const REQUIRED_HOOK_SCRIPTS: &[&str] = &[
    "session-start.sh",
    "session-end.sh",
    "prompt-submit.sh",
    "waiting-input.sh",
    "tool-start.sh",
    "input-answered.sh",
    "tool-end.sh",
    "tool-failure.sh",
    "response-end.sh",
    "notification.sh",
    "pre-compact.sh",
    "subagent-start.sh",
    "subagent-stop.sh",
];

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

/// 检查 hook 脚本文件是否全部存在
fn hooks_scripts_exist(hooks_dir: &PathBuf) -> bool {
    if !hooks_dir.exists() {
        return false;
    }
    REQUIRED_HOOK_SCRIPTS.iter().all(|script| {
        hooks_dir.join(script).exists()
    })
}

/// 检查 monitor hooks 是否已注入（同时验证 settings.json marker 和脚本文件存在性）
#[tauri::command]
pub fn monitor_check_hooks() -> Result<MonitorCheckResult> {
    let hooks_dir = get_hooks_dir()?;
    let scripts_exist = hooks_scripts_exist(&hooks_dir);

    let settings_path = get_claude_settings_path()?;
    let has_marker = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)?;
        content.contains(MONITOR_MARKER) || content.contains(SKILL_MARKER)
    } else {
        false
    };

    // installed 仅在 marker + 脚本都存在时为 true
    Ok(MonitorCheckResult {
        installed: has_marker && scripts_exist,
        hooks_dir_exists: scripts_exist,
    })
}

/// 注入 monitor hooks 到 settings.json
/// 确保 hook 脚本文件存在，缺失时调用 claude-monitor init 创建
/// 返回 true 表示脚本就绪，false 表示创建失败
fn ensure_hooks_scripts() -> Result<bool> {
    let hooks_dir = get_hooks_dir()?;
    if hooks_scripts_exist(&hooks_dir) {
        return Ok(true);
    }

    eprintln!("monitor_install_hooks: hook scripts missing, running npx init...");

    // 调用 claude-monitor init 创建 hook 脚本
    let output = Command::new("npx")
        .args(["@wangjs-jacky/claude-monitor", "init"])
        .output();

    match output {
        Ok(out) => {
            if !out.status.success() {
                let stderr = String::from_utf8_lossy(&out.stderr);
                eprintln!("monitor_install_hooks: init failed: {}", stderr.trim());
            }
        }
        Err(e) => {
            eprintln!("monitor_install_hooks: failed to run npx: {}", e);
        }
    }

    // 验证脚本是否创建成功
    if hooks_scripts_exist(&hooks_dir) {
        Ok(true)
    } else {
        eprintln!("monitor_install_hooks: scripts still missing after init, aborting hooks injection");
        Ok(false)
    }
}

#[tauri::command]
pub fn monitor_install_hooks() -> Result<MonitorOperationResult> {
    // 步骤0：确保 hook 脚本文件存在（创建失败则不注入，避免指向不存在的脚本）
    let scripts_ready = ensure_hooks_scripts()?;
    if !scripts_ready {
        return Ok(MonitorOperationResult { success: false });
    }

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

// ========== 终端窗口激活 ==========

/// 终端类型到 macOS bundle ID 和 AppleScript 应用名的映射
struct TerminalAppInfo {
    /// 用于 NSWorkspace 查找进程
    bundle_id: &'static str,
    /// 用于 AppleScript "tell application" 和 System Events 进程名
    app_name: &'static str,
    /// URL scheme 前缀（用于聚焦终端面板）
    url_scheme: &'static str,
}

fn get_terminal_info(terminal: &str) -> Option<TerminalAppInfo> {
    match terminal {
        "vscode" => Some(TerminalAppInfo {
            bundle_id: "com.microsoft.VSCode",
            app_name: "Visual Studio Code",
            url_scheme: "vscode",
        }),
        "cursor" => Some(TerminalAppInfo {
            bundle_id: "com.todesktop.230313mzl4w4u92",
            app_name: "Cursor",
            url_scheme: "cursor",
        }),
        "iterm" => Some(TerminalAppInfo {
            bundle_id: "com.googlecode.iterm2",
            app_name: "iTerm",
            url_scheme: "",
        }),
        "warp" => Some(TerminalAppInfo {
            bundle_id: "dev.warp.Warp-Stable",
            app_name: "Warp",
            url_scheme: "",
        }),
        "terminal" => Some(TerminalAppInfo {
            bundle_id: "com.apple.Terminal",
            app_name: "Terminal",
            url_scheme: "",
        }),
        _ => None,
    }
}

/// 判断是否为 IDE 类终端（需要精准窗口匹配）
fn is_ide_terminal(terminal: &str) -> bool {
    matches!(terminal, "vscode" | "cursor")
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateParams {
    pub terminal: String,
    pub project: String,
    pub pid: Option<u32>,
    pub cwd: Option<String>,
}

/// 从 Claude PID 往上遍历进程树，收集所有祖先 PID 并检测真正的 IDE 类型
///
/// 返回 (ancestor_pids, detected_ide)
/// - ancestor_pids: 从 Claude PID 到 IDE 进程之间的所有 PID
/// - detected_ide: "cursor" | "vscode" | ""
fn walk_process_tree(start_pid: u32) -> (Vec<u32>, String) {
    let mut pids = Vec::new();
    let mut current_pid = start_pid;
    let mut detected_ide = String::new();

    for _ in 0..10 {
        let output = Command::new("ps")
            .args(["-o", "ppid=,comm=", "-p", &current_pid.to_string()])
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let line = stdout.trim();
            if line.is_empty() {
                eprintln!("walk_process_tree: ps returned empty for PID {}", current_pid);
                break;
            }

            // 格式: "  1234 /bin/zsh"
            let mut parts = line.splitn(2, char::is_whitespace);
            let ppid_str = parts.next().unwrap_or("").trim();
            let comm = parts.next().unwrap_or("").trim();

            eprintln!("walk_process_tree: PID={} comm='{}' ppid={}", current_pid, comm, ppid_str);

            let ppid: u32 = match ppid_str.parse() {
                Ok(p) => p,
                Err(_) => break,
            };

            // 检测 IDE 类型（进程名包含关键字）
            if comm.contains("Cursor") {
                detected_ide = "cursor".to_string();
                break;
            } else if comm.contains("Code Helper") || comm.contains("Visual Studio Code") {
                detected_ide = "vscode".to_string();
                break;
            }

            pids.push(current_pid);

            if ppid <= 1 {
                break;
            }
            current_pid = ppid;
        } else {
            break;
        }
    }

    (pids, detected_ide)
}

/// 激活终端窗口（async 避免阻塞 Tauri 主线程）
///
/// IDE 终端（vscode/cursor）:
/// 1. 从 Claude PID 遍历进程树，检测真正的 IDE + 收集所有祖先 PID
/// 2. 通过 vibe-island.terminal-focus URI handler 精准跳转到对应终端 Tab
///
/// 普通终端（iterm/warp/terminal）：通过 AppleScript 激活应用窗口。
#[tauri::command]
pub async fn activate_terminal(params: ActivateParams) -> Result<MonitorOperationResult> {
    // 将阻塞 IO 放到后台线程，避免冻结主线程
    tokio::task::spawn_blocking(move || activate_terminal_blocking(params))
        .await
        .map_err(|e| crate::AppError::Io(std::io::Error::new(std::io::ErrorKind::Other, format!("激活终端任务失败: {}", e))))?
}

fn activate_terminal_blocking(params: ActivateParams) -> Result<MonitorOperationResult> {
    let total_start = std::time::Instant::now();
    eprintln!("activate_terminal: [timing] === START terminal={} pid={:?} ===", params.terminal, params.pid);

    let info = match get_terminal_info(&params.terminal) {
        Some(info) => info,
        None => {
            eprintln!("activate_terminal: unknown terminal type '{}'", params.terminal);
            return Ok(MonitorOperationResult { success: false });
        }
    };

    // ===== 非 IDE 终端：用 macOS open 命令激活 =====
    if !is_ide_terminal(&params.terminal) {
        // open -a 通过 LaunchServices 激活应用，不受后台线程限制
        let result = Command::new("open")
            .args(["-a", info.app_name])
            .output();
        if let Err(e) = result {
            eprintln!("activate_terminal: open -a {} failed: {}", info.app_name, e);
            return Ok(MonitorOperationResult { success: false });
        }
        return Ok(MonitorOperationResult { success: true });
    }

    // ===== IDE 终端（vscode/cursor）=====

    // 步骤 1：遍历进程树，收集祖先 PID 并检测真正的 IDE
    let start = std::time::Instant::now();
    let (ancestor_pids, detected_ide) = match params.pid {
        Some(pid) => walk_process_tree(pid),
        None => (Vec::new(), String::new()),
    };
    eprintln!("activate_terminal: [timing] walk_process_tree took {:?}", start.elapsed());

    // 优先使用进程树检测到的 IDE，回退到前端报告的类型
    let effective_terminal = if !detected_ide.is_empty() {
        eprintln!(
            "activate_terminal: detected IDE '{}' from process tree (reported: '{}')",
            detected_ide, params.terminal
        );
        &detected_ide
    } else {
        &params.terminal
    };

    let effective_info = match get_terminal_info(effective_terminal) {
        Some(info) => info,
        None => info, // 回退到原始 info
    };

    eprintln!(
        "activate_terminal: ancestor PIDs: {:?}, url_scheme: {}",
        ancestor_pids, effective_info.url_scheme
    );

    // 步骤 2：通过自研扩展精确聚焦终端 Tab
    // URI 格式: {vscode|cursor}://jackywjs.focus-terminal/focus?pid=X&pid=Y
    // 扩展使用 terminal.processId 做 PID 匹配，无需窗口标题启发式匹配
    if !effective_info.url_scheme.is_empty() {
        let mut pid_params: Vec<String> = Vec::new();
        if !ancestor_pids.is_empty() {
            pid_params = ancestor_pids.iter().map(|p| format!("pid={}", p)).collect();
        }

        // 构建 URI：有 PID 则精确匹配，无 PID 则回退到终端面板聚焦
        let url = if !pid_params.is_empty() {
            format!(
                "{}://jackywjs.focus-terminal/focus?{}",
                effective_info.url_scheme,
                pid_params.join("&")
            )
        } else {
            format!("{}://workbench.action.terminal.focus", effective_info.url_scheme)
        };
        let uri_start = std::time::Instant::now();
        eprintln!("activate_terminal: [timing] opening URI {} at {:?}", url, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default());
        // 使用 spawn 避免 output() 阻塞导致前端 invoke 挂起
        let _ = Command::new("open").arg(&url).spawn();
        eprintln!("activate_terminal: [timing] open URI spawn took {:?}", uri_start.elapsed());
    } else {
        // 非 IDE 终端（iterm/warp 等）不应走到这里，但作为安全网
        let activate_script = format!(r#"tell application id "{}" to activate"#, effective_info.bundle_id);
        let _ = Command::new("osascript")
            .args(["-e", &activate_script])
            .spawn();
    }

    eprintln!("activate_terminal: [timing] === END total took {:?} ===", total_start.elapsed());
    Ok(MonitorOperationResult { success: true })
}

// ========== 终端类型检测 ==========

/// 批量检测会话的真实终端类型（修正 daemon 误判 Cursor 为 VSCode 的问题）
#[tauri::command]
pub async fn detect_terminals(pids: Vec<u32>) -> Result<std::collections::HashMap<u32, String>> {
    tokio::task::spawn_blocking(move || {
        let mut results = std::collections::HashMap::new();
        for pid in pids {
            let (_, detected_ide) = walk_process_tree(pid);
            if !detected_ide.is_empty() {
                results.insert(pid, detected_ide);
            }
        }
        Ok(results)
    })
    .await
    .map_err(|e| crate::AppError::Io(std::io::Error::new(
        std::io::ErrorKind::Other,
        format!("detect_terminals task failed: {}", e),
    )))?
}

// ========== VSCode/Cursor 扩展管理 ==========

const FOCUS_TERMINAL_EXTENSION: &str = "jackywjs.focus-terminal";

/// 获取 IDE CLI 命令名
fn get_ide_cli(terminal: &str) -> Option<&'static str> {
    match terminal {
        "vscode" => Some("code"),
        "cursor" => Some("cursor"),
        _ => None,
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionCheckResult {
    pub installed: bool,
}

// ========== 扩展检测缓存 ==========

use std::collections::HashMap;
use std::sync::LazyLock;
use std::sync::Mutex;
use std::time::Instant;

/// 缓存 TTL：5 分钟
const EXTENSION_CACHE_TTL_SECS: u64 = 300;

/// 扩展安装状态缓存（终端类型 → (是否已安装, 缓存时间)）
/// true/false 都缓存，5 分钟 TTL 过期
static EXTENSION_CACHE: LazyLock<Mutex<HashMap<String, (bool, Instant)>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// 检测 IDE 是否安装了 focus-terminal 扩展（async + 双向缓存 + TTL）
#[tauri::command]
pub async fn check_terminal_extension(terminal: String) -> Result<ExtensionCheckResult> {
    // 1. 查缓存，命中且未过期则直接返回
    {
        let cache = EXTENSION_CACHE.lock().unwrap();
        if let Some((installed, cached_at)) = cache.get(&terminal) {
            if cached_at.elapsed().as_secs() < EXTENSION_CACHE_TTL_SECS {
                return Ok(ExtensionCheckResult { installed: *installed });
            }
        }
    }

    // 2. 缓存未命中，实际检测（后台线程）
    let t = terminal.clone();
    let result = tokio::task::spawn_blocking(move || -> Result<ExtensionCheckResult> {
        let cli = match get_ide_cli(&t) {
            Some(cli) => cli,
            None => return Ok(ExtensionCheckResult { installed: false }),
        };

        let output = Command::new(cli)
            .args(["--list-extensions"])
            .output();

        match output {
            Ok(out) => {
                let extensions = String::from_utf8_lossy(&out.stdout);
                let installed = extensions.lines().any(|line| line.trim() == FOCUS_TERMINAL_EXTENSION);
                Ok(ExtensionCheckResult { installed })
            }
            Err(_) => Ok(ExtensionCheckResult { installed: false }),
        }
    })
    .await
    .map_err(|e| crate::AppError::Io(std::io::Error::new(
        std::io::ErrorKind::Other,
        format!("extension check task failed: {}", e),
    )))??;

    // 3. 写入缓存（true/false 都缓存，带时间戳用于 TTL 过期）
    EXTENSION_CACHE.lock().unwrap().insert(terminal, (result.installed, Instant::now()));

    Ok(result)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionInstallResult {
    pub success: bool,
    pub message: String,
}

/// 安装 focus-terminal 扩展到 IDE（async + 安装成功后刷新缓存）
#[tauri::command]
pub async fn install_terminal_extension(terminal: String) -> Result<ExtensionInstallResult> {
    let t = terminal.clone();
    let result = tokio::task::spawn_blocking(move || -> Result<ExtensionInstallResult> {
        let cli = match get_ide_cli(&t) {
            Some(cli) => cli,
            None => {
                return Ok(ExtensionInstallResult {
                    success: false,
                    message: format!("unsupported terminal: {}", t),
                });
            }
        };

        let output = Command::new(cli)
            .args(["--install-extension", FOCUS_TERMINAL_EXTENSION])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let stderr = String::from_utf8_lossy(&out.stderr);
                let success = out.status.success();
                let message = if success {
                    "installed".to_string()
                } else {
                    format!("install failed: {}", stderr.trim())
                };
                eprintln!("install_terminal_extension: stdout={}, stderr={}", stdout.trim(), stderr.trim());
                Ok(ExtensionInstallResult { success, message })
            }
            Err(e) => Ok(ExtensionInstallResult {
                success: false,
                message: format!("exec failed: {}, please install {} first", e, cli),
            }),
        }
    })
    .await
    .map_err(|e| crate::AppError::Io(std::io::Error::new(
        std::io::ErrorKind::Other,
        format!("extension install task failed: {}", e),
    )))??;

    // 安装成功后刷新缓存
    if result.success {
        EXTENSION_CACHE.lock().unwrap().insert(terminal, (true, Instant::now()));
    }

    Ok(result)
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
