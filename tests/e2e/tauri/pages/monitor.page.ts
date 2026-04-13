import { BasePage } from './base.page'

/**
 * Monitor 页面对象
 * 对应前端 web/src/pages/Monitor/index.tsx 及子组件
 */
export class MonitorPage extends BasePage {
  protected get pageId() { return 'monitor-page' }

  // ─── 页面元素 ───
  get loadingEl() { return $('[data-testid="monitor-loading"]') }
  get errorEl() { return $('[data-testid="monitor-error"]') }
  get statsBar() { return $('[data-testid="monitor-stats"]') }
  get sessionGrid() { return $('[data-testid="session-grid"]') }
  get noSessions() { return $('[data-testid="no-sessions"]') }
  get floatingWindowToggle() { return $('[data-testid="floating-window-toggle"]') }

  // ─── Daemon Setup Guide ───
  get setupGuide() { return $('[data-testid="daemon-setup-guide"]') }
  get startDaemonBtn() { return $('[data-testid="start-daemon-btn"]') }
  get installHooksBtn() { return $('[data-testid="install-hooks-btn"]') }
  get guideToggle() { return $('[data-testid="guide-toggle"]') }
  get retryInitBtn() { return $('[data-testid="retry-init-btn"]') }

  // ─── 动态选择器 ───
  sessionCard(pid: number) { return $(`[data-testid="session-card-${pid}"]`) }
  sessionToggle(pid: number) { return $(`[data-testid="session-card-toggle-${pid}"]`) }
  sessionDetail(pid: number) { return $(`[data-testid="session-detail-${pid}"]`) }
  sessionKill(pid: number) { return $(`[data-testid="session-kill-${pid}"]`) }

  // ─── 操作 ───
  async clickStartDaemon(): Promise<void> {
    await this.startDaemonBtn.click()
  }

  async clickInstallHooks(): Promise<void> {
    await this.installHooksBtn.click()
  }

  async clickRetryInit(): Promise<void> {
    await this.retryInitBtn.click()
  }

  async toggleFloatingWindow(): Promise<void> {
    await this.floatingWindowToggle.click()
  }
}
