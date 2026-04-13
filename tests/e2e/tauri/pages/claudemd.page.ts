import { BasePage } from './base.page'

/**
 * ClaudeMD 页面对象
 * 对应前端 web/src/pages/ClaudeMD/index.tsx
 *
 * 注意：ClaudeMD 页面的按钮目前没有 data-testid，
 * 使用文本内容或角色定位器作为备选方案。
 */
export class ClaudeMDPage extends BasePage {
  protected get pageId() { return 'claudemd-page' }

  // ─── 页面元素 ───
  // 刷新按钮没有 data-testid，通过文本定位
  get refreshBtn() { return $('button=刷新') }
  // 复制按钮没有 data-testid，通过文本定位
  get copyBtn() { return $('button=复制') }
  // 文件选择按钮没有 data-testid，通过包含文本的按钮定位
  fileButton(label: string) { return $(`button*=${label}`) }

  // ─── 操作 ───
  async clickRefresh(): Promise<void> {
    await this.refreshBtn.click()
  }

  async clickCopy(): Promise<void> {
    await this.copyBtn.click()
  }

  async selectFile(label: string): Promise<void> {
    await this.fileButton(label).click()
  }

  async getFileButtons(): Promise<WebdriverIO.ElementArray> {
    // 文件按钮位于文件列表区域
    return $$('button').filter(async (btn) => {
      const text = await btn.getText()
      return text.length > 0 && !text.includes('刷新') && !text.includes('复制')
    })
  }
}
