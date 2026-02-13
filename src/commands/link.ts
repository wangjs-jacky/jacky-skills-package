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
 * 检查目录是否包含 skill.md
 */
export function isValidSkillDir(dir: string): boolean {
  return existsSync(resolve(dir, 'skill.md'))
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
 * 注册 link 命令
 */
export function registerLinkCommand(cli: ReturnType<typeof cac>): void {
  cli
    .command('link [path]', 'Link a local skill folder to global registry')
    .option('-l, --list', 'List all linked skills')
    .option('--unlink <name>', 'Unlink a skill by name')
    .option('--json', 'Output as JSON')
    .action(async (skillPath?: string, options?: { list?: boolean; unlink?: string; json?: boolean }) => {
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

      // 链接新 skill
      const targetPath = skillPath ? resolve(skillPath) : process.cwd()

      // 验证目录
      if (!isValidSkillDir(targetPath)) {
        error(`No skill.md found in ${targetPath}`)
        process.exit(1)
      }

      const skillName = getSkillName(targetPath)
      const linkedDir = getLinkedDir()
      const linkPath = resolve(linkedDir, skillName)

      // 检查是否已存在
      const existingSkill = getSkill(skillName)
      if (existingSkill || existsSync(linkPath)) {
        const shouldOverwrite = await p.confirm({
          message: `Skill "${skillName}" is already linked. Overwrite?`,
          initialValue: false,
        })

        if (isCancel(shouldOverwrite) || !shouldOverwrite) {
          info('Operation cancelled.')
          return
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

        if (options?.json) {
          console.log(JSON.stringify({
            success: true,
            message: `Linked skill: ${skillName}`,
            skill: {
              ...skillData,
              linkPath,
              installedAt: new Date().toISOString(),
            },
          }, null, 2))
          return
        }

        success(`Linked skill: ${skillName}`)
        console.log(`  ${linkPath} → ${targetPath}`)
      } catch (err) {
        if (options?.json) {
          console.log(JSON.stringify({
            success: false,
            error: `Failed to create link: ${(err as Error).message}`,
          }, null, 2))
          process.exit(1)
        }
        error(`Failed to create link: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
