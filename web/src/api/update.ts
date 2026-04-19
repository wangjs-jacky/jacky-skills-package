import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export interface UpdateInfo {
  has_update: boolean
  current_version: string
  latest_version: string
  download_url: string
  release_notes: string
  release_date: string
  file_size: number
}

export interface DownloadProgress {
  downloaded: number
  total: number
  percentage: number
}

/** 检查是否有新版本 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  return invoke<UpdateInfo>('check_for_update')
}

/** 下载并打开 DMG 安装包 */
export async function downloadUpdate(url: string, version: string): Promise<string> {
  return invoke<string>('download_update', { url, version })
}

/** 获取当前 App 版本号 */
export async function getAppVersion(): Promise<string> {
  return invoke<string>('get_app_version')
}

/** 监听下载进度事件 */
export async function onDownloadProgress(
  callback: (progress: DownloadProgress) => void,
): Promise<UnlistenFn> {
  return listen<DownloadProgress>('update-download-progress', (event) => {
    callback(event.payload)
  })
}
