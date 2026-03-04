# Tauri 桌面应用改造实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 j-skills Web 应用改造为 Tauri 桌面应用，提供原生桌面体验和系统级集成

**Architecture:** 在现有 monorepo 中添加 src-tauri 目录，使用 Rust 实现后端逻辑，前端从 HTTP 调用改为 Tauri Commands，保持 CLI 工具独立发布

**Tech Stack:** Tauri v2, Rust, React 18, TypeScript, Vite, Tailwind CSS

---

## 阶段 1：项目初始化与 Tauri 集成

### Task 1: 安装 Tauri CLI 和依赖

**Files:**
- Modify: `package.json`
- Create: `src-tauri/.gitignore`

**Step 1: 安装 Tauri CLI**

Run: `pnpm add -D @tauri-apps/cli@latest`
Expected: 成功安装 tauri CLI

**Step 2: 初始化 Tauri 项目**

Run: `pnpm tauri init --app-name "j-skills" --window-title "j-skills" --dev-url "http://localhost:5173" --before-dev-command "pnpm dev:web" --before-build-command "pnpm build:web"`
Expected: 创建 src-tauri 目录和基础配置

**Step 3: 创建 .gitignore**

Create: `src-tauri/.gitignore`

```gitignore
# Build artifacts
/target/
/WixTools/

# Tauri
/Cargo.lock
```

**Step 4: 验证目录结构**

Run: `ls -la src-tauri/`
Expected: 看到 Cargo.toml, tauri.conf.json, src/ 目录

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src-tauri/
git commit -m "chore: 初始化 Tauri 项目"
```

---

### Task 2: 配置 Cargo.toml 依赖

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1: 更新依赖**

Replace `src-tauri/Cargo.toml` 的 `[dependencies]` 部分：

```toml
[package]
name = "j-skills"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["system-tray"] }
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1"
thiserror = "1"
notify = "6"
dirs = "5"

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

**Step 2: 验证 Cargo 配置**

Run: `cd src-tauri && cargo check`
Expected: 成功下载依赖并检查通过

**Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "chore: 配置 Cargo 依赖"
```

---

### Task 3: 配置 tauri.conf.json

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1: 更新 Tauri 配置**

Replace `src-tauri/tauri.conf.json`：

```json
{
  "build": {
    "beforeBuildCommand": "pnpm build:web",
    "beforeDevCommand": "pnpm dev:web",
    "devPath": "http://localhost:5173",
    "distDir": "../packages/web/dist"
  },
  "package": {
    "productName": "j-skills",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "all": true,
        "scope": ["$HOME/.j-skills/**", "$HOME/**"]
      },
      "path": {
        "all": true
      },
      "shell": {
        "open": true
      },
      "dialog": {
        "open": true,
        "save": true
      }
    },
    "bundle": {
      "active": true,
      "category": "DeveloperTool",
      "copyright": "MIT",
      "identifier": "com.wangjs-jacky.j-skills",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.icns"
      ],
      "targets": ["dmg", "app"],
      "macOS": {
        "minimumSystemVersion": "10.13"
      }
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "title": "j-skills",
        "width": 1200,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true
      }
    ]
  }
}
```

**Step 2: 验证配置格式**

Run: `cat src-tauri/tauri.conf.json | python3 -m json.tool`
Expected: JSON 格式正确

**Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: 配置 Tauri 应用设置"
```

---

### Task 4: 创建应用图标

**Files:**
- Create: `src-tauri/icons/` 目录下的图标文件

**Step 1: 创建图标目录**

Run: `mkdir -p src-tauri/icons`
Expected: 创建目录成功

**Step 2: 生成默认图标（临时）**

Run: `pnpm tauri icon`
Expected: 在 icons/ 目录生成占位图标

**Step 3: 验证图标文件**

Run: `ls -la src-tauri/icons/`
Expected: 看到 32x32.png, 128x128.png, icon.icns 等文件

**Step 4: Commit**

```bash
git add src-tauri/icons/
git commit -m "chore: 添加应用图标"
```

---

### Task 5: 更新根 package.json 脚本

**Files:**
- Modify: `package.json`

**Step 1: 添加 Tauri 相关脚本**

在 `package.json` 的 `scripts` 部分添加：

```json
{
  "scripts": {
    "dev": "pnpm dev:tauri",
    "dev:tauri": "tauri dev",
    "build": "pnpm build:all && pnpm build:tauri",
    "build:tauri": "tauri build",
    "build:macos": "tauri build --target universal-apple-darwin",
    "build:macos-intel": "tauri build --target x86_64-apple-darwin",
    "build:macos-arm": "tauri build --target aarch64-apple-darwin"
  }
}
```

**Step 2: 验证脚本**

Run: `pnpm run build:tauri --help`
Expected: 显示 tauri build 帮助信息

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat: 添加 Tauri 开发和构建脚本"
```

---

## 阶段 2：Rust 后端核心功能

### Task 6: 创建错误处理模块

**Files:**
- Create: `src-tauri/src/error.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: 创建错误类型**

Create: `src-tauri/src/error.rs`

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Skill not found: {0}")]
    SkillNotFound(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Registry error: {0}")]
    Registry(String),

    #[error("Config error: {0}")]
    Config(String),

    #[error("Environment not found: {0}")]
    EnvironmentNotFound(String),
}

impl From<AppError> for String {
    fn from(error: AppError) -> String {
        error.to_string()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
```

**Step 2: 在 lib.rs 中导出**

Modify: `src-tauri/src/lib.rs`

```rust
mod error;

pub use error::{AppError, Result};
```

**Step 3: 验证编译**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 4: Commit**

```bash
git add src-tauri/src/error.rs src-tauri/src/lib.rs
git commit -m "feat: 添加错误处理模块"
```

---

### Task 7: 创建数据模型

**Files:**
- Create: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/src/models/skill.rs`
- Create: `src-tauri/src/models/config.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: 创建 Skill 模型**

Create: `src-tauri/src/models/skill.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillInfo {
    pub name: String,
    pub path: String,
    pub source: SkillSource,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installed_environments: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SkillSource {
    Linked,
    Global,
    Marketplace,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceFolder {
    pub path: String,
    pub added_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_scanned: Option<String>,
    pub skill_names: Vec<String>,
}
```

**Step 2: 创建 Config 模型**

Create: `src-tauri/src/models/config.rs`

```rust
use serde::{Deserialize, Serialize};
use super::skill::SourceFolder;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub default_environments: Vec<String>,
    #[serde(default)]
    pub auto_confirm: bool,
    #[serde(default = "default_install_method")]
    pub install_method: InstallMethod,
    #[serde(default)]
    pub auto_launch: bool,
    #[serde(default)]
    pub source_folders: Vec<SourceFolder>,
    #[serde(default)]
    pub enable_watcher: bool,
    #[serde(default = "default_theme")]
    pub theme: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InstallMethod {
    Copy,
    Symlink,
}

fn default_install_method() -> InstallMethod {
    InstallMethod::Copy
}

fn default_theme() -> String {
    "system".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            default_environments: vec!["claude-code".to_string(), "cursor".to_string()],
            auto_confirm: false,
            install_method: InstallMethod::Copy,
            auto_launch: false,
            source_folders: vec![],
            enable_watcher: false,
            theme: "system".to_string(),
        }
    }
}
```

**Step 3: 创建模块导出**

Create: `src-tauri/src/models/mod.rs`

```rust
pub mod skill;
pub mod config;

pub use skill::{SkillInfo, SkillSource, SourceFolder};
pub use config::{AppConfig, InstallMethod};
```

**Step 4: 在 lib.rs 中导出**

Modify: `src-tauri/src/lib.rs`

```rust
mod error;
mod models;

pub use error::{AppError, Result};
pub use models::{SkillInfo, SkillSource, SourceFolder, AppConfig, InstallMethod};
```

**Step 5: 验证编译**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 6: Commit**

```bash
git add src-tauri/src/models/ src-tauri/src/lib.rs
git commit -m "feat: 添加数据模型"
```

---

### Task 8: 创建路径工具模块

**Files:**
- Create: `src-tauri/src/utils/paths.rs`
- Create: `src-tauri/src/utils/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: 创建路径工具**

Create: `src-tauri/src/utils/paths.rs`

```rust
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
```

**Step 2: 创建模块导出**

Create: `src-tauri/src/utils/mod.rs`

```rust
pub mod paths;

pub use paths::*;
```

**Step 3: 在 lib.rs 中导出**

Modify: `src-tauri/src/lib.rs`

```rust
mod error;
mod models;
mod utils;

pub use error::{AppError, Result};
pub use models::{SkillInfo, SkillSource, SourceFolder, AppConfig, InstallMethod};
pub use utils::*;
```

**Step 4: 验证编译**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 5: Commit**

```bash
git add src-tauri/src/utils/ src-tauri/src/lib.rs
git commit -m "feat: 添加路径工具模块"
```

---

### Task 9: 创建配置管理服务

**Files:**
- Create: `src-tauri/src/services/config.rs`
- Modify: `src-tauri/src/services/mod.rs`

**Step 1: 创建配置服务**

Create: `src-tauri/src/services/config.rs`

```rust
use crate::{AppConfig, Result, get_config_path, ensure_j_skills_dir};

pub struct ConfigService;

impl ConfigService {
    pub fn load() -> Result<AppConfig> {
        let config_path = get_config_path()?;

        if !config_path.exists() {
            return Ok(AppConfig::default());
        }

        let content = std::fs::read_to_string(&config_path)?;
        let config: AppConfig = serde_json::from_str(&content)?;
        Ok(config)
    }

    pub fn save(config: &AppConfig) -> Result<()> {
        ensure_j_skills_dir()?;
        let config_path = get_config_path()?;
        let content = serde_json::to_string_pretty(config)?;
        std::fs::write(&config_path, content)?;
        Ok(())
    }

    pub fn update<F>(updater: F) -> Result<AppConfig>
    where
        F: FnOnce(&mut AppConfig),
    {
        let mut config = Self::load()?;
        updater(&mut config);
        Self::save(&config)?;
        Ok(config)
    }
}
```

**Step 2: 创建 services 模块**

Create: `src-tauri/src/services/mod.rs`

```rust
pub mod config;

pub use config::ConfigService;
```

**Step 3: 在 lib.rs 中导出**

Modify: `src-tauri/src/lib.rs`

```rust
mod error;
mod models;
mod utils;
mod services;

pub use error::{AppError, Result};
pub use models::{SkillInfo, SkillSource, SourceFolder, AppConfig, InstallMethod};
pub use utils::*;
pub use services::ConfigService;
```

**Step 4: 验证编译**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 5: Commit**

```bash
git add src-tauri/src/services/ src-tauri/src/lib.rs
git commit -m "feat: 添加配置管理服务"
```

---

### Task 10: 创建注册表服务

**Files:**
- Create: `src-tauri/src/services/registry.rs`
- Modify: `src-tauri/src/services/mod.rs`

**Step 1: 创建注册表数据结构**

Create: `src-tauri/src/services/registry.rs`

```rust
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::{SkillInfo, SkillSource, Result, get_registry_path, ensure_j_skills_dir};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Registry {
    pub skills: HashMap<String, SkillInfo>,
}

impl Registry {
    pub fn load() -> Result<Self> {
        let registry_path = get_registry_path()?;

        if !registry_path.exists() {
            return Ok(Self::default());
        }

        let content = std::fs::read_to_string(&registry_path)?;
        let registry: Registry = serde_json::from_str(&content)?;
        Ok(registry)
    }

    pub fn save(&self) -> Result<()> {
        ensure_j_skills_dir()?;
        let registry_path = get_registry_path()?;
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(&registry_path, content)?;
        Ok(())
    }

    pub fn list_skills(&self) -> Vec<SkillInfo> {
        self.skills.values().cloned().collect()
    }

    pub fn get_skill(&self, name: &str) -> Option<SkillInfo> {
        self.skills.get(name).cloned()
    }

    pub fn register(&mut self, skill: SkillInfo) -> Result<()> {
        self.skills.insert(skill.name.clone(), skill);
        self.save()
    }

    pub fn unregister(&mut self, name: &str) -> Result<()> {
        self.skills.remove(name);
        self.save()
    }

    pub fn update_skill_environments(&mut self, name: &str, environments: Vec<String>) -> Result<()> {
        if let Some(skill) = self.skills.get_mut(name) {
            skill.installed_environments = Some(environments);
            self.save()?;
        }
        Ok(())
    }
}
```

**Step 2: 更新 services 模块导出**

Modify: `src-tauri/src/services/mod.rs`

```rust
pub mod config;
pub mod registry;

pub use config::ConfigService;
pub use registry::Registry;
```

**Step 3: 在 lib.rs 中导出**

Modify: `src-tauri/src/lib.rs`

```rust
mod error;
mod models;
mod utils;
mod services;

pub use error::{AppError, Result};
pub use models::{SkillInfo, SkillSource, SourceFolder, AppConfig, InstallMethod};
pub use utils::*;
pub use services::{ConfigService, Registry};
```

**Step 4: 验证编译**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 5: Commit**

```bash
git add src-tauri/src/services/registry.rs src-tauri/src/services/mod.rs src-tauri/src/lib.rs
git commit -m "feat: 添加注册表服务"
```

---

## 阶段 3：Tauri Commands API

### Task 11: 创建 Skills Commands

**Files:**
- Create: `src-tauri/src/commands/skills.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: 创建 Skills Commands**

Create: `src-tauri/src/commands/skills.rs`

```rust
use tauri::State;
use std::sync::Mutex;
use crate::{SkillInfo, Result, Registry, get_linked_dir};

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
        .map_err(|e| e.to_string())
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
        source: crate::SkillSource::Linked,
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
```

**Step 2: 创建 commands 模块**

Create: `src-tauri/src/commands/mod.rs`

```rust
pub mod skills;

pub use skills::*;
```

**Step 3: 在 lib.rs 中导出**

Modify: `src-tauri/src/lib.rs`

```rust
mod error;
mod models;
mod utils;
mod services;
mod commands;

pub use error::{AppError, Result};
pub use models::{SkillInfo, SkillSource, SourceFolder, AppConfig, InstallMethod};
pub use utils::*;
pub use services::{ConfigService, Registry};
pub use commands::AppState;
```

**Step 4: 验证编译**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 5: Commit**

```bash
git add src-tauri/src/commands/ src-tauri/src/lib.rs
git commit -m "feat: 添加 Skills Tauri Commands"
```

---

### Task 12: 创建 Config Commands

**Files:**
- Create: `src-tauri/src/commands/config.rs`
- Modify: `src-tauri/src/commands/mod.rs`

**Step 1: 创建 Config Commands**

Create: `src-tauri/src/commands/config.rs`

```rust
use crate::{AppConfig, ConfigService};

#[tauri::command]
pub async fn get_config() -> Result<AppConfig, String> {
    ConfigService::load().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_config(config: AppConfig) -> Result<AppConfig, String> {
    ConfigService::save(&config).map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
pub async fn update_config_field(key: String, value: serde_json::Value) -> Result<AppConfig, String> {
    ConfigService::update(|config| {
        match key.as_str() {
            "autoLaunch" => {
                if let Ok(v) = serde_json::from_value(value.clone()) {
                    config.auto_launch = v;
                }
            }
            "enableWatcher" => {
                if let Ok(v) = serde_json::from_value(value.clone()) {
                    config.enable_watcher = v;
                }
            }
            "theme" => {
                if let Ok(v) = serde_json::from_value(value.clone()) {
                    config.theme = v;
                }
            }
            _ => {}
        }
    }).map_err(|e| e.to_string())
}
```

**Step 2: 更新 commands 模块导出**

Modify: `src-tauri/src/commands/mod.rs`

```rust
pub mod skills;
pub mod config;

pub use skills::*;
pub use config::*;
```

**Step 3: 验证编译**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 4: Commit**

```bash
git add src-tauri/src/commands/
git commit -m "feat: 添加 Config Tauri Commands"
```

---

### Task 13: 更新 main.rs 注册 Commands

**Files:**
- Modify: `src-tauri/src/main.rs`

**Step 1: 更新 main.rs**

Replace `src-tauri/src/main.rs`：

```rust
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use j_skills::{AppState, Registry};

fn main() {
    let registry = Registry::load().expect("Failed to load registry");

    tauri::Builder::default()
        .manage(AppState {
            registry: std::sync::Mutex::new(registry),
        })
        .invoke_handler(tauri::generate_handler![
            j_skills::commands::list_skills,
            j_skills::commands::get_skill,
            j_skills::commands::link_skill,
            j_skills::commands::unlink_skill,
            j_skills::commands::get_config,
            j_skills::commands::update_config,
            j_skills::commands::update_config_field,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 2: 验证编译**

Run: `cd src-tauri && cargo build`
Expected: 编译通过

**Step 3: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "feat: 注册 Tauri Commands"
```

---

## 阶段 4：前端 API 迁移

### Task 14: 安装 Tauri API 依赖

**Files:**
- Modify: `packages/web/package.json`

**Step 1: 安装 Tauri API**

Run: `cd packages/web && pnpm add @tauri-apps/api@latest`
Expected: 成功安装

**Step 2: 验证安装**

Run: `cat packages/web/package.json | grep tauri`
Expected: 看到 @tauri-apps/api 依赖

**Step 3: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml
git commit -m "feat: 安装 Tauri API 依赖"
```

---

### Task 15: 创建 Tauri API 适配器

**Files:**
- Create: `packages/web/src/api/tauri.ts`
- Create: `packages/web/src/api/types.ts`

**Step 1: 创建类型定义**

Create: `packages/web/src/api/types.ts`

```typescript
export interface SkillInfo {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  installedEnvironments?: string[]
  installedAt?: string
}

export interface AppConfig {
  defaultEnvironments: string[]
  autoConfirm: boolean
  installMethod: 'copy' | 'symlink'
  autoLaunch: boolean
  sourceFolders: SourceFolder[]
  enableWatcher: boolean
  theme: 'light' | 'dark' | 'system'
}

export interface SourceFolder {
  path: string
  addedAt: string
  lastScanned?: string
  skillNames: string[]
}
```

**Step 2: 创建 Tauri API 适配器**

Create: `packages/web/src/api/tauri.ts`

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { SkillInfo, AppConfig } from './types'

export const api = {
  // Skills
  async listSkills(): Promise<SkillInfo[]> {
    return invoke('list_skills')
  },

  async getSkill(name: string): Promise<SkillInfo> {
    return invoke('get_skill', { name })
  },

  async linkSkill(path: string): Promise<string[]> {
    return invoke('link_skill', { path })
  },

  async unlinkSkill(name: string): Promise<void> {
    return invoke('unlink_skill', { name })
  },

  // Config
  async getConfig(): Promise<AppConfig> {
    return invoke('get_config')
  },

  async updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    return invoke('update_config', { config })
  },
}
```

**Step 3: Commit**

```bash
git add packages/web/src/api/
git commit -m "feat: 创建 Tauri API 适配器"
```

---

### Task 16: 创建环境检测和 API 切换

**Files:**
- Create: `packages/web/src/api/index.ts`
- Create: `packages/web/src/api/http.ts`

**Step 1: 创建 HTTP API 适配器（开发用）**

Create: `packages/web/src/api/http.ts`

```typescript
import ky from 'ky'
import type { SkillInfo, AppConfig } from './types'

const client = ky.create({
  prefixUrl: 'http://localhost:3001/api',
})

export const api = {
  async listSkills(): Promise<SkillInfo[]> {
    const response = await client.get('skills').json<{ success: boolean; data: SkillInfo[] }>()
    return response.data
  },

  async getSkill(name: string): Promise<SkillInfo> {
    const response = await client.get(`skills/${name}`).json<{ success: boolean; data: SkillInfo }>()
    return response.data
  },

  async linkSkill(path: string): Promise<string[]> {
    const response = await client.post('skills/link', { json: { path } }).json<{ success: boolean; data: { linked: string[] } }>()
    return response.data.linked
  },

  async unlinkSkill(name: string): Promise<void> {
    await client.delete(`skills/link/${name}`)
  },

  async getConfig(): Promise<AppConfig> {
    const response = await client.get('config').json<{ success: boolean; data: AppConfig }>()
    return response.data
  },

  async updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    const response = await client.post('config', { json: config }).json<{ success: boolean; data: AppConfig }>()
    return response.data
  },
}
```

**Step 2: 创建 API 入口（自动检测环境）**

Create: `packages/web/src/api/index.ts`

```typescript
import { isTauri } from '@tauri-apps/api/core'

let apiImpl: typeof import('./tauri').api | typeof import('./http').api

export async function initApi() {
  if (await isTauri()) {
    const module = await import('./tauri')
    apiImpl = module.api
  } else {
    const module = await import('./http')
    apiImpl = module.api
  }
}

export const api = new Proxy({} as typeof import('./tauri').api, {
  get(_target, prop) {
    if (!apiImpl) {
      throw new Error('API not initialized. Call initApi() first.')
    }
    return apiImpl[prop as keyof typeof apiImpl]
  },
})
```

**Step 3: Commit**

```bash
git add packages/web/src/api/
git commit -m "feat: 添加 API 环境检测和切换逻辑"
```

---

### Task 17: 更新前端初始化逻辑

**Files:**
- Modify: `packages/web/src/main.tsx`

**Step 1: 在应用启动时初始化 API**

Modify: `packages/web/src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initApi } from './api'

async function bootstrap() {
  await initApi()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

bootstrap()
```

**Step 2: 验证前端构建**

Run: `cd packages/web && pnpm build`
Expected: 构建成功

**Step 3: Commit**

```bash
git add packages/web/src/main.tsx
git commit -m "feat: 更新前端初始化逻辑以支持 Tauri"
```

---

## 阶段 5：测试与验证

### Task 18: 测试 Tauri 应用启动

**Files:**
- 无文件修改

**Step 1: 启动开发服务器**

Run: `pnpm dev:tauri`
Expected:
- Web 开发服务器启动在 http://localhost:5173
- Tauri 窗口打开
- 看到应用界面

**Step 2: 测试 API 调用**

在浏览器控制台执行：
```javascript
window.__TAURI__.invoke('list_skills')
```
Expected: 返回 skills 数组（可能为空）

**Step 3: 验证文件系统访问**

在浏览器控制台执行：
```javascript
window.__TAURI__.invoke('get_config')
```
Expected: 返回配置对象

**Step 4: 停止服务器**

按 Ctrl+C 停止开发服务器

---

### Task 19: 测试 Skills 链接功能

**Files:**
- 无文件修改

**Step 1: 创建测试 skill**

Run:
```bash
mkdir -p /tmp/test-skill
cat > /tmp/test-skill/SKILL.md << 'EOF'
---
name: test-skill
description: A test skill
---

# Test Skill

This is a test skill.
EOF
```
Expected: 创建测试 skill 文件

**Step 2: 启动应用**

Run: `pnpm dev:tauri`
Expected: 应用窗口打开

**Step 3: 测试链接功能**

在浏览器控制台执行：
```javascript
window.__TAURI__.invoke('link_skill', { path: '/tmp/test-skill' })
```
Expected: 返回 `['test-skill']`

**Step 4: 验证链接**

在浏览器控制台执行：
```javascript
window.__TAURI__.invoke('list_skills')
```
Expected: 返回包含 test-skill 的数组

**Step 5: 验证文件系统**

Run: `ls -la ~/.j-skills/linked/`
Expected: 看到 test-skill 符号链接

**Step 6: 清理**

按 Ctrl+C 停止应用

---

### Task 20: 构建生产版本

**Files:**
- 无文件修改

**Step 1: 构建 macOS 应用**

Run: `pnpm build:macos-arm`
Expected:
- 前端构建完成
- Rust 编译完成
- 在 src-tauri/target/release/bundle/ 生成 .app 和 .dmg 文件

**Step 2: 验证构建产物**

Run: `ls -lh src-tauri/target/release/bundle/macos/`
Expected: 看到 j-skills.app

**Step 3: 运行应用**

Run: `open src-tauri/target/release/bundle/macos/j-skills.app`
Expected: 应用启动并正常运行

**Step 4: Commit（如果需要）**

如果有任何构建配置调整：
```bash
git add .
git commit -m "chore: 调整构建配置"
```

---

## 阶段 6：文档更新

### Task 21: 更新 README

**Files:**
- Modify: `README.md`
- Modify: `README_CN.md`

**Step 1: 添加桌面应用说明**

在 `README.md` 中添加新章节：

```markdown
## Desktop App

j-skills is also available as a native desktop application powered by Tauri.

### Installation

Download the latest release for your platform:
- [macOS (Apple Silicon)](https://github.com/wangjs-jacky/jacky-skills-package/releases)
- [macOS (Intel)](https://github.com/wangjs-jacky/jacky-skills-package/releases)

### Build from Source

```bash
# Prerequisites: Rust and Xcode Command Line Tools
pnpm install
pnpm build:macos
```

### Features

- Native desktop experience
- System tray integration
- File watcher for automatic skill syncing
- Offline support
```

**Step 2: 更新中文 README**

在 `README_CN.md` 中添加对应章节。

**Step 3: Commit**

```bash
git add README.md README_CN.md
git commit -m "docs: 添加桌面应用说明"
```

---

### Task 22: 创建 CHANGELOG

**Files:**
- Create: `CHANGELOG.md`

**Step 1: 创建变更日志**

Create: `CHANGELOG.md`

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-03-05

### Added
- Tauri desktop application for macOS
- Native system tray integration
- File watcher for automatic skill syncing
- Desktop settings (auto-launch, theme, etc.)
- Rust backend for better performance

### Changed
- Migrated from Express backend to Rust (Tauri Commands)
- API calls now use Tauri IPC instead of HTTP

### Technical
- Added src-tauri directory with Rust implementation
- Created API adapter layer for Tauri/Web compatibility
- Implemented core services in Rust (Registry, Config, Linker)

## [0.1.0] - 2026-02-13

### Added
- Initial release
- CLI tool for skill management
- Web GUI with React
- Express backend server
- Support for 35+ agent environments
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: 创建 CHANGELOG"
```

---

## 完成检查清单

完成所有任务后，验证以下内容：

- [ ] Tauri 开发环境正常运行 (`pnpm dev:tauri`)
- [ ] 能成功链接 skill (`link_skill` command)
- [ ] 能查看 skills 列表 (`list_skills` command)
- [ ] 配置管理正常 (`get_config`, `update_config` commands)
- [ ] macOS 构建成功 (`pnpm build:macos-arm`)
- [ ] 生成的 .app 文件能正常运行
- [ ] 文档已更新（README, CHANGELOG）
- [ ] 所有改动已提交到 Git

---

## 后续优化建议

完成基础改造后，可以考虑以下优化：

1. **系统托盘功能** - 添加完整的托盘菜单和状态显示
2. **文件监控** - 实现自动同步源文件夹
3. **自动更新** - 集成 Tauri 自动更新 API
4. **Windows/Linux 支持** - 扩展到其他平台
5. **性能优化** - 缓存机制、异步优化
6. **UI 改进** - 暗色主题、键盘快捷键、拖拽操作

---

**计划创建完成！** 🎉

保存位置：`docs/plans/2026-03-05-tauri-migration-implementation.md`
