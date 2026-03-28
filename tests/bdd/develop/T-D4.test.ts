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

vi.mock('../../../packages/web/src/utils/directoryPicker', () => ({
  pickDirectory: pickDirectoryMock,
}))
vi.mock('../../../packages/web/src/stores', () => ({
  useStore: () => ({ showToast: showToastMock }),
}))
vi.mock('../../../packages/web/src/api/client', () => ({
  skillsApi: {
    listSourceFolders: listSourceFoldersMock,
    removeSourceFolder: removeSourceFolderMock,
    link: linkMock,
    getFileContent: getFileContentMock,
    get: getSkillMock,
  },
}))

describe('T-D4 点击路径回填输入框', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    pickDirectoryMock.mockResolvedValue(null)
  })

  it('点击文件夹路径 → 输入框回填', async () => {
    const folder = { path: '/skills/my-folder', addedAt: '2025-01-01', skillNames: ['s1'] }
    listSourceFoldersMock.mockResolvedValue({ success: true, data: [folder] })

    const { default: DevelopPage } = await import('../../../packages/web/src/pages/Develop')
    render(React.createElement(DevelopPage))

    // 等待文件夹路径出现
    await expectElementAsync(screen, 'develop-page', { text: '/skills/my-folder' })

    const input = screen.getByPlaceholderText('/path/to/skills/directory') as HTMLInputElement
    expect(input.value).toBe('')

    // 点击路径文本（源码中 p 标签 onClick={() => setSkillPath(folder.path)）
    const pathText = screen.getByText('/skills/my-folder')
    await user.click(pathText)

    expect(input.value).toBe('/skills/my-folder')
  })
})
