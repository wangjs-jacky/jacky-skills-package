// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('T-D5 Preview 空状态', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pickDirectoryMock.mockResolvedValue(null)
    listSourceFoldersMock.mockResolvedValue({ success: true, data: [] })
  })

  it('未选择 skill 时显示提示文案', async () => {
    const { default: DevelopPage } = await import('../../../packages/web/src/pages/Develop')
    render(React.createElement(DevelopPage))

    await expectElementAsync(screen, 'develop-page', { text: 'Select a skill to preview' })
    await expectElementAsync(screen, 'develop-page', { text: 'Content will appear here' })
  })
})
