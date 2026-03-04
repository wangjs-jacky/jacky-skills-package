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
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
