/**
 * install 命令 - 安装 skills 到项目或全局
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { resolve, basename } from 'path'
import { existsSync, cpSync, mkdirSync, rmSync, lstatSync, unlinkSync } from 'fs'
import {
  getLinkedDir,
  getGlobalSkillsDir,
  ensureGlobalDir,
} from '../lib/paths.js'
import {
  registerSkill,
  getSkill,
  updateSkillEnvironments,
} from '../lib/registry.js'
import {
  getGlobalEnvPath,
  getFirstExistingProjectPath,
  getEnvOptions,
  parseEnvironments,
  getAllowedEnvironments,
  type Environment,
} from '../lib/environments.js'
import {
  hasSkillHooks,
  mergeSkillHooks,
} from '../lib/hooks.js'
import { success, error, info, warn, verbose } from '../lib/log.js'
import { setVerboseMode } from '../lib/log.js'
import { isCancel } from '@clack/prompts'
import {
  getProfile,
  getActiveProfile,
} from '../lib/profiles.js'
import { readSkillMetadata } from '../lib/skill-metadata.js'
import {
  detectConflicts,
  type ConflictResult,
} from '../lib/conflicts.js'

/**
 * 默认安装环境（当使用 -y 但未指定 --env 时）
 */
const DEFAULT_ENVS: Environment[] = ['claude-code', 'cursor', 'opencode', 'codex']

/**
 * 查找 skill（先 linked，后 global）
 */
export function findSkill(name: string): { path: string; source: 'linked' | 'global'; health?: 'broken' } | null {
  // 先查找 linked
  const linkedPath = resolve(getLinkedDir(), name)
  if (existsSync(linkedPath)) {
    return { path: linkedPath, source: 'linked' }
  }

  // 检查是否为断链的符号链接
  try {
    const stat = lstatSync(linkedPath, { throwIfNoEntry: false })
    if (stat?.isSymbolicLink()) {
      return { path: linkedPath, source: 'linked', health: 'broken' }
    }
  } catch {
    // 忽略
  }

  // 再查找 global
  const globalPath = resolve(getGlobalSkillsDir(), name)
  if (existsSync(globalPath)) {
    return { path: globalPath, source: 'global' }
  }

  return null
}

/**
 * 安全删除路径（处理 broken symlink 的场景）
 * rmSync({ recursive: true, force: true }) 无法删除 broken symlink，
 * 需要用 unlinkSync 兜底
 */
function safeRemovePath(path: string): void {
  const stat = lstatSync(path, { throwIfNoEntry: false })
  if (!stat) return

  if (stat.isSymbolicLink()) {
    // symlink（包括 broken 的）用 unlinkSync 删除
    unlinkSync(path)
  } else {
    // 普通文件/目录用 rmSync
    rmSync(path, { recursive: true, force: true })
  }
}

/**
 * 安装 skill 到指定环境
 * @param skillPath skill 源路径
 * @param env 目标环境
 * @param global 是否全局安装
 * @param projectDir 项目目录
 */
export function installToEnv(
  skillPath: string,
  env: Environment,
  global: boolean = false,
  projectDir: string = process.cwd()
): string {
  const envPath = global
    ? getGlobalEnvPath(env)
    : getFirstExistingProjectPath(env, projectDir) || resolve(projectDir, '.cursor/skills')
  const skillName = basename(skillPath)
  const targetPath = resolve(envPath, skillName)

  // 确保目标目录存在
  if (!existsSync(envPath)) {
    mkdirSync(envPath, { recursive: true })
  }

  // 如果目标已存在，先安全删除（包括 broken symlink）
  if (lstatSync(targetPath, { throwIfNoEntry: false })) {
    safeRemovePath(targetPath)
  }

  // 复制 skill 到目标环境
  cpSync(skillPath, targetPath, { recursive: true })
  verbose(`Copied to ${targetPath}`)

  return targetPath
}

/**
 * 注册 install 命令
 */
export function registerInstallCommand(cli: ReturnType<typeof cac>): void {
  cli
    .command('install [skill]', 'Install a skill to project or globally')
    .option('-g, --global', 'Install globally')
    .option('-e, --env <environments>', 'Target environments (comma-separated)')
    .option('-y, --yes', 'Skip confirmation prompts and use default environments')
    .option('--all-env', 'Install to all supported environments')
    .option('--profile [name]', 'Install all skills from a profile')
    .option('--skip-conflicts', 'Skip conflicting skills instead of prompting')
    .option('--verbose', 'Show detailed logs')
    .option('--json', 'Output as JSON')
    .action(
      async (
        skillName?: string,
        options?: {
          global?: boolean
          env?: string
          yes?: boolean
          allEnv?: boolean
          profile?: boolean | string
          skipConflicts?: boolean
          verbose?: boolean
          json?: boolean
        }
      ) => {
        ensureGlobalDir()

        if (options?.verbose) {
          setVerboseMode(true)
        }

        const isGlobal = options?.global || false
        const isYes = options?.yes || false
        const isAllEnv = options?.allEnv || false
        const isSkipConflicts = options?.skipConflicts || process.env.J_SKILLS_SKIP_CONFLICTS === '1'

        // 处理 profile 模式
        if (options?.profile !== undefined) {
          await handleProfileInstall({
            profileName: typeof options.profile === 'string' ? options.profile : undefined,
            isGlobal,
            isYes,
            isAllEnv,
            envStr: options?.env,
            isSkipConflicts,
            isJson: options?.json || false,
          })
          return
        }

        // 如果没有指定 skill 名称，显示帮助
        if (!skillName) {
          if (options?.json) {
            console.log(JSON.stringify({
              error: 'Skill name is required',
              usage: 'j-skills install <skill-name> [options]',
            }, null, 2))
            return
          }
          info('Usage: j-skills install <skill-name>')
          info('Options:')
          console.log('  -g, --global    Install globally')
          console.log('  -e, --env       Target environments (comma-separated)')
          console.log('  -y, --yes       Skip prompts, use default environments')
          console.log('  --all-env       Install to all supported environments')
          console.log('  --profile       Install all skills from a profile')
          return
        }

        // 查找 skill
        const found = findSkill(skillName)
        if (!found) {
          if (options?.json) {
            console.log(JSON.stringify({
              success: false,
              error: `Skill "${skillName}" not found.`,
              hint: 'Try linking it first: j-skills link /path/to/skill',
            }, null, 2))
            process.exit(1)
          }
          error(`Skill "${skillName}" not found.`)
          info('Try linking it first: j-skills link /path/to/skill')
          process.exit(1)
        }

        // 断链检测
        if (found.health === 'broken') {
          if (options?.json) {
            console.log(JSON.stringify({
              success: false,
              error: `Skill "${skillName}" has a broken symlink.`,
              hint: 'Run `j-skills link --doctor` to fix.',
            }, null, 2))
            process.exit(1)
          }
          warn(`Skill "${skillName}" 的软链接已断裂。`)
          info('运行 j-skills link --doctor 修复。')
          process.exit(1)
        }

        verbose(`Found skill at: ${found.path} (source: ${found.source})`)

        // 确定目标环境
        let targetEnvs: Environment[]

        if (options?.env) {
          // 从命令行参数解析
          targetEnvs = parseEnvironments(options.env)
          if (targetEnvs.length === 0) {
            error('No valid environments specified.')
            process.exit(1)
          }
        } else if (isAllEnv) {
          // 安装到所有环境
          targetEnvs = DEFAULT_ENVS
          verbose(`Installing to all environments: ${targetEnvs.join(', ')}`)
        } else if (isYes) {
          // 使用默认环境（跳过交互式选择）
          targetEnvs = DEFAULT_ENVS
          verbose(`Using default environments: ${targetEnvs.join(', ')}`)
        } else {
          // 交互式多选
          const scopeText = isGlobal ? '(global)' : '(project)'
          p.intro(`Select target environments ${scopeText}`)

          const selected = await p.multiselect({
            message: 'Where do you want to install this skill?',
            options: getEnvOptions() as any,
            required: false,
          })

          if (isCancel(selected)) {
            p.cancel('Operation cancelled.')
            process.exit(0)
          }

          targetEnvs = selected as Environment[]

          if (targetEnvs.length === 0) {
            info('No environments selected. Operation cancelled.')
            return
          }
        }

        verbose(`Target environments: ${targetEnvs.join(', ')}`)
        verbose(`Install mode: ${isGlobal ? 'global' : 'project'}`)

        const projectDir = process.cwd()
        const s = p.spinner()
        s.start('Installing skill...')

        // 全局安装：先复制到全局目录
        if (isGlobal) {
          const globalSkillsDir = getGlobalSkillsDir()
          const globalPath = resolve(globalSkillsDir, skillName)

          // 如果目标已存在，先安全删除（包括 broken symlink）
          if (lstatSync(globalPath, { throwIfNoEntry: false })) {
            safeRemovePath(globalPath)
          }

          // 复制到全局目录
          cpSync(found.path, globalPath, { recursive: true })
          verbose(`Copied to global: ${globalPath}`)
        }

        // 安装到各环境
        for (const env of targetEnvs) {
          try {
            const targetPath = installToEnv(found.path, env, isGlobal, projectDir)
            verbose(`Installed to ${env}: ${targetPath}`)
          } catch (err) {
            s.stop(`Failed to install to ${env}`)
            error((err as Error).message)
            process.exit(1)
          }
        }

        // 更新注册表
        const existingSkill = getSkill(skillName)
        if (existingSkill) {
          const allEnvs = [
            ...(existingSkill.installedEnvironments || []),
            ...targetEnvs,
          ]
          updateSkillEnvironments(skillName, [...new Set(allEnvs)])
        } else {
          const metadata = readSkillMetadata(found.path)
          registerSkill({
            name: skillName,
            path: found.path,
            source: isGlobal ? 'global' : found.source,
            installedEnvironments: targetEnvs,
            category: metadata.category,
          })
        }

        // 处理 hooks（仅在安装到 claude-code 时）
        if (targetEnvs.includes('claude-code') && hasSkillHooks(found.path)) {
          const hooksMerged = mergeSkillHooks(found.path, skillName)
          if (hooksMerged) {
            verbose(`Merged hooks for skill: ${skillName}`)
          }
        }

        s.stop('Installed successfully!')

        // JSON 输出
        if (options?.json) {
          const configModule = await import('../lib/environments.js')
          const environments = targetEnvs.map((env) => {
            const config = configModule.getEnvConfig(env)
            return {
              name: env,
              label: config.label,
              scope: isGlobal ? 'global' : 'project',
              path: isGlobal
                ? `${configModule.getGlobalEnvPath(env)}/${skillName}`
                : `${configModule.getFirstExistingProjectPath(env, projectDir) || `${projectDir}/${config.projectPaths[0]}`}/${skillName}`,
            }
          })

          console.log(JSON.stringify({
            success: true,
            skill: {
              name: skillName,
              source: found.source,
              scope: isGlobal ? 'global' : 'project',
            },
            installedTo: environments,
          }, null, 2))
          return
        }

        // 显示安装位置
        const envLabels = targetEnvs
          .map((env) => {
            const config = require('../lib/environments.js').getEnvConfig(env)
            return isGlobal ? `${config.label} (global)` : `${config.label} (project)`
          })
          .join(', ')

        success(`Installed "${skillName}" to: ${envLabels}`)

        // 显示具体路径
        if (!isGlobal) {
          console.log('')
          verbose('Installed to:')
          for (const env of targetEnvs) {
            const path = getFirstExistingProjectPath(env, projectDir) || resolve(projectDir, '.cursor/skills')
            console.log(`  ${env}: ${path}/${skillName}`)
          }
        }
      }
    )
}

/**
 * Profile 批量安装选项
 */
interface ProfileInstallOptions {
  profileName?: string
  isGlobal: boolean
  isYes: boolean
  isAllEnv: boolean
  envStr?: string
  isSkipConflicts: boolean
  isJson: boolean
}

/**
 * 处理 profile 批量安装
 */
async function handleProfileInstall(options: ProfileInstallOptions): Promise<void> {
  const { profileName, isGlobal, isYes, isAllEnv, envStr, isSkipConflicts, isJson } = options

  // 解析目标环境
  let targetEnvs: Environment[]

  if (envStr) {
    targetEnvs = parseEnvironments(envStr)
    if (targetEnvs.length === 0) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: 'No valid environments specified.' }, null, 2))
        process.exit(1)
      }
      error('No valid environments specified.')
      process.exit(1)
    }
  } else if (isAllEnv) {
    targetEnvs = DEFAULT_ENVS
    verbose(`Installing to all environments: ${targetEnvs.join(', ')}`)
  } else if (isYes) {
    targetEnvs = DEFAULT_ENVS
    verbose(`Using default environments: ${targetEnvs.join(', ')}`)
  } else {
    // 交互式多选
    const scopeText = isGlobal ? '(global)' : '(project)'
    p.intro(`Select target environments ${scopeText}`)

    const selected = await p.multiselect({
      message: 'Where do you want to install these skills?',
      options: getEnvOptions() as any,
      required: false,
    })

    if (isCancel(selected)) {
      p.cancel('Operation cancelled.')
      process.exit(0)
    }

    targetEnvs = selected as Environment[]

    if (targetEnvs.length === 0) {
      info('No environments selected. Operation cancelled.')
      return
    }
  }

  verbose(`Target environments: ${targetEnvs.join(', ')}`)

  // 解析 profile
  let resolvedProfileName = profileName
  if (!resolvedProfileName) {
    const activeInfo = getActiveProfile()
    if (!activeInfo) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: 'No active profile. Use --profile <name> or activate a profile first.' }, null, 2))
        process.exit(1)
      }
      error('No active profile. Use --profile <name> or activate a profile first.')
      process.exit(1)
    }
    resolvedProfileName = activeInfo.profile.name
  }

  const profile = getProfile(resolvedProfileName)
  if (!profile) {
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: `Profile "${resolvedProfileName}" not found.` }, null, 2))
      process.exit(1)
    }
    error(`Profile "${resolvedProfileName}" not found.`)
    process.exit(1)
  }

  verbose(`Using profile: ${profile.name}`)

  // 构建 skill 列表
  let skillNames: string[] = profile.skills.include

  // default profile 且 include 为空 → 使用所有 linked skills
  if (profile.name === 'default' && skillNames.length === 0) {
    const { listSkills } = await import('../lib/registry.js')
    skillNames = listSkills({ source: 'linked' }).map((s) => s.name)
    verbose(`Default profile fallback: using all ${skillNames.length} linked skills`)
  }

  if (skillNames.length === 0) {
    if (isJson) {
      console.log(JSON.stringify({ success: true, profile: profile.name, installed: [], message: 'No skills to install.' }, null, 2))
      return
    }
    info(`Profile "${profile.name}" has no skills to install.`)
    return
  }

  // 过滤掉不可用的 skills
  const availableSkills: { name: string; path: string; source: 'linked' | 'global' }[] = []
  const missingSkills: string[] = []
  const brokenSkills: string[] = []

  for (const name of skillNames) {
    const found = findSkill(name)
    if (!found) {
      missingSkills.push(name)
    } else if (found.health === 'broken') {
      brokenSkills.push(name)
    } else {
      availableSkills.push({ name, path: found.path, source: found.source })
    }
  }

  if (missingSkills.length > 0) {
    warn(`Skills not found (skipped): ${missingSkills.join(', ')}`)
  }
  if (brokenSkills.length > 0) {
    warn(`Skills with broken links (skipped): ${brokenSkills.join(', ')}`)
  }

  if (availableSkills.length === 0) {
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: 'No available skills to install from profile.' }, null, 2))
      process.exit(1)
    }
    error('No available skills to install from profile.')
    process.exit(1)
  }

  // 冲突检测：同一 category 的多个 skill 视为冲突
  const conflicts = detectConflicts(availableSkills.map((s) => s.name))

  if (conflicts.conflicts.length > 0) {
    for (const group of conflicts.conflicts) {
      warn(`Multiple ${group.category} skills detected: ${group.skills.join(', ')}`)
    }

    if (isSkipConflicts || isYes) {
      // 自动跳过所有冲突 skills
      for (const group of conflicts.conflicts) {
        warn(`Skipping ${group.category} skills: ${group.skills.join(', ')}`)
        for (const name of group.skills) {
          const idx = availableSkills.findIndex((s) => s.name === name)
          if (idx >= 0) availableSkills.splice(idx, 1)
        }
      }
    } else {
      // 交互式解决冲突：每个 category 选择一个保留
      for (const group of conflicts.conflicts) {
        const options = group.skills.map((name) => ({ value: name, label: name }))
        options.push({ value: 'skip-all', label: `Skip all ${group.category} skills` })

        const choice = await p.select({
          message: `Multiple ${group.category} skills conflict. Which one to keep?`,
          options,
        })

        if (isCancel(choice)) {
          p.cancel('Operation cancelled.')
          process.exit(0)
        }

        if (choice === 'skip-all') {
          for (const name of group.skills) {
            const idx = availableSkills.findIndex((s) => s.name === name)
            if (idx >= 0) availableSkills.splice(idx, 1)
          }
        } else {
          // 保留选中的，移除同 category 的其他 skills
          for (const name of group.skills) {
            if (name !== choice) {
              const idx = availableSkills.findIndex((s) => s.name === name)
              if (idx >= 0) availableSkills.splice(idx, 1)
            }
          }
        }
      }
    }
  }

  if (availableSkills.length === 0) {
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: 'All skills were skipped due to conflicts or unavailability.' }, null, 2))
      process.exit(1)
    }
    error('All skills were skipped due to conflicts or unavailability.')
    process.exit(1)
  }

  // 开始安装
  const projectDir = process.cwd()
  const s = p.spinner()
  s.start(`Installing ${availableSkills.length} skills from profile "${profile.name}"...`)

  const installed: { name: string; environments: string[] }[] = []
  const failed: { name: string; error: string }[] = []

  for (const skill of availableSkills) {
    try {
      // 全局安装：先复制到全局目录
      if (isGlobal) {
        const globalSkillsDir = getGlobalSkillsDir()
        const globalPath = resolve(globalSkillsDir, skill.name)

        if (lstatSync(globalPath, { throwIfNoEntry: false })) {
          safeRemovePath(globalPath)
        }
        cpSync(skill.path, globalPath, { recursive: true })
        verbose(`Copied to global: ${globalPath}`)
      }

      // 安装到各环境
      for (const env of targetEnvs) {
        const targetPath = installToEnv(skill.path, env, isGlobal, projectDir)
        verbose(`Installed ${skill.name} to ${env}: ${targetPath}`)
      }

      // 更新注册表
      const { getSkill: getRegistrySkill, updateSkillEnvironments, registerSkill } = await import('../lib/registry.js')
      const existingSkill = getRegistrySkill(skill.name)
      if (existingSkill) {
        const allEnvs = [...(existingSkill.installedEnvironments || []), ...targetEnvs]
        updateSkillEnvironments(skill.name, [...new Set(allEnvs)])
      } else {
        const metadata = readSkillMetadata(skill.path)
        registerSkill({
          name: skill.name,
          path: skill.path,
          source: isGlobal ? 'global' : skill.source,
          installedEnvironments: targetEnvs,
          category: metadata.category,
        })
      }

      // 处理 hooks
      if (targetEnvs.includes('claude-code') && hasSkillHooks(skill.path)) {
        mergeSkillHooks(skill.path, skill.name)
      }

      installed.push({ name: skill.name, environments: targetEnvs })
    } catch (err) {
      failed.push({ name: skill.name, error: (err as Error).message })
    }
  }

  s.stop(`Installed ${installed.length}/${availableSkills.length} skills.`)

  if (failed.length > 0) {
    for (const f of failed) {
      error(`Failed to install "${f.name}": ${f.error}`)
    }
  }

  if (isJson) {
    console.log(JSON.stringify({
      success: failed.length === 0,
      profile: profile.name,
      installed: installed.map((i) => ({ name: i.name, environments: i.environments })),
      failed: failed.map((f) => ({ name: f.name, error: f.error })),
      skipped: [...missingSkills, ...brokenSkills],
    }, null, 2))
    return
  }

  success(`Installed ${installed.length} skills from profile "${profile.name}".`)
  for (const i of installed) {
    info(`  ✓ ${i.name} → ${i.environments.join(', ')}`)
  }

  if (missingSkills.length > 0 || brokenSkills.length > 0) {
    info(`\nSkipped ${missingSkills.length + brokenSkills.length} unavailable skills.`)
  }
}
