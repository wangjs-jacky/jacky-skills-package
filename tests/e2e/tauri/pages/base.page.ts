/**
 * POM 基类
 * 所有页面对象继承此类，提供导航、等待、Tauri invoke 等通用能力。
 *
 * 选择器约定：前端页面使用 data-testid 属性，选择器格式为 [data-testid="xxx"]
 */
export class BasePage {
  /** 子类必须返回页面的 data-testid 值，如 'skills-page' */
  protected get pageId(): string {
    throw new Error('子类必须实现 pageId')
  }

  /** 页面路由路径，如 'skills'。默认与 pageId 相同（去掉 -page 后缀） */
  protected get route(): string {
    return this.pageId.replace(/-page$/, '')
  }

  /** 导航到本页面并等待加载完成 */
  async navigate(): Promise<void> {
    await browser.url(`tauri://localhost/${this.route}`)
    await this.waitForLoad()
  }

  /** 等待页面容器出现 */
  async waitForLoad(timeout = 10000): Promise<void> {
    const el = await $(`[data-testid="${this.pageId}"]`)
    await el.waitForExist({ timeout })
  }

  /** 检查页面是否可见 */
  async isDisplayed(): Promise<boolean> {
    const el = await $(`[data-testid="${this.pageId}"]`)
    return el.isDisplayed()
  }

  /**
   * 调用 Tauri 命令
   * 通过 WKWebView 的 JS 执行环境直接调用 __TAURI_INTERNALS__.invoke
   */
  async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    return browser.execute(
      (cmd: string, payload: string) => {
        return (window as any).__TAURI_INTERNALS__.invoke(cmd, JSON.parse(payload))
      },
      command,
      JSON.stringify(args || {})
    ) as Promise<T>
  }
}
