/**
 * 错误处理工具函数
 */

/**
 * CLI 错误类
 */
export class CliError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN',
    public exitCode: number = 1
  ) {
    super(message)
    this.name = 'CliError'
  }
}

/**
 * 抛出 CLI 错误
 */
export function throwError(
  message: string,
  code: string = 'UNKNOWN',
  exitCode: number = 1
): never {
  throw new CliError(message, code, exitCode)
}

/**
 * 错误码常量
 */
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CANCELLED: 'CANCELLED',
} as const

/**
 * 格式化错误信息
 */
export function formatError(error: unknown): string {
  if (error instanceof CliError) {
    return `[${error.code}] ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
