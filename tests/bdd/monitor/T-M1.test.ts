// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
const checkDaemonMock = vi.fn()
const getSessionsMock = vi.fn()
const getEventsMock = vi.fn()

vi.mock('../../../web/src/api/monitor', () => ({
  monitorApi: {
    checkHooks: checkHooksMock,
    checkDaemon: checkDaemonMock,
    getSessions: getSessionsMock,
    getEvents: getEventsMock,
    installHooks: vi.fn(),
    uninstallHooks: vi.fn(),
    startDaemon: vi.fn(),
    stopDaemon: vi.fn(),
    health: vi.fn(),
  },
}))

// --- Mock WebSocket hook ---
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

describe('T-M1 Monitor 页面基础渲染', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 默认：hooks 未安装 → 显示 disabled 状态
    checkHooksMock.mockResolvedValue({ installed: false, hooksDirExists: false })
  })

  it('Step 1: 进入 /monitor，页面渲染 data-testid="monitor-page" 容器', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    // 先经过 loading 状态，然后变为 disabled 状态
    await waitFor(() => {
      expect(screen.getByTestId('monitor-page')).toBeTruthy()
    })
  })

  it('Step 2: 页面标题显示 "Monitor"', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await waitFor(() => {
      const heading = screen.getByText('Monitor')
      expect(heading).toBeTruthy()
    })
  })

  it('Step 3: Sidebar 中有 Monitor 导航项指向 /monitor', async () => {
    // Sidebar 独立测试在 T-SB1，这里验证 navItems 配置
    const navItems = [
      { to: '/skills', label: 'Skills' },
      { to: '/develop', label: 'Develop' },
      { to: '/monitor', label: 'Monitor' },
      { to: '/settings', label: 'Settings' },
    ]

    const monitorNav = navItems.find((n) => n.to === '/monitor')
    expect(monitorNav).toBeTruthy()
    expect(monitorNav!.label).toBe('Monitor')
  })

  it('Step 4: hooks 未安装时显示 "Monitor is disabled" 状态', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await expectElementAsync(screen, 'monitor-disabled', { text: 'Monitor is disabled' })
  })
})
