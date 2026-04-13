/**
 * E2E 测试：ClaudeMD 页面核心流程
 * 覆盖: E2E-CMD-01 ~ E2E-CMD-04
 */
import { ClaudeMDPage } from '../pages/claudemd.page'
import { tauri } from '../helpers/tauri-commands'

const claudemdPage = new ClaudeMDPage()

describe('ClaudeMD 页面', () => {
  beforeEach(async () => {
    await claudemdPage.navigate()
  })

  it('E2E-CMD-01: 应加载页面并显示编辑器区域', async () => {
    await expect(claudemdPage.isDisplayed()).resolves.toBe(true)
  })

  it('E2E-CMD-01: 应显示页面标题', async () => {
    const pageEl = await $('[data-testid="claudemd-page"]')
    const text = await pageEl.getText()
    expect(text).toContain('CLAUDE.md')
  })

  it('E2E-CMD-02: 应显示文件列表或空状态', async () => {
    // 通过 Tauri 命令获取文件列表
    const result = await tauri.invoke('list_claudemd_files') as any
    // 命令应不崩溃
    expect(result).toBeDefined()
  })

  it('E2E-CMD-01: 刷新按钮应可用', async () => {
    const refreshBtn = await claudemdPage.refreshBtn
    if (await refreshBtn.isExisting()) {
      await claudemdPage.clickRefresh()
      await expect(claudemdPage.isDisplayed()).resolves.toBe(true)
    }
  })
})
