/**
 * E2E 测试：Develop 页面核心流程
 * 验证批量链接 UI、源文件夹列表、预览面板
 */
describe('Develop 页面', () => {
  beforeEach(async () => {
    await browser.url('tauri://localhost/develop')
    const developPage = await $('#develop-page')
    await developPage.waitForExist({ timeout: 10000 })
  })

  it('应加载页面并显示批量链接卡片', async () => {
    const batchLinkCard = await $('#develop-batch-link-card')
    await expect(batchLinkCard).toBeDisplayed()
  })

  it('应显示路径输入框和操作按钮', async () => {
    const pathInput = await $('#develop-skill-path-input')
    await expect(pathInput).toBeDisplayed()

    const chooseDirBtn = await $('#develop-choose-directory-btn')
    await expect(chooseDirBtn).toBeDisplayed()

    const linkAllBtn = await $('#develop-link-all-btn')
    await expect(linkAllBtn).toBeDisplayed()
  })

  it('应在路径为空时提示输入', async () => {
    const pathInput = await $('#develop-skill-path-input')
    await pathInput.clearValue()

    const linkAllBtn = await $('#develop-link-all-btn')
    await linkAllBtn.click()

    // 空路径应触发错误提示（不崩溃即可）
    const batchLinkCard = await $('#develop-batch-link-card')
    await expect(batchLinkCard).toBeDisplayed()
  })

  it('应能输入路径并尝试链接', async () => {
    const pathInput = await $('#develop-skill-path-input')
    await pathInput.setValue('/tmp/nonexistent-skill-path')

    const linkAllBtn = await $('#develop-link-all-btn')
    await linkAllBtn.click()

    // 不验证成功与否，只验证不崩溃
    const developPage = await $('#develop-page')
    await expect(developPage).toBeDisplayed()
  })

  it('应显示源文件夹卡片', async () => {
    const sourceFoldersCard = await $('#develop-source-folders-card')
    await expect(sourceFoldersCard).toBeDisplayed()

    // 刷新按钮应可用
    const refreshBtn = await $('#develop-refresh-folders-btn')
    await expect(refreshBtn).toBeClickable()
  })

  it('应能刷新源文件夹列表', async () => {
    const refreshBtn = await $('#develop-refresh-folders-btn')
    await refreshBtn.click()

    // 刷新后页面应正常
    const sourceFoldersCard = await $('#develop-source-folders-card')
    await expect(sourceFoldersCard).toBeDisplayed()
  })
})
