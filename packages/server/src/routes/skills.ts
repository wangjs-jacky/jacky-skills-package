import { Router } from 'express'
import type { ApiResponse, SkillInfo } from '../types.js'
import { existsSync, readdirSync, readFileSync, unlinkSync, lstatSync, symlinkSync } from 'fs'
import { join, basename, resolve } from 'path'

// 导入 CLI 核心模块（从根目录 src/lib）
import {
  listSkills,
  getSkill,
  unregisterSkill,
  registerSkill,
} from '../../../../src/lib/registry.js'
import { getLinkedDir } from '../../../../src/lib/paths.js'

export function createSkillsRouter(): Router {
  const router = Router()

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

  // POST /api/skills/link - 链接本地 skill
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
      const skillName = basename(resolvedPath)
      const linkedDir = getLinkedDir()

      // 验证目录
      if (!existsSync(join(resolvedPath, 'SKILL.md'))) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'No SKILL.md found in the specified directory',
        })
      }

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
      })

      res.json({
        success: true,
        data: { name: skillName, path: resolvedPath },
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

  return router
}
