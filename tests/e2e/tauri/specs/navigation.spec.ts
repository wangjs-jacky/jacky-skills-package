/**
 * E2E 测试：全局导航
 * 覆盖: E2E-NAV-03, E2E-NAV-04
 *
 * 验证侧边栏导航和直接 URL 导航均正常工作。
 */
import { SkillsPage } from '../pages/skills.page'
import { SettingsPage } from '../pages/settings.page'
import { DevelopPage } from '../pages/develop.page'
import { MonitorPage } from '../pages/monitor.page'
import { ClaudeMDPage } from '../pages/claudemd.page'

const skillsPage = new SkillsPage()
const settingsPage = new SettingsPage()
const developPage = new DevelopPage()
const monitorPage = new MonitorPage()
const claudemdPage = new ClaudeMDPage()

describe('全局导航', () => {
  const pages = [
    { name: 'Skills', page: skillsPage, route: 'skills' },
    { name: 'Develop', page: developPage, route: 'develop' },
    { name: 'Monitor', page: monitorPage, route: 'monitor' },
    { name: 'CLAUDE.md', page: claudemdPage, route: 'claudemd' },
    { name: 'Settings', page: settingsPage, route: 'settings' },
  ]

  it('E2E-NAV-03: 侧边栏应显示应用标题', async () => {
    const title = await $('[data-testid="sidebar-app-title"]')
    await expect(title).toBeDisplayed()
    const titleText = await title.getText()
    expect(titleText).toContain('j-skills')
  })

  it('E2E-NAV-03: 侧边栏应显示版本号', async () => {
    const version = await $('[data-testid="sidebar-version"]')
    await expect(version).toBeDisplayed()
    const versionText = await version.getText()
    expect(versionText).toMatch(/^v/)
  })

  // 动态生成导航测试
  for (const { name, page, route } of pages) {
    it(`E2E-NAV-04: 直接导航到 ${name} 页面`, async () => {
      await page.navigate()
      await expect(page.isDisplayed()).resolves.toBe(true)
    })
  }

  it('E2E-NAV-03: 应能通过侧边栏连续导航', async () => {
    // Skills → Settings → Monitor → Back to Skills
    await settingsPage.navigate()
    await expect(settingsPage.isDisplayed()).resolves.toBe(true)

    await monitorPage.navigate()
    await expect(monitorPage.isDisplayed()).resolves.toBe(true)

    await skillsPage.navigate()
    await expect(skillsPage.isDisplayed()).resolves.toBe(true)
  })
})
