/**
 * 全局目录管理
 */
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// 全局目录名称
const GLOBAL_DIR_NAME = '.j-skills'

/**
 * 获取全局目录路径
 */
export function getGlobalDir(): string {
  return join(homedir(), GLOBAL_DIR_NAME)
}

/**
 * 获取 linked 目录路径（存放 link 的符号链接）
 */
export function getLinkedDir(): string {
  return join(getGlobalDir(), 'linked')
}

/**
 * 获取全局 skills 目录路径
 */
export function getGlobalSkillsDir(): string {
  return join(getGlobalDir(), 'global')
}

/**
 * 获取缓存目录路径
 */
export function getCacheDir(): string {
  return join(getGlobalDir(), 'cache')
}

/**
 * 获取配置文件路径
 */
export function getConfigPath(): string {
  return join(getGlobalDir(), 'config.json')
}

/**
 * 获取注册表文件路径
 */
export function getRegistryPath(): string {
  return join(getGlobalDir(), 'registry.json')
}

/**
 * 获取 Profile 目录路径
 */
export function getProfilesDir(): string {
  return join(getGlobalDir(), 'profiles')
}

/**
 * 获取活跃 Profile 文件路径
 */
export function getActiveProfilePath(): string {
  return join(getProfilesDir(), '_active.json')
}

/**
 * 获取 Profile 文件路径
 */
export function getProfilePath(name: string): string {
  return join(getProfilesDir(), `${name}.json`)
}

/**
 * 获取项目级 Profile 文件路径
 */
export function getProjectProfilePath(projectDir: string = process.cwd()): string {
  return join(projectDir, '.j-skills', 'profile.json')
}

/**
 * 确保全局目录存在
 */
export function ensureGlobalDir(): void {
  const globalDir = getGlobalDir()
  const linkedDir = getLinkedDir()
  const globalSkillsDir = getGlobalSkillsDir()
  const cacheDir = getCacheDir()
  const profilesDir = getProfilesDir()

  const dirs = [globalDir, linkedDir, globalSkillsDir, cacheDir, profilesDir]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}
