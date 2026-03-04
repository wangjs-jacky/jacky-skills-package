import { invoke } from '@tauri-apps/api/core'
import type { SkillInfo, AppConfig } from './types'

export const api = {
  // Skills
  async listSkills(): Promise<SkillInfo[]> {
    return invoke('list_skills')
  },

  async getSkill(name: string): Promise<SkillInfo> {
    return invoke('get_skill', { name })
  },

  async linkSkill(path: string): Promise<string[]> {
    return invoke('link_skill', { path })
  },

  async unlinkSkill(name: string): Promise<void> {
    return invoke('unlink_skill', { name })
  },

  // Config
  async getConfig(): Promise<AppConfig> {
    return invoke('get_config')
  },

  async updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    return invoke('update_config', { config })
  },
}
