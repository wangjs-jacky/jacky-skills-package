// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

const showToastMock = vi.fn()
const setConfigMock = vi.fn()
const configMock = { defaultEnvironments: ['claude-code', 'cursor'], installMethod: 'copy' }

vi.mock('../../../web/src/stores', () => ({
  useStore: () => ({
    showToast: showToastMock,
    config: configMock,
    setConfig: setConfigMock,
  }),
}))

const configGetMock = vi.fn()
const configUpdateMock = vi.fn()
const envListMock = vi.fn()

vi.mock('../../../web/src/api/client', () => ({
  configApi: {
    get: configGetMock,
    update: configUpdateMock,
  },
  environmentsApi: {
    list: envListMock,
  },
}))

const mockEnvironments = [
  { name: 'claude-code', label: 'Claude Code' },
  { name: 'cursor', label: 'Cursor' },
]

describe('T-ST2 默认环境多选', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    configGetMock.mockResolvedValue({
      success: true,
      data: {
        defaultEnvironments: ['claude-code', 'cursor'],
        installMethod: 'copy',
      },
    })
    envListMock.mockResolvedValue({ success: true, data: mockEnvironments })
  })

  /**
   * T-ST2 完整流程（3 步）:
   * Step 1: Claude Code 和 Cursor 均已选中 → 两个按钮高亮+勾号
   * Step 2: 点击 Claude Code → 取消选中
   * Step 3: 再次点击 Claude Code → 重新选中
   */
  it('完整流程: 双选中 → 取消 Claude Code → 重新选中 Claude Code', async () => {
    const { default: SettingsPage } = await import(
      '../../../web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage))

    // 等待页面加载完成
    await screen.findByTestId('settings-page')

    // Step 1: 两个环境都已选中 → 各自有 Check 图标
    const claudeBtn = await screen.findByTestId('settings-env-toggle-claude-code')
    const cursorBtn = await screen.findByTestId('settings-env-toggle-cursor')

    // claude-code 选中：有 Check 圆形图标
    let claudeCheck = claudeBtn.querySelector('.rounded-full.bg-\\[var\\(--color-primary\\)\\]')
    expect(claudeCheck).toBeTruthy()

    // cursor 选中：有 Check 圆形图标
    let cursorCheck = cursorBtn.querySelector('.rounded-full.bg-\\[var\\(--color-primary\\)\\]')
    expect(cursorCheck).toBeTruthy()

    // Step 2: 点击 Claude Code → 取消选中
    await user.click(claudeBtn)

    // claude-code 取消选中后 Check 图标消失
    await waitFor(() => {
      const claudeBtnUpdated = screen.getByTestId('settings-env-toggle-claude-code')
      const checkAfterClick = claudeBtnUpdated.querySelector(
        '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
      )
      expect(checkAfterClick).toBeFalsy()
    })

    // cursor 仍然选中
    const cursorBtnAfter = screen.getByTestId('settings-env-toggle-cursor')
    const cursorCheckAfter = cursorBtnAfter.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(cursorCheckAfter).toBeTruthy()

    // Step 3: 再次点击 Claude Code → 重新选中
    const claudeBtnAgain = screen.getByTestId('settings-env-toggle-claude-code')
    await user.click(claudeBtnAgain)

    // claude-code 重新选中 → Check 图标重新出现
    await waitFor(() => {
      const claudeBtnFinal = screen.getByTestId('settings-env-toggle-claude-code')
      const checkFinal = claudeBtnFinal.querySelector(
        '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
      )
      expect(checkFinal).toBeTruthy()
    })
  })
})
