/**
 * j-skills CLI 入口
 * CLI tool for managing Claude Code Skills
 */
import { cac } from 'cac'
import { setVerboseMode, error, info } from './lib/log.js'
import { initializeDefaultProfiles } from './lib/profiles.js'
import { ensureGlobalDir } from './lib/paths.js'

// 导入命令
import { registerLinkCommand } from './commands/link.js'
import { registerInstallCommand } from './commands/install.js'
import { registerUninstallCommand } from './commands/uninstall.js'
import { registerListCommand } from './commands/list.js'
import { registerConfigCommand } from './commands/config.js'
import { registerProfileCommand } from './commands/profile.js'
import { registerScanAgentsCommand } from './commands/scan-agents.js'
import { registerAddCommand } from './commands/add.js'

// 版本号
const VERSION = '0.3.1'

// 创建 CLI 实例
const cli = cac('j-skills')

// 初始化默认 Profiles
ensureGlobalDir()
initializeDefaultProfiles()

// 全局选项
cli.version(VERSION)
cli.help()
cli.option('--verbose', 'Show detailed logs', { default: false })

// 注册命令
registerLinkCommand(cli)
registerInstallCommand(cli)
registerUninstallCommand(cli)
registerListCommand(cli)
registerConfigCommand(cli)
registerProfileCommand(cli)
registerScanAgentsCommand(cli)
registerAddCommand(cli)

/**
 * 判断是否为 CAC 相关错误
 */
function isCACError(err: Error): boolean {
  const message = err.message
  return (
    message.includes('Unknown option') ||
    message.includes('Unknown command') ||
    message.includes('missing required args') ||
    message.includes('value is missing')
  )
}

/**
 * 格式化 CAC 错误
 */
function formatCACError(err: Error): string {
  const message = err.message

  // 未知选项错误
  if (message.includes('Unknown option')) {
    const match = message.match(/`([^`]+)`/)
    const option = match ? match[1] : ''
    return `未知选项: ${option}\n使用 --help 查看可用选项`
  }

  // 未知命令错误
  if (message.includes('Unknown command')) {
    const match = message.match(/`([^`]+)`/)
    const cmd = match ? match[1] : ''
    return `未知命令: ${cmd}\n使用 --help 查看可用命令`
  }

  // 缺少必要参数
  if (message.includes('missing required args')) {
    return '缺少必要参数\n使用 --help 查看用法'
  }

  // 选项值缺失
  if (message.includes('value is missing')) {
    const match = message.match(/`([^`]+)`/)
    const option = match ? match[1] : ''
    return `选项 ${option} 需要提供值`
  }

  return message
}

// 全局错误处理
let isExiting = false

process.on('uncaughtException', (err: Error) => {
  // 防止重复处理
  if (isExiting) return

  if (isCACError(err)) {
    isExiting = true
    error(formatCACError(err))
    process.exit(1)
  }

  // 非 CAC 错误，正常抛出
  throw err
})

// 解析参数
const { options } = cli.parse()

// 设置 verbose 模式
if (options.verbose) {
  setVerboseMode(true)
}
