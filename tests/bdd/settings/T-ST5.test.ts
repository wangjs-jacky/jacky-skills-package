// @vitest-environment jsdom
import React from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

const showToastMock = vi.fn()
const setConfigMock = vi.fn()

// 使用可变 config，每个测试用例可覆盖
let configMock: Record<string, unknown> = {}

vi.mock('../../../web/src/stores', () => ({
  useStore: () => ({
    showToast: showToastMock,
    get config() {
      return configMock
    },
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

describe('T-ST5 页面初始化默认值', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    configMock = {}
    cleanup()
  })

  /**
   * T-ST5 完整流程（3 步）:
   * Step 1: 首次加载无历史配置 → Install Method 默认 copy
   * Step 2: Default Environments 初始选中状态由 config.defaultEnvironments 决定
   * Step 3: 修改配置后刷新页面 → 从 API 重新加载，恢复上次保存状态
   */

  it('Step 1: 首次加载无历史配置 → Install Method 默认 copy', async () => {
    // API 返回空配置（无 defaultEnvironments，无 installMethod）
    configGetMock.mockResolvedValue({
      success: true,
      data: {},
    })
    envListMock.mockResolvedValue({ success: true, data: mockEnvironments })
    configMock = {}

    const { default: SettingsPage } = await import(
      '../../../web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage))

    await screen.findByTestId('settings-page')

    // loadConfig 拿到空 data，installMethod 走默认值 'copy'
    const copyBtn = await screen.findByTestId('settings-install-method-copy')
    const copyCheck = copyBtn.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(copyCheck).toBeTruthy()

    // symlink 未选中
    const symlinkBtn = await screen.findByTestId('settings-install-method-symlink')
    const symlinkCheck = symlinkBtn.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(symlinkCheck).toBeFalsy()
  })

  it('Step 2: Default Environments 初始选中状态由 config.defaultEnvironments 决定', async () => {
    // 只配置 cursor，不配置 claude-code
    configGetMock.mockResolvedValue({
      success: true,
      data: {
        defaultEnvironments: ['cursor'],
        installMethod: 'copy',
      },
    })
    envListMock.mockResolvedValue({ success: true, data: mockEnvironments })
    configMock = { defaultEnvironments: ['cursor'], installMethod: 'copy' }

    const { default: SettingsPage } = await import(
      '../../../web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage))

    await screen.findByTestId('settings-page')

    // cursor 选中
    const cursorBtn = await screen.findByTestId('settings-env-toggle-cursor')
    const cursorCheck = cursorBtn.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(cursorCheck).toBeTruthy()

    // claude-code 未选中
    const claudeBtn = await screen.findByTestId('settings-env-toggle-claude-code')
    const claudeCheck = claudeBtn.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(claudeCheck).toBeFalsy()
  })

  it('Step 3: 修改配置后刷新页面 → 从 API 重新加载，恢复上次保存状态', async () => {
    // 第一次渲染：claude-code 选中，copy 方式
    configGetMock.mockResolvedValue({
      success: true,
      data: {
        defaultEnvironments: ['claude-code'],
        installMethod: 'copy',
      },
    })
    envListMock.mockResolvedValue({ success: true, data: mockEnvironments })
    configMock = { defaultEnvironments: ['claude-code'], installMethod: 'copy' }

    const { default: SettingsPage } = await import(
      '../../../web/src/pages/Settings'
    )
    render(React.createElement(SettingsPage))

    await screen.findByTestId('settings-page')

    // 初始状态：claude-code 选中
    let claudeBtn = await screen.findByTestId('settings-env-toggle-claude-code')
    let claudeCheck = claudeBtn.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(claudeCheck).toBeTruthy()

    // 模拟"保存了新配置"：API 返回更新后的值
    // 重新渲染模拟刷新页面：API 现在返回 cursor 选中 + symlink
    vi.clearAllMocks()
    configGetMock.mockResolvedValue({
      success: true,
      data: {
        defaultEnvironments: ['cursor'],
        installMethod: 'symlink',
      },
    })
    envListMock.mockResolvedValue({ success: true, data: mockEnvironments })
    configMock = { defaultEnvironments: ['cursor'], installMethod: 'symlink' }

    // 清理上一次渲染的 DOM，避免重复 settings-page
    cleanup()

    // 重新 import 获取新模块实例（vi.resetModules 已在 beforeEach 中调用）
    const { default: SettingsPageFresh } = await import(
      '../../../web/src/pages/Settings'
    )
    render(React.createElement(SettingsPageFresh))

    await screen.findByTestId('settings-page')

    // 重新加载后：cursor 选中，claude-code 未选中
    const cursorBtnLoaded = await screen.findByTestId('settings-env-toggle-cursor')
    const cursorCheckLoaded = cursorBtnLoaded.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(cursorCheckLoaded).toBeTruthy()

    const claudeBtnLoaded = await screen.findByTestId(
      'settings-env-toggle-claude-code',
    )
    const claudeCheckLoaded = claudeBtnLoaded.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(claudeCheckLoaded).toBeFalsy()

    // symlink 选中，copy 未选中
    const symlinkBtnLoaded = await screen.findByTestId(
      'settings-install-method-symlink',
    )
    const symlinkCheckLoaded = symlinkBtnLoaded.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(symlinkCheckLoaded).toBeTruthy()

    const copyBtnLoaded = await screen.findByTestId(
      'settings-install-method-copy',
    )
    const copyCheckLoaded = copyBtnLoaded.querySelector(
      '.rounded-full.bg-\\[var\\(--color-primary\\)\\]',
    )
    expect(copyCheckLoaded).toBeFalsy()
  })
})
