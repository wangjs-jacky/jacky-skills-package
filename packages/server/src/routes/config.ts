import { Router } from 'express'
import type { ApiResponse, ConfigInfo } from '../types.js'
import { getConfigPath, ensureGlobalDir } from '../../../../src/lib/paths.js'
import { existsSync, readFileSync, writeFileSync } from 'fs'

export function createConfigRouter(): Router {
  const router = Router()

  // GET /api/config - 获取配置
  router.get('/', (_req, res) => {
    try {
      ensureGlobalDir()
      const configPath = getConfigPath()

      let config: ConfigInfo = {}
      if (existsSync(configPath)) {
        config = JSON.parse(readFileSync(configPath, 'utf-8'))
      }

      res.json({ success: true, data: config, error: null })
    } catch (err) {
      res.status(500).json({
        success: false,
        data: null,
        error: (err as Error).message,
      })
    }
  })

  // PUT /api/config - 更新配置
  router.put('/', (req, res) => {
    try {
      ensureGlobalDir()
      const configPath = getConfigPath()

      // 读取现有配置
      let config: ConfigInfo = {}
      if (existsSync(configPath)) {
        config = JSON.parse(readFileSync(configPath, 'utf-8'))
      }

      // 合并新配置
      const newConfig = { ...config, ...req.body }
      writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8')

      res.json({ success: true, data: newConfig, error: null })
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
