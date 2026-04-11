// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('T-ST1 读取配置', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * T-ST1 完整流程（5 步）:
   * Step 1: 进入 Settings 页面 → 显示 Default Environments 和 Install Method 卡片
   * Step 2: 环境列表加载 → 显示 Claude Code 和 Cursor，已配置的显示选中状态
   * Step 3: 安装方式加载 → copy 为选中高亮状态
   * Step 4: configApi.get 失败 → Toast "Failed to load config"
   * Step 5: environmentsApi.list 失败 → Toast "Failed to load environments"
   */
  it('完整流程: 页面渲染 → 环境列表加载 → 安装方式加载 → API 失败', async () => {
    // 准备 mock 数据
    configGetMock.mockResolvedValue({
      success: true,
      data: {
        defaultEnvironments: ['claude-code'],
        installMethod: 'copy',
      },
    })
    envListMock.mockResolvedValue({ success: true, data: mockEnvironments })

    // Step 1: 渲染页面, settings-page 容器存在
    const { default: SettingsPage } = await import(
      '../../../web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage))

    const pageEl = await screen.findByTestId('settings-page')
    expect(pageEl).toBeTruthy()

    // 确认 Default Environments 标题存在
    expect(pageEl.textContent).toContain('Default Environments')
    // 确认 Install Method 标题存在
    expect(pageEl.textContent).toContain('Install Method')

    // Step 2: 环境列表加载完成 → 显示 Claude Code 和 Cursor
    await waitFor(() => {
      expect(envListMock).toHaveBeenCalled()
    })

    // Claude Code 按钮存在且已选中（配置中 defaultEnvironments 包含 claude-code）
    const claudeBtn = await screen.findByTestId('settings-env-toggle-claude-code')
    expect(claudeBtn).toBeTruthy()
    expect(claudeBtn.textContent).toContain('Claude Code')
    // claude-code 已选中 → 应有 Check 图标（圆形背景包含 check）
    const claudeCheck = claudeBtn.querySelector('.rounded-full.bg-\\[var\\(--color-primary\\)\\]')
    expect(claudeCheck).toBeTruthy()

    // Cursor 按钮存在但未选中（配置中 defaultEnvironments 不包含 cursor）
    const cursorBtn = await screen.findByTestId('settings-env-toggle-cursor')
    expect(cursorBtn).toBeTruthy()
    expect(cursorBtn.textContent).toContain('Cursor')

    // Step 3: 安装方式加载 → copy 为选中状态
    const copyBtn = await screen.findByTestId('settings-install-method-copy')
    expect(copyBtn).toBeTruthy()
    // copy 选中 → 按钮中有 Check 图标
    const copyCheck = copyBtn.querySelector('.rounded-full.bg-\\[var\\(--color-primary\\)\\]')
    expect(copyCheck).toBeTruthy()

    // symlink 未选中 → 无 Check 图标
    const symlinkBtn = await screen.findByTestId('settings-install-method-symlink')
    const symlinkCheck = symlinkBtn.querySelector('.rounded-full.bg-\\[var\\(--color-primary\\)\\]')
    expect(symlinkCheck).toBeFalsy()

    // Step 4: configApi.get 失败 → Toast "Failed to load config"
    vi.clearAllMocks()
    configGetMock.mockRejectedValue(new Error('Network error'))
    envListMock.mockResolvedValue({ success: true, data: mockEnvironments })

    const { default: SettingsPage2 } = await import(
      '../../../web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage2))

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('Failed to load config', 'error')
    })

    // Step 5: environmentsApi.list 失败 → Toast "Failed to load environments"
    vi.clearAllMocks()
    configGetMock.mockResolvedValue({
      success: true,
      data: { defaultEnvironments: [], installMethod: 'copy' },
    })
    envListMock.mockRejectedValue(new Error('Network error'))

    const { default: SettingsPage3 } = await import(
      '../../../web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage3))

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Failed to load environments',
        'error',
      )
    })
  })
})
