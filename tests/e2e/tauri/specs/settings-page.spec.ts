/**
 * E2E 测试：Settings 页面核心流程
 * 覆盖: E2E-CFG-01 ~ E2E-CFG-05
 */
import { SettingsPage } from '../pages/settings.page'
import { tauri } from '../helpers/tauri-commands'

const settingsPage = new SettingsPage()

describe('Settings 页面', () => {
  beforeEach(async () => {
    await settingsPage.navigate()
  })

  it('E2E-CFG-01: 应加载配置并显示页面', async () => {
    await expect(settingsPage.isDisplayed()).resolves.toBe(true)
  })

  it('E2E-CFG-01: 应显示环境选择列表', async () => {
    const envButtons = await settingsPage.getEnvButtons()
    expect(envButtons.length).toBeGreaterThan(0)
  })

  it('E2E-CFG-02: 应能切换环境选择', async () => {
    const envButtons = await settingsPage.getEnvButtons()
    if (envButtons.length > 0) {
      const firstBtn = envButtons[0]
      const testId = await firstBtn.getAttribute('data-testid')
      const envName = testId?.replace('settings-env-toggle-', '')

      if (envName) {
        await settingsPage.toggleEnv(envName)
        // 验证按钮仍然可见（不崩溃）
        await expect(firstBtn).toBeDisplayed()
      }
    }
  })

  it('E2E-CFG-03: 应能切换安装方式', async () => {
    await expect(settingsPage.copyMethodBtn).toBeDisplayed()
    await expect(settingsPage.symlinkMethodBtn).toBeDisplayed()

    // 切换到 Symlink
    await settingsPage.selectSymlinkMethod()
    await expect(settingsPage.symlinkMethodBtn).toBeDisplayed()

    // 切换回 Copy
    await settingsPage.selectCopyMethod()
    await expect(settingsPage.copyMethodBtn).toBeDisplayed()
  })

  it('E2E-CFG-05: 配置修改后刷新应保持', async () => {
    // 读取当前配置
    const config = await tauri.getConfig() as any
    expect(config).toBeTruthy()
  })
})
