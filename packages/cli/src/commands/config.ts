/**
 * config 命令 - 配置管理
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { getConfigPath, ensureGlobalDir } from '../lib/paths.js'
import { success, error, info, log } from '../lib/log.js'

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  registry: 'https://registry.j-skills.dev',
  registries: [
    {
      name: 'default',
      url: 'https://registry.j-skills.dev',
    },
  ],
}

/**
 * 配置类型
 */
interface Config {
  registry: string
  registries: Array<{ name: string; url: string }>
  [key: string]: unknown
}

/**
 * 读取配置
 */
export function readConfig(): Config {
  const configPath = getConfigPath()

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG }
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 写入配置
 */
export function writeConfig(config: Config): void {
  const configPath = getConfigPath()
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * 注册 config 命令（使用扁平命令结构）
 */
export function registerConfigCommand(cli: ReturnType<typeof cac>): void {
  // config list
  cli
    .command('config:list', 'List all configuration values')
    .action(() => {
      ensureGlobalDir()
      const config = readConfig()

      p.intro('Configuration')
      console.log(JSON.stringify(config, null, 2))
    })

  // config set
  cli
    .command('config:set <key> <value>', 'Set a configuration value')
    .action((key: string, value: string) => {
      ensureGlobalDir()
      const config = readConfig()

      // 特殊处理 registry
      if (key === 'registry') {
        config.registry = value
      } else if (key === 'defaultEnvironments') {
        // 确保始终以数组格式存储
        config[key] = value.split(',').map((s: string) => s.trim()).filter(Boolean)
      } else {
        config[key] = value
      }

      writeConfig(config)
      success(`Set ${key} = ${value}`)
    })

  // config reset
  cli
    .command('config:reset', 'Reset configuration to defaults')
    .action(async () => {
      ensureGlobalDir()

      const shouldReset = await p.confirm({
        message: 'Reset all configuration to defaults?',
        initialValue: false,
      })

      if (p.isCancel(shouldReset) || !shouldReset) {
        info('Operation cancelled.')
        return
      }

      writeConfig({ ...DEFAULT_CONFIG })
      success('Configuration reset to defaults.')
    })

  // config add-registry
  cli
    .command('config:add-registry <name> <url>', 'Add a registry source')
    .action((name: string, url: string) => {
      ensureGlobalDir()
      const config = readConfig()

      // 检查是否已存在
      if (config.registries.some((r) => r.name === name)) {
        error(`Registry "${name}" already exists.`)
        return
      }

      config.registries.push({ name, url })
      writeConfig(config)
      success(`Added registry "${name}"`)
    })

  // config registries
  cli
    .command('config:registries', 'List all registry sources')
    .action(() => {
      ensureGlobalDir()
      const config = readConfig()

      p.intro('Registry Sources')
      for (const registry of config.registries) {
        const current = registry.url === config.registry ? '(current)' : ''
        console.log(`  ${registry.name}: ${registry.url} ${current}`)
      }
    })

  // config use
  cli
    .command('config:use <name>', 'Switch to a registry by name')
    .action((name: string) => {
      ensureGlobalDir()
      const config = readConfig()

      const registry = config.registries.find((r) => r.name === name)
      if (!registry) {
        error(`Registry "${name}" not found.`)
        return
      }

      config.registry = registry.url
      writeConfig(config)
      success(`Switched to registry "${name}"`)
    })
}
