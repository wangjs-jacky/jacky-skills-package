// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

/**
 * T-D6: Preview 加载 SKILL.md
 *
 * 注意：源码中 skill 名称标签（Source Folders 的 skillNames span）目前没有 onClick 事件，
 * loadSkillContent 函数虽然存在但未绑定到任何可点击元素。
 * 此 case 标记为 skip，待源码实现 D6 功能后再启用。
 */
describe.skip('T-D6 Preview 加载 SKILL.md（源码未实现 onClick）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pickDirectoryMock.mockResolvedValue(null)
    listSourceFoldersMock.mockResolvedValue({
      success: true,
      data: [{ path: '/skills/demo', addedAt: '2025-01-01', skillNames: ['task-memory'] }],
    })
    getFileContentMock.mockResolvedValue({
      success: true,
      data: { content: '# Task Memory\nA skill for task management.' },
    })
  })

  it('点击 skill 名称标签 → Preview 显示 SKILL.md 内容', async () => {
    const { default: DevelopPage } = await import('../../../packages/web/src/pages/Develop')
    render(React.createElement(DevelopPage))

    await expectElementAsync(screen, 'develop-page', { text: 'task-memory' })

    const { default: userEventLib } = await import('@testing-library/user-event')
    const user = userEventLib.setup()
    await user.click(screen.getByText('task-memory'))

    expect(getFileContentMock).toHaveBeenCalledWith('task-memory', 'SKILL.md')

    await expectElementAsync(screen, 'develop-page', { text: 'task-memory/SKILL.md' })
  })
})
