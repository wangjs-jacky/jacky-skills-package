/**
 * link 命令 - 将本地 skills 文件夹链接到全局 registry
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { resolve, basename, dirname } from 'path'
import { existsSync, lstatSync, readlinkSync, symlinkSync, unlinkSync, readdirSync } from 'fs'
import { getLinkedDir, ensureGlobalDir } from '../lib/paths.js'
import {
  registerSkill,
  unregisterSkill,
  getSkill,
  listSkills,
  updateSkillPath,
  addSourceFolder,
  getSourceFolder,
  updateSourceFolder,
  listSourceFolders,
} from '../lib/registry.js'
import { readSkillMetadata } from '../lib/skill-metadata.js'
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
  doctor?: boolean  // 断链诊断与修复
  force?: boolean  // 强制清理，跳过 symlink 存在性检查
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

    // 注册到 registry（包含 metadata）
    const metadata = readSkillMetadata(targetPath)
    const skillData = {
      name: skillName,
      path: targetPath,
      source: 'linked' as const,
      sourceFolder: dirname(targetPath),
      category: metadata.category,
    }
    registerSkill(skillData)

    // 记录 sourceFolder
    const parentDir = dirname(targetPath)
    const existingFolder = getSourceFolder(parentDir)
    if (existingFolder) {
      const names = new Set([...existingFolder.skillNames, skillName])
      updateSourceFolder(parentDir, {
        skillNames: [...names],
        lastScanned: new Date().toISOString(),
      })
    } else {
      addSourceFolder({
        path: parentDir,
        addedAt: new Date().toISOString(),
        lastScanned: new Date().toISOString(),
        skillNames: [skillName],
      })
    }

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
 * 软链接健康状态
 */
export type LinkHealth = 'healthy' | 'broken' | 'missing' | 'not-symlink'

/**
 * 检查单个软链接的健康状态
 */
export function checkLinkHealth(linkPath: string): LinkHealth {
  try {
    const stat = lstatSync(linkPath, { throwIfNoEntry: false })
    if (!stat) return 'missing'
    if (!stat.isSymbolicLink()) return 'not-symlink'

    const target = readlinkSync(linkPath)
    // 跟随链接判断目标是否存在
    return existsSync(linkPath) ? 'healthy' : 'broken'
  } catch {
    return 'missing'
  }
}

/**
 * 诊断结果条目
 */
export interface DiagnoseResult {
  name: string
  linkPath: string
  targetPath: string
  health: LinkHealth
}

/**
 * 遍历所有 linked skills，返回健康诊断列表
 */
export function diagnoseAllLinks(): DiagnoseResult[] {
  const skills = listSkills({ source: 'linked' })
  const linkedDir = getLinkedDir()

  return skills.map(skill => {
    const linkPath = resolve(linkedDir, skill.name)
    return {
      name: skill.name,
      linkPath,
      targetPath: skill.path,
      health: checkLinkHealth(linkPath),
    }
  })
}

/**
 * 从 sourceFolders 中按名称精确匹配 skill 目录
 */
export function findSkillInSourceFolders(skillName: string): string | null {
  const folders = listSourceFolders()
  for (const folder of folders) {
    if (!existsSync(folder.path)) continue
    const candidate = resolve(folder.path, skillName)
    if (isValidSkillDir(candidate)) {
      return candidate
    }
  }
  return null
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
    .option('--doctor', 'Diagnose and fix broken symlinks')
    .option('--force', 'Force cleanup even if symlink is missing')
    .action(async (skillPath?: string, options?: LinkOptions) => {
      options = options || {}
      ensureGlobalDir()

      // 断链诊断与修复
      if (options?.doctor) {
        const results = diagnoseAllLinks()

        if (results.length === 0) {
          if (options?.json) {
            console.log(JSON.stringify({ healthy: [], broken: [], total: 0 }))
            return
          }
          info('No skills linked yet.')
          return
        }

        const broken = results.filter(r => r.health === 'broken')
        const healthy = results.filter(r => r.health === 'healthy')
        const abnormal = results.filter(r => r.health !== 'healthy' && r.health !== 'broken')

        if (options?.json) {
          console.log(JSON.stringify({
            healthy: healthy.map(r => r.name),
            broken: broken.map(r => ({ name: r.name, linkPath: r.linkPath, targetPath: r.targetPath })),
            abnormal: abnormal.map(r => ({ name: r.name, health: r.health })),
            total: results.length,
          }, null, 2))
          if (broken.length > 0) process.exit(1)
          return
        }

        p.intro('Link Health Check')

        for (const r of results) {
          if (r.health === 'healthy') {
            console.log(`  \x1b[32m✓\x1b[0m ${r.name} → ${r.targetPath}`)
          } else if (r.health === 'broken') {
            console.log(`  \x1b[31m✗\x1b[0m ${r.name} → ${r.targetPath} (\x1b[31mbroken\x1b[0m)`)
          } else {
            console.log(`  \x1b[33m?\x1b[0m ${r.name} (${r.health})`)
          }
        }

        if (broken.length === 0 && abnormal.length === 0) {
          success(`All ${results.length} link(s) are healthy.`)
          return
        }

        console.log('')
        const unfixable: DiagnoseResult[] = []

        if (broken.length > 0) {
          warn(`Found ${broken.length} broken link(s).`)

          // 尝试自动修复
          const shouldFix = await p.confirm({
            message: 'Attempt to auto-fix broken links?',
            initialValue: true,
          })

          if (isCancel(shouldFix) || !shouldFix) {
            // 跳过修复，全部 broken 视为 unfixable
            unfixable.push(...broken)
          } else {
            let fixed = 0
            for (const item of broken) {
              const newPath = findSkillInSourceFolders(item.name)
              if (newPath) {
                // 重建软链接
                createSymlink(newPath, item.linkPath)
                updateSkillPath(item.name, newPath)
                success(`Fixed: ${item.name} → ${newPath}`)
                fixed++
              } else {
                error(`Cannot find "${item.name}" in any source folder.`)
                unfixable.push(item)
              }
            }

            console.log(`\nFixed: ${fixed} / ${broken.length}`)
          }
        }

        // abnormal（missing/not-symlink）全部视为 unfixable
        if (abnormal.length > 0) {
          unfixable.push(...abnormal)
        }

        // 统一处理 unfixable 条目
        if (unfixable.length > 0) {
          console.log('')
          warn(`Found ${unfixable.length} unfixable link(s):`)
          for (const item of unfixable) {
            console.log(`  \x1b[31m✗\x1b[0m ${item.name} (${item.health})`)
          }

          const shouldRemove = await p.confirm({
            message: `Remove ${unfixable.length} unfixable entry/entries from registry?`,
            initialValue: true,
          })

          if (shouldRemove && !isCancel(shouldRemove)) {
            let removed = 0
            for (const item of unfixable) {
              // 尝试删除 symlink（如有）
              try { unlinkSync(item.linkPath) } catch {}
              // 从注册表移除
              unregisterSkill(item.name)
              removed++
            }
            success(`Removed ${removed} unfixable entry/entries.`)
          }
        }

        return
      }

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
          const linkedDir = getLinkedDir()
          const result = {
            skills: skills.map(skill => {
              const linkPath = resolve(linkedDir, skill.name)
              return {
                name: skill.name,
                path: skill.path,
                source: skill.source,
                installedAt: skill.installedAt,
                health: checkLinkHealth(linkPath),
              }
            }),
          }
          console.log(JSON.stringify(result, null, 2))
          return
        }

        p.intro('Linked Skills')
        for (const skill of skills) {
          const linkPath = resolve(getLinkedDir(), skill.name)
          const health = checkLinkHealth(linkPath)
          let icon: string
          if (health === 'healthy') {
            icon = '\x1b[32m✓\x1b[0m'
          } else if (health === 'broken') {
            icon = '\x1b[31m✗\x1b[0m'
          } else {
            icon = '\x1b[33m?\x1b[0m'
          }
          console.log(`  ${icon} ${skill.name} → ${skill.path}`)
        }
        return
      }

      // 取消链接
      if (options?.unlink) {
        const skillName = options.unlink
        const linkedDir = getLinkedDir()
        const linkPath = resolve(linkedDir, skillName)

        // 非 force 模式：symlink 不存在时报错退出
        if (!options?.force && !existsSync(linkPath)) {
          if (options?.json) {
            console.log(JSON.stringify({ success: false, error: `Skill "${skillName}" is not linked.` }))
            return
          }
          warn(`Skill "${skillName}" is not linked.`)
          return
        }

        // 获取 skill 信息（用于 JSON 输出）
        const skillBeforeUnlink = getSkill(skillName)

        // 尝试删除 symlink（broken 的也能删，不存在时忽略）
        try { unlinkSync(linkPath) } catch {}

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
