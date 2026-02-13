/**
 * uninstall 命令 - 卸载 skills
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { resolve } from 'path'
import { existsSync, rmSync } from 'fs'
import {
  getGlobalSkillsDir,
  ensureGlobalDir,
} from '../lib/paths.js'
import {
  unregisterSkill,
  getSkill,
} from '../lib/registry.js'
import { getGlobalEnvPath, getFirstExistingProjectPath, type Environment } from '../lib/environments.js'
import { success, error, info, warn } from '../lib/log.js'
import { isCancel } from '@clack/prompts'

/**
 * 从环境移除 skill
 * @param skillName skill 名称
 * @param env 目标环境
 * @param global 是否全局
 * @param projectDir 项目目录
 */
export function removeFromEnv(
  skillName: string,
  env: Environment,
  global: boolean = false,
  projectDir: string = process.cwd()
): boolean {
  const envPath = global
    ? getGlobalEnvPath(env)
    : getFirstExistingProjectPath(env, projectDir) || resolve(projectDir, '.cursor/skills')
  const skillPath = resolve(envPath, skillName)

  if (existsSync(skillPath)) {
    rmSync(skillPath, { recursive: true, force: true })
    return true
  }
  return false
}

/**
 * 注册 uninstall 命令
 */
export function registerUninstallCommand(cli: ReturnType<typeof cac>): void {
  cli
    .command('uninstall <skill>', 'Uninstall a skill')
    .option('-g, --global', 'Uninstall from global')
    .option('-y, --yes', 'Skip confirmation')
    .option('--json', 'Output as JSON')
    .action(
      async (
        skillName: string,
        options?: { global?: boolean; yes?: boolean; json?: boolean }
      ) => {
        ensureGlobalDir()

        const isGlobal = options?.global || false

        // 检查 skill 是否已安装
        const skill = getSkill(skillName)
        if (!skill) {
          if (options?.json) {
            console.log(JSON.stringify({
              success: false,
              error: `Skill "${skillName}" is not installed.`,
            }, null, 2))
            return
          }
          warn(`Skill "${skillName}" is not installed.`)
          return
        }

        // 确认卸载
        if (!options?.yes) {
          const scopeText = isGlobal ? '(global)' : '(project)'
          const shouldUninstall = await p.confirm({
            message: `Uninstall "${skillName}" ${scopeText}?`,
            initialValue: false,
          })

          if (isCancel(shouldUninstall) || !shouldUninstall) {
            if (options?.json) {
              console.log(JSON.stringify({
                success: false,
                cancelled: true,
                message: 'Operation cancelled.',
              }, null, 2))
              return
            }
            info('Operation cancelled.')
            return
          }
        }

        const projectDir = process.cwd()

        // 从所有已安装的环境移除
        const installedEnvs = skill.installedEnvironments || []
        const removedPaths: string[] = []
        for (const env of installedEnvs) {
          const removed = removeFromEnv(skillName, env as Environment, isGlobal, projectDir)
          if (removed) {
            const envPath = isGlobal
              ? getGlobalEnvPath(env as Environment)
              : getFirstExistingProjectPath(env as Environment, projectDir) || resolve(projectDir, '.cursor/skills')
            removedPaths.push(`${envPath}/${skillName}`)
          }
        }

        // 如果是全局卸载，也从全局目录删除
        if (isGlobal) {
          const globalPath = resolve(getGlobalSkillsDir(), skillName)
          if (existsSync(globalPath)) {
            rmSync(globalPath, { recursive: true, force: true })
            removedPaths.push(globalPath)
          }
        }

        // 从注册表移除
        unregisterSkill(skillName)

        if (options?.json) {
          console.log(JSON.stringify({
            success: true,
            message: `Uninstalled "${skillName}" ${isGlobal ? 'globally' : 'from project'}`,
            skill: {
              name: skillName,
              removedFrom: installedEnvs,
              removedPaths,
            },
          }, null, 2))
          return
        }

        const scopeText = isGlobal ? 'globally' : 'from project'
        success(`Uninstalled "${skillName}" ${scopeText}`)
      }
    )
}
