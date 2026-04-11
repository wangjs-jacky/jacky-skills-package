// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

// --- Store mock ---
// 使用 let 变量控制动态 skills 数据
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

const mockEnvironments = [
  { name: 'claude-code', label: 'Claude Code', globalPath: '/home/.claude' },
  { name: 'cursor', label: 'Cursor', globalPath: '/home/.cursor' },
]

vi.mock('../../../web/src/api/client', () => ({
  skillsApi: {
    list: listMock,
    unlink: unlinkMock,
    install: installMock,
    uninstall: uninstallMock,
    export: exportMock,
  },
  environmentsApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: mockEnvironments }),
  },
  configApi: {
    get: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}))

describe('T-S3 环境开关安装/卸载', () => {
  const user = userEvent.setup()

  const skillWithClaudeCode = {
    name: 'my-skill',
    path: '/skills/my-skill',
    source: 'linked' as const,
    installedEnvironments: ['claude-code'],
  }

  const skillWithNoEnv = {
    name: 'plain-skill',
    path: '/skills/plain-skill',
    source: 'global' as const,
    installedEnvironments: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSkills = [skillWithClaudeCode, skillWithNoEnv]
    listMock.mockResolvedValue({ success: true, data: { skills: mockSkills, cleanedCount: 0 }})
  })

  /**
   * T-S3 完整流程（4 步）:
   * Step 1: 已安装环境 → Card 显示 "ON" badge
   * Step 2: 点击已安装环境 Toggle → uninstall → updateSkillEnvironments → Toast
   * Step 3: 点击未安装环境 Toggle → install → updateSkillEnvironments → Toast
   * Step 4: API 失败 → Toast "Failed to install to/remove from xxx"
   */
  it('完整流程: ON badge → 卸载 → 安装 → API 失败', async () => {
    const { default: SkillsPage } = await import('../../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // Step 1: my-skill 的 claude-code 已安装 → 显示 "ON" badge
    const claudeToggle = await screen.findByTestId('skill-env-toggle-my-skill-claude-code')
    expect(claudeToggle.textContent).toContain('ON')

    // my-skill 的 cursor 未安装 → 显示 "OFF" badge
    const cursorToggle = screen.getByTestId('skill-env-toggle-my-skill-cursor')
    expect(cursorToggle.textContent).toContain('OFF')

    // plain-skill 的两个环境都未安装
    const plainClaudeToggle = screen.getByTestId('skill-env-toggle-plain-skill-claude-code')
    expect(plainClaudeToggle.textContent).toContain('OFF')

    // Step 2: 点击 my-skill 的 claude-code Toggle（已安装 → 卸载）
    uninstallMock.mockResolvedValue({ success: true, data: { name: 'my-skill', env: 'claude-code', removed: true } })
    await user.click(claudeToggle)

    expect(uninstallMock).toHaveBeenCalledWith('my-skill', 'claude-code', true)
    expect(updateSkillEnvironmentsMock).toHaveBeenCalledWith('my-skill', [])
    expect(showToastMock).toHaveBeenCalledWith('Removed my-skill from claude-code', 'success')

    // Step 3: 点击 my-skill 的 cursor Toggle（未安装 → 安装）
    installMock.mockResolvedValue({ success: true, data: { name: 'my-skill', env: 'cursor', path: '/some/path' } })
    await user.click(cursorToggle)

    expect(installMock).toHaveBeenCalledWith('my-skill', 'cursor', true)
    expect(updateSkillEnvironmentsMock).toHaveBeenCalledWith('my-skill', ['claude-code', 'cursor'])
    expect(showToastMock).toHaveBeenCalledWith('Installed my-skill to cursor', 'success')
  })

  it('API 失败 → Toast 错误信息', async () => {
    mockSkills = [skillWithClaudeCode]
    listMock.mockResolvedValue({ success: true, data: { skills: [skillWithClaudeCode], cleanedCount: 0 } })

    const { default: SkillsPage } = await import('../../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // 卸载失败
    const claudeToggle = await screen.findByTestId('skill-env-toggle-my-skill-claude-code')
    uninstallMock.mockRejectedValue(new Error('Network error'))
    await user.click(claudeToggle)

    expect(showToastMock).toHaveBeenCalledWith('Failed to remove from claude-code', 'error')

    // 安装失败
    const cursorToggle = screen.getByTestId('skill-env-toggle-my-skill-cursor')
    installMock.mockRejectedValue(new Error('Network error'))
    await user.click(cursorToggle)

    expect(showToastMock).toHaveBeenCalledWith('Failed to install to cursor', 'error')
  })
})
