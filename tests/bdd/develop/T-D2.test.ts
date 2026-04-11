// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElementAsync } from '@wangjs-jacky/tdd-kit'

const pickDirectoryMock = vi.fn()
const listSourceFoldersMock = vi.fn()
const showToastMock = vi.fn()
const removeSourceFolderMock = vi.fn()
const linkMock = vi.fn()
const getFileContentMock = vi.fn()
const getSkillMock = vi.fn()

vi.mock('../../../web/src/utils/directoryPicker', () => ({
  pickDirectory: pickDirectoryMock,
}))
vi.mock('../../../web/src/stores', () => ({
  useStore: () => ({ showToast: showToastMock }),
}))
vi.mock('../../../web/src/api/client', () => ({
  skillsApi: {
    listSourceFolders: listSourceFoldersMock,
    removeSourceFolder: removeSourceFolderMock,
    link: linkMock,
    getFileContent: getFileContentMock,
    get: getSkillMock,
  },
}))

describe('T-D2 Source Folders 列表展示', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    pickDirectoryMock.mockResolvedValue(null)
  })

  it('空状态 → 加载列表 → 刷新', async () => {
    // Step 1: 空状态
    listSourceFoldersMock.mockResolvedValue({ success: true, data: [] })
    const { default: DevelopPage } = await import('../../../web/src/pages/Develop')
    render(React.createElement(DevelopPage))

    await expectElementAsync(screen, 'develop-page', { text: 'No source folders yet' })

    // Step 2: 重新渲染带数据
    const folders = [
      { path: '/skills/a', addedAt: '2025-01-01', skillNames: ['skill-1'] },
      { path: '/skills/b', addedAt: '2025-02-01', skillNames: ['skill-2', 'skill-3'] },
    ]
    listSourceFoldersMock.mockResolvedValue({ success: true, data: folders })

    // 点击 Refresh 按钮
    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshBtn)

    await expectElementAsync(screen, 'develop-page', { text: '/skills/a' })
    await expectElementAsync(screen, 'develop-page', { text: '/skills/b' })
    expect(screen.getByText('skill-1')).toBeTruthy()
    expect(screen.getByText('skill-2')).toBeTruthy()

    // Step 3: 再次刷新确认 API 被调用
    await user.click(refreshBtn)
    expect(listSourceFoldersMock).toHaveBeenCalledTimes(3) // mount + 2次手动刷新
  })
})
