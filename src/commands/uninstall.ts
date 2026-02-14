/**
 * uninstall 命令 - 卸载 skills
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { resolve, join } from 'path'
import { existsSync, rmSync, readdirSync } from 'fs'
import {
  getGlobalSkillsDir,
  ensureGlobalDir,
} from '../lib/paths.js'
import {
  unregisterSkill,
  getSkill,
} from '../lib/registry.js'
import { getGlobalEnvPath, getFirstExistingProjectPath, ENVIRONMENTS, type Environment } from '../lib/environments.js'
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
 * 扫描全局目录下的 skills
 */
function scanGlobalSkills(): Map<string, Environment[]> {
  const skillEnvs = new Map<string, Environment[]>()

  for (const env of Object.keys(ENVIRONMENTS) as Environment[]) {
    const envPath = ENVIRONMENTS[env].globalPath

    if (existsSync(envPath)) {
      const dirs = readdirSync(envPath, { withFileTypes: true })
      for (const dir of dirs) {
        if (dir.isDirectory() || dir.isSymbolicLink()) {
          const existing = skillEnvs.get(dir.name) || []
          if (!existing.includes(env)) {
            existing.push(env)
            skillEnvs.set(dir.name, existing)
          }
        }
      }
    }
  }

  return skillEnvs
}

/**
 * 扫描项目目录下的 skills
 */
function scanProjectSkills(projectDir: string = process.cwd()): Map<string, Environment[]> {
  const skillEnvs = new Map<string, Environment[]>()

  for (const env of Object.keys(ENVIRONMENTS) as Environment[]) {
    const config = ENVIRONMENTS[env]
    for (const projectPath of config.projectPaths) {
      const envPath = join(projectDir, projectPath)

      if (existsSync(envPath)) {
        const dirs = readdirSync(envPath, { withFileTypes: true })
        for (const dir of dirs) {
          if (dir.isDirectory() || dir.isSymbolicLink()) {
            const existing = skillEnvs.get(dir.name) || []
            if (!existing.includes(env)) {
              existing.push(env)
              skillEnvs.set(dir.name, existing)
            }
          }
        }
      }
    }
  }

  return skillEnvs
}

/**
 * 在磁盘上查找 skill 存在的环境
 */
function findSkillOnDisk(
  skillName: string,
  options: { global?: boolean; local?: boolean },
  projectDir: string = process.cwd()
): { envs: Environment[], paths: string[] } {
  const result: { envs: Environment[], paths: string[] } = { envs: [], paths: [] }

  // 扫描全局目录
  if (!options.local) {
    for (const env of Object.keys(ENVIRONMENTS) as Environment[]) {
      const envPath = ENVIRONMENTS[env].globalPath
      const skillPath = join(envPath, skillName)
      if (existsSync(skillPath)) {
        result.envs.push(env)
        result.paths.push(skillPath)
      }
    }
  }

  // 扫描项目目录
  if (!options.global) {
    for (const env of Object.keys(ENVIRONMENTS) as Environment[]) {
      const config = ENVIRONMENTS[env]
      for (const projectPath of config.projectPaths) {
        const envPath = join(projectDir, projectPath)
        const skillPath = join(envPath, skillName)
        if (existsSync(skillPath)) {
          if (!result.envs.includes(env)) {
            result.envs.push(env)
            result.paths.push(skillPath)
          }
        }
      }
    }
  }

  return result
}

/**
 * 卸载单个 skill
 */
async function uninstallSkill(
  skillName: string,
  options: { global?: boolean; local?: boolean; yes?: boolean; json?: boolean }
): Promise<boolean> {
  const isGlobal = options?.global || false
  const isLocal = options?.local || false
  const projectDir = process.cwd()

  // 检查 skill 是否在 registry 中
  const skill = getSkill(skillName)
  let installedEnvs: string[] = []
  let foundPaths: string[] = []

  if (skill) {
    installedEnvs = skill.installedEnvironments || []
  } else {
    const scanOptions = { global: isGlobal, local: isLocal }
    const found = findSkillOnDisk(skillName, scanOptions, projectDir)
    installedEnvs = found.envs
    foundPaths = found.paths

    if (found.envs.length === 0) {
      return false
    }
  }

  const removedPaths: string[] = []

  // 如果 skill 在 registry 中，使用 registry 记录的环境
  if (skill) {
    for (const env of installedEnvs) {
      const removed = removeFromEnv(skillName, env as Environment, isGlobal, projectDir)
      if (removed) {
        const envPath = isGlobal
          ? getGlobalEnvPath(env as Environment)
          : getFirstExistingProjectPath(env as Environment, projectDir) || resolve(projectDir, '.cursor/skills')
        removedPaths.push(`${envPath}/${skillName}`)
      }
    }

    if (isGlobal) {
      const globalPath = resolve(getGlobalSkillsDir(), skillName)
      if (existsSync(globalPath)) {
        rmSync(globalPath, { recursive: true, force: true })
        removedPaths.push(globalPath)
      }
    }

    unregisterSkill(skillName)
  } else {
    for (const path of foundPaths) {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true })
        removedPaths.push(path)
      }
    }
  }

  return true
}

/**
 * 注册 uninstall 命令
 */
export function registerUninstallCommand(cli: ReturnType<typeof cac>): void {
  cli
    .command('uninstall [skill]', 'Uninstall a skill')
    .option('-g, --global', 'Uninstall from global directory')
    .option('-l, --local', 'Uninstall from project directory')
    .option('-y, --yes', 'Skip confirmation')
    .option('--json', 'Output as JSON')
    .action(
      async (
        skillName?: string,
        options?: { global?: boolean; yes?: boolean; json?: boolean; local?: boolean }
      ) => {
        ensureGlobalDir()

        const isGlobal = options?.global || false
        const isLocal = options?.local || false

        // 如果没有指定 skill 名称，扫描并列出所有 skills 让用户选择
        if (!skillName) {
          let skills: Map<string, Environment[]>

          if (isGlobal && !isLocal) {
            skills = scanGlobalSkills()
          } else if (isLocal && !isGlobal) {
            skills = scanProjectSkills()
          } else {
            // 默认扫描项目目录
            skills = scanProjectSkills()
          }

          if (skills.size === 0) {
            info('No skills found.')
            return
          }

          // 让用户选择要卸载的 skills
          const choices = Array.from(skills.entries()).map(([name, envs]) => ({
            value: name,
            label: name,
            hint: envs.map((e) => ENVIRONMENTS[e].label).join(', '),
          }))

          const selected = await p.multiselect({
            message: 'Select skills to uninstall',
            options: choices,
            required: false,
          })

          if (isCancel(selected) || selected.length === 0) {
            info('No skills selected.')
            return
          }

          // 确认卸载
          if (!options?.yes) {
            const shouldUninstall = await p.confirm({
              message: `Uninstall ${selected.length} skill(s)?`,
              initialValue: false,
            })

            if (isCancel(shouldUninstall) || !shouldUninstall) {
              info('Operation cancelled.')
              return
            }
          }

          // 卸载选中的 skills
          let count = 0
          for (const name of selected) {
            const success = await uninstallSkill(name, { ...options, global: isGlobal, local: isLocal })
            if (success) count++
          }

          if (options?.json) {
            console.log(JSON.stringify({
              success: true,
              message: `Uninstalled ${count} skill(s)`,
              skills: selected,
            }, null, 2))
            return
          }

          success(`Uninstalled ${count} skill(s).`)
          return
        }

        // 卸载指定的 skill
        const skill = getSkill(skillName)
        let installedEnvs: string[] = []
        let foundPaths: string[] = []

        if (skill) {
          installedEnvs = skill.installedEnvironments || []
        } else {
          const scanOptions = { global: isGlobal, local: isLocal }
          const found = findSkillOnDisk(skillName, scanOptions)
          installedEnvs = found.envs
          foundPaths = found.paths

          if (found.envs.length === 0) {
            if (options?.json) {
              console.log(JSON.stringify({
                success: false,
                error: `Skill "${skillName}" not found.`,
              }, null, 2))
              return
            }
            warn(`Skill "${skillName}" not found.`)
            return
          }
        }

        // 确认卸载
        if (!options?.yes) {
          const scopeText = isGlobal ? '(global)' : isLocal ? '(project)' : ''
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
        const removedPaths: string[] = []

        // 如果 skill 在 registry 中，使用 registry 记录的环境
        if (skill) {
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
        } else {
          // 不在 registry 中，直接从找到的路径删除
          for (const path of foundPaths) {
            if (existsSync(path)) {
              rmSync(path, { recursive: true, force: true })
              removedPaths.push(path)
            }
          }
        }

        if (options?.json) {
          console.log(JSON.stringify({
            success: true,
            message: `Uninstalled "${skillName}"`,
            skill: {
              name: skillName,
              removedFrom: installedEnvs,
              removedPaths,
            },
          }, null, 2))
          return
        }

        success(`Uninstalled "${skillName}"`)
      }
    )
}
