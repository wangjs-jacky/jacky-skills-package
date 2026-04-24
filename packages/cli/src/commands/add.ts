/**
 * add 命令 - 统一入口添加外部 skill（GitHub URL / 本地路径）
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { resolve, basename, join } from 'path'
import { existsSync, mkdirSync, rmSync, readdirSync, cpSync, writeFileSync } from 'fs'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { setTimeout as sleep } from 'timers/promises'
import {
  registerSkill,
  getSkill,
} from '../lib/registry.js'
import { readSkillMetadata } from '../lib/skill-metadata.js'
import { success, error, info, warn, verbose } from '../lib/log.js'
import { setVerboseMode } from '../lib/log.js'
import { isCancel } from '@clack/prompts'
import { installToEnv } from './install.js'
import { getGlobalDir } from '../lib/paths.js'
import type { Environment } from '../lib/environments.js'
import { parseEnvironments } from '../lib/environments.js'

// ==================== URL 解析 ====================

/**
 * GitHub URL 解析结果
 */
interface GitHubUrlInfo {
  owner: string
  repo: string
  branch: string
  subDir?: string   // 子目录路径（如 skills/frontend-design）
}

/**
 * 解析 GitHub URL，提取 owner/repo/branch/subDir
 */
function parseGitHubUrl(url: string): GitHubUrlInfo | null {
  // https://github.com/owner/repo
  let match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/)
  if (!match) return null

  const owner = match[1]
  let repo = match[2]
  // 去掉 .git 后缀
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4)
  }

  // 检查是否有 tree/branch/path
  const treeMatch = url.match(/\/tree\/([^/]+)\/(.+)$/)
  if (treeMatch) {
    return {
      owner,
      repo,
      branch: treeMatch[1],
      subDir: treeMatch[2],
    }
  }

  return { owner, repo, branch: 'main', subDir: undefined }
}

// ==================== GitHub 下载 ====================

/**
 * 下载 GitHub 仓库 tarball 并解压到目标目录
 */
async function downloadGitHubRepo(
  info: GitHubUrlInfo,
  targetDir: string,
): Promise<string> {
  const tarballUrl = `https://api.github.com/repos/${info.owner}/${info.repo}/tarball/${info.branch}`
  verbose(`下载: ${tarballUrl}`)

  // 确保目标目录存在
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  // 下载 tarball
  const response = await fetch(tarballUrl, {
    headers: {
      'User-Agent': 'j-skills-cli',
      'Accept': 'application/vnd.github+json',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`GitHub API 返回 ${response.status}: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('GitHub API 返回空响应体')
  }

  // 保存 tarball 到临时文件
  const tmpFile = join(targetDir, '.tmp-download.tar.gz')
  try {
    const fileStream = createWriteStream(tmpFile)
    // Web ReadableStream → Node Readable
    const nodeStream = Readable.fromWeb(response.body as any)
    await pipeline(nodeStream, fileStream)

    // 解压 tarball（使用 tar 命令）
    const { execSync } = await import('child_process')
    const extractDir = join(targetDir, '.tmp-extract')
    mkdirSync(extractDir, { recursive: true })

    execSync(`tar -xzf "${tmpFile}" -C "${extractDir}"`, { stdio: 'pipe' })

    // GitHub tarball 会创建一个前缀目录（如 owner-repo-abc123/）
    const entries = readdirSync(extractDir)
    if (entries.length === 0) {
      throw new Error('下载的仓库为空')
    }

    const repoDir = join(extractDir, entries[0])
    let skillSourceDir: string

    if (info.subDir) {
      // 有子目录路径
      skillSourceDir = join(repoDir, info.subDir)
      if (!existsSync(skillSourceDir)) {
        throw new Error(`仓库中不存在子目录: ${info.subDir}`)
      }
    } else {
      skillSourceDir = repoDir
    }

    return { skillSourceDir, extractDir } as any // 临时返回，下面处理

  } finally {
    // 清理临时 tarball
    if (existsSync(tmpFile)) {
      rmSync(tmpFile, { force: true })
    }
  }
}

/**
 * 从下载的仓库中查找 skill 目录
 */
function findSkillDirInRepo(
  repoDir: string,
  subDir?: string,
): string[] {
  const results: string[] = []

  function search(dir: string, depth: number = 0) {
    if (depth > 3) return // 限制搜索深度

    const skillMd = join(dir, 'SKILL.md')
    const skillMdLower = join(dir, 'skill.md')

    if (existsSync(skillMd) || existsSync(skillMdLower)) {
      results.push(dir)
      return // 找到就停止向下搜索
    }

    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          search(join(dir, entry.name), depth + 1)
        }
      }
    } catch {
      // 忽略权限错误
    }
  }

  if (subDir) {
    const subDirPath = join(repoDir, subDir)
    if (existsSync(subDirPath)) {
      search(subDirPath)
    }
  }

  // 如果子目录没找到，搜索整个仓库
  if (results.length === 0) {
    search(repoDir)
  }

  return results
}

// ==================== 源格式检测 ====================

type SourceType = 'github' | 'local'

function detectSourceType(source: string): SourceType {
  if (source.startsWith('https://github.com/') || source.startsWith('http://github.com/')) {
    return 'github'
  }
  return 'local'
}

// ==================== 命令注册 ====================

/**
 * 注册 add 命令
 */
export function registerAddCommand(cli: ReturnType<typeof cac>): void {
  cli
    .command('add <source>', 'Add external skill from GitHub URL or local path')
    .option('--target <path>', 'Target project directory (default: CWD)')
    .option('-g, --global', 'Install to global directory')
    .option('-e, --env <environments>', 'Also install to environments (comma-separated)')
    .option('--force', 'Force overwrite existing skill')
    .option('--json', 'Output as JSON')
    .option('--verbose', 'Show detailed logs')
    .action(
      async (
        source: string,
        options?: {
          target?: string
          global?: boolean
          env?: string
          force?: boolean
          json?: boolean
          verbose?: boolean
        }
      ) => {
        if (options?.verbose) {
          setVerboseMode(true)
        }

        const sourceType = detectSourceType(source)
        verbose(`检测到来源类型: ${sourceType}`)

        if (sourceType === 'github') {
          await handleGitHubAdd(source, options)
        } else {
          await handleLocalAdd(source, options)
        }
      }
    )
}

// ==================== GitHub 下载模式 ====================

async function handleGitHubAdd(
  url: string,
  options?: {
    target?: string
    global?: boolean
    env?: string
    force?: boolean
    json?: boolean
  },
): Promise<void> {
  const urlInfo = parseGitHubUrl(url)
  if (!urlInfo) {
    error('无效的 GitHub 仓库 URL')
    info('格式: https://github.com/owner/repo 或 https://github.com/owner/repo/tree/branch/path')
    process.exit(1)
  }

  verbose(`GitHub: ${urlInfo.owner}/${urlInfo.repo} (branch: ${urlInfo.branch}${urlInfo.subDir ? `, path: ${urlInfo.subDir}` : ''})`)

  const s = p.spinner()
  s.start('从 GitHub 下载 ...')

  // 确定目标目录
  const targetProject = options?.target ? resolve(options.target) : process.cwd()
  const agentsSkillsDir = options?.global
    ? join(getGlobalDir(), 'external')
    : join(targetProject, '.agents', 'skills')

  let extractDir: string | undefined
  let installedSkillName: string | undefined
  let installedSkillPath: string | undefined

  try {
    // 下载 tarball
    const tarballUrl = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repo}/tarball/${urlInfo.branch}`
    verbose(`下载: ${tarballUrl}`)

    const response = await fetch(tarballUrl, {
      headers: {
        'User-Agent': 'j-skills-cli',
        'Accept': 'application/vnd.github+json',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`GitHub API 返回 ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('GitHub API 返回空响应体')
    }

    // 保存 tarball 到临时目录
    const tmpDir = join(agentsSkillsDir, '.tmp-download')
    mkdirSync(tmpDir, { recursive: true })
    const tmpFile = join(tmpDir, 'repo.tar.gz')

    const fileStream = createWriteStream(tmpFile)
    const nodeStream = Readable.fromWeb(response.body as any)
    await pipeline(nodeStream, fileStream)

    // 解压
    const { execSync } = await import('child_process')
    extractDir = join(tmpDir, 'extract')
    mkdirSync(extractDir, { recursive: true })
    execSync(`tar -xzf "${tmpFile}" -C "${extractDir}"`, { stdio: 'pipe' })

    // 清理 tarball
    rmSync(tmpFile, { force: true })

    // 找到仓库根目录
    const entries = readdirSync(extractDir)
    if (entries.length === 0) {
      throw new Error('下载的仓库为空')
    }
    const repoDir = join(extractDir, entries[0])

    // 查找 skill 目录
    const skillDirs = findSkillDirInRepo(repoDir, urlInfo.subDir)

    if (skillDirs.length === 0) {
      throw new Error('该仓库不是有效的 skill（缺少 SKILL.md）')
    }

    // 如果有多个 skill，让用户选择（非 JSON 模式）
    let selectedDir: string
    if (skillDirs.length === 1) {
      selectedDir = skillDirs[0]
    } else if (options?.json) {
      // JSON 模式下，如果有子目录路径则用之，否则取第一个
      selectedDir = urlInfo.subDir
        ? skillDirs.find(d => d.includes(urlInfo.subDir!)) || skillDirs[0]
        : skillDirs[0]
    } else {
      s.stop('发现多个 skill')
      const choices = skillDirs.map(d => ({
        value: d,
        label: basename(d),
      }))
      const selected = await p.select({
        message: '仓库包含多个 skill，选择要安装的:',
        options: choices,
      })
      if (isCancel(selected)) {
        p.cancel('已取消')
        process.exit(0)
      }
      selectedDir = selected as string
      s.start('继续安装 ...')
    }

    // 确定安装名称
    installedSkillName = urlInfo.subDir
      ? basename(urlInfo.subDir)
      : basename(selectedDir)
    installedSkillPath = join(agentsSkillsDir, installedSkillName)

    // 检查是否已存在
    if (existsSync(installedSkillPath) && !options?.force) {
      const existing = getSkill(installedSkillName)
      if (existing && existing.source === 'marketplace') {
        s.stop('跳过')
        if (options?.json) {
          console.log(JSON.stringify({
            success: true,
            action: 'skipped',
            skill: { name: installedSkillName, path: installedSkillPath },
            message: 'Skill already registered',
          }, null, 2))
          return
        }
        warn(`"${installedSkillName}" 已注册，使用 --force 覆盖`)
        return
      }
    }

    // 复制到目标位置
    if (existsSync(installedSkillPath)) {
      rmSync(installedSkillPath, { recursive: true, force: true })
    }
    cpSync(selectedDir, installedSkillPath, { recursive: true })

    // 注册到 registry
    registerSkill({
      name: installedSkillName,
      path: installedSkillPath,
      source: 'marketplace',
      originPath: installedSkillPath,
      remoteUrl: url,
      installedVia: 'download',
    })

    s.stop('下载完成')

    // 安装到指定环境
    if (options?.env) {
      const targetEnvs = parseEnvironments(options.env)
      if (targetEnvs.length > 0) {
        for (const env of targetEnvs) {
          try {
            installToEnv(installedSkillPath!, env, options?.global || false, options?.target || process.cwd())
            verbose(`安装到 ${env} 完成`)
          } catch (err) {
            warn(`安装到 ${env} 失败: ${(err as Error).message}`)
          }
        }
      }
    }

    // 输出结果
    if (options?.json) {
      console.log(JSON.stringify({
        success: true,
        action: 'downloaded',
        skill: {
          name: installedSkillName,
          path: installedSkillPath,
          source: 'marketplace',
          remoteUrl: url,
        },
      }, null, 2))
      return
    }

    success(`下载并注册 "${installedSkillName}"`)
    info(`  路径: ${installedSkillPath}`)

  } catch (err) {
    s.stop('下载失败')
    // 清理残留
    if (extractDir && existsSync(extractDir)) {
      rmSync(extractDir, { recursive: true, force: true })
    }
    if (options?.json) {
      console.log(JSON.stringify({
        success: false,
        error: (err as Error).message,
      }, null, 2))
      process.exit(1)
    }
    error(`下载失败: ${(err as Error).message}`)
    process.exit(1)
  } finally {
    // 清理临时目录
    const tmpDir = join(agentsSkillsDir, '.tmp-download')
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  }
}

// ==================== 本地路径注册模式 ====================

async function handleLocalAdd(
  localPath: string,
  options?: {
    target?: string
    global?: boolean
    env?: string
    force?: boolean
    json?: boolean
  },
): Promise<void> {
  const resolvedPath = resolve(localPath)

  // 验证目录存在
  if (!existsSync(resolvedPath)) {
    if (options?.json) {
      console.log(JSON.stringify({
        success: false,
        error: `路径不存在: ${resolvedPath}`,
      }, null, 2))
      process.exit(1)
    }
    error(`路径不存在: ${resolvedPath}`)
    process.exit(1)
  }

  // 验证包含 SKILL.md
  const hasSkill = existsSync(join(resolvedPath, 'SKILL.md')) || existsSync(join(resolvedPath, 'skill.md'))
  if (!hasSkill) {
    if (options?.json) {
      console.log(JSON.stringify({
        success: false,
        error: '指定的目录不是有效的 skill（缺少 SKILL.md）',
      }, null, 2))
      process.exit(1)
    }
    error('指定的目录不是有效的 skill（缺少 SKILL.md）')
    process.exit(1)
  }

  const skillName = basename(resolvedPath)
  const metadata = readSkillMetadata(resolvedPath)

  // 检查同名 linked skill
  const existing = getSkill(skillName)
  if (existing && existing.source === 'linked' && !options?.force) {
    if (options?.json) {
      console.log(JSON.stringify({
        success: false,
        error: `"${skillName}" 已作为 linked skill 注册，使用 --force 覆盖`,
      }, null, 2))
      process.exit(1)
    }
    error(`"${skillName}" 已作为 linked skill 注册，使用 --force 覆盖`)
    process.exit(1)
  }

  // 注册
  registerSkill({
    name: skillName,
    path: resolvedPath,
    source: 'marketplace',
    originPath: resolvedPath,
    installedVia: 'scan',
    category: metadata.category,
  })

  // 安装到指定环境
  if (options?.env) {
    const targetEnvs = parseEnvironments(options.env)
    for (const env of targetEnvs) {
      try {
        installToEnv(resolvedPath, env, options?.global || false, options?.target || process.cwd())
      } catch (err) {
        warn(`安装到 ${env} 失败: ${(err as Error).message}`)
      }
    }
  }

  // 输出
  if (options?.json) {
    console.log(JSON.stringify({
      success: true,
      action: 'registered',
      skill: {
        name: skillName,
        path: resolvedPath,
        source: 'marketplace',
      },
    }, null, 2))
    return
  }

  success(`注册外部 skill "${skillName}"`)
  info(`  路径: ${resolvedPath}`)
}
