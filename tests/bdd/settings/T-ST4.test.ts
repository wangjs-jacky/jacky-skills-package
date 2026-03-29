// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const showToastMock = vi.fn()
const setConfigMock = vi.fn()
const configMock = { defaultEnvironments: ['claude-code'], installMethod: 'copy' }

vi.mock('../../../packages/web/src/stores', () => ({
  useStore: () => ({
    showToast: showToastMock,
    config: configMock,
    setConfig: setConfigMock,
  }),
}))

const configGetMock = vi.fn()
const configUpdateMock = vi.fn()
const envListMock = vi.fn()

vi.mock('../../../packages/web/src/api/client', () => ({
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

describe('T-ST4 设置自动保存', () => {
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
    configUpdateMock.mockResolvedValue({
      success: true,
      data: {
        defaultEnvironments: ['claude-code', 'cursor'],
        installMethod: 'symlink',
      },
    })
  })

  /**
   * T-ST4 自动保存流程（3 步）:
   * Step 1: 没有 Save Settings 按钮（已删除）
   * Step 2: 点击环境 → 自动保存 → Toast "Settings saved"
   * Step 3: 点击安装方式 → 自动保存
   */
  it('完整流程: 无 Save 按钮 → 修改环境自动保存 → 修改安装方式自动保存', async () => {
    const { default: SettingsPage } = await import(
      '../../../packages/web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage))

    // 等待页面加载完成
    await screen.findByTestId('settings-page')

    // Step 1: Save Settings 按钮已删除
    expect(screen.queryByTestId('settings-save-btn')).toBeNull()

    // Step 2: 点击 cursor 添加环境 → 自动保存
    const cursorBtn = screen.getByTestId('settings-env-toggle-cursor')
    await user.click(cursorBtn)

    await waitFor(() => {
      expect(configUpdateMock).toHaveBeenCalled()
      const callArgs = configUpdateMock.mock.calls[0][0]
      expect(callArgs.defaultEnvironments).toContain('cursor')
    })

    // Toast "Settings saved"
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('Settings saved', 'success')
    })

    // Step 3: 切换安装方式到 symlink → 自动保存
    configUpdateMock.mockClear()
    configUpdateMock.mockResolvedValue({
      success: true,
      data: {
        defaultEnvironments: ['claude-code', 'cursor'],
        installMethod: 'symlink',
      },
    })

    const symlinkBtn = screen.getByTestId('settings-install-method-symlink')
    await user.click(symlinkBtn)

    await waitFor(() => {
      expect(configUpdateMock).toHaveBeenCalled()
      const callArgs = configUpdateMock.mock.calls[0][0]
      expect(callArgs.installMethod).toBe('symlink')
    })
  })

  it('自动保存失败 → Toast 错误信息', async () => {
    configUpdateMock.mockRejectedValue(new Error('Network error'))

    const { default: SettingsPage } = await import(
      '../../../packages/web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage))

    await screen.findByTestId('settings-page')

    // 点击 cursor 触发自动保存 → 失败
    const cursorBtn = screen.getByTestId('settings-env-toggle-cursor')
    await user.click(cursorBtn)

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Failed to save settings',
        'error',
      )
    })
  })
})
