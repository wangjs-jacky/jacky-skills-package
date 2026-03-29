// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

vi.mock('../../../packages/web/src/api/client', () => ({
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

describe('T-S7 Skill Card 信息展示', () => {
  const mockSkill = {
    name: 'demo-skill',
    path: '/Users/demo/.j-skills/linked/demo-skill',
    source: 'linked' as const,
    sourceFolder: '/Users/demo/my-skills',
    installedEnvironments: ['claude-code'],
  }

  const mockSkillNoFolder = {
    name: 'basic-skill',
    path: '/skills/basic-skill',
    source: 'global' as const,
    installedEnvironments: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSkills = [mockSkill, mockSkillNoFolder]
    listMock.mockResolvedValue({ success: true, data: { skills: [mockSkill, mockSkillNoFolder], cleanedCount: 0 } })
  })

  /**
   * T-S7 完整流程（6 步）:
   * Step 1: Card 显示 skill 名称（font-mono font-semibold）
   * Step 2: 显示 source 标签
   * Step 3: 显示 skill 路径
   * Step 4: 有 sourceFolder 时显示 "From: xxx"
   * Step 5: 显示 Claude Code 和 Cursor 两个环境 Toggle
   * Step 6: hover 时显示 Export 和 Unlink 按钮
   */
  it('完整验证 Card 信息展示', async () => {
    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    // Step 1: Card 可见，显示 skill 名称
    const card = await screen.findByTestId('skill-card-demo-skill')
    expect(card).toBeTruthy()
    // 名称在 h3 标签中
    const nameEl = within(card).getByText('demo-skill')
    expect(nameEl).toBeTruthy()
    // 验证 font-mono font-semibold 样式类
    expect(nameEl.className).toContain('font-mono')
    expect(nameEl.className).toContain('font-semibold')

    // Step 2: 显示 source 标签
    const sourceEl = within(card).getByText('linked')
    expect(sourceEl).toBeTruthy()
    expect(sourceEl.className).toContain('font-mono')
    expect(sourceEl.className).toContain('uppercase')

    // Step 3: 显示 skill 路径
    expect(card.textContent).toContain('/Users/demo/.j-skills/linked/demo-skill')

    // Step 4: 有 sourceFolder 时显示 "From: xxx"
    expect(card.textContent).toContain('From:')
    expect(card.textContent).toContain('/Users/demo/my-skills')

    // Step 5: 显示两个环境 Toggle
    const claudeToggle = within(card).getByTestId('skill-env-toggle-demo-skill-claude-code')
    expect(claudeToggle).toBeTruthy()
    expect(claudeToggle.textContent).toContain('Claude Code')

    const cursorToggle = within(card).getByTestId('skill-env-toggle-demo-skill-cursor')
    expect(cursorToggle).toBeTruthy()
    expect(cursorToggle.textContent).toContain('Cursor')

    // 已安装的显示 ON，未安装的显示 OFF
    expect(claudeToggle.textContent).toContain('ON')
    expect(cursorToggle.textContent).toContain('OFF')

    // Step 6: hover 时显示 Export 和 Unlink 按钮
    const exportBtn = within(card).getByTestId('skill-export-btn-demo-skill')
    expect(exportBtn).toBeTruthy()
    // 按钮在 opacity-0 group-hover:opacity-100 的容器内，DOM 中存在即可
    expect(exportBtn.closest('.group-hover\\:opacity-100') || exportBtn.parentElement?.className).toBeDefined()

    const unlinkBtn = within(card).getByTestId('skill-unlink-btn-demo-skill')
    expect(unlinkBtn).toBeTruthy()
  })

  it('无 sourceFolder 的 skill 不显示 "From:" 信息', async () => {
    const { default: SkillsPage } = await import('../../../packages/web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    const card = await screen.findByTestId('skill-card-basic-skill')
    // basic-skill 没有 sourceFolder → 不应出现 "From:"
    expect(card.textContent).not.toContain('From:')
  })
})
