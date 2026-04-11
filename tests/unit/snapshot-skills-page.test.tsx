// @vitest-environment jsdom

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

const listMock = vi.fn()

vi.mock('../../web/src/api/client', () => ({
  skillsApi: {
    list: listMock,
  },
  environmentsApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
  configApi: {
    get: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}))

vi.mock('../../web/src/stores', () => ({
  useStore: () => ({
    skills: [],
    setSkills: vi.fn(),
    isLoading: false,
    setIsLoading: vi.fn(),
    showToast: vi.fn(),
    updateSkillEnvironments: vi.fn(),
    config: {},
    setConfig: vi.fn(),
  }),
}))

describe('Skills 页面 DOM 快照', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMock.mockResolvedValue({ success: true, data: [] })
  })

  it('默认状态匹配快照', async () => {
    const { default: SkillsPage } = await import('../../web/src/pages/Skills')
    const { container } = render(React.createElement(SkillsPage))

    // 等待 useEffect 中的异步加载完成
    await vi.waitFor(() => {
      expect(listMock).toHaveBeenCalled()
    })

    expect(container).toMatchSnapshot()
  })

  it('空状态下存在 j-skills link 提示', async () => {
    const { default: SkillsPage } = await import('../../web/src/pages/Skills')
    render(React.createElement(SkillsPage))

    await vi.waitFor(() => {
      expect(listMock).toHaveBeenCalled()
    })

    // 验证空状态区域包含 j-skills link 文本
    const codeElement = screen.getByText('j-skills link')
    expect(codeElement).toBeTruthy()
    expect(codeElement.tagName).toBe('CODE')
  })
})
