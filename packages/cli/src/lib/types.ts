/**
 * j-skills 类型定义
 */

/**
 * 工作流方案类型
 */
export type WorkflowType = 'superpowers' | 'openspec' | 'spiderkit' | 'native'

/**
 * Profile Skills 配置
 */
export interface ProfileSkills {
  include: string[]    // 包含的 skills
  exclude?: string[]   // 排除的 skills（用于继承时）
}

/**
 * 插件配置
 */
export interface ProfilePlugin {
  name: string
  version?: string
  enabled: boolean
}

/**
 * IDE 特定配置
 */
export interface ProfileIdeConfig {
  claude?: {
    planMode?: string
    hooks?: Record<string, any>
  }
  cursor?: Record<string, any>
  windsurf?: Record<string, any>
}

/**
 * Profile 元数据
 */
export interface ProfileMetadata {
  author?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

/**
 * Profile 配置
 */
export interface Profile {
  name: string
  description?: string
  version: string
  workflow: WorkflowType
  skills: ProfileSkills
  plugins?: ProfilePlugin[]
  ideConfig?: ProfileIdeConfig
  metadata?: ProfileMetadata
}

/**
 * 活跃 Profile 引用
 */
export interface ActiveProfileRef {
  name: string
  scope: 'global' | 'project'
  activatedAt: string
  projectPath?: string  // 项目级时记录路径
}

/**
 * 工作流方案定义
 */
export interface WorkflowScheme {
  id: WorkflowType
  name: string
  description: string
  plugins: {
    packageId: string
    version?: string
    required: boolean
  }[]
  bundledSkills?: string[]
  conflictsWith?: WorkflowType[]
  config?: Record<string, any>
}
