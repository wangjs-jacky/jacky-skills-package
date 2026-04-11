/**
 * Hooks 管理模块
 * 负责 skill hooks 与 .claude/settings.json 的合并和移除
 */
import { homedir } from 'os'
import { join, basename } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { verbose } from './log.js'

/**
 * Claude Code settings.json 路径
 */
export function getClaudeSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json')
}

/**
 * Hook 配置项
 */
export interface HookConfig {
  type: 'command'
  command: string
  async?: boolean
  [key: string]: unknown
}

/**
 * Hook 匹配器配置
 */
export interface HookMatcher {
  matcher?: string | null
  hooks: HookConfig[]
}

/**
 * Hooks 配置结构
 */
export interface HooksConfig {
  [hookType: string]: HookMatcher[]
}

/**
 * Settings.json 结构
 */
export interface ClaudeSettings {
  hooks?: HooksConfig
  [key: string]: unknown
}

/**
 * Skill 的 hooks.json 结构
 */
export interface SkillHooksJson {
  hooks: HooksConfig
}

/**
 * 获取 skill 标识符（用于 command 注释）
 */
function getSkillMarker(skillName: string): string {
  return `# skill: ${skillName}`
}

/**
 * 检查 command 是否来自指定 skill
 */
function isCommandFromSkill(command: string, skillName: string): boolean {
  return command.includes(getSkillMarker(skillName))
}

/**
 * 读取 settings.json
 */
export function readClaudeSettings(): ClaudeSettings {
  const settingsPath = getClaudeSettingsPath()

  if (!existsSync(settingsPath)) {
    return {}
  }

  try {
    const content = readFileSync(settingsPath, 'utf-8')
    return JSON.parse(content) as ClaudeSettings
  } catch (error) {
    verbose(`Failed to read settings.json: ${(error as Error).message}`)
    return {}
  }
}

/**
 * 写入 settings.json
 */
export function writeClaudeSettings(settings: ClaudeSettings): boolean {
  const settingsPath = getClaudeSettingsPath()

  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    return true
  } catch (error) {
    verbose(`Failed to write settings.json: ${(error as Error).message}`)
    return false
  }
}

/**
 * 读取 skill 的 hooks.json
 */
export function readSkillHooks(skillPath: string): SkillHooksJson | null {
  const hooksPath = join(skillPath, 'hooks', 'hooks.json')

  if (!existsSync(hooksPath)) {
    return null
  }

  try {
    const content = readFileSync(hooksPath, 'utf-8')
    return JSON.parse(content) as SkillHooksJson
  } catch (error) {
    verbose(`Failed to read skill hooks.json: ${(error as Error).message}`)
    return null
  }
}

/**
 * 检查 skill 是否有 hooks
 */
export function hasSkillHooks(skillPath: string): boolean {
  return readSkillHooks(skillPath) !== null
}

/**
 * 替换 hooks.json 中的变量
 * ${CLAUDE_PLUGIN_ROOT} -> skill 实际路径
 */
function resolveHookVariables(command: string, skillPath: string): string {
  return command.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, skillPath)
}

/**
 * 验证 hooks 配置结构是否符合规范
 * 在合并/移除操作前调用，防止损坏 settings.json
 */
export function validateHooksConfig(hooks: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 1. hooks 必须是非 null 的 object，且不是数组
  if (hooks === null || hooks === undefined || typeof hooks !== 'object' || Array.isArray(hooks)) {
    return { valid: false, errors: ['hooks 必须是非 null 的 object'] }
  }

  const hooksObj = hooks as Record<string, unknown>

  for (const [hookType, matchers] of Object.entries(hooksObj)) {
    // 2. 每个 hookType 的值必须是数组
    if (!Array.isArray(matchers)) {
      errors.push(`hooks.${hookType} 不是数组`)
      continue
    }

    matchers.forEach((matcher, mIdx) => {
      // 3. 每个 matcher 必须是 object
      if (matcher === null || matcher === undefined || typeof matcher !== 'object' || Array.isArray(matcher)) {
        errors.push(`hooks.${hookType}[${mIdx}] 不是 object`)
        return
      }

      const m = matcher as Record<string, unknown>

      // 4. matcher 字段如果存在必须是 string 或 null
      if ('matcher' in m && m.matcher !== null && typeof m.matcher !== 'string') {
        errors.push(`hooks.${hookType}[${mIdx}].matcher 不是 string/null`)
      }

      // 5. 必须有 hooks 属性且为数组
      if (!('hooks' in m)) {
        errors.push(`hooks.${hookType}[${mIdx}] 缺少 hooks 属性`)
        return
      }
      if (!Array.isArray(m.hooks)) {
        errors.push(`hooks.${hookType}[${mIdx}].hooks 不是数组`)
        return
      }

      // 6. 每个 hook 必须有 type(string) 和 command(string)
      m.hooks.forEach((hook: unknown, hIdx: number) => {
        if (hook === null || hook === undefined || typeof hook !== 'object' || Array.isArray(hook)) {
          errors.push(`hooks.${hookType}[${mIdx}].hooks[${hIdx}] 不是 object`)
          return
        }
        const h = hook as Record<string, unknown>
        if (!('type' in h) || typeof h.type !== 'string') {
          errors.push(`hooks.${hookType}[${mIdx}].hooks[${hIdx}] 缺少 type 或 type 不是 string`)
        }
        if (!('command' in h) || typeof h.command !== 'string') {
          errors.push(`hooks.${hookType}[${mIdx}].hooks[${hIdx}] 缺少 command 或 command 不是 string`)
        }
      })
    })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 归一化 matcher：null/undefined 视为空 matcher
 */
function normalizeMatcher(matcher: string | null | undefined): string {
  return matcher ?? ''
}

/**
 * 合并 skill hooks 到 settings.json
 * @param skillPath skill 路径
 * @param skillName skill 名称
 * @returns 是否成功合并
 */
export function mergeSkillHooks(skillPath: string, skillName: string): boolean {
  const skillHooks = readSkillHooks(skillPath)

  if (!skillHooks || !skillHooks.hooks) {
    verbose(`No hooks found in skill: ${skillName}`)
    return false
  }

  // 前置验证：检查 skill hooks.json 结构
  const skillValidation = validateHooksConfig(skillHooks.hooks)
  if (!skillValidation.valid) {
    verbose(`skill hooks.json 结构异常，中止合并: ${skillValidation.errors.join('; ')}`)
    return false
  }

  const settings = readClaudeSettings()

  // 前置验证：检查 settings.json 现有 hooks 结构
  if (settings.hooks) {
    const validation = validateHooksConfig(settings.hooks)
    if (!validation.valid) {
      verbose(`settings.json hooks 结构异常，中止合并: ${validation.errors.join('; ')}`)
      return false
    }
  }

  // 确保 hooks 对象存在
  if (!settings.hooks) {
    settings.hooks = {}
  }

  const skillMarker = getSkillMarker(skillName)

  // 遍历 skill 的所有 hook 类型
  for (const [hookType, matchers] of Object.entries(skillHooks.hooks)) {
    // 确保该 hook 类型存在
    if (!settings.hooks[hookType]) {
      settings.hooks[hookType] = []
    }

    // 遍历每个 matcher 配置
    for (const matcher of matchers) {
      // 转换 hooks 中的 command
      const resolvedHooks: HookConfig[] = matcher.hooks.map((hook) => {
        const resolved: HookConfig = {
          type: hook.type,
          command: `${resolveHookVariables(hook.command, skillPath)} ${skillMarker}`,
        }
        // 保留 async 等额外字段
        for (const [key, value] of Object.entries(hook)) {
          if (key !== 'type' && key !== 'command') {
            resolved[key] = value
          }
        }
        return resolved
      })

      // 查找是否已有相同 matcher 的配置
      const incomingMatcher = normalizeMatcher(matcher.matcher)
      const existingMatcher = settings.hooks[hookType].find(
        (m) => normalizeMatcher(m.matcher) === incomingMatcher
      )

      if (existingMatcher) {
        // 统一 matcher 表达，避免 null/undefined 与空字符串混用
        existingMatcher.matcher = incomingMatcher

        // 合并 hooks（避免重复）
        for (const resolvedHook of resolvedHooks) {
          const exists = existingMatcher.hooks.some(
            (h) => h.command === resolvedHook.command
          )
          if (!exists) {
            existingMatcher.hooks.push(resolvedHook)
          }
        }
      } else {
        // 添加新的 matcher 配置
        settings.hooks[hookType].push({
          matcher: incomingMatcher,
          hooks: resolvedHooks,
        })
      }
    }

    verbose(`Merged hooks for ${hookType} in skill: ${skillName}`)
  }

  return writeClaudeSettings(settings)
}

/**
 * 从 settings.json 移除 skill hooks
 * @param skillName skill 名称
 * @returns 是否成功移除
 */
export function removeSkillHooks(skillName: string): boolean {
  const settings = readClaudeSettings()

  if (!settings.hooks) {
    verbose('No hooks found in settings.json')
    return false
  }

  // 前置验证：检查 hooks 结构
  const validation = validateHooksConfig(settings.hooks)
  if (!validation.valid) {
    verbose(`settings.json hooks 结构异常，中止移除: ${validation.errors.join('; ')}`)
    return false
  }

  const skillMarker = getSkillMarker(skillName)
  let removed = false

  // 遍历所有 hook 类型
  for (const [hookType, matchers] of Object.entries(settings.hooks)) {
    // 遍历每个 matcher 配置
    for (let i = matchers.length - 1; i >= 0; i--) {
      const matcher = matchers[i]

      // 过滤掉来自该 skill 的 hooks
      const filteredHooks = matcher.hooks.filter(
        (hook) => !isCommandFromSkill(hook.command, skillName)
      )

      if (filteredHooks.length === 0) {
        // 如果没有剩余的 hooks，移除整个 matcher
        matchers.splice(i, 1)
        removed = true
        verbose(`Removed empty matcher for ${hookType}`)
      } else if (filteredHooks.length !== matcher.hooks.length) {
        // 更新 hooks 列表
        matcher.hooks = filteredHooks
        removed = true
        verbose(`Removed hooks from ${hookType} for skill: ${skillName}`)
      }
    }

    // 如果该 hook 类型没有 matchers 了，移除整个 hook 类型
    if (matchers.length === 0) {
      delete settings.hooks[hookType]
      verbose(`Removed empty hook type: ${hookType}`)
    }
  }

  if (removed) {
    return writeClaudeSettings(settings)
  }

  return false
}

/**
 * 检查 settings.json 中是否包含指定 skill 的 hooks
 */
export function hasSkillHooksInSettings(skillName: string): boolean {
  const settings = readClaudeSettings()

  if (!settings.hooks) {
    return false
  }

  for (const matchers of Object.values(settings.hooks)) {
    for (const matcher of matchers) {
      for (const hook of matcher.hooks) {
        if (isCommandFromSkill(hook.command, skillName)) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * 列出 settings.json 中所有 skill hooks
 * @returns skill 名称列表
 */
export function listInstalledSkillHooks(): string[] {
  const settings = readClaudeSettings()
  const skills = new Set<string>()

  if (!settings.hooks) {
    return []
  }

  const markerRegex = /# skill: ([^\s]+)/

  for (const matchers of Object.values(settings.hooks)) {
    for (const matcher of matchers) {
      for (const hook of matcher.hooks) {
        const match = hook.command.match(markerRegex)
        if (match) {
          skills.add(match[1])
        }
      }
    }
  }

  return Array.from(skills)
}
