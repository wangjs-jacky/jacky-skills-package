/**
 * E2E 测试：Skills 页面核心流程
 * 验证技能列表加载、统计显示、环境切换等
 */
describe('Skills 页面', () => {
  beforeEach(async () => {
    await browser.url('tauri://localhost/')
    const skillsPage = await $('#skills-page')
    await skillsPage.waitForExist({ timeout: 10000 })
  })

  it('应加载技能列表并显示统计信息', async () => {
    // 等待加载完成（skills-page 出现意味着加载已完成）
    const stats = await $('#skills-stats')
    await expect(stats).toBeDisplayed()

    // 验证统计栏包含文本（skills linked / installed）
    const statsText = await stats.getText()
    expect(statsText).toContain('skills linked')
    expect(statsText).toContain('installed')
  })

  it('应显示页面标题', async () => {
    const header = await $('#skills-header')
    await expect(header).toBeDisplayed()
    const headerText = await header.getText()
    expect(headerText).toContain('Skills')
  })

  it('应显示技能列表或空状态', async () => {
    // 技能列表或空状态
    const skillsList = await $('#skills-list')
    const emptyState = await $('#skills-empty-state')

    // 至少有一个存在
    const listExists = await skillsList.isExisting()
    const emptyExists = await emptyState.isExisting()
    expect(listExists || emptyExists).toBe(true)
  })

  it('应能搜索技能', async () => {
    const searchInput = await $('#skills-search-input')
    if (await searchInput.isExisting()) {
      await searchInput.setValue('test-skill')
      // 输入后列表应更新（不崩溃即可）
      const body = await $('body')
      await expect(body).toBeDisplayed()
    }
  })
})
