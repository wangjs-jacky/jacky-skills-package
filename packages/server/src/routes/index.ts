import { Router } from 'express'
import { createSkillsRouter } from './skills.js'

export function createRoutes(): Router {
  const router = Router()

  // 健康检查
  router.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' }, error: null })
  })

  // Skills 路由
  router.use('/skills', createSkillsRouter())

  return router
}
