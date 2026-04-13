import { BasePage } from './base.page'

/**
 * Skills 页面对象
 * 对应前端 web/src/pages/Skills/index.tsx 及子组件
 */
export class SkillsPage extends BasePage {
  protected get pageId() { return 'skills-page' }

  // ─── 页面元素 ───
  get loadingEl() { return $('[data-testid="skills-loading"]') }
  get header() { return $('[data-testid="skills-header"]') }
  get statsBar() { return $('[data-testid="skills-stats"]') }
  get statsTotal() { return $('[data-testid="skills-stats-total"]') }
  get statsInstalled() { return $('[data-testid="skills-stats-installed"]') }
  get searchInput() { return $('[data-testid="skills-search-input"]') }
  get skillsList() { return $('[data-testid="skills-list"]') }
  get skillsGrid() { return $('[data-testid="skills-grid"]') }
  get emptyState() { return $('[data-testid="skills-empty-state"]') }
  get contentModal() { return $('[data-testid="skill-content-modal"]') }

  // ─── 动态选择器 ───
  skillCard(name: string) { return $(`[data-testid="skill-card-${name}"]`) }
  viewBtn(name: string) { return $(`[data-testid="skill-view-btn-${name}"]`) }
  exportBtn(name: string) { return $(`[data-testid="skill-export-btn-${name}"]`) }
  unlinkBtn(name: string) { return $(`[data-testid="skill-unlink-btn-${name}"]`) }
  envToggle(skillName: string, envName: string) {
    return $(`[data-testid="skill-env-toggle-${skillName}-${envName}"]`)
  }

  // ─── 操作 ───
  async getStatsText(): Promise<string> {
    return this.statsBar.getText()
  }

  async search(query: string): Promise<void> {
    await this.searchInput.setValue(query)
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clearValue()
  }

  async getSkillCount(): Promise<number> {
    const cards = await $$('[data-testid^="skill-card-"]')
    return cards.length
  }

  async viewSkill(name: string): Promise<void> {
    await this.viewBtn(name).click()
    await this.contentModal.waitForExist({ timeout: 5000 })
  }

  async closeSkillModal(): Promise<void> {
    const closeBtn = await $('[data-testid="skill-content-modal-close"]')
    await closeBtn.click()
  }

  async unlinkSkill(name: string): Promise<void> {
    await this.unlinkBtn(name).click()
  }
}
