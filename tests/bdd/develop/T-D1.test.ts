// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

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

describe('T-D1 Batch Link - 输入路径并扫描子目录批量链接', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    pickDirectoryMock.mockResolvedValue(null)
    listSourceFoldersMock.mockResolvedValue({ success: true, data: [] })
  })

  /**
   * T-D1 完整流程（5 步）:
   * Step 1: 进入 Develop 页面, Batch Link 卡片可见
   * Step 2: 输入框为空, 点击 Link All → Toast "Please enter a path" error
   * Step 3: 输入路径并点击 Link All → API 成功, Toast success, 输入框清空
   * Step 4: API 返回 success:false → 不 toast（源码无此分支）
   * Step 5: API 抛异常 → Toast "Failed to link skills" error
   */
  it('完整流程: 空路径校验 → 链接成功 → 链接失败', async () => {
    // Step 1: 渲染页面, develop-page 容器存在
    const { default: DevelopPage } = await import('../../../packages/web/src/pages/Develop')
    render(React.createElement(DevelopPage))

    const pageEl = await screen.findByTestId('develop-page')

    // 在 develop-page 子树内确认 Batch Link 卡片存在（传入 HTMLElement）
    expectElement(pageEl, 'develop-batch-link-card')

    // Step 2: 在 batch-link-card 内, 输入框为空, 点击 Link All → Toast error
    const batchLinkCard = within(pageEl).getByTestId('develop-batch-link-card')
    const cardScope = within(batchLinkCard)
    const input = cardScope.getByPlaceholderText('/path/to/skills/directory') as HTMLInputElement
    expect(input.value).toBe('')

    const linkAllBtn = cardScope.getByTestId('develop-link-all-btn')
    await user.click(linkAllBtn)

    expect(showToastMock).toHaveBeenCalledWith('Please enter a path', 'error')
    expect(linkMock).not.toHaveBeenCalled()

    // Step 3: 在 batch-link-card 内输入路径, 点击 Link All → 成功
    await user.type(input, '/Users/demo/my-skills')
    linkMock.mockResolvedValue({
      success: true,
      data: { linked: ['skill-a', 'skill-b', 'skill-c'], count: 3 },
    })
    await user.click(linkAllBtn)

    expect(linkMock).toHaveBeenCalledWith('/Users/demo/my-skills')
    expect(showToastMock).toHaveBeenCalledWith(
      'Linked 3 skills: skill-a, skill-b, skill-c',
      'success',
    )

    // 输入框清空
    await waitFor(() => {
      expect(input.value).toBe('')
    })

    // Step 5: API 抛异常 → Toast error
    await user.type(input, '/error/path')
    linkMock.mockRejectedValue(new Error('Network error'))
    await user.click(linkAllBtn)

    expect(showToastMock).toHaveBeenCalledWith('Failed to link skills', 'error')
  })
})
