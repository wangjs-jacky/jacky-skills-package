/**
 * Profile 存储管理
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, mkdirSync } from 'fs'
import { basename, dirname, join } from 'path'
import {
  getProfilesDir,
  getActiveProfilePath,
  getProfilePath,
  getProjectProfilePath,
  ensureGlobalDir,
} from './paths.js'
import type { Profile, ActiveProfileRef } from './types.js'

const DEFAULT_PROFILE_NAME = 'default'

/**
 * 获取默认 Profile
 */
export function getDefaultProfile(): Profile {
  return {
    name: DEFAULT_PROFILE_NAME,
    description: '默认 Profile',
    version: '1.0.0',
    workflow: 'superpowers',
    skills: {
      include: [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
    },
  }
}

/**
 * 获取前端 Profile
 */
export function getFrontendProfile(): Profile {
  return {
    name: 'frontend',
    description: '前端开发 Profile',
    version: '1.0.0',
    workflow: 'superpowers',
    skills: {
      include: [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
    },
  }
}

/**
 * 获取后端 Profile
 */
export function getBackendProfile(): Profile {
  return {
    name: 'backend',
    description: '后端开发 Profile',
    version: '1.0.0',
    workflow: 'superpowers',
    skills: {
      include: [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
    },
  }
}

/**
 * 列出所有 Profile
 */
export function listProfiles(): Profile[] {
  ensureGlobalDir()
  const profilesDir = getProfilesDir()

  if (!existsSync(profilesDir)) {
    return []
  }

  const files = readdirSync(profilesDir)
  const profiles: Profile[] = []

  for (const file of files) {
    // 只读取 .json 文件，排除 _active.json
    if (file.endsWith('.json') && file !== '_active.json') {
      const filePath = join(profilesDir, file)
      try {
        const content = readFileSync(filePath, 'utf-8')
        const profile = JSON.parse(content) as Profile
        profiles.push(profile)
      } catch (error) {
        // 忽略解析错误的文件
        console.warn(`Warning: Failed to parse profile file ${file}`)
      }
    }
  }

  return profiles
}

/**
 * 获取 Profile
 */
export function getProfile(name: string): Profile | null {
  ensureGlobalDir()
  const profilePath = getProfilePath(name)

  if (!existsSync(profilePath)) {
    return null
  }

  try {
    const content = readFileSync(profilePath, 'utf-8')
    return JSON.parse(content) as Profile
  } catch (error) {
    return null
  }
}

/**
 * 保存 Profile
 */
export function saveProfile(profile: Profile): void {
  ensureGlobalDir()
  const profilePath = getProfilePath(profile.name)

  // 更新 metadata
  if (!profile.metadata) {
    profile.metadata = {}
  }
  profile.metadata.updatedAt = new Date().toISOString()

  writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8')
}

/**
 * 删除 Profile
 */
export function deleteProfile(name: string): boolean {
  // 不允许删除 default
  if (name === DEFAULT_PROFILE_NAME) {
    return false
  }

  ensureGlobalDir()
  const profilePath = getProfilePath(name)

  if (!existsSync(profilePath)) {
    return false
  }

  try {
    unlinkSync(profilePath)
    return true
  } catch (error) {
    return false
  }
}

/**
 * 获取当前激活的 Profile
 */
export function getActiveProfile(projectDir?: string): {
  profile: Profile
  scope: 'global' | 'project'
} | null {
  ensureGlobalDir()

  // 优先检查项目级 Profile
  const projectProfilePath = getProjectProfilePath(projectDir)
  if (existsSync(projectProfilePath)) {
    try {
      const content = readFileSync(projectProfilePath, 'utf-8')
      const profile = JSON.parse(content) as Profile
      return { profile, scope: 'project' }
    } catch (error) {
      // 项目级 Profile 解析失败，继续检查全局
    }
  }

  // 检查全局激活的 Profile
  const activeProfilePath = getActiveProfilePath()
  if (existsSync(activeProfilePath)) {
    try {
      const content = readFileSync(activeProfilePath, 'utf-8')
      const activeRef = JSON.parse(content) as ActiveProfileRef
      const profile = getProfile(activeRef.name)
      if (profile) {
        return { profile, scope: 'global' }
      }
    } catch (error) {
      // 激活配置解析失败
    }
  }

  // 返回默认 Profile
  const defaultProfile = getProfile(DEFAULT_PROFILE_NAME)
  if (defaultProfile) {
    return { profile: defaultProfile, scope: 'global' }
  }

  return null
}

/**
 * 设置激活的 Profile
 */
export function setActiveProfile(
  name: string,
  scope: 'global' | 'project',
  projectDir?: string
): boolean {
  // 确保 Profile 存在
  if (!profileExists(name)) {
    return false
  }

  ensureGlobalDir()

  if (scope === 'project') {
    // 项目级：在项目目录下创建 .j-skills/profile.json
    const projectProfilePath = getProjectProfilePath(projectDir)
    const profileDir = dirname(projectProfilePath)

    // 确保项目级目录存在
    if (!existsSync(profileDir)) {
      mkdirSync(profileDir, { recursive: true })
    }

    // 读取 Profile 并写入项目目录
    const profile = getProfile(name)
    if (!profile) {
      return false
    }

    // 创建项目级 Profile 引用
    const projectProfile: ActiveProfileRef = {
      name,
      scope: 'project',
      activatedAt: new Date().toISOString(),
      projectPath: projectDir || process.cwd(),
    }

    writeFileSync(projectProfilePath, JSON.stringify(projectProfile, null, 2), 'utf-8')
    return true
  } else {
    // 全局级：更新 _active.json
    // 如果存在项目级 Profile，需要删除它
    const projectProfilePath = getProjectProfilePath(projectDir)
    if (projectDir && existsSync(projectProfilePath)) {
      try {
        unlinkSync(projectProfilePath)
      } catch (error) {
        // 忽略删除失败
      }
    }

    const activeProfilePath = getActiveProfilePath()
    const activeRef: ActiveProfileRef = {
      name,
      scope: 'global',
      activatedAt: new Date().toISOString(),
    }

    writeFileSync(activeProfilePath, JSON.stringify(activeRef, null, 2), 'utf-8')
    return true
  }
}

/**
 * 复制 Profile
 */
export function duplicateProfile(fromName: string, toName: string): Profile | null {
  const sourceProfile = getProfile(fromName)
  if (!sourceProfile) {
    return null
  }

  // 检查目标是否已存在
  if (profileExists(toName)) {
    return null
  }

  // 创建新 Profile
  const newProfile: Profile = {
    ...sourceProfile,
    name: toName,
    metadata: {
      ...sourceProfile.metadata,
      createdAt: new Date().toISOString(),
    },
  }

  saveProfile(newProfile)
  return newProfile
}

/**
 * 检查 Profile 是否存在
 */
export function profileExists(name: string): boolean {
  ensureGlobalDir()
  const profilePath = getProfilePath(name)
  return existsSync(profilePath)
}

/**
 * 初始化默认 Profiles
 */
export function initializeDefaultProfiles(): void {
  ensureGlobalDir()

  // 创建 default Profile
  if (!profileExists(DEFAULT_PROFILE_NAME)) {
    saveProfile(getDefaultProfile())
  }

  // 创建 frontend Profile
  if (!profileExists('frontend')) {
    saveProfile(getFrontendProfile())
  }

  // 创建 backend Profile
  if (!profileExists('backend')) {
    saveProfile(getBackendProfile())
  }
}
