/**
 * E2E 测试：应用启动基线
 * 覆盖: E2E-NAV-01, E2E-NAV-02, E2E-NAV-05
 */
import { SkillsPage } from '../pages/skills.page'

const skillsPage = new SkillsPage()

describe('应用启动', () => {
  it('E2E-NAV-01: 应正常启动并显示窗口标题', async () => {
    const title = await browser.getTitle()
    expect(title).toContain('j-skills')
  })

  it('E2E-NAV-01: 应渲染 Skills 页面作为首页', async () => {
    await skillsPage.waitForLoad()
    await expect(skillsPage.isDisplayed()).resolves.toBe(true)
  })

  it('E2E-NAV-02: 应显示 Skills 统计栏', async () => {
    await skillsPage.statsBar.waitForExist({ timeout: 10000 })
    await expect(skillsPage.statsBar).toBeDisplayed()
  })

  it('E2E-NAV-02: 窗口尺寸应满足最小要求', async () => {
    const rect = await browser.getWindowRect()
    expect(rect.width).toBeGreaterThanOrEqual(900)
    expect(rect.height).toBeGreaterThanOrEqual(600)
  })

  it('E2E-NAV-05: 页面刷新后应正常加载', async () => {
    await browser.refresh()
    await skillsPage.waitForLoad()
    const title = await browser.getTitle()
    expect(title).toContain('j-skills')
  })
})
