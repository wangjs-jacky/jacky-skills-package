/**
 * scan-agents 命令 - 扫描 .agents/skills/ 目录，发现并注册外部 skill
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { resolve, basename } from 'path'
import { existsSync, readdirSync, statSync } from 'fs'
import { homedir } from 'os'
import {
  registerSkill,
  getSkill,
  listSkills,
} from '../lib/registry.js'
import { readSkillMetadata } from '../lib/skill-metadata.js'
import { success, error, info, warn, verbose } from '../lib/log.js'
import { setVerboseMode } from '../lib/log.js'
import { isCancel } from '@clack/prompts'

/**
 * 扫描结果
 */
interface ScanResult {
  scanned: number
  registered: number
  skipped: number
  skills: ScannedSkill[]
}

interface ScannedSkill {
  name: string
  path: string
  description?: string
  category?: string
  action: 'registered' | 'updated' | 'skipped-linked' | 'skipped-duplicate'
}

/**
 * 检查目录是否包含 SKILL.md 或 skill.md
 */
function hasSkillFile(dir: string): boolean {
  return existsSync(resolve(dir, 'SKILL.md')) || existsSync(resolve(dir, 'skill.md'))
}

/**
 * 扫描 ~/.agents/skills/ 目录下的 skill
 */
export function scanAgentsDir(basePath?: string, force: boolean = false): ScanResult {
  // .agents/skills/ 固定在用户主目录下
  const base = basePath ? resolve(basePath) : homedir()
  const agentsPath = resolve(base, '.agents', 'skills')
  const result: ScanResult = {
    scanned: 0,
    registered: 0,
    skipped: 0,
    skills: [],
  }

  if (!existsSync(agentsPath)) {
    verbose(`目录不存在: ${agentsPath}`)
    return result
  }

  // 获取已注册的 linked skills（不覆盖）
  const linkedSkills = listSkills({ source: 'linked' })
  const linkedNames = new Set(linkedSkills.map(s => s.name))

  // 获取已注册的 marketplace skills（按路径索引去重）
  const marketplaceSkills = listSkills({ source: 'marketplace' })
  const marketplacePaths = new Map(marketplaceSkills.map(s => [s.path, s.name]))

  let entries: string[]
  try {
    entries = readdirSync(agentsPath)
  } catch {
    verbose(`无法读取目录: ${agentsPath}`)
    return result
  }

  for (const entry of entries) {
    const fullPath = resolve(agentsPath, entry)

    // 跳过非目录
    try {
      const stat = statSync(fullPath)
      if (!stat.isDirectory()) continue
    } catch {
      continue
    }

    // 检查是否包含 SKILL.md
    if (!hasSkillFile(fullPath)) {
      verbose(`跳过（无 SKILL.md）: ${entry}`)
      continue
    }

    result.scanned++
    const skillName = basename(fullPath)
    const metadata = readSkillMetadata(fullPath)

    // 去重：linked skill 不覆盖
    if (linkedNames.has(skillName)) {
      result.skipped++
      result.skills.push({
        name: skillName,
        path: fullPath,
        description: metadata.description,
        category: metadata.category,
        action: 'skipped-linked',
      })
      verbose(`跳过（已 link）: ${skillName}`)
      continue
    }

    // 去重：相同路径的 marketplace skill
    const existingName = marketplacePaths.get(fullPath)
    if (existingName && !force) {
      result.skipped++
      result.skills.push({
        name: existingName,
        path: fullPath,
        description: metadata.description,
        category: metadata.category,
        action: 'skipped-duplicate',
      })
      verbose(`跳过（已注册）: ${existingName}`)
      continue
    }

    // 去重：同名的 marketplace skill（不同路径）
    const existingSkill = getSkill(skillName)
    if (existingSkill && existingSkill.source === 'marketplace' && !force) {
      result.skipped++
      result.skills.push({
        name: skillName,
        path: fullPath,
        description: metadata.description,
        category: metadata.category,
        action: 'skipped-duplicate',
      })
      verbose(`跳过（同名已注册）: ${skillName}`)
      continue
    }

    // 注册
    const isUpdate = existingSkill !== undefined
    registerSkill({
      name: skillName,
      path: fullPath,
      source: 'marketplace',
      originPath: fullPath,
      installedVia: 'scan',
      category: metadata.category,
      installedEnvironments: existingSkill?.installedEnvironments,
    })

    result.registered++
    result.skills.push({
      name: skillName,
      path: fullPath,
      description: metadata.description,
      category: metadata.category,
      action: isUpdate ? 'updated' : 'registered',
    })
    verbose(`${isUpdate ? '更新' : '注册'}: ${skillName}`)
  }

  return result
}

/**
 * 注册 scan-agents 命令
 */
export function registerScanAgentsCommand(cli: ReturnType<typeof cac>): void {
  cli
    .command('scan-agents [path]', 'Scan .agents/skills/ for external skills')
    .option('--force', 'Force update existing marketplace skills')
    .option('--json', 'Output as JSON')
    .option('--verbose', 'Show detailed logs')
    .action(
      async (
        scanPath?: string,
        options?: {
          force?: boolean
          json?: boolean
          verbose?: boolean
        }
      ) => {
        if (options?.verbose) {
          setVerboseMode(true)
        }

        const basePath = scanPath ? resolve(scanPath) : homedir()
        const force = options?.force || false

        verbose(`扫描路径: ${basePath}/.agents/skills/`)

        const s = p.spinner()
        s.start('扫描 .agents/skills/ ...')

        const result = scanAgentsDir(basePath, force)

        s.stop(`扫描完成`)

        // JSON 输出
        if (options?.json) {
          console.log(JSON.stringify({
            scanned: result.scanned,
            registered: result.registered,
            skipped: result.skipped,
            skills: result.skills.map(s => ({
              name: s.name,
              path: s.path,
              description: s.description,
              action: s.action,
            })),
          }, null, 2))
          return
        }

        // 友好输出
        if (result.scanned === 0) {
          info(`未在 ${basePath}/.agents/skills/ 发现 skill`)
          return
        }

        success(`扫描完成: 发现 ${result.scanned} 个 skill`)
        info(`  新注册: ${result.registered}`)
        info(`  已跳过: ${result.skipped}`)

        for (const skill of result.skills) {
          if (skill.action === 'registered') {
            info(`  ✓ ${skill.name}${skill.description ? ` - ${skill.description}` : ''}`)
          } else if (skill.action === 'updated') {
            info(`  ↻ ${skill.name}（已更新）`)
          } else if (skill.action === 'skipped-linked') {
            warn(`  ✗ ${skill.name}（已 link，跳过）`)
          } else if (skill.action === 'skipped-duplicate') {
            info(`  - ${skill.name}（已注册，跳过）`)
          }
        }
      }
    )
}
