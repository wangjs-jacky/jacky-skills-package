/**
 * j-skills CLI 入口
 * CLI tool for managing Claude Code Skills
 */
import { cac } from 'cac'
import { setVerboseMode } from './lib/log.js'

// 导入命令
import { registerLinkCommand } from './commands/link.js'
import { registerInstallCommand } from './commands/install.js'
import { registerUninstallCommand } from './commands/uninstall.js'
import { registerListCommand } from './commands/list.js'
import { registerConfigCommand } from './commands/config.js'

// 版本号
const VERSION = '0.1.0'

// 创建 CLI 实例
const cli = cac('j-skills')

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

// 解析参数
const { options } = cli.parse()

// 设置 verbose 模式
if (options.verbose) {
  setVerboseMode(true)
}
