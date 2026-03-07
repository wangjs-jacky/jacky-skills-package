// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use j_skills_lib::{AppState, Registry};

fn main() {
    let registry = Registry::load().expect("Failed to load registry");

    tauri::Builder::default()
        .manage(AppState {
            registry: std::sync::Mutex::new(registry),
        })
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
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
