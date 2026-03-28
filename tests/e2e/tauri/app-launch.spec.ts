/**
 * E2E 测试：应用启动与窗口基线
 * 验证 Tauri 应用能正常启动、渲染主界面
 */
describe('应用启动', () => {
  it('应正常启动并显示窗口标题', async () => {
    const title = await browser.getTitle()
    expect(title).toContain('j-skills')
  })

  it('应渲染 Skills 页面作为首页', async () => {
    const skillsPage = await $('#skills-page')
    await skillsPage.waitForExist({ timeout: 10000 })
    await expect(skillsPage).toBeDisplayed()
  })

  it('应显示 Skills 统计栏', async () => {
    const stats = await $('#skills-stats')
    await stats.waitForExist({ timeout: 10000 })
    await expect(stats).toBeDisplayed()
  })

  it('应显示导航栏并可切换页面', async () => {
    // 通过 URL 导航到 Settings 页面
    await browser.url('tauri://localhost/settings')
    const settingsPage = await $('#settings-page')
    await settingsPage.waitForExist({ timeout: 10000 })
    await expect(settingsPage).toBeDisplayed()

    // 导航到 Develop 页面
    await browser.url('tauri://localhost/develop')
    const developPage = await $('#develop-page')
    await developPage.waitForExist({ timeout: 10000 })
    await expect(developPage).toBeDisplayed()

    // 返回首页
    await browser.url('tauri://localhost/')
    const skillsPage = await $('#skills-page')
    await skillsPage.waitForExist({ timeout: 10000 })
    await expect(skillsPage).toBeDisplayed()
  })

  it('应能获取窗口尺寸', async () => {
    const rect = await browser.getWindowRect()
    expect(rect.width).toBeGreaterThanOrEqual(900)
    expect(rect.height).toBeGreaterThanOrEqual(600)
  })
})
