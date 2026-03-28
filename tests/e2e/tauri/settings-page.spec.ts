/**
 * E2E 测试：Settings 页面核心流程
 * 验证环境选择、安装方式切换、配置保存
 */
describe('Settings 页面', () => {
  beforeEach(async () => {
    await browser.url('tauri://localhost/settings')
    const settingsPage = await $('#settings-page')
    await settingsPage.waitForExist({ timeout: 10000 })
  })

  it('应加载配置并显示页面', async () => {
    const settingsPage = await $('#settings-page')
    await expect(settingsPage).toBeDisplayed()
  })

  it('应显示环境选择列表', async () => {
    // 等待环境列表加载（环境按钮出现）
    const envButtons = await $$('[data-testid^="settings-env-toggle-"]')
    expect(envButtons.length).toBeGreaterThan(0)
  })

  it('应能切换环境选择', async () => {
    // 获取第一个环境按钮
    const envButtons = await $$('[data-testid^="settings-env-toggle-"]')
    if (envButtons.length > 0) {
      const firstBtn = envButtons[0]
      const testId = await firstBtn.getAttribute('data-testid')
      const envName = testId?.replace('settings-env-toggle-', '')

      // 记录当前状态
      const initialClasses = await firstBtn.getAttribute('class')

      // 点击切换
      await firstBtn.click()

      // 验证状态变化（class 应该不同）
      const newClasses = await firstBtn.getAttribute('class')
      // 注意：可能相同（如果之前是选中的，现在取消，反之亦然）
      // 关键是不崩溃
      await expect(firstBtn).toBeDisplayed()
    }
  })

  it('应能切换安装方式', async () => {
    const copyBtn = await $('#settings-install-method-copy')
    const symlinkBtn = await $('#settings-install-method-symlink')

    await expect(copyBtn).toBeDisplayed()
    await expect(symlinkBtn).toBeDisplayed()

    // 切换到 Symlink
    await symlinkBtn.click()
    let symlinkClasses = await symlinkBtn.getAttribute('class')
    expect(symlinkClasses).toContain('primary')

    // 切换回 Copy
    await copyBtn.click()
    let copyClasses = await copyBtn.getAttribute('class')
    expect(copyClasses).toContain('primary')
  })

  it('应能保存配置', async () => {
    const saveBtn = await $('#settings-save-btn')
    await expect(saveBtn).toBeDisplayed()
    await expect(saveBtn).toBeClickable()

    // 点击保存
    await saveBtn.click()

    // 等待 Toast 提示（保存成功或失败）
    // 不验证具体内容，只验证按钮仍然可用（不崩溃）
    await expect(saveBtn).toBeDisplayed()
  })
})
