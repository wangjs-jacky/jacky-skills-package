// API 响应格式
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
}

// Skill 信息
export interface SkillInfo {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  installedEnvironments?: string[]
  installedAt?: string
}

// 环境信息
export interface EnvironmentInfo {
  name: string
  label: string
  globalPath: string
  projectPaths: string[]
  exists: boolean
}

// 配置信息
export interface ConfigInfo {
  defaultEnvironments?: string[]
  autoConfirm?: boolean
  installMethod?: 'copy' | 'symlink'
}
