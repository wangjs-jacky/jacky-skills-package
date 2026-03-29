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
    .option('--verbose', 'Show detailed logs')
    .option('--json', 'Output as JSON')
    .action(
      async (
        skillName?: string,
        options?: { global?: boolean; env?: string; yes?: boolean; allEnv?: boolean; verbose?: boolean; json?: boolean }
      ) => {
        ensureGlobalDir()

        if (options?.verbose) {
          setVerboseMode(true)
        }

        const isGlobal = options?.global || false
        const isYes = options?.yes || false
        const isAllEnv = options?.allEnv || false

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
            options: getEnvOptions(),
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
          registerSkill({
            name: skillName,
            path: found.path,
            source: isGlobal ? 'global' : found.source,
            installedEnvironments: targetEnvs,
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
