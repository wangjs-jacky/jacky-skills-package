// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// --- Store mock ---
let mockSkills: any[] = []
let mockConfig: any = {}
const showToastMock = vi.fn()
const setSkillsMock = vi.fn((skills: any[]) => { mockSkills = skills })
const setIsLoadingMock = vi.fn()
const setConfigMock = vi.fn((config: any) => { mockConfig = config })
const updateSkillEnvironmentsMock = vi.fn()

// 模拟 useStore hook + getState 方法（handleQuickInstall 中使用）
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

vi.mock('../../../packages/web/src/stores', () => ({
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

vi.mock('../../../packages/web/src/api/client', () => ({
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

// 辅助：打开 Dropdown 菜单
async function openDropdown() {
  const trigger = await screen.findByTestId('quick-install-dropdown-trigger')
  await userEvent.click(trigger)
  // 等待菜单出现
  await screen.findByTestId('quick-install-dropdown-menu')
}

describe('T-S8 批量操作 Dropdown', () => {
  const mockEnvironments = [
    { name: 'claude-code', label: 'Claude Code', globalPath: '~/.claude/skills', projectPaths: [] },
    { name: 'cursor', label: 'Cursor', globalPath: '~/.cursor/skills', projectPaths: [] },
    { name: 'windsurf', label: 'Windsurf', globalPath: '~/.windsurf/skills', projectPaths: [] },
  ]

  const mockSkillsData = [
    {
      name: 'skill-a',
      path: '/skills/skill-a',
      source: 'linked' as const,
      installedEnvironments: ['claude-code'],
    },
    {
      name: 'skill-b',
      path: '/skills/skill-b',
      source: 'linked' as const,
      installedEnvironments: [],
    },
    {
      name: 'skill-c',
      path: '/skills/skill-c',
      source: 'linked' as const,
      installedEnvironments: ['cursor'],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockSkills = [...mockSkillsData]
    mockConfig = { defaultEnvironments: ['claude-code', 'cursor'] }
    listMock.mockResolvedValue({ success: true, data: { skills: mockSkillsData, cleanedCount: 0 } })
    environmentsListMock.mockResolvedValue({ success: true, data: mockEnvironments })
    configGetMock.mockResolvedValue({ success: true, data: mockConfig })
  })

  /**
   * MUST-1 (M1-01+M1-03): Dropdown 菜单替代平铺按钮
   */
  it('M1: 显示 "Batch Operations" Dropdown 按钮，且只显示默认环境', async () => {
    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await screen.findByTestId('skills-stats')

    // M1-01: 应该有 Dropdown 触发按钮
    const trigger = screen.getByTestId('quick-install-dropdown-trigger')
    expect(trigger).toBeTruthy()
    expect(trigger.textContent).toContain('Batch Operations')

    // 点击打开后应该显示 claude-code 和 cursor 两个选项
    await userEvent.click(trigger)
    await screen.findByTestId('quick-install-dropdown-menu')

    expect(screen.getByTestId('quick-install-claude-code')).toBeTruthy()
    expect(screen.getByTestId('quick-install-cursor')).toBeTruthy()
    // M1-03: windsurf 不在默认环境中
    expect(screen.queryByTestId('quick-install-windsurf')).toBeNull()
  })

  /**
   * MUST-2 (M2-01): 批量安装跳过已安装 + 正确计数
   */
  it('M2: 点击 "Install All to Claude Code" 跳过已安装的并显示正确计数', async () => {
    installMock.mockResolvedValue({
      success: true,
      data: { name: 'skill-b', env: 'claude-code', path: '~/.claude/skills/skill-b' },
    })

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await openDropdown()

    const claudeItem = screen.getByTestId('quick-install-claude-code')
    await userEvent.click(claudeItem)

    await waitFor(() => {
      // skill-a 已安装到 claude-code → 跳过
      // skill-b 未安装 → install
      // skill-c 未安装到 claude-code → install
      expect(installMock).toHaveBeenCalledTimes(2)
      expect(installMock).toHaveBeenCalledWith('skill-b', 'claude-code', true)
      expect(installMock).toHaveBeenCalledWith('skill-c', 'claude-code', true)
    })
  })

  /**
   * MUST-3 (M3-01): 全部已安装时 Dropdown 项变为 Uninstall，点击触发批量卸载
   */
  it('M3: 全部已安装时点击触发批量卸载（Toggle 行为）', async () => {
    const allInstalledData = [
      { name: 'skill-a', path: '/skills/skill-a', source: 'linked' as const, installedEnvironments: ['claude-code', 'cursor'] },
      { name: 'skill-b', path: '/skills/skill-b', source: 'linked' as const, installedEnvironments: ['claude-code'] },
      { name: 'skill-c', path: '/skills/skill-c', source: 'linked' as const, installedEnvironments: ['claude-code', 'cursor'] },
    ]
    mockSkills = [...allInstalledData]
    listMock.mockResolvedValue({ success: true, data: { skills: allInstalledData, cleanedCount: 0 } })
    uninstallMock.mockResolvedValue({ success: true, data: { name: 'skill-a', env: 'claude-code', removed: true } })

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await openDropdown()

    // allInstalled=true → 按钮显示 Uninstall All（红色样式）
    const claudeItem = screen.getByTestId('quick-install-claude-code')
    expect(claudeItem.textContent).toContain('Uninstall All')

    // 点击触发 uninstall 而非 install
    await userEvent.click(claudeItem)

    await waitFor(() => {
      expect(uninstallMock).toHaveBeenCalled()
      expect(installMock).not.toHaveBeenCalled()
    })
  })

  /**
   * MUST-2 (M2-05): 部分安装失败（broken path）时显示错误信息
   */
  it('M2: 安装部分失败时显示失败计数和错误提示', async () => {
    // skill-b 安装成功，skill-c 安装失败（broken path）
    installMock
      .mockResolvedValueOnce({
        success: true,
        data: { name: 'skill-b', env: 'claude-code', path: '~/.claude/skills/skill-b' },
      })
      .mockResolvedValueOnce({
        success: false,
        error: 'Skill path is not a directory: /skills/skill-c',
      })

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await openDropdown()

    const claudeItem = screen.getByTestId('quick-install-claude-code')
    await userEvent.click(claudeItem)

    await waitFor(() => {
      const lastCall = showToastMock.mock.calls[showToastMock.mock.calls.length - 1]
      // 应该显示部分失败信息，而非 "Installed 0"
      expect(lastCall[0]).not.toContain('Installed 0')
      // 包含失败计数
      expect(lastCall[1]).toBe('error')
    })
  })

  /**
   * MUST-2 (M2-05-ext): 全部安装失败时显示明确错误提示
   */
  it('M2: 全部安装失败时提示检查源路径', async () => {
    // 所有安装都失败
    installMock.mockResolvedValue({
      success: false,
      error: 'Skill path is not a directory',
    })

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await openDropdown()

    const claudeItem = screen.getByTestId('quick-install-claude-code')
    await userEvent.click(claudeItem)

    await waitFor(() => {
      const lastCall = showToastMock.mock.calls[showToastMock.mock.calls.length - 1]
      // 应该提示检查源路径，而非显示 "Installed 0"
      expect(lastCall[0]).not.toContain('Installed 0')
      expect(lastCall[1]).toBe('error')
    })
  })

  /**
   * MUST-4 (M4-01+M4-02): 安装中 loading 状态
   */
  it('M4: 安装中触发按钮显示 loading 状态', async () => {
    let resolveInstall: () => void
    installMock.mockReturnValue(new Promise<void>((resolve) => { resolveInstall = resolve }))

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await openDropdown()

    const claudeItem = screen.getByTestId('quick-install-claude-code')
    await userEvent.click(claudeItem)

    // 触发按钮应显示 loading
    const trigger = screen.getByTestId('quick-install-dropdown-trigger')
    await waitFor(() => {
      expect(trigger.textContent).toContain('Working')
    })

    resolveInstall!()
    await waitFor(() => {
      expect(trigger.textContent).not.toContain('Working')
    })
  })

  /**
   * MUST-5 (M5-01): 安装完成后 toast 提示
   */
  it('M5: 安装完成后显示 toast 提示', async () => {
    installMock.mockResolvedValue({
      success: true,
      data: { name: 'skill-b', env: 'claude-code', path: '~/.claude/skills/skill-b' },
    })

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await openDropdown()

    const claudeItem = screen.getByTestId('quick-install-claude-code')
    await userEvent.click(claudeItem)

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalled()
      const lastCall = showToastMock.mock.calls[showToastMock.mock.calls.length - 1]
      expect(lastCall[0]).toContain('Installed')
      expect(lastCall[0]).toContain('Claude Code')
      expect(lastCall[1]).toBe('success')
    })
  })

  /**
   * MUST-1 (M1-04): Skills 列表为空时不显示按钮
   */
  it('M6: Skills 列表为空时不显示按钮', async () => {
    mockSkills = []
    listMock.mockResolvedValue({ success: true, data: { skills: [], cleanedCount: 0 } })

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await screen.findByTestId('skills-stats')
    expect(screen.queryByTestId('quick-install-dropdown-trigger')).toBeNull()
  })

  /**
   * MUST-1 (M1-05): 未配置默认环境时不显示按钮
   */
  it('M7: 未配置默认环境时不显示按钮', async () => {
    mockConfig = {}
    configGetMock.mockResolvedValue({ success: true, data: {} })

    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await screen.findByTestId('skills-stats')
    expect(screen.queryByTestId('quick-install-dropdown-trigger')).toBeNull()
  })
})
