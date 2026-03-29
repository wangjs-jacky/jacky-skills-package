// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

// --- Store mock ---
let mockSkills: any[] = []
const showToastMock = vi.fn()
const setSkillsMock = vi.fn((skills: any[]) => { mockSkills = skills })
const setIsLoadingMock = vi.fn()
const updateSkillEnvironmentsMock = vi.fn()

vi.mock('../../../packages/web/src/stores', () => ({
  useStore: () => ({
    skills: mockSkills,
    setSkills: setSkillsMock,
    config: {},
    setConfig: vi.fn(),
    isLoading: false,
    setIsLoading: setIsLoadingMock,
    showToast: showToastMock,
    updateSkillEnvironments: updateSkillEnvironmentsMock,
  }),
}))

// --- API mock ---
const listMock = vi.fn()
const unlinkMock = vi.fn()
const installMock = vi.fn()
const uninstallMock = vi.fn()
const exportMock = vi.fn()

vi.mock('../../../packages/web/src/api/client', () => ({
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

describe('T-S2 搜索过滤', () => {
  const user = userEvent.setup()

  const mockSkillData = [
    {
      name: 'task-manager',
      path: '/skills/task-manager',
      source: 'linked' as const,
      installedEnvironments: [],
    },
    {
      name: 'code-review',
      path: '/skills/code-review',
      source: 'global' as const,
      installedEnvironments: [],
    },
    {
      name: 'task-scheduler',
      path: '/skills/task-scheduler',
      source: 'linked' as const,
      installedEnvironments: [],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockSkills = mockSkillData
    listMock.mockResolvedValue({ success: true, data: { skills: mockSkillData, cleanedCount: 0 } })
  })

  /**
   * T-S2 完整流程（5 步）:
   * Step 1: 3 个 skill → 显示 3 张卡片
   * Step 2: 输入 "task" → 只显示包含 "task" 的 skill
   * Step 3: 清空搜索框 → 恢复所有 skill
   * Step 4: 输入 "xyz-not-exist" → "No skills found"
   * Step 5: 搜索框 placeholder 为 "Search skills..."
   */
  it('完整流程: 显示全部 → 搜索过滤 → 清空 → 无结果', async () => {
    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // Step 1: 确认 3 张卡片全部显示
    await expectElementAsync(screen, 'skill-card-task-manager')
    await expectElementAsync(screen, 'skill-card-code-review')
    await expectElementAsync(screen, 'skill-card-task-scheduler')

    // Step 5: 验证搜索框 placeholder
    const searchInput = screen.getByTestId('skills-search-input') as HTMLInputElement
    expect(searchInput.placeholder).toBe('Search skills...')

    // Step 2: 输入 "task" → 只显示 task-manager 和 task-scheduler
    await user.type(searchInput, 'task')

    await waitFor(() => {
      expect(screen.getByTestId('skill-card-task-manager')).toBeTruthy()
      expect(screen.getByTestId('skill-card-task-scheduler')).toBeTruthy()
      expect(screen.queryByTestId('skill-card-code-review')).toBeNull()
    })

    // Step 3: 清空搜索框 → 恢复全部
    await user.clear(searchInput)

    await waitFor(() => {
      expect(screen.getByTestId('skill-card-task-manager')).toBeTruthy()
      expect(screen.getByTestId('skill-card-code-review')).toBeTruthy()
      expect(screen.getByTestId('skill-card-task-scheduler')).toBeTruthy()
    })

    // Step 4: 输入不存在的名称 → "No skills found"
    await user.type(searchInput, 'xyz-not-exist')

    await waitFor(() => {
      expect(screen.queryByTestId('skill-card-task-manager')).toBeNull()
      expect(screen.queryByTestId('skill-card-code-review')).toBeNull()
      expect(screen.queryByTestId('skill-card-task-scheduler')).toBeNull()
    })

    await expectElementAsync(screen, 'skills-empty-state', { text: 'No skills found' })
  })
})
