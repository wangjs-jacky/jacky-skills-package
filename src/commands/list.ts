/**
 * list 命令 - 查看已安装的 skills
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'
import { listSkills, type RegistrySkill } from '../lib/registry.js'
import { ensureGlobalDir } from '../lib/paths.js'
import { info, log } from '../lib/log.js'
import { getEnvConfig, ENVIRONMENTS, type Environment } from '../lib/environments.js'

/**
 * 扫描项目目录下的 skills
 */
function scanProjectSkills(projectDir: string = process.cwd()): Map<string, Environment[]> {
  const skillEnvs = new Map<string, Environment[]>()

  for (const env of Object.keys(ENVIRONMENTS) as Environment[]) {
    const config = ENVIRONMENTS[env]
    // 遍历该环境的所有项目路径
    for (const projectPath of config.projectPaths) {
      const envPath = join(projectDir, projectPath)

      if (existsSync(envPath)) {
        const dirs = readdirSync(envPath, { withFileTypes: true })
        for (const dir of dirs) {
          // 同时检查目录和符号链接（符号链接可能指向目录）
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
 * 扫描全局目录下的 skills
 */
function scanGlobalSkills(): Map<string, Environment[]> {
  const skillEnvs = new Map<string, Environment[]>()

  for (const env of Object.keys(ENVIRONMENTS) as Environment[]) {
    const config = ENVIRONMENTS[env]
    const envPath = config.globalPath

    if (existsSync(envPath)) {
      const dirs = readdirSync(envPath, { withFileTypes: true })
      for (const dir of dirs) {
        // 同时检查目录和符号链接
        if (dir.isDirectory() || dir.isSymbolicLink()) {
          const existing = skillEnvs.get(dir.name) || []
          existing.push(env)
          skillEnvs.set(dir.name, existing)
        }
      }
    }
  }

  return skillEnvs
}

/**
 * 注册 list 命令
 */
export function registerListCommand(cli: ReturnType<typeof cac>): void {
  cli
    .command('list [skill]', 'List installed skills')
    .option('-g, --global', 'List global skills only')
    .option('-l, --local', 'List skills in current project directory')
    .option('-a, --all', 'List all skills (project + global)')
    .option('--json', 'Output as JSON')
    .option('-s, --search <keyword>', 'Search skills by name')
    .action(
      (
        skillName?: string,
        options?: {
          global?: boolean
          local?: boolean
          all?: boolean
          json?: boolean
          search?: string
        }
      ) => {
        ensureGlobalDir()

        // 默认显示项目级 skills（如果没有指定选项）
        const showLocal = options?.local || options?.all || (!options?.global && !options?.all)
        const showGlobal = options?.global || options?.all

        // 显示全局技能
        if (options?.global && !options?.all) {
          const globalSkills = scanGlobalSkills()

          // 搜索过滤
          let filteredSkills = globalSkills
          if (options?.search) {
            const keyword = options.search.toLowerCase()
            filteredSkills = new Map()
            for (const [name, envs] of globalSkills) {
              if (name.toLowerCase().includes(keyword)) {
                filteredSkills.set(name, envs)
              }
            }
          }

          if (options?.json) {
            const result: Record<string, {
              name: string
              environments: Array<{
                name: string
                label: string
                path: string
              }>
            }> = {}
            for (const [skillName, envs] of filteredSkills) {
              result[skillName] = {
                name: skillName,
                environments: envs.map((env) => {
                  const config = ENVIRONMENTS[env]
                  return {
                    name: env,
                    label: config.label,
                    path: `${config.globalPath.replace(/\/$/, '')}/${skillName}`,
                  }
                }),
              }
            }
            console.log(JSON.stringify(result, null, 2))
            return
          }

          if (filteredSkills.size === 0) {
            info('No global skills found.')
            return
          }

          p.intro(`Global Skills (${filteredSkills.size})`)

          for (const [name, envs] of filteredSkills) {
            console.log('')
            console.log(`  \x1b[36m${name}\x1b[0m`)

            const envLabels = envs.map((e) => getEnvConfig(e).label).join(', ')
            console.log(`    📍 ${envLabels}`)

            // 显示路径
            for (const env of envs) {
              const config = ENVIRONMENTS[env]
              console.log(`    📁 ${config.globalPath}/${name}`)
            }
          }

          console.log('')
          return
        }

        // 显示项目级技能（默认或 -l 选项）
        if (showLocal) {
          const projectSkills = scanProjectSkills()
          const projectDir = process.cwd()

          if (options?.json) {
            const result: Record<string, {
              name: string
              environments: Array<{
                name: string
                label: string
                path: string
              }>
            }> = {}
            for (const [skillName, envs] of projectSkills) {
              result[skillName] = {
                name: skillName,
                environments: envs.map((env) => {
                  const config = ENVIRONMENTS[env]
                  return {
                    name: env,
                    label: config.label,
                    path: `${config.projectPaths[0].replace(/\/$/, '')}/${skillName}`,
                  }
                }),
              }
            }
            console.log(JSON.stringify({ project: result }, null, 2))
            return
          }

          if (projectSkills.size === 0) {
            info('No skills found in current project.')
            return
          }

          p.intro(`Project Skills (${projectSkills.size})`)

          for (const [name, envs] of projectSkills) {
            console.log('')
            console.log(`  \x1b[36m${name}\x1b[0m`)

            const envLabels = envs.map((e) => getEnvConfig(e).label).join(', ')
            console.log(`    📍 ${envLabels}`)

            // 显示路径
            for (const env of envs) {
              const config = ENVIRONMENTS[env]
              // 显示第一个（默认）项目路径
              console.log(`    📁 ${config.projectPaths[0]}/${name}`)
            }
          }

          console.log('')

          // 如果是 -a 选项，继续显示全局技能
          if (!showGlobal) return
        }

        // 显示全局技能（-a 选项时）
        if (showGlobal) {
          const globalSkills = scanGlobalSkills()

          // 搜索过滤
          let filteredSkills = globalSkills
          if (options?.search) {
            const keyword = options.search.toLowerCase()
            filteredSkills = new Map()
            for (const [name, envs] of globalSkills) {
              if (name.toLowerCase().includes(keyword)) {
                filteredSkills.set(name, envs)
              }
            }
          }

          if (options?.json) {
            const result: Record<string, {
              name: string
              environments: Array<{
                name: string
                label: string
                path: string
              }>
            }> = {}
            for (const [skillName, envs] of filteredSkills) {
              result[skillName] = {
                name: skillName,
                environments: envs.map((env) => {
                  const config = ENVIRONMENTS[env]
                  return {
                    name: env,
                    label: config.label,
                    path: `${config.globalPath.replace(/\/$/, '')}/${skillName}`,
                  }
                }),
              }
            }
            console.log(JSON.stringify(result, null, 2))
            return
          }

          if (filteredSkills.size === 0) {
            info('No global skills found.')
            return
          }

          p.intro(`Global Skills (${filteredSkills.size})`)

          for (const [name, envs] of filteredSkills) {
            console.log('')
            console.log(`  \x1b[36m${name}\x1b[0m`)

            const envLabels = envs.map((e) => getEnvConfig(e).label).join(', ')
            console.log(`    📍 ${envLabels}`)

            // 显示路径
            for (const env of envs) {
              const config = ENVIRONMENTS[env]
              console.log(`    📁 ${config.globalPath}/${name}`)
            }
          }

          console.log('')
        }
      }
    )
}
