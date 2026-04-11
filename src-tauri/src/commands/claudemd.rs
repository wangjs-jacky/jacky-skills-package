use std::path::PathBuf;

/// CLAUDE.md 文件信息
#[derive(Debug, Clone, serde::Serialize)]
pub struct ClaudeMDInfo {
    pub path: String,
    pub label: String,
    pub exists: bool,
    pub content: String,
    pub size_bytes: u64,
}

/// 获取 home 目录
fn home_dir() -> Result<PathBuf, String> {
    dirs::home_dir().ok_or_else(|| "无法获取 home 目录".to_string())
}

/// 扫描所有 CLAUDE.md 文件
#[tauri::command]
pub async fn list_claude_md_files() -> Result<Vec<ClaudeMDInfo>, String> {
    let mut files = Vec::new();

    // 1. 全局 CLAUDE.md: ~/.claude/CLAUDE.md
    let home = home_dir()?;
    let global_path = home.join(".claude").join("CLAUDE.md");
    files.push(read_claude_md_info(&global_path, "Global"));

    // 2. 项目级 CLAUDE.md: 当前工作目录
    if let Ok(cwd) = std::env::current_dir() {
        let project_claude = cwd.join("CLAUDE.md");
        if project_claude.exists() && project_claude != global_path {
            let label = cwd
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "Project".to_string());
            files.push(read_claude_md_info(&project_claude, &format!("Project: {label}")));
        }

        // 3. 项目 .claude/CLAUDE.md
        let project_claude_dir = cwd.join(".claude").join("CLAUDE.md");
        if project_claude_dir.exists() && project_claude_dir != global_path {
            let label = cwd
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "Project".to_string());
            files.push(read_claude_md_info(
                &project_claude_dir,
                &format!("Project .claude: {label}"),
            ));
        }
    }

    Ok(files)
}

/// 读取指定 CLAUDE.md 的内容
#[tauri::command]
pub async fn read_claude_md(path: String) -> Result<ClaudeMDInfo, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("文件不存在: {path}"));
    }
    Ok(read_claude_md_info(&p, ""))
}

fn read_claude_md_info(path: &PathBuf, label: &str) -> ClaudeMDInfo {
    let exists = path.exists();
    let content = if exists {
        std::fs::read_to_string(path).unwrap_or_default()
    } else {
        String::new()
    };
    let size_bytes = if exists {
        std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };

    ClaudeMDInfo {
        path: path.to_string_lossy().to_string(),
        label: label.to_string(),
        exists,
        content,
        size_bytes,
    }
}
