import { Router } from 'express'
import { createSkillsRouter } from './skills.js'
import { createEnvironmentsRouter } from './environments.js'
import { createConfigRouter } from './config.js'

export function createRoutes(): Router {
  const router = Router()

  // 健康检查
  router.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' }, error: null })
  })

  // Skills 路由
  router.use('/skills', createSkillsRouter())

  // Environments 路由
  router.use('/environments', createEnvironmentsRouter())

  // Config 路由
  router.use('/config', createConfigRouter())

  return router
}
