import ky from 'ky'
import { invoke } from '@tauri-apps/api/core'

// 动态检测是否在 Tauri 环境中
function isTauriEnv(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const runtime = window as Window & {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
  }

  return Boolean(runtime.__TAURI__ || runtime.__TAURI_INTERNALS__)
}

const api = ky.create({
  prefixUrl: '/api',
  hooks: {
    beforeError: [
      (error) => {
        console.error('API Error:', error)
        return error
      },
    ],
  },
})

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  error: string | null
}

// Types
export interface SkillInfo {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  sourceFolder?: string
  installedEnvironments?: string[]
  installedAt?: string
}

export interface SourceFolder {
  path: string
  addedAt: string
  lastScanned?: string
  skillNames: string[]
}

export interface EnvironmentInfo {
  name: string
  label: string
  globalPath: string
  projectPaths: string[]
  hint?: string
}

export interface EnvironmentStatus {
  name: string
  label: string
  globalExists: boolean
}

export interface ConfigInfo {
  defaultEnvironments?: string[]
  autoConfirm?: boolean
  installMethod?: 'copy' | 'symlink'
}

export interface FileInfo {
  name: string
  type: 'file' | 'directory'
}

// 辅助函数：将 Tauri 命令结果包装为 ApiResponse
function tauriResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data, error: null }
}

function tauriError<T>(error: string): ApiResponse<T> {
  return { success: false, data: null as T, error }
}

// 辅助函数：安全调用 Tauri 命令
async function safeTauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const result = await invoke<T>(cmd, args)
    return tauriResponse(result)
  } catch (err) {
    console.error(`Tauri command ${cmd} failed:`, err)
    return tauriError<T>(String(err))
  }
}

// Skills API
export const skillsApi = {
  async list(): Promise<ApiResponse<SkillInfo[]>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<SkillInfo[]>('list_skills')
    }
    return api.get('skills').json<ApiResponse<SkillInfo[]>>()
  },

  async get(name: string): Promise<ApiResponse<SkillInfo>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<SkillInfo>('get_skill', { name })
    }
    return api.get(`skills/${name}`).json<ApiResponse<SkillInfo>>()
  },

  async unlink(name: string): Promise<ApiResponse<{ name: string }>> {
    if (isTauriEnv()) {
      const result = await safeTauriInvoke<void>('unlink_skill', { name })
      if (result.success) {
        return tauriResponse({ name })
      }
      return { success: false, data: null as unknown as { name: string }, error: result.error }
    }
    return api.delete(`skills/link/${name}`).json<ApiResponse<{ name: string }>>()
  },

  async getFiles(name: string): Promise<ApiResponse<FileInfo[]>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<FileInfo[]>('get_skill_files', { name })
    }
    return api.get(`skills/${name}/files`).json<ApiResponse<FileInfo[]>>()
  },

  async getFileContent(name: string, path: string): Promise<ApiResponse<{ path: string; content: string }>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<{ path: string; content: string }>('get_skill_file_content', { name, path })
    }
    return api.get(`skills/${name}/files/${path}`).json<ApiResponse<{ path: string; content: string }>>()
  },

  async link(skillPath: string): Promise<ApiResponse<{ linked: string[]; count: number }>> {
    if (isTauriEnv()) {
      const result = await safeTauriInvoke<string[]>('link_skill', { path: skillPath })
      if (result.success && result.data) {
        return tauriResponse({ linked: result.data, count: result.data.length })
      }
      return { success: false, data: null as unknown as { linked: string[]; count: number }, error: result.error }
    }
    return api.post('skills/link', { json: { path: skillPath } }).json<ApiResponse<{ linked: string[]; count: number }>>()
  },

  async install(name: string, env: string, global: boolean = true): Promise<ApiResponse<{ name: string; env: string; path: string }>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<{ name: string; env: string; path: string }>('install_skill', { name, env, global })
    }
    return api.post(`skills/${name}/install`, { json: { env, global } }).json<ApiResponse<{ name: string; env: string; path: string }>>()
  },

  async uninstall(name: string, env: string, global: boolean = true): Promise<ApiResponse<{ name: string; env: string; removed: boolean }>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<{ name: string; env: string; removed: boolean }>('uninstall_skill', { name, env, global })
    }
    return api.post(`skills/${name}/uninstall`, { json: { env, global } }).json<ApiResponse<{ name: string; env: string; removed: boolean }>>()
  },

  // 源文件夹管理
  async listSourceFolders(): Promise<ApiResponse<SourceFolder[]>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<SourceFolder[]>('list_source_folders')
    }
    return api.get('skills/source-folders').json<ApiResponse<SourceFolder[]>>()
  },

  async removeSourceFolder(path: string): Promise<ApiResponse<{ path: string }>> {
    if (isTauriEnv()) {
      const result = await safeTauriInvoke<void>('remove_source_folder', { path })
      if (result.success) {
        return tauriResponse({ path })
      }
      return { success: false, data: null as unknown as { path: string }, error: result.error }
    }
    return api.delete(`skills/source-folders/${encodeURIComponent(path)}`).json<ApiResponse<{ path: string }>>()
  },

  // 导出
  async export(skillNames: string[], targetPath: string): Promise<ApiResponse<{ exported: string[]; errors: string[]; targetPath: string }>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<{ exported: string[]; errors: string[]; targetPath: string }>('export_skills', { skillNames, targetPath })
    }
    return api.post('skills/export', { json: { skillNames, targetPath } }).json<ApiResponse<{ exported: string[]; errors: string[]; targetPath: string }>>()
  },
}

// Environments API
export const environmentsApi = {
  async list(): Promise<ApiResponse<EnvironmentInfo[]>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<EnvironmentInfo[]>('list_environments')
    }
    return api.get('environments').json<ApiResponse<EnvironmentInfo[]>>()
  },

  async status(): Promise<ApiResponse<EnvironmentStatus[]>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<EnvironmentStatus[]>('environment_status')
    }
    return api.get('environments/status').json<ApiResponse<EnvironmentStatus[]>>()
  },
}

// Config API
export const configApi = {
  async get(): Promise<ApiResponse<ConfigInfo>> {
    if (isTauriEnv()) {
      const result = await safeTauriInvoke<{
        defaultEnvironments?: string[]
        autoConfirm?: boolean
        installMethod?: string
      }>('get_config')
      return result as ApiResponse<ConfigInfo>
    }
    return api.get('config').json<ApiResponse<ConfigInfo>>()
  },

  async update(config: Partial<ConfigInfo>): Promise<ApiResponse<ConfigInfo>> {
    if (isTauriEnv()) {
      // 先读取当前配置,避免覆盖未提供的字段
      const currentResult = await safeTauriInvoke<{
        defaultEnvironments: string[]
        autoConfirm: boolean
        installMethod: string
        autoLaunch: boolean
        sourceFolders: Array<{
          path: string
          addedAt: string
          lastScanned?: string
          skillNames: string[]
        }>
        enableWatcher: boolean
        theme: string
      }>('get_config')

      if (!currentResult.success) {
        return { success: false, data: null as unknown as ConfigInfo, error: currentResult.error }
      }

      const current = currentResult.data

      // 合并配置:只更新提供的字段,保留其他字段
      const tauriConfig = {
        defaultEnvironments: config.defaultEnvironments ?? current.defaultEnvironments,
        autoConfirm: config.autoConfirm ?? current.autoConfirm,
        installMethod: config.installMethod ?? current.installMethod,
        autoLaunch: current.autoLaunch,
        sourceFolders: current.sourceFolders,  // 🔥 保留现有 sourceFolders
        enableWatcher: current.enableWatcher,
        theme: current.theme,
      }
      return safeTauriInvoke<ConfigInfo>('update_config', { config: tauriConfig })
    }
    return api.put('config', { json: config }).json<ApiResponse<ConfigInfo>>()
  },
}
