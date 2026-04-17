use std::sync::{Arc, Mutex};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use crate::Registry;

/// Registry 文件监听器句柄
/// 持有 watcher 防止其被 Drop，确保监听持续有效
pub struct RegistryWatcherHandle {
    pub _watcher: std::sync::Mutex<RecommendedWatcher>,
}

/// 启动 registry.json 文件监听器
/// 当文件被修改或创建时，自动重新加载 Registry 到内存状态
pub fn start_registry_watcher(
    registry: Arc<Mutex<Registry>>,
) -> Result<RegistryWatcherHandle, Box<dyn std::error::Error>> {
    let registry_path = crate::get_registry_path()?;

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            match res {
                Ok(event) => {
                    if event.kind.is_modify() || event.kind.is_create() {
                        match Registry::load() {
                            Ok(new_registry) => {
                                if let Ok(mut current) = registry.lock() {
                                    // 保护：如果当前 registry 非空而新加载的为空，
                                    // 可能是文件写入中间状态或异常，跳过此次重载
                                    if !current.skills.is_empty() && new_registry.skills.is_empty() {
                                        log::warn!(
                                            "Registry watcher detected empty registry file while memory has {} skills, skipping reload",
                                            current.skills.len()
                                        );
                                    } else {
                                        *current = new_registry;
                                        log::info!("Registry auto-reloaded from disk");
                                    }
                                }
                            }
                            Err(e) => {
                                log::error!("Failed to reload registry: {}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    log::error!("Registry watcher error: {}", e);
                }
            }
        },
        Config::default(),
    )?;

    watcher.watch(&registry_path, RecursiveMode::NonRecursive)?;

    Ok(RegistryWatcherHandle {
        _watcher: std::sync::Mutex::new(watcher),
    })
}
