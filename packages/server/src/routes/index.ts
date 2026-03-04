import { Router } from 'express'

export function createRoutes(): Router {
  const router = Router()

  // 健康检查
  router.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' }, error: null })
  })

  return router
}
