// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

// --- Mock Store ---
const showToastMock = vi.fn()

vi.mock('../../../web/src/stores', () => ({
  useStore: () => ({
    showToast: showToastMock,
  }),
}))

// --- Mock API ---
const checkHooksMock = vi.fn()
const installHooksMock = vi.fn()
const uninstallHooksMock = vi.fn()
const checkDaemonMock = vi.fn()
const startDaemonMock = vi.fn()
const stopDaemonMock = vi.fn()
const getSessionsMock = vi.fn()
const getEventsMock = vi.fn()

vi.mock('../../../web/src/api/monitor', () => ({
  monitorApi: {
    checkHooks: checkHooksMock,
    installHooks: installHooksMock,
    uninstallHooks: uninstallHooksMock,
    checkDaemon: checkDaemonMock,
    startDaemon: startDaemonMock,
    stopDaemon: stopDaemonMock,
    getSessions: getSessionsMock,
    getEvents: getEventsMock,
    health: vi.fn(),
  },
}))

// --- Mock WebSocket hook ---
const wsConnectMock = vi.fn()
const wsDisconnectMock = vi.fn()

vi.mock('../../../web/src/hooks/useMonitorWebSocket', () => ({
  useMonitorWebSocket: () => ({
    connected: false,
    reconnecting: false,
  }),
}))

// --- Mock lucide-react ---
vi.mock('lucide-react', () => ({
  Activity: () => React.createElement('span', null, 'Activity'),
  Power: () => React.createElement('span', null, 'Power'),
  PowerOff: () => React.createElement('span', null, 'PowerOff'),
  Loader2: () => React.createElement('span', null, 'Loader2'),
  WifiOff: () => React.createElement('span', null, 'WifiOff'),
  Radio: () => React.createElement('span', null, 'Radio'),
}))

describe('T-M2 Monitor 状态流转', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Step 1: 初始加载时显示 loading 状态', async () => {
    // 让 checkHooks 挂起以观察 loading 状态
    checkHooksMock.mockReturnValue(new Promise(() => {}))

    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await expectElementAsync(screen, 'monitor-loading')
  })

  it('Step 2: hooks 未安装 → 显示 "Monitor is disabled" + Enable 按钮', async () => {
    checkHooksMock.mockResolvedValue({ installed: false, hooksDirExists: false })

    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await expectElementAsync(screen, 'monitor-disabled', { text: 'Monitor is disabled' })
    await expectElementAsync(screen, 'enable-monitor-btn', { text: 'Enable Monitor' })
  })

  it('Step 3: 点击 Enable Monitor → 调用 installHooks + startDaemon', async () => {
    checkHooksMock.mockResolvedValue({ installed: false, hooksDirExists: true })
    installHooksMock.mockResolvedValue({ success: true })
    startDaemonMock.mockResolvedValue({ running: true })

    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    // 等待 loading 完成
    await waitFor(() => {
      expect(screen.getByTestId('enable-monitor-btn')).toBeTruthy()
    })

    // 点击 Enable
    const user = userEvent.setup()
    await user.click(screen.getByTestId('enable-monitor-btn'))

    await waitFor(() => {
      expect(installHooksMock).toHaveBeenCalled()
      expect(startDaemonMock).toHaveBeenCalled()
    })
  })

  it('Step 4: hooks 已安装但 daemon 离线 → 显示 Start Daemon 按钮', async () => {
    checkHooksMock.mockResolvedValue({ installed: true, hooksDirExists: true })
    checkDaemonMock.mockResolvedValue({ running: false })

    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await expectElementAsync(screen, 'start-daemon-btn', { text: 'Start Daemon' })
  })
})
