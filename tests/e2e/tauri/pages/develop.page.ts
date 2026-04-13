import { BasePage } from './base.page'

/**
 * Develop 页面对象
 * 对应前端 web/src/pages/Develop/index.tsx
 */
export class DevelopPage extends BasePage {
  protected get pageId() { return 'develop-page' }

  // ─── 页面元素 ───
  get batchLinkCard() { return $('[data-testid="develop-batch-link-card"]') }
  get pathInput() { return $('[data-testid="develop-skill-path-input"]') }
  get chooseDirBtn() { return $('[data-testid="develop-choose-directory-btn"]') }
  get linkAllBtn() { return $('[data-testid="develop-link-all-btn"]') }
  get sourceFoldersCard() { return $('[data-testid="develop-source-folders-card"]') }
  get refreshFoldersBtn() { return $('[data-testid="develop-refresh-folders-btn"]') }

  // ─── 操作 ───
  async setPath(path: string): Promise<void> {
    await this.pathInput.setValue(path)
  }

  async clearPath(): Promise<void> {
    await this.pathInput.clearValue()
  }

  async clickLinkAll(): Promise<void> {
    await this.linkAllBtn.click()
  }

  async refreshFolders(): Promise<void> {
    await this.refreshFoldersBtn.click()
  }
}
