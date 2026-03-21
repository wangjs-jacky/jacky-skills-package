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
}

/**
 * Hook 匹配器配置
 */
export interface HookMatcher {
  matcher?: string
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

  const settings = readClaudeSettings()

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
      const resolvedHooks: HookConfig[] = matcher.hooks.map((hook) => ({
        type: hook.type,
        command: `${resolveHookVariables(hook.command, skillPath)} ${skillMarker}`,
      }))

      // 查找是否已有相同 matcher 的配置
      const existingMatcher = settings.hooks[hookType].find(
        (m) => m.matcher === (matcher.matcher || '')
      )

      if (existingMatcher) {
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
          matcher: matcher.matcher || '',
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
