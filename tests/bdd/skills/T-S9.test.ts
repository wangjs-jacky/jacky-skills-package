// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// --- Store mock ---
let mockSkills: any[] = []
let mockConfig: any = {}
const showToastMock = vi.fn()
const setSkillsMock = vi.fn((skills: any[]) => { mockSkills = skills })
const setIsLoadingMock = vi.fn()
const setConfigMock = vi.fn((config: any) => { mockConfig = config })
const updateSkillEnvironmentsMock = vi.fn()

const useStoreMock = Object.assign(
  () => ({
    skills: mockSkills,
    setSkills: setSkillsMock,
    config: mockConfig,
    setConfig: setConfigMock,
    isLoading: false,
    setIsLoading: setIsLoadingMock,
    showToast: showToastMock,
    updateSkillEnvironments: updateSkillEnvironmentsMock,
  }),
  {
    getState: () => ({
      skills: mockSkills,
      config: mockConfig,
    }),
  }
)

vi.mock('../../../web/src/stores', () => ({
  useStore: useStoreMock,
}))

// --- API mock ---
const listMock = vi.fn()
const unlinkMock = vi.fn()
const installMock = vi.fn()
const uninstallMock = vi.fn()
const exportMock = vi.fn()
const environmentsListMock = vi.fn()
const configGetMock = vi.fn()

vi.mock('../../../web/src/api/client', () => ({
  skillsApi: {
    list: listMock,
    unlink: unlinkMock,
    install: installMock,
    uninstall: uninstallMock,
    export: exportMock,
  },
  environmentsApi: {
    list: environmentsListMock,
  },
  configApi: {
    get: configGetMock,
  },
}))

describe('T-S9 失效技能自动清理', () => {
  const mockEnvironments = [
    { name: 'claude-code', label: 'Claude Code', globalPath: '~/.claude/skills', projectPaths: [] },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfig = { defaultEnvironments: ['claude-code'] }
    environmentsListMock.mockResolvedValue({ success: true, data: mockEnvironments })
    configGetMock.mockResolvedValue({ success: true, data: mockConfig })
  })

  /**
   * M1: 无失效技能时正常渲染，不显示 toast
   */
  it('M1: 无失效技能时正常渲染，不显示清理 toast', async () => {
    const validSkills = [
      { name: 'skill-a', path: '/skills/skill-a', source: 'linked', installedEnvironments: ['claude-code'] },
      { name: 'skill-b', path: '/skills/skill-b', source: 'linked', installedEnvironments: [] },
    ]
    mockSkills = [...validSkills]
    // 新返回结构：{ skills, cleanedCount }
    listMock.mockResolvedValue({ success: true, data: { skills: validSkills, cleanedCount: 0 } })

    const { default: SkillsPage } = await import('../../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // 等待加载完成
    await screen.findByTestId('skills-stats')

    // 应该渲染两个技能卡片
    await waitFor(() => {
      expect(setSkillsMock).toHaveBeenCalledWith(validSkills)
    })

    // 不应该显示清理 toast
    const cleanupCalls = showToastMock.mock.calls.filter(
      (call: any[]) => call[0]?.includes('Auto-cleaned')
    )
    expect(cleanupCalls.length).toBe(0)
  })

  /**
   * M2: 有失效技能时显示 toast 提示清理数量
   */
  it('M2: 有失效技能时显示 "Auto-cleaned N broken skill(s)" toast', async () => {
    const remainingSkills = [
      { name: 'skill-a', path: '/skills/skill-a', source: 'linked', installedEnvironments: ['claude-code'] },
    ]
    mockSkills = [...remainingSkills]
    listMock.mockResolvedValue({ success: true, data: { skills: remainingSkills, cleanedCount: 2 } })

    const { default: SkillsPage } = await import('../../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Auto-cleaned 2 broken skill(s)',
        'success',
      )
    })

    // 只渲染剩余的 skill-a
    expect(setSkillsMock).toHaveBeenCalledWith(remainingSkills)
  })

  /**
   * M3: 所有技能都失效时显示空列表 + toast
   */
  it('M3: 所有技能都失效时显示空列表 + toast', async () => {
    mockSkills = []
    listMock.mockResolvedValue({ success: true, data: { skills: [], cleanedCount: 5 } })

    const { default: SkillsPage } = await import('../../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Auto-cleaned 5 broken skill(s)',
        'success',
      )
    })

    expect(setSkillsMock).toHaveBeenCalledWith([])
  })
})
