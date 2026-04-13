/**
 * E2E 测试：Develop 页面核心流程
 * 覆盖: E2E-DEV-01 ~ E2E-DEV-05
 */
import { DevelopPage } from '../pages/develop.page'

const developPage = new DevelopPage()

describe('Develop 页面', () => {
  beforeEach(async () => {
    await developPage.navigate()
  })

  it('E2E-DEV-01: 应加载页面并显示批量链接卡片', async () => {
    await expect(developPage.batchLinkCard).toBeDisplayed()
  })

  it('E2E-DEV-01: 应显示路径输入框和操作按钮', async () => {
    await expect(developPage.pathInput).toBeDisplayed()
    await expect(developPage.chooseDirBtn).toBeDisplayed()
    await expect(developPage.linkAllBtn).toBeDisplayed()
  })

  it('E2E-DEV-02: 空路径点击链接应不崩溃', async () => {
    await developPage.clearPath()
    await developPage.clickLinkAll()
    // 页面应保持正常
    await expect(developPage.batchLinkCard).toBeDisplayed()
  })

  it('E2E-DEV-03: 无效路径链接应不崩溃', async () => {
    await developPage.setPath('/tmp/nonexistent-skill-path-e2e-test')
    await developPage.clickLinkAll()
    // 页面应保持正常
    await expect(developPage.batchLinkCard).toBeDisplayed()
  })

  it('E2E-DEV-04: 应显示源文件夹卡片', async () => {
    await expect(developPage.sourceFoldersCard).toBeDisplayed()
  })

  it('E2E-DEV-04: 刷新按钮应可用', async () => {
    await expect(developPage.refreshFoldersBtn).toBeClickable()
  })

  it('E2E-DEV-05: 应能刷新源文件夹列表', async () => {
    await developPage.refreshFolders()
    await expect(developPage.sourceFoldersCard).toBeDisplayed()
  })
})
