/**
 * 目标环境配置
 */
import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * 支持的目标环境类型
 * 官方文档: https://github.com/vercel-labs/skills#available-agents
 */
export type Environment =
  | 'amp'
  | 'antigravity'
  | 'augment'
  | 'claude-code'
  | 'openclaw'
  | 'cline'
  | 'codebuddy'
  | 'codex'
  | 'command-code'
  | 'continue'
  | 'crush'
  | 'cursor'
  | 'droid'
  | 'gemini-cli'
  | 'github-copilot'
  | 'goose'
  | 'junie'
  | 'iflow-cli'
  | 'kilo'
  | 'kiro-cli'
  | 'kode'
  | 'mcpjam'
  | 'mistral-vibe'
  | 'mux'
  | 'opencode'
  | 'openhands'
  | 'pi'
  | 'qoder'
  | 'qwen-code'
  | 'roo'
  | 'trae'
  | 'trae-cn'
  | 'windsurf'
  | 'zencoder'
  | 'neovate'
  | 'pochi'
  | 'adal'
  | 'kimi-cli'
  | 'replit'

/**
 * 环境配置
 */
export interface EnvironmentConfig {
  name: string
  label: string
  globalPath: string
  projectPaths: string[]
  hint?: string
}

/**
 * 环境配置映射
 *
 * 官方文档: https://github.com/vercel-labs/skills#available-agents
 */
export const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  amp: {
    name: 'amp',
    label: 'Amp',
    globalPath: join(homedir(), '.config', 'agents', 'skills'),
    projectPaths: ['.agents/skills/'],
  },
  antigravity: {
    name: 'antigravity',
    label: 'Antigravity',
    globalPath: join(homedir(), '.gemini', 'antigravity', 'skills'),
    projectPaths: ['.agent/skills/'],
  },
  augment: {
    name: 'augment',
    label: 'Augment',
    globalPath: join(homedir(), '.augment', 'skills'),
    projectPaths: ['.augment/skills/'],
  },
  'claude-code': {
    name: 'claude-code',
    label: 'Claude Code',
    globalPath: join(homedir(), '.claude', 'skills'),
    projectPaths: ['.claude/skills/'],
    hint: 'recommended',
  },
  openclaw: {
    name: 'openclaw',
    label: 'OpenClaw',
    globalPath: join(homedir(), '.moltbot', 'skills'),
    projectPaths: ['skills/'],
  },
  cline: {
    name: 'cline',
    label: 'Cline',
    globalPath: join(homedir(), '.cline', 'skills'),
    projectPaths: ['.cline/skills/'],
  },
  codebuddy: {
    name: 'codebuddy',
    label: 'CodeBuddy',
    globalPath: join(homedir(), '.codebuddy', 'skills'),
    projectPaths: ['.codebuddy/skills/'],
  },
  codex: {
    name: 'codex',
    label: 'Codex',
    globalPath: join(homedir(), '.codex', 'skills'),
    projectPaths: ['.agents/skills/'],
  },
  'command-code': {
    name: 'command-code',
    label: 'Command Code',
    globalPath: join(homedir(), '.commandcode', 'skills'),
    projectPaths: ['.commandcode/skills/'],
  },
  continue: {
    name: 'continue',
    label: 'Continue',
    globalPath: join(homedir(), '.continue', 'skills'),
    projectPaths: ['.continue/skills/'],
  },
  crush: {
    name: 'crush',
    label: 'Crush',
    globalPath: join(homedir(), '.config', 'crush', 'skills'),
    projectPaths: ['.crush/skills/'],
  },
  cursor: {
    name: 'cursor',
    label: 'Cursor',
    globalPath: join(homedir(), '.cursor', 'skills'),
    projectPaths: ['.cursor/skills/'],
  },
  droid: {
    name: 'droid',
    label: 'Droid',
    globalPath: join(homedir(), '.factory', 'skills'),
    projectPaths: ['.factory/skills/'],
  },
  'gemini-cli': {
    name: 'gemini-cli',
    label: 'Gemini CLI',
    globalPath: join(homedir(), '.gemini', 'skills'),
    projectPaths: ['.agents/skills/'],
  },
  'github-copilot': {
    name: 'github-copilot',
    label: 'GitHub Copilot',
    globalPath: join(homedir(), '.copilot', 'skills'),
    projectPaths: ['.agents/skills/'],
  },
  goose: {
    name: 'goose',
    label: 'Goose',
    globalPath: join(homedir(), '.config', 'goose', 'skills'),
    projectPaths: ['.goose/skills/'],
  },
  junie: {
    name: 'junie',
    label: 'Junie',
    globalPath: join(homedir(), '.junie', 'skills'),
    projectPaths: ['.junie/skills/'],
  },
  'iflow-cli': {
    name: 'iflow-cli',
    label: 'iFlow CLI',
    globalPath: join(homedir(), '.iflow', 'skills'),
    projectPaths: ['.iflow/skills/'],
  },
  kilo: {
    name: 'kilo',
    label: 'Kilo Code',
    globalPath: join(homedir(), '.kilocode', 'skills'),
    projectPaths: ['.kilocode/skills/'],
  },
  'kiro-cli': {
    name: 'kiro-cli',
    label: 'Kiro CLI',
    globalPath: join(homedir(), '.kiro', 'skills'),
    projectPaths: ['.kiro/skills/'],
  },
  kode: {
    name: 'kode',
    label: 'Kode',
    globalPath: join(homedir(), '.kode', 'skills'),
    projectPaths: ['.kode/skills/'],
  },
  mcpjam: {
    name: 'mcpjam',
    label: 'MCPJam',
    globalPath: join(homedir(), '.mcpjam', 'skills'),
    projectPaths: ['.mcpjam/skills/'],
  },
  'mistral-vibe': {
    name: 'mistral-vibe',
    label: 'Mistral Vibe',
    globalPath: join(homedir(), '.vibe', 'skills'),
    projectPaths: ['.vibe/skills/'],
  },
  mux: {
    name: 'mux',
    label: 'Mux',
    globalPath: join(homedir(), '.mux', 'skills'),
    projectPaths: ['.mux/skills/'],
  },
  opencode: {
    name: 'opencode',
    label: 'OpenCode',
    globalPath: join(homedir(), '.config', 'opencode', 'skills'),
    projectPaths: ['.agents/skills/'],
  },
  openhands: {
    name: 'openhands',
    label: 'OpenHands',
    globalPath: join(homedir(), '.openhands', 'skills'),
    projectPaths: ['.openhands/skills/'],
  },
  pi: {
    name: 'pi',
    label: 'Pi',
    globalPath: join(homedir(), '.pi', 'agent', 'skills'),
    projectPaths: ['.pi/skills/'],
  },
  qoder: {
    name: 'qoder',
    label: 'Qoder',
    globalPath: join(homedir(), '.qoder', 'skills'),
    projectPaths: ['.qoder/skills/'],
  },
  'qwen-code': {
    name: 'qwen-code',
    label: 'Qwen Code',
    globalPath: join(homedir(), '.qwen', 'skills'),
    projectPaths: ['.qwen/skills/'],
  },
  roo: {
    name: 'roo',
    label: 'Roo Code',
    globalPath: join(homedir(), '.roo', 'skills'),
    projectPaths: ['.roo/skills/'],
  },
  trae: {
    name: 'trae',
    label: 'Trae',
    globalPath: join(homedir(), '.trae', 'skills'),
    projectPaths: ['.trae/skills/'],
  },
  'trae-cn': {
    name: 'trae-cn',
    label: 'Trae CN',
    globalPath: join(homedir(), '.trae-cn', 'skills'),
    projectPaths: ['.trae/skills/'],
  },
  windsurf: {
    name: 'windsurf',
    label: 'Windsurf',
    globalPath: join(homedir(), '.codeium', 'windsurf', 'skills'),
    projectPaths: ['.windsurf/skills/'],
  },
  zencoder: {
    name: 'zencoder',
    label: 'Zencoder',
    globalPath: join(homedir(), '.zencoder', 'skills'),
    projectPaths: ['.zencoder/skills/'],
  },
  neovate: {
    name: 'neovate',
    label: 'Neovate',
    globalPath: join(homedir(), '.neovate', 'skills'),
    projectPaths: ['.neovate/skills/'],
  },
  pochi: {
    name: 'pochi',
    label: 'Pochi',
    globalPath: join(homedir(), '.pochi', 'skills'),
    projectPaths: ['.pochi/skills/'],
  },
  adal: {
    name: 'adal',
    label: 'AdaL',
    globalPath: join(homedir(), '.adal', 'skills'),
    projectPaths: ['.adal/skills/'],
  },
  'kimi-cli': {
    name: 'kimi-cli',
    label: 'Kimi Code CLI',
    globalPath: join(homedir(), '.config', 'agents', 'skills'),
    projectPaths: ['.agents/skills/'],
  },
  replit: {
    name: 'replit',
    label: 'Replit',
    globalPath: join(homedir(), '.config', 'agents', 'skills'),
    projectPaths: ['.agents/skills/'],
  },
}

/**
 * 获取环境目标路径（全局）
 */
export function getGlobalEnvPath(env: Environment): string {
  return ENVIRONMENTS[env].globalPath
}

/**
 * 获取项目级环境路径列表
 */
export function getProjectEnvPaths(env: Environment, projectDir: string = process.cwd()): string[] {
  return ENVIRONMENTS[env].projectPaths.map((p) => join(projectDir, p))
}

/**
 * 获取第一个存在的项目级环境路径
 */
export function getFirstExistingProjectPath(env: Environment, projectDir: string = process.cwd()): string | null {
  const paths = getProjectEnvPaths(env, projectDir)
  for (const path of paths) {
    if (existsSync(path)) {
      return path
    }
  }
  // 如果都不存在，返回第一个（作为默认创建路径）
  return paths[0]
}

/**
 * 获取支持的环境列表
 */
export function getAllowedEnvironments(): Environment[] {
  return Object.keys(ENVIRONMENTS) as Environment[]
}

/**
 * 获取环境配置
 */
export function getEnvConfig(env: Environment): EnvironmentConfig {
  return ENVIRONMENTS[env]
}

/**
 * 检查环境路径是否存在
 */
export function checkEnvPathExists(env: Environment, global: boolean = false): boolean {
  if (global) {
    return existsSync(getGlobalEnvPath(env))
  }
  return getFirstExistingProjectPath(env) !== null
}

/**
 * 获取用于 @clack/prompts multiselect 的选项列表
 */
export function getEnvOptions() {
  return getAllowedEnvironments().map((env) => {
    const config = ENVIRONMENTS[env]
    return {
      value: env,
      label: config.label,
      hint: config.hint,
    }
  })
}

/**
 * 解析环境字符串（从命令行参数）
 */
export function parseEnvironments(envString: string): Environment[] {
  const envs = envString.split(',').map((e) => e.trim() as Environment)
  const validEnvs: Environment[] = []

  for (const env of envs) {
    if (getAllowedEnvironments().includes(env)) {
      validEnvs.push(env)
    } else {
      console.warn(`Unknown environment: ${env}`)
    }
  }

  return validEnvs
}
