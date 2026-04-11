// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

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

describe('T-D8 目录选择器 - 唤起文件管理器并回填路径', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    listSourceFoldersMock.mockResolvedValue({ success: true, data: [] })
  })

  /**
   * T-D8 完整流程:
   * Step 1: 进入 Develop 页面, Batch Link 卡片可见
   * Step 2: 输入框为空, placeholder 正 "/path/to/skills/directory"
   * Step 3: 点击 Choose Directory → pickDirectory 被调用
   * Step 4+5: 选择路径后确认 → 目录选择器关闭 → 输入框回填
   * Step 6: 再次点击取消 → 输入框值不变
   */
  it('完整流程: 选择目录 → 回填路径 → 取消保持', async () => {
    // Step 1: 渲染页面, Batch Link 卡片可见
    pickDirectoryMock.mockResolvedValue('/Users/demo/my-skills')
    const { default: DevelopPage } = await import('../../../web/src/pages/Develop')
    render(React.createElement(DevelopPage))

    // 等待 Batch Link 文本出现，确认页面渲染完成
    await expectElementAsync(screen, 'develop-page', { text: 'Batch Link Skills' })

    // Step 2: 输入框为空, placeholder 正 "/path/to/skills/directory"
    const input = screen.getByPlaceholderText('/path/to/skills/directory') as HTMLInputElement
    expect(input.value).toBe('')

    // Step 3: 点击 Choose Directory, pickDirectory 被调用
    const chooseButton = screen.getByRole('button', { name: /choose directory/i })
    await user.click(chooseButton)
    expect(pickDirectoryMock).toHaveBeenCalledTimes(1)

    // Step 4: pickDirectory 被调用（目录选择器关闭）
    expect(pickDirectoryMock).toHaveBeenCalledWith()

    // Step 5: 输入框回填为选中路径
    await waitFor(() => {
      expect(input.value).toBe('/Users/demo/my-skills')
    })

    // Step 6: 再次点击取消 (pickDirectory 返回 null), 输入框值不变
    pickDirectoryMock.mockResolvedValue(null)
    await user.click(chooseButton)
    expect(pickDirectoryMock).toHaveBeenCalledTimes(2)
    // 输入框值不变
    expect(input.value).toBe('/Users/demo/my-skills')
  })
})
