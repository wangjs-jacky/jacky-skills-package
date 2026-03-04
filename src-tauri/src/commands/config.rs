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
