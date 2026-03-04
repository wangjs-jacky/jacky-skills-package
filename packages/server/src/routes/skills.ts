import { Router } from 'express'
import type { ApiResponse, SkillInfo, ConfigInfo } from '../types.js'
import { existsSync, readdirSync, readFileSync, unlinkSync, lstatSync, symlinkSync, cpSync, rmSync, mkdirSync } from 'fs'
import { join, basename, resolve } from 'path'
import { homedir } from 'os'

// 导入 CLI 核心模块（从根目录 src/lib）
import {
  listSkills,
  getSkill,
  unregisterSkill,
  registerSkill,
  updateSkillEnvironments,
  addSourceFolder,
  listSourceFolders,
  removeSourceFolder,
} from '../../../../src/lib/registry.js'
import { getLinkedDir, getGlobalSkillsDir, ensureGlobalDir, getConfigPath } from '../../../../src/lib/paths.js'
import { getGlobalEnvPath, getFirstExistingProjectPath, type Environment } from '../../../../src/lib/environments.js'

// 扩展路径中的 ~ 为用户主目录
function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1))
  }
  return path
}

export function createSkillsRouter(): Router {
  const router = Router()

  // GET /api/source-folders - 获取源文件夹列表
  router.get('/source-folders', (_req, res) => {
    try {
      const folders = listSourceFolders()
      res.json({ success: true, data: folders, error: null })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // DELETE /api/source-folders/* - 移除源文件夹记录
  router.delete('/source-folders/*', (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params[0])
      const removed = removeSourceFolder(folderPath)
      res.json({ success: removed, data: { path: folderPath }, error: null })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // GET /api/skills - 列出所有 skills
  router.get('/', (_req, res) => {
    try {
      const skills = listSkills()
      const response: ApiResponse<SkillInfo[]> = {
        success: true,
        data: skills,
        error: null,
      }
      res.json(response)
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // GET /api/skills/:name - 获取 skill 详情
  router.get('/:name', (req, res) => {
    try {
      const skill = getSkill(req.params.name)
      if (!skill) {
        return res.status(404).json({
          success: false,
          data: null,
          error: `Skill "${req.params.name}" not found`,
        })
      }
      res.json({ success: true, data: skill, error: null })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // DELETE /api/skills/link/:name - 取消链接
  router.delete('/link/:name', (req, res) => {
    try {
      const skillName = req.params.name
      const linkedDir = getLinkedDir()
      const linkPath = join(linkedDir, skillName)

      if (!existsSync(linkPath)) {
        return res.status(404).json({
          success: false,
          data: null,
          error: `Skill "${skillName}" is not linked`,
        })
      }

      // 删除符号链接
      unlinkSync(linkPath)
      unregisterSkill(skillName)

      res.json({
        success: true,
        data: { name: skillName },
        error: null,
      })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // GET /api/skills/:name/files - 获取 skill 文件列表
  router.get('/:name/files', (req, res) => {
    try {
      const skill = getSkill(req.params.name)
      if (!skill) {
        return res.status(404).json({
          success: false,
          data: null,
          error: `Skill "${req.params.name}" not found`,
        })
      }

      const files = readdirSync(skill.path, { withFileTypes: true }).map((d) => ({
        name: d.name,
        type: d.isDirectory() ? 'directory' : 'file',
      }))

      res.json({ success: true, data: files, error: null })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // POST /api/skills/link - 链接本地 skill（支持批量链接目录下所有 skill）
  router.post('/link', (req, res) => {
    try {
      const { path: skillPath } = req.body

      if (!skillPath) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Path is required',
        })
      }

      const resolvedPath = resolve(skillPath)
      const linkedDir = getLinkedDir()

      // 如果目录本身包含 SKILL.md，链接单个 skill
      if (existsSync(join(resolvedPath, 'SKILL.md'))) {
        const skillName = basename(resolvedPath)
        const linkPath = join(linkedDir, skillName)

        // 删除已存在的链接
        try {
          const stats = lstatSync(linkPath)
          if (stats.isSymbolicLink() || stats.isFile() || stats.isDirectory()) {
            unlinkSync(linkPath)
          }
        } catch {
          // 忽略
        }

        // 创建符号链接
        symlinkSync(resolvedPath, linkPath, 'junction')

        // 注册到 registry
        registerSkill({
          name: skillName,
          path: resolvedPath,
          source: 'linked',
          sourceFolder: resolvedPath,
        })

        return res.json({
          success: true,
          data: { linked: [skillName], count: 1 },
          error: null,
        })
      }

      // 批量链接：扫描子目录，找出所有包含 SKILL.md 的目录
      const linkedSkills: string[] = []
      const entries = readdirSync(resolvedPath, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

        const subDirPath = join(resolvedPath, entry.name)
        if (!existsSync(join(subDirPath, 'SKILL.md'))) continue

        const skillName = entry.name
        const linkPath = join(linkedDir, skillName)

        // 删除已存在的链接
        try {
          const stats = lstatSync(linkPath)
          if (stats.isSymbolicLink() || stats.isFile() || stats.isDirectory()) {
            unlinkSync(linkPath)
          }
        } catch {
          // 忽略
        }

        // 创建符号链接
        symlinkSync(subDirPath, linkPath, 'junction')

        // 注册到 registry
        registerSkill({
          name: skillName,
          path: subDirPath,
          source: 'linked',
          sourceFolder: resolvedPath,
        })

        linkedSkills.push(skillName)
      }

      if (linkedSkills.length === 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'No skills found (directories with SKILL.md)',
        })
      }

      // 记录源文件夹
      addSourceFolder({
        path: resolvedPath,
        addedAt: new Date().toISOString(),
        lastScanned: new Date().toISOString(),
        skillNames: linkedSkills,
      })

      res.json({
        success: true,
        data: { linked: linkedSkills, count: linkedSkills.length },
        error: null,
      })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // POST /api/skills/export - 导出 skills
  router.post('/export', (req, res) => {
    try {
      const { skillNames, targetPath } = req.body

      if (!skillNames || !Array.isArray(skillNames) || skillNames.length === 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'skillNames array is required',
        })
      }

      if (!targetPath) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'targetPath is required',
        })
      }

      // 扩展路径中的 ~ 为用户主目录
      const expandedPath = expandPath(targetPath)

      // 确保目标目录存在
      mkdirSync(expandedPath, { recursive: true })

      const exported: string[] = []
      const errors: string[] = []

      for (const skillName of skillNames) {
        const skill = getSkill(skillName)
        if (!skill) {
          errors.push(`Skill "${skillName}" not found`)
          continue
        }

        try {
          const destPath = join(expandedPath, skillName)
          // 如果目标已存在，先删除
          if (existsSync(destPath)) {
            rmSync(destPath, { recursive: true, force: true })
          }
          // 复制实际文件
          cpSync(skill.path, destPath, { recursive: true })
          exported.push(skillName)
        } catch (err) {
          errors.push(`Failed to export "${skillName}": ${(err as Error).message}`)
        }
      }

      res.json({
        success: errors.length === 0,
        data: { exported, errors, targetPath: expandedPath },
        error: errors.length > 0 ? errors.join('; ') : null,
      })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // GET /api/skills/:name/files/* - 获取文件内容
  router.get('/:name/files/*', (req, res) => {
    try {
      const skill = getSkill(req.params.name)
      if (!skill) {
        return res.status(404).json({
          success: false,
          data: null,
          error: `Skill "${req.params.name}" not found`,
        })
      }

      const filePath = req.params[0]
      const fullPath = join(skill.path, filePath)

      if (!existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          data: null,
          error: `File not found: ${filePath}`,
        })
      }

      const content = readFileSync(fullPath, 'utf-8')
      res.json({ success: true, data: { path: filePath, content }, error: null })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // POST /api/skills/:name/install - 安装 skill 到指定环境
  router.post('/:name/install', (req, res) => {
    try {
      const skillName = req.params.name
      const { env, global = true } = req.body

      if (!env) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Environment is required',
        })
      }

      const skill = getSkill(skillName)
      if (!skill) {
        return res.status(404).json({
          success: false,
          data: null,
          error: `Skill "${skillName}" not found`,
        })
      }

      ensureGlobalDir()
      const isGlobal = global
      const projectDir = process.cwd()

      // 获取目标环境路径
      const envPath = isGlobal
        ? getGlobalEnvPath(env as Environment)
        : getFirstExistingProjectPath(env as Environment, projectDir) || resolve(projectDir, '.cursor/skills')

      const targetPath = resolve(envPath, skillName)

      // 确保目标目录存在
      if (!existsSync(envPath)) {
        mkdirSync(envPath, { recursive: true })
      }

      // 如果目标已存在，先删除
      if (existsSync(targetPath) || lstatSync(targetPath, { throwIfNoEntry: false })) {
        rmSync(targetPath, { recursive: true, force: true })
      }

      // 读取配置获取安装方式
      const configPath = getConfigPath()
      let config: ConfigInfo = {}
      if (existsSync(configPath)) {
        config = JSON.parse(readFileSync(configPath, 'utf-8'))
      }
      const installMethod = config.installMethod || 'copy'

      // 根据配置选择安装方式
      if (installMethod === 'symlink') {
        // 创建符号链接
        symlinkSync(skill.path, targetPath, 'junction')
      } else {
        // 复制 skill 到目标环境
        cpSync(skill.path, targetPath, { recursive: true })
      }

      // 更新注册表
      const existingEnvs = skill.installedEnvironments || []
      if (!existingEnvs.includes(env)) {
        existingEnvs.push(env)
      }
      updateSkillEnvironments(skillName, existingEnvs)

      res.json({
        success: true,
        data: { name: skillName, env, path: targetPath, method: installMethod },
        error: null,
      })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // POST /api/skills/:name/uninstall - 从指定环境卸载 skill
  router.post('/:name/uninstall', (req, res) => {
    try {
      const skillName = req.params.name
      const { env, global = true } = req.body

      if (!env) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Environment is required',
        })
      }

      const skill = getSkill(skillName)
      if (!skill) {
        return res.status(404).json({
          success: false,
          data: null,
          error: `Skill "${skillName}" not found`,
        })
      }

      const isGlobal = global
      const projectDir = process.cwd()

      // 获取目标环境路径
      const envPath = isGlobal
        ? getGlobalEnvPath(env as Environment)
        : getFirstExistingProjectPath(env as Environment, projectDir) || resolve(projectDir, '.cursor/skills')

      const targetPath = resolve(envPath, skillName)

      // 删除目标
      if (existsSync(targetPath)) {
        rmSync(targetPath, { recursive: true, force: true })
      }

      // 更新注册表
      const existingEnvs = skill.installedEnvironments || []
      const updatedEnvs = existingEnvs.filter((e) => e !== env)
      updateSkillEnvironments(skillName, updatedEnvs)

      res.json({
        success: true,
        data: { name: skillName, env, removed: true },
        error: null,
      })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  return router
}
