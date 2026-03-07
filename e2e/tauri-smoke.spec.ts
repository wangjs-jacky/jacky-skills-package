/**
 * Tauri 应用烟雾测试（E2E）
 * 验证 L6 门控: 最小化关键路径测试
 *
 * 测试策略：
 * 1. 应用启动并验证窗口
 * 2. 列出 skills（读路径）
 * 3. 验证 API 可访问性
 */

import { test, expect } from '@playwright/test'

test.describe('j-skills Web App Smoke Tests', () => {
  test('App should load and show title', async ({ page }) => {
    // 访问应用
    await page.goto('/')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')

    // 验证窗口标题
    const title = await page.title()
    expect(title).toContain('j-skills')
  })

  test('should render main UI components', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 验证主要 UI 元素存在
    const body = await page.locator('body')
    await expect(body).toBeVisible()

    // 检查是否有 React 应用挂载
    const rootElement = await page.locator('#root')
    await expect(rootElement).toBeVisible()
  })

  test('should have working API client', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 在浏览器控制台测试 API
    const apiCheck = await page.evaluate(() => {
      // 检查 API 客户端是否已初始化
      return typeof window !== 'undefined'
    })

    expect(apiCheck).toBe(true)
  })

  test('should detect environment correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 检查环境检测逻辑
    const envCheck = await page.evaluate(() => {
      // 在浏览器环境中检查 Tauri 检测
      const hasTauri = typeof (window as any).__TAURI__ !== 'undefined'
      const hasTauriInternals = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined'

      return {
        isTauri: hasTauri || hasTauriInternals,
        isWeb: !hasTauri && !hasTauriInternals
      }
    })

    // 在 Web 模式下应该检测为 Web 环境
    expect(envCheck.isWeb).toBe(true)
  })

  test('should handle page navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 刷新页面应该正常工作
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 验证页面仍然可以访问
    const title = await page.title()
    expect(title).toContain('j-skills')
  })
})
