// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

const showToastMock = vi.fn()
const setConfigMock = vi.fn()
const configMock = { defaultEnvironments: ['claude-code'], installMethod: 'copy' }

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

describe('T-ST3 安装方式切换', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    configGetMock.mockResolvedValue({
      success: true,
      data: {
        defaultEnvironments: ['claude-code'],
        installMethod: 'copy',
      },
    })
    envListMock.mockResolvedValue({ success: true, data: mockEnvironments })
  })

  /**
   * T-ST3 完整流程（3 步）:
   * Step 1: 当前选中 copy → Copy 按钮高亮+勾号，Symlink 未高亮
   * Step 2: 点击 Symlink → Symlink 高亮+勾号，Copy 恢复
   * Step 3: 点击 Copy → Copy 高亮+勾号，Symlink 恢复
   */
  it('完整流程: copy 选中 → 切换到 symlink → 切换回 copy', async () => {
    const { default: SettingsPage } = await import(
      '../../../web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage))

    // 等待页面加载完成
    await screen.findByTestId('settings-page')

    // Step 1: copy 选中 → Check 图标在 Copy 按钮中
    const copyBtn = await screen.findByTestId('settings-install-method-copy')
    const symlinkBtn = await screen.findByTestId('settings-install-method-symlink')

    // Copy 有 Check
    let copyCheck = copyBtn.querySelector('.rounded-full.bg-\\[var\\(--color-primary\\)\\]')
    expect(copyCheck).toBeTruthy()

    // Symlink 无 Check
    let symlinkCheck = symlinkBtn.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(symlinkCheck).toBeFalsy()

    // Step 2: 点击 Symlink → Symlink 高亮，Copy 恢复
    await user.click(symlinkBtn)

    await waitFor(() => {
      const symlinkBtnUpdated = screen.getByTestId('settings-install-method-symlink')
      const symlinkCheckNow = symlinkBtnUpdated.querySelector(
        '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
      )
      expect(symlinkCheckNow).toBeTruthy()
    })

    // Copy 不再有 Check
    await waitFor(() => {
      const copyBtnUpdated = screen.getByTestId('settings-install-method-copy')
      const copyCheckNow = copyBtnUpdated.querySelector(
        '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
      )
      expect(copyCheckNow).toBeFalsy()
    })

    // Step 3: 点击 Copy → Copy 高亮，Symlink 恢复
    const copyBtnAgain = screen.getByTestId('settings-install-method-copy')
    await user.click(copyBtnAgain)

    await waitFor(() => {
      const copyBtnFinal = screen.getByTestId('settings-install-method-copy')
      const copyCheckFinal = copyBtnFinal.querySelector(
        '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
      )
      expect(copyCheckFinal).toBeTruthy()
    })

    // Symlink 不再有 Check
    await waitFor(() => {
      const symlinkBtnFinal = screen.getByTestId('settings-install-method-symlink')
      const symlinkCheckFinal = symlinkBtnFinal.querySelector(
        '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
      )
      expect(symlinkCheckFinal).toBeFalsy()
    })
  })
})
