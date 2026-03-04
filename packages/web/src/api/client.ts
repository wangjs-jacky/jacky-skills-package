import ky from 'ky'

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
  lastScanned: string
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

// Skills API
export const skillsApi = {
  list: () => api.get('skills').json<ApiResponse<SkillInfo[]>>(),
  get: (name: string) => api.get(`skills/${name}`).json<ApiResponse<SkillInfo>>(),
  unlink: (name: string) => api.delete(`skills/link/${name}`).json<ApiResponse<{ name: string }>>(),
  getFiles: (name: string) => api.get(`skills/${name}/files`).json<ApiResponse<FileInfo[]>>(),
  getFileContent: (name: string, path: string) =>
    api.get(`skills/${name}/files/${path}`).json<ApiResponse<{ path: string; content: string }>>(),
  link: (skillPath: string) =>
    api.post('skills/link', { json: { path: skillPath } }).json<ApiResponse<{ linked: string[]; count: number }>>(),
  install: (name: string, env: string, global: boolean = true) =>
    api.post(`skills/${name}/install`, { json: { env, global } }).json<ApiResponse<{ name: string; env: string; path: string }>>(),
  uninstall: (name: string, env: string, global: boolean = true) =>
    api.post(`skills/${name}/uninstall`, { json: { env, global } }).json<ApiResponse<{ name: string; env: string; removed: boolean }>>(),

  // 源文件夹管理
  listSourceFolders: () =>
    api.get('skills/source-folders').json<ApiResponse<SourceFolder[]>>(),

  removeSourceFolder: (path: string) =>
    api.delete(`skills/source-folders/${encodeURIComponent(path)}`).json<ApiResponse<{ path: string }>>(),

  // 导出
  export: (skillNames: string[], targetPath: string) =>
    api.post('skills/export', { json: { skillNames, targetPath } }).json<ApiResponse<{ exported: string[]; errors: string[]; targetPath: string }>>(),
}

// Environments API
export const environmentsApi = {
  list: () => api.get('environments').json<ApiResponse<EnvironmentInfo[]>>(),
  status: () => api.get('environments/status').json<ApiResponse<EnvironmentStatus[]>>(),
}

// Config API
export const configApi = {
  get: () => api.get('config').json<ApiResponse<ConfigInfo>>(),
  update: (config: Partial<ConfigInfo>) =>
    api.put('config', { json: config }).json<ApiResponse<ConfigInfo>>(),
}
