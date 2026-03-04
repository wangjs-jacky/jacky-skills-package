# j-skills GUI Web Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 j-skills CLI 工具创建本地 Web GUI 界面，支持可视化管理 Skills 和 Skill 开发调试功能。

**Architecture:** 采用 Server + SPA 分离架构。Express Server 复用现有 CLI 核心逻辑 (src/lib)，React SPA 通过 HTTP API 与 Server 交互。使用 pnpm monorepo 管理多包。

**Tech Stack:** Express + React 18 + Vite + Zustand + Tailwind CSS + React Router v6

---

## Task 1: 搭建 Monorepo 基础结构

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `packages/server/package.json`
- Create: `packages/web/package.json`

**Step 1: 创建 pnpm workspace 配置**

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

**Step 2: 更新根 package.json 为 monorepo 配置**

```json
{
  "name": "j-skills-monorepo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "pnpm run --parallel dev",
    "build": "pnpm -r build",
    "dev:server": "pnpm --filter @j-skills/server dev",
    "dev:web": "pnpm --filter @j-skills/web dev",
    "build:server": "pnpm --filter @j-skills/server build",
    "build:web": "pnpm --filter @j-skills/web build"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

**Step 3: 创建 packages/server/package.json**

```json
{
  "name": "@j-skills/server",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^22.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.6.0"
  }
}
```

**Step 4: 创建 packages/web/package.json**

```json
{
  "name": "@j-skills/web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0",
    "ky": "^1.2.0",
    "lucide-react": "^0.314.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.6.0",
    "vite": "^5.1.0"
  }
}
```

**Step 5: 验证 monorepo 配置**

Run: `pnpm install`
Expected: 成功安装所有依赖

**Step 6: Commit**

```bash
git add pnpm-workspace.yaml package.json packages/server/package.json packages/web/package.json
git commit -m "chore: setup monorepo structure with pnpm workspace"
```

---

## Task 2: 配置 TypeScript 和构建工具

**Files:**
- Create: `tsconfig.base.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/server/tsup.config.ts`
- Create: `packages/web/vite.config.ts`
- Create: `packages/web/tailwind.config.js`
- Create: `packages/web/postcss.config.js`

**Step 1: 创建共享 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 2: 创建 packages/server/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: 创建 packages/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 4: 创建 packages/web/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 5: 创建 packages/web/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

**Step 6: 创建 packages/web/tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 7: 创建 packages/web/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 8: 验证 TypeScript 配置**

Run: `cd packages/server && pnpm tsc --noEmit`
Expected: 无错误

**Step 9: Commit**

```bash
git add tsconfig.base.json packages/server/tsconfig.json packages/web/tsconfig.json packages/web/tsconfig.node.json packages/web/vite.config.ts packages/web/tailwind.config.js packages/web/postcss.config.js
git commit -m "chore: add TypeScript and build configurations"
```

---

## Task 3: 实现后端 Server 基础结构

**Files:**
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/routes/index.ts`
- Create: `packages/server/src/middleware/errorHandler.ts`
- Create: `packages/server/src/types.ts`

**Step 1: 创建类型定义 packages/server/src/types.ts**

```typescript
// API 响应格式
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
}

// Skill 信息
export interface SkillInfo {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  installedEnvironments?: string[]
  installedAt?: string
}

// 环境信息
export interface EnvironmentInfo {
  name: string
  label: string
  globalPath: string
  projectPaths: string[]
  exists: boolean
}

// 配置信息
export interface ConfigInfo {
  defaultEnvironments?: string[]
  autoConfirm?: boolean
}
```

**Step 2: 创建错误处理中间件 packages/server/src/middleware/errorHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express'
import type { ApiResponse } from '../types.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Server Error:', err)

  const response: ApiResponse = {
    success: false,
    data: null,
    error: err.message || 'Internal Server Error',
  }

  res.status(500).json(response)
}
```

**Step 3: 创建路由入口 packages/server/src/routes/index.ts**

```typescript
import { Router } from 'express'

export function createRoutes(): Router {
  const router = Router()

  // 健康检查
  router.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' }, error: null })
  })

  return router
}
```

**Step 4: 创建 Server 入口 packages/server/src/index.ts**

```typescript
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
```

**Step 5: 验证 Server 启动**

Run: `cd packages/server && pnpm dev`
Expected: 显示 "j-skills server running at http://localhost:3001"

Run: `curl http://localhost:3001/api/health`
Expected: `{"success":true,"data":{"status":"ok"},"error":null}`

**Step 6: Commit**

```bash
git add packages/server/src/
git commit -m "feat(server): add basic Express server with health check"
```

---

## Task 4: 实现 Skills API 路由

**Files:**
- Create: `packages/server/src/routes/skills.ts`
- Modify: `packages/server/src/routes/index.ts`

**Step 1: 创建 Skills 路由 packages/server/src/routes/skills.ts**

```typescript
import { Router } from 'express'
import type { ApiResponse, SkillInfo } from '../types.js'

// 导入 CLI 核心模块（需要调整路径）
import {
  listSkills,
  getSkill,
  unregisterSkill,
} from '../../../src/lib/registry.js'
import { getLinkedDir, getGlobalSkillsDir } from '../../../src/lib/paths.js'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'

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
      const { unlinkSync } = require('fs')
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
```

**Step 2: 更新路由入口**

```typescript
// packages/server/src/routes/index.ts
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
```

**Step 3: 验证 Skills API**

Run: `cd packages/server && pnpm dev`

Run: `curl http://localhost:3001/api/skills`
Expected: `{"success":true,"data":[...],"error":null}`

**Step 4: Commit**

```bash
git add packages/server/src/routes/
git commit -m "feat(server): add Skills API routes"
```

---

## Task 5: 实现环境和配置 API 路由

**Files:**
- Create: `packages/server/src/routes/environments.ts`
- Create: `packages/server/src/routes/config.ts`
- Modify: `packages/server/src/routes/index.ts`

**Step 1: 创建环境路由 packages/server/src/routes/environments.ts**

```typescript
import { Router } from 'express'
import type { ApiResponse, EnvironmentInfo } from '../types.js'
import {
  ENVIRONMENTS,
  getAllowedEnvironments,
  getGlobalEnvPath,
  getProjectEnvPaths,
} from '../../../src/lib/environments.js'
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
```

**Step 2: 创建配置路由 packages/server/src/routes/config.ts**

```typescript
import { Router } from 'express'
import type { ApiResponse, ConfigInfo } from '../types.js'
import { getConfigPath, ensureGlobalDir } from '../../../src/lib/paths.js'
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
```

**Step 3: 更新路由入口**

```typescript
// packages/server/src/routes/index.ts
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
```

**Step 4: 验证 API**

Run: `curl http://localhost:3001/api/environments`
Expected: 返回环境列表

Run: `curl http://localhost:3001/api/config`
Expected: 返回配置信息

**Step 5: Commit**

```bash
git add packages/server/src/routes/
git commit -m "feat(server): add environments and config API routes"
```

---

## Task 6: 创建前端基础结构

**Files:**
- Create: `packages/web/index.html`
- Create: `packages/web/src/main.tsx`
- Create: `packages/web/src/App.tsx`
- Create: `packages/web/src/styles/globals.css`

**Step 1: 创建 HTML 入口 packages/web/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>j-skills GUI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: 创建全局样式 packages/web/src/styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-border: #e5e5e5;
  --color-primary: #0066ff;
  --color-primary-hover: #0052cc;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0a0a0a;
    --color-text: #f5f5f5;
    --color-border: #262626;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text);
}
```

**Step 3: 创建 main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

**Step 4: 创建 App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import SkillsPage from './pages/Skills'
import DevelopPage from './pages/Develop'
import SettingsPage from './pages/Settings'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SkillsPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/develop" element={<DevelopPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
```

**Step 5: 验证前端启动**

Run: `cd packages/web && pnpm dev`
Expected: Vite 开发服务器启动在 http://localhost:5173

**Step 6: Commit**

```bash
git add packages/web/index.html packages/web/src/
git commit -m "feat(web): add basic React app structure"
```

---

## Task 7: 实现前端 API 客户端和状态管理

**Files:**
- Create: `packages/web/src/api/client.ts`
- Create: `packages/web/src/stores/index.ts`

**Step 1: 创建 API 客户端 packages/web/src/api/client.ts**

```typescript
import ky from 'ky'

const api = ky.create({
  prefixUrl: '/api',
  hooks: {
    beforeError: [
      (error) => {
        console.error('API Error:', error)
        return error
      },
    ],
  },
})

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  error: string | null
}

// Skills API
export const skillsApi = {
  list: () => api.get('skills').json<ApiResponse<SkillInfo[]>>(),
  get: (name: string) => api.get(`skills/${name}`).json<ApiResponse<SkillInfo>>(),
  unlink: (name: string) => api.delete(`skills/link/${name}`).json<ApiResponse<{ name: string }>>(),
  getFiles: (name: string) => api.get(`skills/${name}/files`).json<ApiResponse<FileInfo[]>>(),
  getFileContent: (name: string, path: string) =>
    api.get(`skills/${name}/files/${path}`).json<ApiResponse<{ path: string; content: string }>>(),
}

// Environments API
export const environmentsApi = {
  list: () => api.get('environments').json<ApiResponse<EnvironmentInfo[]>>(),
  status: () => api.get('environments/status').json<ApiResponse<EnvironmentStatus[]>>(),
}

// Config API
export const configApi = {
  get: () => api.get('config').json<ApiResponse<ConfigInfo>>(),
  update: (config: Partial<ConfigInfo>) =>
    api.put('config', { json: config }).json<ApiResponse<ConfigInfo>>(),
}

// Types
export interface SkillInfo {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  installedEnvironments?: string[]
  installedAt?: string
}

export interface EnvironmentInfo {
  name: string
  label: string
  globalPath: string
  projectPaths: string[]
  hint?: string
}

export interface EnvironmentStatus {
  name: string
  label: string
  globalExists: boolean
}

export interface ConfigInfo {
  defaultEnvironments?: string[]
  autoConfirm?: boolean
}

export interface FileInfo {
  name: string
  type: 'file' | 'directory'
}
```

**Step 2: 创建 Zustand Store packages/web/src/stores/index.ts**

```typescript
import { create } from 'zustand'
import type { SkillInfo, EnvironmentInfo, ConfigInfo } from '../api/client'

interface AppState {
  // Skills
  skills: SkillInfo[]
  setSkills: (skills: SkillInfo[]) => void

  // Environments
  environments: EnvironmentInfo[]
  setEnvironments: (envs: EnvironmentInfo[]) => void

  // Config
  config: ConfigInfo
  setConfig: (config: ConfigInfo) => void

  // UI State
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null
  showToast: (message: string, type: 'success' | 'error') => void
  hideToast: () => void
}

export const useStore = create<AppState>((set) => ({
  // Skills
  skills: [],
  setSkills: (skills) => set({ skills }),

  // Environments
  environments: [],
  setEnvironments: (environments) => set({ environments }),

  // Config
  config: {},
  setConfig: (config) => set({ config }),

  // UI State
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // Toast
  toast: null,
  showToast: (message, type) => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),
}))
```

**Step 3: Commit**

```bash
git add packages/web/src/api/ packages/web/src/stores/
git commit -m "feat(web): add API client and Zustand store"
```

---

## Task 8: 实现布局组件

**Files:**
- Create: `packages/web/src/components/Layout/index.tsx`
- Create: `packages/web/src/components/Sidebar/index.tsx`
- Create: `packages/web/src/components/Toast/index.tsx`

**Step 1: 创建 Sidebar 组件 packages/web/src/components/Sidebar/index.tsx**

```tsx
import { NavLink } from 'react-router-dom'
import { Package, Code, Settings } from 'lucide-react'

const navItems = [
  { to: '/skills', icon: Package, label: 'Skills' },
  { to: '/develop', icon: Code, label: 'Develop' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 border-r border-[var(--color-border)] p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">j-skills</h1>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
```

**Step 2: 创建 Toast 组件 packages/web/src/components/Toast/index.tsx**

```tsx
import { useEffect } from 'react'
import { useStore } from '../../stores'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

export default function Toast() {
  const { toast, hideToast } = useStore()

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(hideToast, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast, hideToast])

  if (!toast) return null

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
        toast.type === 'success'
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}
    >
      {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span>{toast.message}</span>
      <button onClick={hideToast} className="ml-2 hover:opacity-80">
        <X size={16} />
      </button>
    </div>
  )
}
```

**Step 3: 创建 Layout 组件 packages/web/src/components/Layout/index.tsx**

```tsx
import { ReactNode } from 'react'
import Sidebar from '../Sidebar'
import Toast from '../Toast'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
      <Toast />
    </div>
  )
}
```

**Step 4: 验证布局显示**

Run: `cd packages/web && pnpm dev`
Expected: 显示侧边栏导航

**Step 5: Commit**

```bash
git add packages/web/src/components/
git commit -m "feat(web): add Layout, Sidebar and Toast components"
```

---

## Task 9: 实现 Skills 管理页面

**Files:**
- Create: `packages/web/src/pages/Skills/index.tsx`
- Create: `packages/web/src/pages/Skills/SkillList.tsx`
- Create: `packages/web/src/pages/Skills/SkillCard.tsx`

**Step 1: 创建 SkillCard 组件 packages/web/src/pages/Skills/SkillCard.tsx**

```tsx
import { Package, Trash2, ExternalLink } from 'lucide-react'
import type { SkillInfo } from '../../api/client'

interface SkillCardProps {
  skill: SkillInfo
  onUnlink: (name: string) => void
}

export default function SkillCard({ skill, onUnlink }: SkillCardProps) {
  return (
    <div className="border border-[var(--color-border)] rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Package size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium">{skill.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {skill.source}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUnlink(skill.name)}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg text-red-600"
            title="Unlink"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 truncate">
        {skill.path}
      </div>
      {skill.installedEnvironments && skill.installedEnvironments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skill.installedEnvironments.map((env) => (
            <span
              key={env}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs"
            >
              {env}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: 创建 SkillList 组件 packages/web/src/pages/Skills/SkillList.tsx**

```tsx
import { useState } from 'react'
import { Search } from 'lucide-react'
import SkillCard from './SkillCard'
import type { SkillInfo } from '../../api/client'

interface SkillListProps {
  skills: SkillInfo[]
  onUnlink: (name: string) => void
}

export default function SkillList({ skills, onUnlink }: SkillListProps) {
  const [search, setSearch] = useState('')

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill) => (
          <SkillCard key={skill.name} skill={skill} onUnlink={onUnlink} />
        ))}
      </div>
      {filteredSkills.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No skills found. Try linking one first.
        </div>
      )}
    </div>
  )
}
```

**Step 3: 创建 Skills 页面 packages/web/src/pages/Skills/index.tsx**

```tsx
import { useEffect } from 'react'
import { useStore } from '../../stores'
import { skillsApi } from '../../api/client'
import SkillList from './SkillList'

export default function SkillsPage() {
  const { skills, setSkills, isLoading, setIsLoading, showToast } = useStore()

  useEffect(() => {
    loadSkills()
  }, [])

  async function loadSkills() {
    setIsLoading(true)
    try {
      const response = await skillsApi.list()
      if (response.success) {
        setSkills(response.data)
      }
    } catch (err) {
      showToast('Failed to load skills', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUnlink(name: string) {
    try {
      const response = await skillsApi.unlink(name)
      if (response.success) {
        showToast(`Unlinked: ${name}`, 'success')
        loadSkills()
      }
    } catch (err) {
      showToast('Failed to unlink skill', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Skills</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your linked and installed skills
        </p>
      </div>
      <SkillList skills={skills} onUnlink={handleUnlink} />
    </div>
  )
}
```

**Step 4: 验证 Skills 页面**

Run: `pnpm dev`
Expected: 显示 Skills 列表页面

**Step 5: Commit**

```bash
git add packages/web/src/pages/Skills/
git commit -m "feat(web): add Skills management page"
```

---

## Task 10: 实现 Develop 和 Settings 页面

**Files:**
- Create: `packages/web/src/pages/Develop/index.tsx`
- Create: `packages/web/src/pages/Settings/index.tsx`

**Step 1: 创建 Develop 页面 packages/web/src/pages/Develop/index.tsx**

```tsx
import { useState } from 'react'
import { FolderOpen, Link, FileText } from 'lucide-react'
import { useStore } from '../../stores'

export default function DevelopPage() {
  const { showToast } = useStore()
  const [skillPath, setSkillPath] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [skillContent, setSkillContent] = useState<string>('')

  async function handleLink() {
    if (!skillPath.trim()) {
      showToast('Please enter a skill path', 'error')
      return
    }

    try {
      const response = await fetch('/api/skills/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: skillPath }),
      })
      const data = await response.json()
      if (data.success) {
        showToast(`Linked: ${data.skill.name}`, 'success')
        setSkillPath('')
      } else {
        showToast(data.error || 'Failed to link', 'error')
      }
    } catch (err) {
      showToast('Failed to link skill', 'error')
    }
  }

  async function loadSkillContent(skillName: string) {
    try {
      const response = await fetch(`/api/skills/${skillName}/files/SKILL.md`)
      const data = await response.json()
      if (data.success) {
        setSelectedSkill(skillName)
        setSkillContent(data.data.content)
      }
    } catch (err) {
      showToast('Failed to load skill content', 'error')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Develop</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Link and preview local skills
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="border border-[var(--color-border)] rounded-lg p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Link size={18} />
              Link New Skill
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="/path/to/skill"
                value={skillPath}
                onChange={(e) => setSkillPath(e.target.value)}
                className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <button
                onClick={handleLink}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
              >
                Link
              </button>
            </div>
          </div>

          <div className="mt-4 border border-[var(--color-border)] rounded-lg p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <FolderOpen size={18} />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setSkillPath('/Users/jiashengwang/jacky-github/jacky-skills')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Open jacky-skills directory
              </button>
            </div>
          </div>
        </div>

        <div className="border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <FileText size={18} />
            Preview
          </h3>
          {selectedSkill ? (
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm">
              {skillContent}
            </pre>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a skill to preview
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: 创建 Settings 页面 packages/web/src/pages/Settings/index.tsx**

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../../stores'
import { configApi, environmentsApi, type EnvironmentInfo } from '../../api/client'
import { Settings, Check } from 'lucide-react'

export default function SettingsPage() {
  const { config, setConfig, showToast } = useStore()
  const [environments, setEnvironments] = useState<EnvironmentInfo[]>([])
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>([])

  useEffect(() => {
    loadConfig()
    loadEnvironments()
  }, [])

  async function loadConfig() {
    try {
      const response = await configApi.get()
      if (response.success) {
        setConfig(response.data)
        setSelectedEnvs(response.data.defaultEnvironments || [])
      }
    } catch (err) {
      showToast('Failed to load config', 'error')
    }
  }

  async function loadEnvironments() {
    try {
      const response = await environmentsApi.list()
      if (response.success) {
        setEnvironments(response.data)
      }
    } catch (err) {
      showToast('Failed to load environments', 'error')
    }
  }

  async function saveConfig() {
    try {
      const response = await configApi.update({
        ...config,
        defaultEnvironments: selectedEnvs,
      })
      if (response.success) {
        setConfig(response.data)
        showToast('Settings saved', 'success')
      }
    } catch (err) {
      showToast('Failed to save settings', 'error')
    }
  }

  function toggleEnv(envName: string) {
    setSelectedEnvs((prev) =>
      prev.includes(envName)
        ? prev.filter((e) => e !== envName)
        : [...prev, envName]
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Configure j-skills preferences
        </p>
      </div>

      <div className="border border-[var(--color-border)] rounded-lg p-4 mb-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Settings size={18} />
          Default Environments
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Select the environments to use by default when installing skills.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {environments.map((env) => (
            <button
              key={env.name}
              onClick={() => toggleEnv(env.name)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                selectedEnvs.includes(env.name)
                  ? 'border-[var(--color-primary)] bg-blue-50 dark:bg-blue-900/20'
                  : 'border-[var(--color-border)] hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{env.label}</span>
              {selectedEnvs.includes(env.name) && (
                <Check size={16} className="text-[var(--color-primary)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={saveConfig}
        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
      >
        Save Settings
      </button>
    </div>
  )
}
```

**Step 3: 验证页面功能**

Run: `pnpm dev`
Expected: Develop 和 Settings 页面正常工作

**Step 4: Commit**

```bash
git add packages/web/src/pages/
git commit -m "feat(web): add Develop and Settings pages"
```

---

## Task 11: 添加 Link API 端点

**Files:**
- Modify: `packages/server/src/routes/skills.ts`

**Step 1: 添加 POST /api/skills/link 端点**

在 `packages/server/src/routes/skills.ts` 中添加：

```typescript
// 在 createSkillsRouter 函数开头添加导入
import { symlinkSync, lstatSync, unlinkSync } from 'fs'
import { registerSkill } from '../../../src/lib/registry.js'

// 在 router.get('/:name/files/*', ...) 之前添加：

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
```

**Step 2: 验证 Link API**

Run: `curl -X POST http://localhost:3001/api/skills/link -H "Content-Type: application/json" -d '{"path":"/Users/jiashengwang/jacky-github/jacky-skills/skill-creator"}'`
Expected: 返回成功响应

**Step 3: Commit**

```bash
git add packages/server/src/routes/skills.ts
git commit -m "feat(server): add POST /api/skills/link endpoint"
```

---

## Task 12: 最终集成测试和文档

**Files:**
- Modify: `README.md`

**Step 1: 验证完整流程**

Run: `pnpm dev`

检查:
1. 后端启动在 :3001
2. 前端启动在 :5173
3. API 代理正常工作
4. Skills 列表能正确显示
5. Settings 能保存配置

**Step 2: 更新 README.md 添加 GUI 说明**

在 README.md 中添加：

```markdown
## Web GUI

j-skills 提供了一个本地 Web GUI 界面，方便可视化管理 Skills。

### 启动 GUI

```bash
# 同时启动前后端
pnpm dev

# 或分别启动
pnpm dev:server  # 后端 :3001
pnpm dev:web     # 前端 :5173
```

### GUI 功能

- **Skills 管理** - 查看已链接/安装的 Skills，支持搜索和卸载
- **Develop** - 链接本地 Skill 目录，预览 SKILL.md 内容
- **Settings** - 配置默认安装环境
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add Web GUI documentation"
```

---

## 完成检查清单

- [ ] Monorepo 结构正确，`pnpm dev` 能同时启动前后端
- [ ] 后端 API 正常工作（health, skills, environments, config）
- [ ] 前端能正确显示 Skills 列表
- [ ] Settings 页面能保存配置
- [ ] Develop 页面能链接新 Skill
- [ ] Tailwind CSS 样式正常应用
- [ ] Toast 通知正常显示
