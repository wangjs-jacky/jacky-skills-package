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
 * 确保全局目录存在
 */
export function ensureGlobalDir(): void {
  const globalDir = getGlobalDir()
  const linkedDir = getLinkedDir()
  const globalSkillsDir = getGlobalSkillsDir()
  const cacheDir = getCacheDir()

  if (!existsSync(globalDir)) {
    mkdirSync(globalDir, { recursive: true })
  }
  if (!existsSync(linkedDir)) {
    mkdirSync(linkedDir, { recursive: true })
  }
  if (!existsSync(globalSkillsDir)) {
    mkdirSync(globalSkillsDir, { recursive: true })
  }
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true })
  }
}
