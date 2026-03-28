// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

// --- Store mock ---
// 使用 let 变量控制动态状态，每次 useStore() 调用返回当时的值
let mockSkills: any[] = []
let mockIsLoading = false
const showToastMock = vi.fn()
const setSkillsMock = vi.fn()
const setIsLoadingMock = vi.fn()
const updateSkillEnvironmentsMock = vi.fn()

vi.mock('../../../packages/web/src/stores', () => ({
  useStore: () => ({
    get skills() { return mockSkills },
    setSkills: setSkillsMock,
    get isLoading() { return mockIsLoading },
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
}))

const mockSkillData = [
  {
    name: 'skill-a',
    path: '/skills/skill-a',
    source: 'linked' as const,
    installedEnvironments: ['claude-code'],
  },
  {
    name: 'skill-b',
    path: '/skills/skill-b',
    source: 'global' as const,
    installedEnvironments: [],
  },
  {
    name: 'skill-c',
    path: '/skills/skill-c',
    source: 'marketplace' as const,
    installedEnvironments: ['claude-code', 'cursor'],
  },
]

describe('T-S1 列表加载与统计', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSkills = []
    mockIsLoading = false
  })

  /**
   * Step 1: isLoading=true 时显示加载状态
   * 由于 mock store 的 isLoading 是 getter，组件渲染时会读取到 mockIsLoading
   * 但 SkillsPage 的 loadSkills 在 useEffect 中执行 setSkills → setIsLoading(true)
   * 由于 setIsLoading 只是一个 vi.fn() 不会真正修改 mockIsLoading，
   * 我们需要通过手动设置 mockIsLoading + mockSkills 来模拟 loading 完成后的状态
   */
  it('Step 1: 渲染时调用 setIsLoading(true) 和 list API', async () => {
    listMock.mockResolvedValue({ success: true, data: [] })

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // 组件 mount 后应调用 setIsLoading(true)
    expect(setIsLoadingMock).toHaveBeenCalledWith(true)
    // 然后调用 list API
    expect(listMock).toHaveBeenCalled()
  })

  it('Step 2: API 返回空列表 → Stats Bar 显示 "0 skills linked" 和空状态', async () => {
    listMock.mockResolvedValue({ success: true, data: [] })
    mockSkills = []

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // isLoading 为 false，直接渲染主页面
    await expectElementAsync(screen, 'skills-stats-total', { text: '0 skills linked' })
    await expectElementAsync(screen, 'skills-stats-installed', { text: '0 installed' })
    await expectElementAsync(screen, 'skills-empty-state', { text: 'No skills found' })
  })

  it('Step 3: API 返回 3 个 skill → Stats Bar 显示 "3 skills linked" + "2 installed"，列表显示 3 张卡片', async () => {
    // 预设置 skills 数据，组件渲染时直接使用
    mockSkills = mockSkillData
    listMock.mockResolvedValue({ success: true, data: mockSkillData })

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // Stats Bar
    await expectElementAsync(screen, 'skills-stats-total', { text: '3 skills linked' })
    await expectElementAsync(screen, 'skills-stats-installed', { text: '2 installed' })

    // 3 张 skill card
    expect(screen.getByTestId('skill-card-skill-a')).toBeTruthy()
    expect(screen.getByTestId('skill-card-skill-b')).toBeTruthy()
    expect(screen.getByTestId('skill-card-skill-c')).toBeTruthy()
  })

  it('Step 4: API 失败 → Toast "Failed to load skills"', async () => {
    listMock.mockRejectedValue(new Error('Network error'))
    mockSkills = []

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('Failed to load skills', 'error')
    })
  })
})
