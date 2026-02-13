/**
 * Skills 注册表管理
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getGlobalDir } from './paths.js'

/**
 * 注册表中的 Skill 条目
 */
export interface RegistrySkill {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
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
    }
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as Registry
  } catch {
    return {
      version: REGISTRY_VERSION,
      skills: {},
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
