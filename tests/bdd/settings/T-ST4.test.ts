// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

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

describe('T-ST4 保存设置', () => {
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
   * T-ST4 完整流程（3 步）:
   * Step 1: Save Settings 按钮可见
   * Step 2: 修改环境选择和安装方式后点击 Save → 调用 configApi.update → Toast "Settings saved"
   * Step 3: 保存失败 → Toast "Failed to save settings"
   */
  it('完整流程: Save 按钮可见 → 修改并保存成功 → 保存失败', async () => {
    const { default: SettingsPage } = await import(
      '../../../packages/web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage))

    // 等待页面加载完成
    await screen.findByTestId('settings-page')

    // Step 1: Save Settings 按钮可见
    const saveBtn = await screen.findByTestId('settings-save-btn')
    expect(saveBtn).toBeTruthy()
    expect(saveBtn.textContent).toContain('Save Settings')

    // Step 2: 修改环境选择（点击 cursor 添加）和安装方式（切换到 symlink），然后保存
    configUpdateMock.mockResolvedValue({
      success: true,
      data: {
        defaultEnvironments: ['claude-code', 'cursor'],
        installMethod: 'symlink',
      },
    })

    // 点击 cursor 添加选中
    const cursorBtn = screen.getByTestId('settings-env-toggle-cursor')
    await user.click(cursorBtn)

    // 切换安装方式到 symlink
    const symlinkBtn = screen.getByTestId('settings-install-method-symlink')
    await user.click(symlinkBtn)

    // 点击 Save
    await user.click(saveBtn)

    // 验证 configApi.update 被调用，参数包含修改后的值
    await waitFor(() => {
      expect(configUpdateMock).toHaveBeenCalled()
      const callArgs = configUpdateMock.mock.calls[0][0]
      expect(callArgs.defaultEnvironments).toContain('cursor')
      expect(callArgs.installMethod).toBe('symlink')
    })

    // Toast "Settings saved"
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('Settings saved', 'success')
    })

    // 验证 setConfig 被调用
    expect(setConfigMock).toHaveBeenCalled()

    // Step 3: 保存失败 → Toast "Failed to save settings"
    configUpdateMock.mockRejectedValue(new Error('Network error'))
    await user.click(saveBtn)

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Failed to save settings',
        'error',
      )
    })
  })
})
