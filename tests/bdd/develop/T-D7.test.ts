// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

// Mock 声明
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

describe('T-D7 Link 结果明细 - 成功链接后显示链接的 skill 名称列表', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    pickDirectoryMock.mockResolvedValue(null)
    // 初始 Source Folders 为空
    listSourceFoldersMock.mockResolvedValue({ success: true, data: [] })
  })

  /**
   * Step 1: 进入 Develop 页面, Batch Link Skills 卡片可见, 输入框为空
   * Step 2: 输入路径并点击 Link All → Toast 显示复数形式 "Linked 3 skills: skill-a, skill-b, skill-c"
   * Step 4: 链接成功后输入框清空
   * Step 5: 链接成功后 Source Folders 自动刷新
   */
  it('链接多个 skills → Toast 复数形式 + 输入框清空 + Source Folders 刷新', async () => {
    // link 返回 3 个 skill（复数场景）
    linkMock.mockResolvedValue({
      success: true,
      data: {
        linked: ['skill-a', 'skill-b', 'skill-c'],
        count: 3,
      },
    })
    // 刷新时返回新文件夹
    listSourceFoldersMock
      .mockResolvedValueOnce({ success: true, data: [] }) // 初始加载
      .mockResolvedValueOnce({
        // link 成功后 loadSourceFolders 刷新
        success: true,
        data: [
          {
            path: '/Users/demo/my-skills',
            addedAt: '2025-01-01',
            skillNames: ['skill-a', 'skill-b', 'skill-c'],
          },
        ],
      })

    const { default: DevelopPage } = await import(
      '../../../packages/web/src/pages/Develop'
    )
    render(React.createElement(DevelopPage))

    // Step 1: Batch Link Skills 卡片可见, 输入框为空
    await expectElementAsync(screen, 'develop-page', {
      text: 'Batch Link Skills',
    })
    const input = screen.getByPlaceholderText(
      '/path/to/skills/directory'
    ) as HTMLInputElement
    expect(input.value).toBe('')

    // Step 2: 输入路径并点击 Link All
    await user.type(input, '/Users/demo/my-skills')
    expect(input.value).toBe('/Users/demo/my-skills')

    const linkAllBtn = screen.getByRole('button', { name: /link all/i })
    await user.click(linkAllBtn)

    // 验证 link API 被调用
    expect(linkMock).toHaveBeenCalledWith('/Users/demo/my-skills')

    // Toast 复数形式 "Linked 3 skills: skill-a, skill-b, skill-c"
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Linked 3 skills: skill-a, skill-b, skill-c',
        'success'
      )
    })

    // Step 4: 链接成功后输入框清空
    await waitFor(() => {
      expect(input.value).toBe('')
    })

    // Step 5: Source Folders 自动刷新 — loadSourceFolders 被调用两次（初始 + link 后）
    expect(listSourceFoldersMock).toHaveBeenCalledTimes(2)
    // 新链接的文件夹出现在 Source Folders 列表中
    await expectElementAsync(screen, 'develop-page', {
      text: '/Users/demo/my-skills',
    })
    await expectElementAsync(screen, 'develop-page', {
      text: 'skill-a',
    })
  })

  /**
   * Step 3: 链接 1 个 skill → Toast 单数形式 "Linked 1 skill: xxx"（无 s）
   */
  it('链接单个 skill → Toast 单数形式', async () => {
    linkMock.mockResolvedValue({
      success: true,
      data: {
        linked: ['my-awesome-skill'],
        count: 1,
      },
    })
    listSourceFoldersMock
      .mockResolvedValueOnce({ success: true, data: [] }) // 初始加载
      .mockResolvedValueOnce({
        // 刷新
        success: true,
        data: [
          {
            path: '/Users/demo/solo',
            addedAt: '2025-01-01',
            skillNames: ['my-awesome-skill'],
          },
        ],
      })

    const { default: DevelopPage } = await import(
      '../../../packages/web/src/pages/Develop'
    )
    render(React.createElement(DevelopPage))

    await expectElementAsync(screen, 'develop-batch-link-card')

    const input = screen.getByPlaceholderText(
      '/path/to/skills/directory'
    ) as HTMLInputElement
    await user.type(input, '/Users/demo/solo')

    const linkAllBtn = screen.getByRole('button', { name: /link all/i })
    await user.click(linkAllBtn)

    // Toast 单数形式 "Linked 1 skill: my-awesome-skill"（无 s）
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Linked 1 skill: my-awesome-skill',
        'success'
      )
    })

    // 输入框清空
    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })
})
