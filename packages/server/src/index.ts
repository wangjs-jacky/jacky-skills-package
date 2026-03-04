import express from 'express'
import cors from 'cors'
import { createRoutes } from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'

const PORT = process.env.PORT || 3001

const app = express()

// 中间件
app.use(cors())
app.use(express.json())

// API 路由
app.use('/api', createRoutes())

// 错误处理
app.use(errorHandler)

// 启动服务器
app.listen(PORT, () => {
  console.log(`j-skills server running at http://localhost:${PORT}`)
})
