// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use j_skills_lib::{AppState, Registry};
use tauri::Manager;

fn main() {
    let registry = Registry::load().expect("Failed to load registry");

    let mut builder = tauri::Builder::default()
        .manage(AppState {
            registry: std::sync::Mutex::new(registry),
        })
        .plugin(tauri_plugin_dialog::init());

    // E2E 测试 WebDriver 插件（仅 debug 构建）
    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_webdriver_automation::init());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            j_skills_lib::commands::list_skills,
            j_skills_lib::commands::get_skill,
            j_skills_lib::commands::link_skill,
            j_skills_lib::commands::unlink_skill,
            j_skills_lib::commands::get_skill_files,
            j_skills_lib::commands::get_skill_file_content,
            j_skills_lib::commands::list_source_folders,
            j_skills_lib::commands::remove_source_folder,
            j_skills_lib::commands::install_skill,
            j_skills_lib::commands::uninstall_skill,
            j_skills_lib::commands::export_skills,
            j_skills_lib::commands::list_environments,
            j_skills_lib::commands::environment_status,
            j_skills_lib::commands::get_config,
            j_skills_lib::commands::update_config,
            j_skills_lib::commands::update_config_field,
        ])
        
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 通过环境变量控制是否打开 DevTools（调试用）
            if std::env::var("J_SKILLS_DEVTOOLS").is_ok() {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
