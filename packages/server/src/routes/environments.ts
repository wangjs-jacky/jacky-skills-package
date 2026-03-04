import { Router } from 'express'
import type { ApiResponse, EnvironmentInfo } from '../types.js'
import {
  ENVIRONMENTS,
  getAllowedEnvironments,
  getGlobalEnvPath,
} from '../../../../src/lib/environments.js'
import { existsSync } from 'fs'

export function createEnvironmentsRouter(): Router {
  const router = Router()

  // GET /api/environments - 获取所有支持的环境
  router.get('/', (_req, res) => {
    try {
      const envs = getAllowedEnvironments().map((env) => {
        const config = ENVIRONMENTS[env]
        return {
          name: config.name,
          label: config.label,
          globalPath: config.globalPath,
          projectPaths: config.projectPaths,
          hint: config.hint,
        }
      })
      res.json({ success: true, data: envs, error: null })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // GET /api/environments/status - 获取所有环境状态
  router.get('/status', (_req, res) => {
    try {
      const statuses = getAllowedEnvironments().map((env) => {
        const config = ENVIRONMENTS[env]
        return {
          name: config.name,
          label: config.label,
          globalExists: existsSync(getGlobalEnvPath(env)),
        }
      })
      res.json({ success: true, data: statuses, error: null })
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
