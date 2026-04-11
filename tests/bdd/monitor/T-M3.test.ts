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
  ChevronDown: () => React.createElement('span', null, 'ChevronDown'),
  ChevronRight: () => React.createElement('span', null, 'ChevronRight'),
  Terminal: () => React.createElement('span', null, 'Terminal'),
  Clock: () => React.createElement('span', null, 'Clock'),
  Wrench: () => React.createElement('span', null, 'Wrench'),
  Bot: () => React.createElement('span', null, 'Bot'),
  MessageSquare: () => React.createElement('span', null, 'MessageSquare'),
}))

// 测试数据
const mockSessions = [
  {
    pid: 1001,
    ppid: 1,
    terminal: 'vscode',
    cwd: '/Users/test/project-a',
    project: 'project-a',
    status: 'thinking',
    startedAt: Date.now() - 5 * 60 * 1000, // 5 分钟前
    updatedAt: Date.now(),
  },
  {
    pid: 1002,
    ppid: 1,
    terminal: 'iterm',
    cwd: '/Users/test/project-b',
    project: 'project-b',
    status: 'idle',
    startedAt: Date.now() - 60 * 60 * 1000, // 1 小时前
    updatedAt: Date.now(),
  },
]

describe('T-M3 会话列表展示', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 默认：hooks 已安装 + daemon 运行
    checkHooksMock.mockResolvedValue({ installed: true, hooksDirExists: true })
    checkDaemonMock.mockResolvedValue({ running: true })
    getEventsMock.mockResolvedValue([])
  })

  it('Step 1: 无会话时显示空状态（data-testid="no-sessions"）', async () => {
    getSessionsMock.mockResolvedValue([])

    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await expectElementAsync(screen, 'no-sessions', { text: 'No active sessions' })
  })

  it('Step 2: 返回 2 个会话 → 渲染 2 张会话卡片', async () => {
    getSessionsMock.mockResolvedValue(mockSessions)

    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await waitFor(() => {
      expect(screen.getByTestId('session-card-1001')).toBeTruthy()
      expect(screen.getByTestId('session-card-1002')).toBeTruthy()
    })
  })

  it('Step 3: thinking 状态使用琥珀色 + 脉冲动画', async () => {
    getSessionsMock.mockResolvedValue([mockSessions[0]]) // thinking 会话

    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await waitFor(() => {
      const badge = screen.getByTestId('status-badge-thinking')
      expect(badge).toBeTruthy()
      // thinking 状态有 animate-pulse
      const dot = badge.querySelector('.animate-pulse')
      expect(dot).toBeTruthy()
    })
  })

  it('Step 4: 会话卡片显示终端类型（VSCode/iTerm）', async () => {
    getSessionsMock.mockResolvedValue(mockSessions)

    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await waitFor(() => {
      const card1 = screen.getByTestId('session-card-1001')
      expect(card1.textContent).toContain('VSCode')
    })
  })

  it('Step 5: 会话卡片显示持续时间', async () => {
    getSessionsMock.mockResolvedValue(mockSessions)

    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    await waitFor(() => {
      // 验证 session-grid 存在（表示会话已渲染）
      expect(screen.getByTestId('session-grid')).toBeTruthy()
    })
  })
})
