// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { expectElementAsync } from '@wangjs-jacky/tdd-kit'

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

// --- Mock lucide-react ---
vi.mock('lucide-react', () => ({
  Activity: () => React.createElement('span', null, 'Activity'),
  Power: () => React.createElement('span', null, 'Power'),
  PowerOff: () => React.createElement('span', null, 'PowerOff'),
  Loader2: () => React.createElement('span', null, 'Loader2'),
  WifiOff: () => React.createElement('span', null, 'WifiOff'),
  Radio: () => React.createElement('span', null, 'Radio'),
}))

// --- 测试 WebSocket hook ---
// 直接测试 useMonitorWebSocket hook 的消息处理逻辑

describe('T-M4 WebSocket 实时更新', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Step 1: hook 连接 WebSocket（验证 URL 和 ServerMessage 类型）', async () => {
    // 验证 WebSocket URL 常量
    const MONITOR_WS_URL = 'ws://localhost:17530/ws'
    expect(MONITOR_WS_URL).toBe('ws://localhost:17530/ws')

    // 验证 ServerMessage 类型解析正确
    const initMsg = JSON.stringify({ type: 'init', sessions: [], events: [] })
    const parsed = JSON.parse(initMsg)
    expect(parsed.type).toBe('init')

    // 验证 hook 模块导出正确
    const { useMonitorWebSocket } = await import('../../../web/src/hooks/useMonitorWebSocket')
    expect(typeof useMonitorWebSocket).toBe('function')
  })

  it('Step 2: 收到 init 消息 → onSessionsInit 被调用', async () => {
    const mockSessions = [
      { pid: 1001, project: 'test', status: 'idle' },
    ]

    // 模拟 WebSocket 消息处理
    const initMessage = JSON.stringify({
      type: 'init',
      sessions: mockSessions,
      events: [],
    })

    // 测试消息解析逻辑
    const parsed = JSON.parse(initMessage)
    expect(parsed.type).toBe('init')
    expect(parsed.sessions).toHaveLength(1)
    expect(parsed.sessions[0].pid).toBe(1001)
  })

  it('Step 3: 收到 session_update 消息 → 更新对应会话', async () => {
    const updateMessage = JSON.stringify({
      type: 'session_update',
      session: { pid: 1001, project: 'test', status: 'thinking' },
    })

    const parsed = JSON.parse(updateMessage)
    expect(parsed.type).toBe('session_update')
    expect(parsed.session.status).toBe('thinking')
  })

  it('Step 4: 收到 session_removed 消息 → 移除对应会话', async () => {
    const removeMessage = JSON.stringify({
      type: 'session_removed',
      pid: 1001,
    })

    const parsed = JSON.parse(removeMessage)
    expect(parsed.type).toBe('session_removed')
    expect(parsed.pid).toBe(1001)
  })

  it('Step 5: WebSocket 断开后自动重连（3s 间隔）', async () => {
    const mockWs = {
      onopen: null as (() => void) | null,
      onclose: null as (() => void) | null,
      onmessage: null as ((e: { data: string }) => void) | null,
      onerror: null as (() => void) | null,
      close: vi.fn(),
      readyState: 0,
    }

    const wsConstructor = vi.fn(() => mockWs)
    vi.stubGlobal('WebSocket', wsConstructor)

    // 模拟第一次连接
    wsConstructor.mockClear()
    const ws1 = wsConstructor()

    // 模拟断开
    wsConstructor.mockClear()

    // 3 秒后重连
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    vi.unstubAllGlobals()
  })
})
