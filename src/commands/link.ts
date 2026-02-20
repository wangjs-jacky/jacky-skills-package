/**
 * link 命令 - 将本地 skills 文件夹链接到全局 registry
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { resolve, basename } from 'path'
import { existsSync, lstatSync, symlinkSync, unlinkSync, readdirSync } from 'fs'
import { getLinkedDir, ensureGlobalDir } from '../lib/paths.js'
import { registerSkill, unregisterSkill, getSkill, listSkills } from '../lib/registry.js'
import { success, error, info, warn } from '../lib/log.js'
import { isCancel } from '@clack/prompts'

/**
 * Link 命令选项
 */
interface LinkOptions {
  list?: boolean
  unlink?: string
  json?: boolean
  yes?: boolean  // 跳过交互确认
  all?: boolean  // 批量链接
}

/**
 * 检查目录是否包含 SKILL.md
 */
export function isValidSkillDir(dir: string): boolean {
  return existsSync(resolve(dir, 'SKILL.md'))
}

/**
 * 获取 skill 名称（从目录名）
 */
export function getSkillName(dir: string): string {
  return basename(dir)
}

/**
 * 创建符号链接（跨平台兼容）
 */
export function createSymlink(target: string, linkPath: string): void {
  // 确保目标存在
  if (!existsSync(target)) {
    throw new Error(`Target directory does not exist: ${target}`)
  }

  // 如果链接已存在，先删除
  try {
    const stats = lstatSync(linkPath)
    if (stats.isSymbolicLink() || stats.isFile() || stats.isDirectory()) {
      unlinkSync(linkPath)
    }
  } catch {
    // 文件不存在，忽略
  }

  // 创建符号链接
  symlinkSync(target, linkPath, 'junction')
}

/**
 * 链接单个 skill
 */
async function linkSingleSkill(
  targetPath: string,
  options: LinkOptions
): Promise<{ success: boolean; name: string; message?: string }> {
  const skillName = getSkillName(targetPath)
  const linkedDir = getLinkedDir()
  const linkPath = resolve(linkedDir, skillName)

  // 检查是否已存在
  const existingSkill = getSkill(skillName)
  if (existingSkill || existsSync(linkPath)) {
    // 如果有 -y/--yes 选项，直接覆盖
    if (!options.yes) {
      const shouldOverwrite = await p.confirm({
        message: `Skill "${skillName}" is already linked. Overwrite?`,
        initialValue: false,
      })

      if (isCancel(shouldOverwrite) || !shouldOverwrite) {
        return { success: false, name: skillName, message: 'Operation cancelled.' }
      }
    }
  }

  // 创建链接
  try {
    createSymlink(targetPath, linkPath)

    // 注册到 registry
    const skillData = {
      name: skillName,
      path: targetPath,
      source: 'linked' as const,
    }
    registerSkill(skillData)

    return { success: true, name: skillName }
  } catch (err) {
    return { success: false, name: skillName, message: `Failed to create link: ${(err as Error).message}` }
  }
}

/**
 * 扫描目录下所有 skill 目录
 */
function scanSkillDirs(baseDir: string): string[] {
  const skillDirs: string[] = []
  const entries = readdirSync(baseDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirPath = resolve(baseDir, entry.name)
      if (isValidSkillDir(dirPath)) {
        skillDirs.push(dirPath)
      }
    }
  }

  return skillDirs
}

/**
 * 注册 link 命令
 */
export function registerLinkCommand(cli: ReturnType<typeof cac>): void {
  cli
    .command('link [path]', 'Link a local skill folder to global registry')
    .option('-l, --list', 'List all linked skills')
    .option('--unlink <name>', 'Unlink a skill by name')
    .option('--json', 'Output as JSON')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--all', 'Link all skills in current directory')
    .action(async (skillPath?: string, options?: LinkOptions) => {
      options = options || {}
      ensureGlobalDir()

      // 列出已链接的 skills
      if (options?.list) {
        const skills = listSkills({ source: 'linked' })
        if (skills.length === 0) {
          if (options?.json) {
            console.log(JSON.stringify({ skills: [] }))
            return
          }
          info('No skills linked yet.')
          return
        }

        if (options?.json) {
          const result = {
            skills: skills.map(skill => ({
              name: skill.name,
              path: skill.path,
              source: skill.source,
              installedAt: skill.installedAt,
            })),
          }
          console.log(JSON.stringify(result, null, 2))
          return
        }

        p.intro('Linked Skills')
        for (const skill of skills) {
          console.log(`  ${skill.name} → ${skill.path}`)
        }
        return
      }

      // 取消链接
      if (options?.unlink) {
        const skillName = options.unlink
        const linkedDir = getLinkedDir()
        const linkPath = resolve(linkedDir, skillName)

        if (!existsSync(linkPath)) {
          if (options?.json) {
            console.log(JSON.stringify({ success: false, error: `Skill "${skillName}" is not linked.` }))
            return
          }
          warn(`Skill "${skillName}" is not linked.`)
          return
        }

        // 获取 skill 信息（用于 JSON 输出）
        const skillBeforeUnlink = getSkill(skillName)

        // 删除符号链接
        unlinkSync(linkPath)
        // 从注册表移除
        unregisterSkill(skillName)

        if (options?.json) {
          console.log(JSON.stringify({
            success: true,
            message: `Unlinked skill: ${skillName}`,
            skill: {
              name: skillName,
              path: skillBeforeUnlink?.path,
            },
          }, null, 2))
          return
        }
        success(`Unlinked skill: ${skillName}`)
        return
      }

      // 批量链接模式
      if (options.all) {
        const baseDir = skillPath ? resolve(skillPath) : process.cwd()
        const skillDirs = scanSkillDirs(baseDir)

        if (skillDirs.length === 0) {
          if (options.json) {
            console.log(JSON.stringify({ success: true, linked: [], message: 'No skills found.' }))
            return
          }
          info('No skills found in current directory.')
          return
        }

        const results: Array<{ name: string; success: boolean; message?: string }> = []

        for (const dir of skillDirs) {
          // 批量模式自动启用 yes
          const result = await linkSingleSkill(dir, { ...options, yes: true })
          results.push(result)

          if (options.json) {
            // JSON 模式下静默处理
          } else {
            if (result.success) {
              success(result.name)
            } else {
              warn(`${result.name}: ${result.message}`)
            }
          }
        }

        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            linked: results.filter(r => r.success).map(r => r.name),
            failed: results.filter(r => !r.success).map(r => ({ name: r.name, error: r.message })),
          }, null, 2))
          return
        }

        const linked = results.filter(r => r.success).length
        const failed = results.filter(r => !r.success).length
        console.log(`\nLinked: ${linked}  Failed: ${failed}`)

        // 显示最终列表
        if (!options.json) {
          console.log('\n')
          const skills = listSkills({ source: 'linked' })
          p.intro('Linked Skills')
          for (const skill of skills) {
            console.log(`  ${skill.name} → ${skill.path}`)
          }
        }
        return
      }

      // 链接单个 skill
      const targetPath = skillPath ? resolve(skillPath) : process.cwd()

      // 验证目录
      if (!isValidSkillDir(targetPath)) {
        if (options.json) {
          console.log(JSON.stringify({ success: false, error: `No SKILL.md found in ${targetPath}` }))
          process.exit(1)
        }
        error(`No SKILL.md found in ${targetPath}`)
        process.exit(1)
      }

      const result = await linkSingleSkill(targetPath, options)

      if (options.json) {
        console.log(JSON.stringify({
          success: result.success,
          message: result.success ? `Linked skill: ${result.name}` : result.message,
          skill: result.success ? { name: result.name, path: targetPath } : undefined,
        }, null, 2))
        if (!result.success) process.exit(1)
        return
      }

      if (result.success) {
        const linkedDir = getLinkedDir()
        const linkPath = resolve(linkedDir, result.name)
        success(`Linked skill: ${result.name}`)
        console.log(`  ${linkPath} → ${targetPath}`)
      } else {
        info(result.message || 'Operation cancelled.')
      }
    })
}
