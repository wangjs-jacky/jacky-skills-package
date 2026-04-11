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

describe('T-D3 删除源文件夹', () => {
  const user = userEvent.setup()
  const folder = { path: '/skills/to-delete', addedAt: '2025-01-01', skillNames: ['s1'] }

  beforeEach(() => {
    vi.clearAllMocks()
    pickDirectoryMock.mockResolvedValue(null)
    // mount 时返回 1 个文件夹
    listSourceFoldersMock.mockResolvedValueOnce({ success: true, data: [folder] })
    // 删除后 loadSourceFolders 刷新时返回空
    listSourceFoldersMock.mockResolvedValueOnce({ success: true, data: [] })
    removeSourceFolderMock.mockResolvedValue({ success: true })
  })

  it('删除文件夹 → toast 成功 → 列表变为空状态', async () => {
    const { default: DevelopPage } = await import('../../../web/src/pages/Develop')
    render(React.createElement(DevelopPage))

    // 等待文件夹路径出现
    await expectElementAsync(screen, 'develop-page', { text: '/skills/to-delete' })

    // 点击删除按钮
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    await user.click(removeBtn)

    expect(removeSourceFolderMock).toHaveBeenCalledWith('/skills/to-delete')
    expect(showToastMock).toHaveBeenCalledWith('Folder removed', 'success')

    // 删除后列表刷新为空
    await expectElementAsync(screen, 'develop-page', { text: 'No source folders yet' })
  })
})
