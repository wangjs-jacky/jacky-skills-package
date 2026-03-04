export interface SkillInfo {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  installedEnvironments?: string[]
  installedAt?: string
}

export interface AppConfig {
  defaultEnvironments: string[]
  autoConfirm: boolean
  installMethod: 'copy' | 'symlink'
  autoLaunch: boolean
  sourceFolders: SourceFolder[]
  enableWatcher: boolean
  theme: 'light' | 'dark' | 'system'
}

export interface SourceFolder {
  path: string
  addedAt: string
  lastScanned?: string
  skillNames: string[]
}
