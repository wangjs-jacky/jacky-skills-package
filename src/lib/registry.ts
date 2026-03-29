/**
 * Skills 注册表管理
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getGlobalDir } from './paths.js'

/**
 * 源文件夹记录
 */
export interface SourceFolder {
  path: string              // 文件夹路径
  addedAt: string          // 添加时间
  lastScanned: string      // 最后扫描时间
  skillNames: string[]     // 包含的 skill 名称列表
}

/**
 * 注册表中的 Skill 条目
 */
export interface RegistrySkill {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  sourceFolder?: string      // 来源文件夹路径
  installedEnvironments?: string[]
  installedAt?: string
  version?: string
}

/**
 * 注册表结构
 */
export interface Registry {
  version: string
  skills: Record<string, RegistrySkill>
  sourceFolders: SourceFolder[]  // 源文件夹列表
}

const REGISTRY_VERSION = '1.0.0'

/**
 * 获取注册表文件路径
 */
function getRegistryFilePath(): string {
  return join(getGlobalDir(), 'registry.json')
}

/**
 * 读取注册表
 */
export function readRegistry(): Registry {
  const filePath = getRegistryFilePath()

  if (!existsSync(filePath)) {
    return {
      version: REGISTRY_VERSION,
      skills: {},
      sourceFolders: [],
    }
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const registry = JSON.parse(content) as Registry
    // 兼容旧版本数据
    if (!registry.sourceFolders) {
      registry.sourceFolders = []
    }
    return registry
  } catch {
    return {
      version: REGISTRY_VERSION,
      skills: {},
      sourceFolders: [],
    }
  }
}

/**
 * 写入注册表
 */
export function writeRegistry(registry: Registry): void {
  const filePath = getRegistryFilePath()
  writeFileSync(filePath, JSON.stringify(registry, null, 2), 'utf-8')
}

/**
 * 注册 skill
 */
export function registerSkill(skill: RegistrySkill): void {
  const registry = readRegistry()
  registry.skills[skill.name] = {
    ...skill,
    installedAt: skill.installedAt || new Date().toISOString(),
  }
  writeRegistry(registry)
}

/**
 * 注销 skill
 */
export function unregisterSkill(name: string): boolean {
  const registry = readRegistry()
  if (registry.skills[name]) {
    delete registry.skills[name]
    writeRegistry(registry)
    return true
  }
  return false
}

/**
 * 查询 skill
 */
export function getSkill(name: string): RegistrySkill | undefined {
  const registry = readRegistry()
  return registry.skills[name]
}

/**
 * 列出所有 skills
 */
export function listSkills(filter?: {
  source?: RegistrySkill['source']
  environment?: string
}): RegistrySkill[] {
  const registry = readRegistry()
  let skills = Object.values(registry.skills)

  if (filter?.source) {
    skills = skills.filter((s) => s.source === filter.source)
  }

  if (filter?.environment) {
    skills = skills.filter(
      (s) => s.installedEnvironments?.includes(filter.environment!)
    )
  }

  return skills
}

/**
 * 更新 skill 的安装环境
 */
export function updateSkillEnvironments(
  name: string,
  environments: string[]
): void {
  const registry = readRegistry()
  if (registry.skills[name]) {
    registry.skills[name].installedEnvironments = environments
    writeRegistry(registry)
  }
}

/**
 * 检查 skill 是否已注册
 */
export function isSkillRegistered(name: string): boolean {
  const registry = readRegistry()
  return name in registry.skills
}

// ==================== 源文件夹管理 ====================

/**
 * 添加源文件夹记录
 */
export function addSourceFolder(folder: SourceFolder): void {
  const registry = readRegistry()
  const existing = registry.sourceFolders.findIndex(f => f.path === folder.path)
  if (existing >= 0) {
    registry.sourceFolders[existing] = folder
  } else {
    registry.sourceFolders.push(folder)
  }
  writeRegistry(registry)
}

/**
 * 获取源文件夹列表
 */
export function listSourceFolders(): SourceFolder[] {
  const registry = readRegistry()
  return registry.sourceFolders || []
}

/**
 * 获取源文件夹
 */
export function getSourceFolder(path: string): SourceFolder | undefined {
  const registry = readRegistry()
  return registry.sourceFolders.find(f => f.path === path)
}

/**
 * 更新源文件夹
 */
export function updateSourceFolder(path: string, updates: Partial<SourceFolder>): boolean {
  const registry = readRegistry()
  const index = registry.sourceFolders.findIndex(f => f.path === path)
  if (index >= 0) {
    registry.sourceFolders[index] = { ...registry.sourceFolders[index], ...updates }
    writeRegistry(registry)
    return true
  }
  return false
}

/**
 * 移除源文件夹记录
 */
export function removeSourceFolder(path: string): boolean {
  const registry = readRegistry()
  const index = registry.sourceFolders.findIndex(f => f.path === path)
  if (index >= 0) {
    registry.sourceFolders.splice(index, 1)
    writeRegistry(registry)
    return true
  }
  return false
}

/**
 * 更新 skill 的路径（doctor 修复后使用）
 */
export function updateSkillPath(name: string, newPath: string): boolean {
  const registry = readRegistry()
  if (registry.skills[name]) {
    registry.skills[name].path = newPath
    writeRegistry(registry)
    return true
  }
  return false
}
