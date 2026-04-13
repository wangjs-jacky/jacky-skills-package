import { BasePage } from './base.page'

/**
 * Settings 页面对象
 * 对应前端 web/src/pages/Settings/index.tsx
 */
export class SettingsPage extends BasePage {
  protected get pageId() { return 'settings-page' }

  // ─── 页面元素 ───
  envToggle(envName: string) { return $(`[data-testid="settings-env-toggle-${envName}"]`) }
  get copyMethodBtn() { return $('[data-testid="settings-install-method-copy"]') }
  get symlinkMethodBtn() { return $('[data-testid="settings-install-method-symlink"]') }

  // ─── 操作 ───
  async getEnvButtons(): Promise<WebdriverIO.ElementArray> {
    return $$('[data-testid^="settings-env-toggle-"]')
  }

  async toggleEnv(envName: string): Promise<void> {
    await this.envToggle(envName).click()
  }

  async selectCopyMethod(): Promise<void> {
    await this.copyMethodBtn.click()
  }

  async selectSymlinkMethod(): Promise<void> {
    await this.symlinkMethodBtn.click()
  }

  async isEnvActive(envName: string): Promise<boolean> {
    const classes = await this.envToggle(envName).getAttribute('class')
    return classes.includes('primary') || classes.includes('active') || classes.includes('selected')
  }
}
