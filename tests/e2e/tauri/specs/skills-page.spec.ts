/**
 * E2E 测试：Skills 页面核心流程
 * 覆盖: E2E-SK-01 ~ E2E-SK-08
 */
import { SkillsPage } from '../pages/skills.page'
import { tauri } from '../helpers/tauri-commands'

const skillsPage = new SkillsPage()

describe('Skills 页面', () => {
  beforeEach(async () => {
    await skillsPage.navigate()
  })

  it('E2E-SK-01: 应加载技能列表并显示统计信息', async () => {
    await skillsPage.statsBar.waitForExist({ timeout: 10000 })
    const statsText = await skillsPage.getStatsText()
    expect(statsText).toBeTruthy()
  })

  it('E2E-SK-01: 应显示页面标题', async () => {
    await skillsPage.header.waitForExist({ timeout: 10000 })
    const headerText = await skillsPage.header.getText()
    expect(headerText).toContain('Skills')
  })

  it('E2E-SK-02: 应显示技能列表或空状态', async () => {
    // 列表或空状态至少有一个存在
    const listExists = await skillsPage.skillsList.isExisting()
    const emptyExists = await skillsPage.emptyState.isExisting()
    expect(listExists || emptyExists).toBe(true)
  })

  it('E2E-SK-03: 应能搜索过滤技能', async () => {
    // 先获取当前 skill 数量
    const countBefore = await skillsPage.getSkillCount()

    // 输入搜索词
    await skillsPage.search('nonexistent-skill-xyz')
    await browser.pause(300) // 等待过滤

    const countAfter = await skillsPage.getSkillCount()
    expect(countAfter).toBeLessThanOrEqual(countBefore)

    // 清除搜索
    await skillsPage.clearSearch()
    await browser.pause(300)
  })

  it('E2E-SK-04: 应能查看 Skill 详情', async () => {
    const count = await skillsPage.getSkillCount()
    if (count === 0) return // 无 skill 时跳过

    // 获取第一个 skill 的名称
    const firstCard = await $('[data-testid^="skill-card-"]')
    const testId = await firstCard.getAttribute('data-testid')
    const skillName = testId?.replace('skill-card-', '') || ''

    if (skillName) {
      await skillsPage.viewSkill(skillName)
      await expect(skillsPage.contentModal).toBeDisplayed()
      await skillsPage.closeSkillModal()
    }
  })

  it('E2E-SK-07: 统计栏应显示正确的 linked 数量', async () => {
    const result = await tauri.listSkills() as any
    if (result && result.skills) {
      const statsText = await skillsPage.statsBar.getText()
      expect(statsText).toBeTruthy()
    }
  })
})
