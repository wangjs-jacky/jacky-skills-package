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
  installedEnvironments?: string[]
  installedAt?: string
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
    api.post('skills/link', { json: { path: skillPath } }).json<ApiResponse<{ name: string; path: string }>>(),
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
