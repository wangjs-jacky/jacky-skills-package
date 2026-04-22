// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use j_skills_lib::{AppState, Registry, start_registry_watcher};
use std::sync::{Arc, Mutex};
use tauri::Manager;

fn main() {
    let registry = Registry::load().expect("Failed to load registry");
    let app_state = AppState {
        registry: Arc::new(Mutex::new(registry)),
    };

    let mut builder = tauri::Builder::default()
        .manage(app_state)
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
            j_skills_lib::commands::monitor_check_hooks,
            j_skills_lib::commands::monitor_install_hooks,
            j_skills_lib::commands::monitor_uninstall_hooks,
            j_skills_lib::commands::monitor_check_daemon,
            j_skills_lib::commands::monitor_start_daemon,
            j_skills_lib::commands::monitor_stop_daemon,
            j_skills_lib::commands::monitor_get_config,
            j_skills_lib::commands::monitor_set_config,
            j_skills_lib::commands::monitor_fetch,
            j_skills_lib::commands::activate_terminal,
            j_skills_lib::commands::detect_terminals,
            j_skills_lib::commands::check_terminal_extension,
            j_skills_lib::commands::install_terminal_extension,
            j_skills_lib::commands::list_claude_md_files,
            j_skills_lib::commands::read_claude_md,
            j_skills_lib::commands::check_for_update,
            j_skills_lib::commands::download_update,
            j_skills_lib::commands::get_app_version,
            j_skills_lib::commands::list_profiles,
            j_skills_lib::commands::get_profile,
            j_skills_lib::commands::create_profile,
            j_skills_lib::commands::update_profile,
            j_skills_lib::commands::rename_profile,
            j_skills_lib::commands::delete_profile,
            j_skills_lib::commands::set_active_profile,
            j_skills_lib::commands::get_active_profile,
            j_skills_lib::commands::add_skill_to_profile,
            j_skills_lib::commands::remove_skill_from_profile,
            j_skills_lib::commands::install_profile,
            j_skills_lib::commands::switch_profile,
        ])

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
                    log::info!("Registry watcher started successfully");
                }
                Err(e) => {
                    log::error!("Failed to start registry watcher: {}", e);
                }
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
