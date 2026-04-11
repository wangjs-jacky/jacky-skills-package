// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('T-S5 Unlink Skill', () => {
  const user = userEvent.setup()

  const mockSkill = {
    name: 'unlink-skill',
    path: '/skills/unlink-skill',
    source: 'linked' as const,
    installedEnvironments: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSkills = [mockSkill]
    listMock.mockResolvedValue({ success: true, data: { skills: [mockSkill], cleanedCount: 0 } })
  })

  /**
   * T-S5 完整流程（3 步）:
   * Step 1: Card 可见，hover 显示 Unlink 按钮
   * Step 2: 点击 Unlink → 调用 unlink → loadSkills 刷新 → Toast "Unlinked: xxx"
   * Step 3: API 失败 → Toast "Failed to unlink skill"
   */
  it('完整流程: Unlink 成功 → API 失败', async () => {
    const { default: SkillsPage } = await import('../../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // Step 1: Card 和 Unlink 按钮存在
    const card = await screen.findByTestId('skill-card-unlink-skill')
    expect(card).toBeTruthy()
    const unlinkBtn = screen.getByTestId('skill-unlink-btn-unlink-skill')
    expect(unlinkBtn).toBeTruthy()

    // Step 2: 点击 Unlink → 成功
    unlinkMock.mockResolvedValue({ success: true, data: { name: 'unlink-skill' } })
    // loadSkills 会再次调用 list，mock 返回空列表
    listMock.mockResolvedValue({ success: true, data: { skills: [], cleanedCount: 0 } })
    await user.click(unlinkBtn)

    expect(unlinkMock).toHaveBeenCalledWith('unlink-skill')
    // loadSkills 刷新：list 被再次调用
    expect(listMock).toHaveBeenCalledTimes(2) // mount + unlink 后的刷新
    expect(showToastMock).toHaveBeenCalledWith('Unlinked: unlink-skill', 'success')
  })

  it('API 失败 → Toast "Failed to unlink skill"', async () => {
    const { default: SkillsPage } = await import('../../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    const unlinkBtn = await screen.findByTestId('skill-unlink-btn-unlink-skill')

    // Step 3: API 抛异常 → Toast error
    unlinkMock.mockRejectedValue(new Error('Network error'))
    await user.click(unlinkBtn)

    expect(showToastMock).toHaveBeenCalledWith('Failed to unlink skill', 'error')
  })
})
