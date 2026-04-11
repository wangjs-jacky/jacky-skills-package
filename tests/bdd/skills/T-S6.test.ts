// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { expectElementAsync } from '@wangjs-jacky/tdd-kit'

// --- Store mock ---
let mockSkills: any[] = []
const showToastMock = vi.fn()
const setSkillsMock = vi.fn((skills: any[]) => { mockSkills = skills })
const setIsLoadingMock = vi.fn()
const updateSkillEnvironmentsMock = vi.fn()

vi.mock('../../../web/src/stores', () => ({
  useStore: () => ({
    skills: mockSkills,
    setSkills: setSkillsMock,
    isLoading: false,
    setIsLoading: setIsLoadingMock,
    showToast: showToastMock,
    updateSkillEnvironments: updateSkillEnvironmentsMock,
    config: {},
    setConfig: vi.fn(),
  }),
}))

// --- API mock ---
const listMock = vi.fn()
const unlinkMock = vi.fn()
const installMock = vi.fn()
const uninstallMock = vi.fn()
const exportMock = vi.fn()

vi.mock('../../../web/src/api/client', () => ({
  skillsApi: {
    list: listMock,
    unlink: unlinkMock,
    install: installMock,
    uninstall: uninstallMock,
    export: exportMock,
  },
  environmentsApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: { skills: [], cleanedCount: 0 } }),
  },
  configApi: {
    get: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}))

describe('T-S6 空状态', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSkills = []
    listMock.mockResolvedValue({ success: true, data: { skills: [], cleanedCount: 0 } })
  })

  /**
   * T-S6 完整流程（2 步）:
   * Step 1: API 返回空 → "No skills found" + "Try linking one first with j-skills link"
   * Step 2: Stats Bar 显示 "0 skills linked" 和 "0 installed"
   */
  it('API 返回空 → 显示空状态和零值统计', async () => {
    const { default: SkillsPage } = await import('../../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // Step 1: 空状态文案
    await expectElementAsync(screen, 'skills-empty-state')
    const emptyState = screen.getByTestId('skills-empty-state')
    expect(emptyState.textContent).toContain('No skills found')
    expect(emptyState.textContent).toContain('Try linking one first with')
    expect(emptyState.textContent).toContain('j-skills link')

    // Step 2: Stats Bar 零值统计
    await expectElementAsync(screen, 'skills-stats-total', { text: '0 skills linked' })
    await expectElementAsync(screen, 'skills-stats-installed', { text: '0 installed' })

    // 验证没有任何 skill card
    expect(screen.queryByTestId(/skill-card-/)).toBeNull()
  })
})
