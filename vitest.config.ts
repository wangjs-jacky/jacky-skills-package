import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // pnpm monorepo: 测试文件从根目录运行时需要手动 alias 子包依赖
      'react-router-dom': path.resolve(__dirname, 'packages/web/node_modules/react-router-dom'),
      '@tauri-apps/api/app': path.resolve(__dirname, 'packages/web/node_modules/@tauri-apps/api/app'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
})
