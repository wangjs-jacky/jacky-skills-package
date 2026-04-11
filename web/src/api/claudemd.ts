import { invoke } from '@tauri-apps/api/core'
import { getApiTransport, type ApiResponse } from './client'

export interface ClaudeMDInfo {
  path: string
  label: string
  exists: boolean
  content: string
  size_bytes: number
}

export const claudemdApi = {
  async listFiles(): Promise<ApiResponse<ClaudeMDInfo[]>> {
    if (getApiTransport() === 'tauri') {
      try {
        const result = await invoke<ClaudeMDInfo[]>('list_claude_md_files')
        return { success: true, data: result, error: null }
      } catch (err) {
        return { success: false, data: [], error: String(err) }
      }
    }
    return { success: false, data: [], error: '仅支持桌面端' }
  },

  async readContent(path: string): Promise<ApiResponse<ClaudeMDInfo>> {
    if (getApiTransport() === 'tauri') {
      try {
        const result = await invoke<ClaudeMDInfo>('read_claude_md', { path })
        return { success: true, data: result, error: null }
      } catch (err) {
        return { success: false, data: null as unknown as ClaudeMDInfo, error: String(err) }
      }
    }
    return { success: false, data: null as unknown as ClaudeMDInfo, error: '仅支持桌面端' }
  },
}
