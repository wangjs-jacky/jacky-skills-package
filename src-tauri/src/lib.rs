mod error;
mod models;
mod utils;
mod services;
pub mod commands;

pub use error::{AppError, Result};
pub use models::{SkillInfo, SkillSource, SourceFolder, AppConfig, InstallMethod};
pub use utils::*;
pub use services::{ConfigService, Registry, has_skill_hooks, has_skill_hooks_in_settings, merge_skill_hooks, remove_skill_hooks, start_registry_watcher};
pub use commands::AppState;
pub use commands::monitor;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // 启动 registry 文件监听器
      let state = app.state::<AppState>();
      let registry_arc = state.registry.clone();
      match start_registry_watcher(registry_arc) {
        Ok(handle) => {
          app.manage(handle);
        }
        Err(e) => {
          log::error!("Failed to start registry watcher: {}", e);
        }
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
