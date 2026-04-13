/**
 * Tauri 命令封装
 * 在 WebDriverIO 浏览器环境中通过 __TAURI_INTERNALS__.invoke 调用 Rust 后端命令。
 */

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return browser.execute(
    (command: string, payload: string) => {
      return (window as any).__TAURI_INTERNALS__.invoke(command, JSON.parse(payload))
    },
    cmd,
    JSON.stringify(args || {})
  ) as Promise<T>
}

export const tauri = {
  invoke,

  // ─── Skills ───
  listSkills: () => invoke('list_skills'),
  getSkill: (name: string) => invoke('get_skill', { name }),
  linkSkill: (path: string) => invoke('link_skill', { path }),
  unlinkSkill: (name: string) => invoke('unlink_skill', { name }),
  installSkill: (name: string, env: string) => invoke('install_skill', { name, env }),
  uninstallSkill: (name: string, env: string) => invoke('uninstall_skill', { name, env }),

  // ─── Config ───
  getConfig: () => invoke('get_config'),
  updateConfig: (config: any) => invoke('update_config', { config }),
  updateConfigField: (key: string, value: any) => invoke('update_config_field', { key, value }),

  // ─── Develop ───
  listSourceFolders: () => invoke('list_source_folders'),
  removeSourceFolder: (path: string) => invoke('remove_source_folder', { path }),

  // ─── Monitor ───
  monitorGetConfig: () => invoke('monitor_get_config'),
  monitorSetConfig: (config: any) => invoke('monitor_set_config', { config }),
  monitorCheckHooks: () => invoke('monitor_check_hooks'),
  monitorInstallHooks: () => invoke('monitor_install_hooks'),
  monitorUninstallHooks: () => invoke('monitor_uninstall_hooks'),
  monitorCheckDaemon: () => invoke('monitor_check_daemon'),
  monitorStartDaemon: () => invoke('monitor_start_daemon'),
  monitorStopDaemon: () => invoke('monitor_stop_daemon'),
  monitorFetch: (path: string) => invoke('monitor_fetch', { path }),
}
