// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

const pickDirectoryMock = vi.fn()
const listSourceFoldersMock = vi.fn()
const showToastMock = vi.fn()
const removeSourceFolderMock = vi.fn()
const linkMock = vi.fn()

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
  },
}))

describe('T-D5 Develop 页面无 Preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pickDirectoryMock.mockResolvedValue(null)
    listSourceFoldersMock.mockResolvedValue({ success: true, data: [] })
  })

  it('页面不包含 Preview 区域和 Select a skill to preview 文案', async () => {
    const { default: DevelopPage } = await import('../../../web/src/pages/Develop')
    render(React.createElement(DevelopPage))

    // 确认页面渲染
    await expectElementAsync(screen, 'develop-page')

    // Preview 区域已删除，不应出现相关文案
    expect(screen.queryByText('Select a skill to preview')).toBeNull()
    expect(screen.queryByText('Content will appear here')).toBeNull()
    expect(screen.queryByText('Preview')).toBeNull()
  })
})
