/**
 * Tauri 应用烟雾测试（E2E）
 * 鼔证 L6 门控: 最小化关键路径测试
 *
 * 测试策略：
 * 1. 应用启动并验证窗口
 * 2. 列出 skills（读路径）
 * 3. 链接 skill 并验证（写路径）
 */

import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'

test.describe('Tauri App Smoke Tests', () => {
  test.slow('App should start and show skills list', async ({ page }) => {
    // 启动应用
    await page.goto('http://localhost:5173')

    // 等待应用加载
    await page.waitForSelector('text=Skills', { timeout: 10000 })

    // 验证窗口标题
    const title = await page.title()
    expect(title).toContain('j-skills')
  })

  test('should list skills from registry', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForSelector('text=Skills')

    // 模拟调用 API
    const skillsData = await page.evaluate(() => {
      // 在浏览器环境中调用 Tauri invoke
      if (typeof (window as any).__TAURI__) {
        return await (window as any).__TAURI__.invoke('list_skills')
      }
      // 否则使用 HTTP API
      const response = await page.request.get('/api/skills')
      return response.json()
    })

    // 验证数据结构
    expect(skillsData).toBeDefined()
    expect(Array.isArray(skillsData.data || skillsData)).toBe(true)
  })

  test('should link a skill folder', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForSelector('text=Skills')

    // 准备测试数据
    const testSkillPath = '/tmp/test-skill-e2e'
    const testSkillName = 'test-skill-e2e'

    // 模拟链接操作
    const linkResult = await page.evaluate(async () => {
      if (typeof (window as any).__TAURI__) {
        return await (window as any).__TAURI__.invoke('link_skill', { path: testSkillPath })
      }
      // 否则使用 HTTP API
      const response = await page.request.post('/api/skills/link', {
        json: { path: testSkillPath },
      })
      return response.json()
    })

    // 验证返回结果
    expect(linkResult).toBeDefined()
    expect(linkResult.success).toBe(true)
    expect(linkResult.data.linked).toContain(testSkillName)
  })
})
