import ky from 'ky'
import type { SkillInfo, AppConfig } from './types'

const client = ky.create({
  prefixUrl: 'http://localhost:3001/api',
})

export const api = {
  async listSkills(): Promise<SkillInfo[]> {
    const response = await client.get('skills').json<{ success: boolean; data: SkillInfo[] }>()
    return response.data
  },

  async getSkill(name: string): Promise<SkillInfo> {
    const response = await client.get(`skills/${name}`).json<{ success: boolean; data: SkillInfo }>()
    return response.data
  },

  async linkSkill(path: string): Promise<string[]> {
    const response = await client.post('skills/link', { json: { path } }).json<{ success: boolean; data: { linked: string[] } }>()
    return response.data.linked
  },

  async unlinkSkill(name: string): Promise<void> {
    await client.delete(`skills/link/${name}`)
  },

  async getConfig(): Promise<AppConfig> {
    const response = await client.get('config').json<{ success: boolean; data: AppConfig }>()
    return response.data
  },

  async updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    const response = await client.post('config', { json: config }).json<{ success: boolean; data: AppConfig }>()
    return response.data
  },
}
