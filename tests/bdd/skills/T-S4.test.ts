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

describe('T-S4 导出 Skill', () => {
  const user = userEvent.setup()

  const mockSkill = {
    name: 'export-skill',
    path: '/skills/export-skill',
    source: 'linked' as const,
    installedEnvironments: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSkills = [mockSkill]
    listMock.mockResolvedValue({ success: true, data: { skills: [mockSkill], cleanedCount: 0 } })
  })

  /**
   * T-S4 完整流程（4 步）:
   * Step 1: Card 可见，hover 显示导出按钮
   * Step 2: 点击导出 → 成功 Toast
   * Step 3: API 失败 → Toast "Failed to export skill"
   * Step 4: API 返回 errors → Toast 显示 errors[0]
   */
  it('完整流程: 导出成功 → API 失败 → 返回 errors', async () => {
    const { default: SkillsPage } = await import('../../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // Step 1: Card 和导出按钮存在
    const card = await screen.findByTestId('skill-card-export-skill')
    expect(card).toBeTruthy()
    const exportBtn = screen.getByTestId('skill-export-btn-export-skill')
    expect(exportBtn).toBeTruthy()

    // Step 2: 点击导出 → 成功
    exportMock.mockResolvedValue({
      success: true,
      data: { exported: ['export-skill'], errors: [], targetPath: '~/Downloads/j-skills-export' },
    })
    await user.click(exportBtn)

    expect(exportMock).toHaveBeenCalledWith(['export-skill'], '~/Downloads/j-skills-export')
    expect(showToastMock).toHaveBeenCalledWith(
      'Exported export-skill to ~/Downloads/j-skills-export',
      'success',
    )

    // Step 3: API 抛异常 → Toast "Failed to export skill"
    exportMock.mockRejectedValue(new Error('Network error'))
    await user.click(exportBtn)

    expect(showToastMock).toHaveBeenCalledWith('Failed to export skill', 'error')

    // Step 4: API 返回 success:false 带 errors → Toast errors[0]
    exportMock.mockResolvedValue({
      success: false,
      data: { exported: [], errors: ['Permission denied for export-skill'], targetPath: '' },
    })
    await user.click(exportBtn)

    expect(showToastMock).toHaveBeenCalledWith('Permission denied for export-skill', 'error')
  })
})
