/**
 * 日志工具（支持 verbose 模式）
 */

let verboseMode = false

/**
 * 设置 verbose 模式
 */
export function setVerboseMode(enabled: boolean): void {
  verboseMode = enabled
}

/**
 * 检查是否处于 verbose 模式
 */
export function isVerbose(): boolean {
  return verboseMode
}

/**
 * 普通日志
 */
export function log(message: string): void {
  console.log(message)
}

/**
 * 信息日志
 */
export function info(message: string): void {
  console.log(`\x1b[34mℹ\x1b[0m ${message}`)
}

/**
 * 成功日志
 */
export function success(message: string): void {
  console.log(`\x1b[32m✓\x1b[0m ${message}`)
}

/**
 * 警告日志
 */
export function warn(message: string): void {
  console.log(`\x1b[33m⚠\x1b[0m ${message}`)
}

/**
 * 错误日志
 */
export function error(message: string): void {
  console.error(`\x1b[31m✗\x1b[0m ${message}`)
}

/**
 * 详细日志（仅在 verbose 模式下输出）
 */
export function verbose(message: string): void {
  if (verboseMode) {
    console.log(`\x1b[90m→ ${message}\x1b[0m`)
  }
}

/**
 * 调试日志（仅在 verbose 模式下输出）
 */
export function debug(message: string, data?: unknown): void {
  if (verboseMode) {
    if (data !== undefined) {
      console.log(`\x1b[90m[debug] ${message}\x1b[0m`, data)
    } else {
      console.log(`\x1b[90m[debug] ${message}\x1b[0m`)
    }
  }
}

/**
 * 步骤日志
 */
export function step(stepName: string, message: string): void {
  console.log(`\x1b[36m◆ ${stepName}\x1b[0m ${message}`)
}
