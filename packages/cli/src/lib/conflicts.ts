/**
 * Skill 冲突检测模块
 * 同一 category 的多个 skill 自动视为冲突
 */
import { readRegistry, type Registry, type RegistrySkill } from './registry.js'

/**
 * Category 冲突组
 */
export interface CategoryConflict {
  category: string
  skills: string[]
}

/**
 * 冲突检测结果
 */
export interface ConflictResult {
  conflicts: CategoryConflict[]
}

/**
 * 检测技能列表中的冲突
 * 同一 category 下有多个 skill 时视为冲突
 * @param skillNames 要安装的技能名称列表
 * @param registryOrSkills 可选：直接传入 registry 或 skill 列表（用于测试）
 * @returns 冲突检测结果
 */
export function detectConflicts(
  skillNames: string[],
  registryOrSkills?: Registry | RegistrySkill[]
): ConflictResult {
  let skills: RegistrySkill[]

  if (registryOrSkills) {
    if (Array.isArray(registryOrSkills)) {
      skills = registryOrSkills
    } else {
      skills = []
      for (const name of skillNames) {
        const skill = registryOrSkills.skills[name]
        if (skill) skills.push(skill)
      }
    }
  } else {
    const registry = readRegistry()
    skills = []
    for (const name of skillNames) {
      const skill = registry.skills[name]
      if (skill) skills.push(skill)
    }
  }

  // 按 category 分组
  const categoryMap = new Map<string, string[]>()
  for (const skill of skills) {
    if (skill.category) {
      const list = categoryMap.get(skill.category) || []
      list.push(skill.name)
      categoryMap.set(skill.category, list)
    }
  }

  // 同一 category 下有多个 skill 视为冲突
  const conflicts: CategoryConflict[] = []
  for (const [category, names] of categoryMap) {
    if (names.length > 1) {
      conflicts.push({
        category,
        skills: names,
      })
    }
  }

  return { conflicts }
}
