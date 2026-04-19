use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use tauri::{AppHandle, Emitter};

// ========== 数据结构 ==========

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub download_url: String,
    pub release_notes: String,
    pub release_date: String,
    pub file_size: u64,
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    body: Option<String>,
    published_at: Option<String>,
    assets: Vec<GitHubAsset>,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

// ========== 工具函数 ==========

fn get_current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn get_arch_suffix() -> &'static str {
    // 编译时直接匹配
    if cfg!(target_arch = "aarch64") {
        return "aarch64";
    }
    // x86_64 编译但运行在 Apple Silicon（Rosetta）→ 仍应下载 aarch64 DMG
    if let Ok(output) = std::process::Command::new("sysctl")
        .args(["-n", "hw.optional.arm64"])
        .output()
    {
        if String::from_utf8_lossy(&output.stdout).trim() == "1" {
            return "aarch64";
        }
    }
    "x86_64"
}

/// 语义版本比较：latest > current → true
fn compare_versions(current: &str, latest: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect()
    };

    let cur = parse(current);
    let lat = parse(latest);

    for i in 0..lat.len().max(cur.len()) {
        let c = cur.get(i).unwrap_or(&0);
        let l = lat.get(i).unwrap_or(&0);
        if l > c {
            return true;
        }
        if l < c {
            return false;
        }
    }
    false
}

// ========== Tauri Commands ==========

#[tauri::command]
pub async fn check_for_update() -> Result<UpdateInfo, String> {
    let current = get_current_version();

    let client = reqwest::Client::builder()
        .user_agent("j-skills-update-checker")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let response = client
        .get("https://api.github.com/repos/wangjs-jacky/jacky-skills-package/releases/latest")
        .send()
        .await
        .map_err(|e| format!("检查更新失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API 返回状态: {}", response.status()));
    }

    let release: GitHubRelease = response
        .json()
        .await
        .map_err(|e| format!("解析 Release 信息失败: {}", e))?;

    let latest_version = release.tag_name.trim_start_matches('v').to_string();
    let has_update = compare_versions(&current, &latest_version);

    // 查找匹配当前架构的 DMG
    let arch = get_arch_suffix();
    let dmg_asset = release
        .assets
        .iter()
        .find(|a| a.name.ends_with(".dmg") && a.name.contains(arch));

    let (download_url, file_size) = match dmg_asset {
        Some(asset) => (asset.browser_download_url.clone(), asset.size),
        None => {
            return Err(format!(
                "未找到匹配架构 ({}) 的 DMG 文件",
                arch
            ))
        }
    };

    Ok(UpdateInfo {
        has_update,
        current_version: current,
        latest_version,
        download_url,
        release_notes: release.body.unwrap_or_default(),
        release_date: release.published_at.unwrap_or_default(),
        file_size,
    })
}

#[tauri::command]
pub async fn download_update(
    app: AppHandle,
    url: String,
    version: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("下载失败: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);

    // 创建临时文件
    let temp_dir = std::env::temp_dir();
    let file_name = format!("j-skills_{}.dmg", version);
    let file_path = temp_dir.join(&file_name);

    let mut file =
        fs::File::create(&file_path).map_err(|e| format!("创建临时文件失败: {}", e))?;

    let mut downloaded: u64 = 0;

    // 分块下载并推送进度
    let mut response = response;
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("下载数据读取失败: {}", e))?
    {
        file.write_all(&chunk)
            .map_err(|e| format!("写入文件失败: {}", e))?;
        downloaded += chunk.len() as u64;

        let percentage = if total_size > 0 {
            (downloaded as f64 / total_size as f64 * 100.0) as u32
        } else {
            0
        };

        let _ = app.emit(
            "update-download-progress",
            serde_json::json!({
                "downloaded": downloaded,
                "total": total_size,
                "percentage": percentage,
            }),
        );
    }

    // 下载完成，打开 DMG
    std::process::Command::new("open")
        .arg(&file_path)
        .spawn()
        .map_err(|e| format!("打开 DMG 失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_app_version() -> String {
    get_current_version()
}
