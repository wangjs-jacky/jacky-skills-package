/**
 * Skill Metadata 解析模块
 * 从 SKILL.md frontmatter 或 package.json 中解析 skill 的 category
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { verbose } from './log.js'

/**
 * Skill 元数据结构
 */
export interface SkillMetadata {
  category?: string
}

/**
 * 从 SKILL.md 解析 frontmatter（轻量 YAML 解析）
 * 仅支持简单键值对和字符串数组
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!match) return {}

  const yaml = match[1]
  const result: Record<string, unknown> = {}

  // 简单 YAML 解析：只处理顶层键值对和字符串数组
  const lines = yaml.split('\n')
  let currentKey: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // 检查是否为数组项（以 - 开头且缩进）
    if (line.startsWith('  -') || line.startsWith('-')) {
      if (currentKey) {
        const item = trimmed.replace(/^-\s*/, '').trim()
        const arr = result[currentKey]
        if (Array.isArray(arr)) {
          arr.push(item)
        }
      }
      continue
    }

    // 键值对
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim()
      const value = trimmed.slice(colonIdx + 1).trim()

      currentKey = key

      if (!value) {
        // 空值，可能是数组开始
        result[key] = []
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // 内联数组 [a, b, c]
        try {
          result[key] = value
            .slice(1, -1)
            .split(',')
            .map((s) => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean)
        } catch {
          result[key] = value
        }
      } else {
        // 简单字符串值
        result[key] = value.replace(/^["']|["']$/g, '')
      }
    }
  }

  return result
}

/**
 * 从 package.json 解析 j-skills 元数据
 */
function parsePackageJson(skillPath: string): SkillMetadata {
  const pkgPath = join(skillPath, 'package.json')
  if (!existsSync(pkgPath)) return {}

  try {
    const content = readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(content) as Record<string, unknown>
    const jSkills = pkg['j-skills'] as Record<string, unknown> | undefined

    if (!jSkills) return {}

    const metadata: SkillMetadata = {}

    if (typeof jSkills.category === 'string') {
      metadata.category = jSkills.category
    }

    return metadata
  } catch (err) {
    verbose(`Failed to parse package.json: ${(err as Error).message}`)
    return {}
  }
}

/**
 * 读取 skill 的元数据
 * 优先从 SKILL.md frontmatter 读取，fallback 到 package.json
 */
export function readSkillMetadata(skillPath: string): SkillMetadata {
  const skillMdPath = join(skillPath, 'SKILL.md')
  const metadata: SkillMetadata = {}

  // 优先：SKILL.md frontmatter
  if (existsSync(skillMdPath)) {
    try {
      const content = readFileSync(skillMdPath, 'utf-8')
      const frontmatter = parseFrontmatter(content)

      if (typeof frontmatter.category === 'string') {
        metadata.category = frontmatter.category
      }
    } catch (err) {
      verbose(`Failed to parse SKILL.md frontmatter: ${(err as Error).message}`)
    }
  }

  // Fallback：package.json j-skills 字段
  const pkgMetadata = parsePackageJson(skillPath)

  return {
    category: metadata.category ?? pkgMetadata.category,
  }
}
