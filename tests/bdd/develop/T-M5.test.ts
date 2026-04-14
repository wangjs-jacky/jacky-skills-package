// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// 所有 mock 依赖必须用 vi.hoisted 定义（vi.mock 工厂会被提升到文件顶部）
const { mockSession, showToastMock } = vi.hoisted(() => {
  const mockSession = {
    pid: 12345,
    ppid: 100,
    terminal: 'vscode' as const,
    cwd: '/Users/demo/my-project',
    project: 'my-project',
    status: 'executing' as const,
    startedAt: Date.now() - 60000,
    updatedAt: Date.now(),
    currentTool: 'Edit',
    activeToolsCount: 2,
    activeTools: ['Edit', 'Grep'],
    activeSubagentsCount: 2,
    activeSubagents: ['researcher', 'executor'],
  }
  return {
    mockSession,
    showToastMock: vi.fn(),
  }
})

vi.mock('../../../web/src/stores', () => ({
  useStore: () => ({ showToast: showToastMock }),
}))

vi.mock('../../../web/src/hooks/useMonitorWebSocket', () => ({
  useMonitorWebSocket: () => ({
    connected: true,
    reconnecting: false,
    lastError: null,
  }),
}))

vi.mock('../../../web/src/hooks/useDaemonHealth', () => ({
  useDaemonHealth: () => ({
    consecutiveFailures: 0,
    checking: false,
    checkNow: vi.fn().mockResolvedValue(true),
  }),
}))

vi.mock('../../../web/src/api/monitor', () => ({
  monitorApi: {
    checkDaemon: vi.fn().mockResolvedValue({ ok: true, data: { running: true, pid: 9999 } }),
    getSessions: vi.fn().mockResolvedValue({ ok: true, data: [mockSession] }),
    getEvents: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getConfig: vi.fn().mockResolvedValue({ ok: true, data: { floatingWindow: { enabled: false } } }),
    checkHooks: vi.fn().mockResolvedValue({ ok: true, data: { installed: true, hooksDirExists: true } }),
  },
}))

describe('T-M5 SessionCard 布局 - 2 列网格、默认展开', () => {
  it('网格使用 2 列布局（不含 grid-cols-3）', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    const grid = await screen.findByTestId('session-grid')
    const cls = grid.className
    expect(cls).toContain('md:grid-cols-2')
    expect(cls).not.toContain('lg:grid-cols-3')
  })

  it('SessionCard 默认展开显示详情', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    const detail = await screen.findByTestId(`session-detail-${mockSession.pid}`)
    expect(detail).toBeTruthy()
  })

  it('展开区域包含 PID、Started、CWD 字段', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    const detail = await screen.findByTestId(`session-detail-${mockSession.pid}`)
    expect(detail.textContent).toContain('PID:')
    expect(detail.textContent).toContain('Started:')
    expect(detail.textContent).toContain('CWD:')
  })
})

describe('T-M6 SessionCard 信息展示 - Subagent 徽标', () => {
  it('有子代理时卡片头部包含 Bot SVG 图标', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    const card = await screen.findByTestId(`session-card-${mockSession.pid}`)
    const svg = card.querySelector('svg.lucide-bot')
    expect(svg).toBeTruthy()
  })

  it('展开区域显示活跃工具和子代理', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    const detail = await screen.findByTestId(`session-detail-${mockSession.pid}`)
    expect(detail.textContent).toContain('Active Tools')
    expect(detail.textContent).toContain('Edit')
    expect(detail.textContent).toContain('Subagents')
  })
})

describe('T-M7 字体样式 - 标签 sans-serif，值 mono', () => {
  it('基本信息标签不含 font-mono，值含 font-mono', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    const detail = await screen.findByTestId(`session-detail-${mockSession.pid}`)
    const infoGrid = detail.querySelector('.grid.grid-cols-2')
    expect(infoGrid).toBeTruthy()

    // 标签 span（opacity-60）不应有 font-mono
    const labels = infoGrid!.querySelectorAll('.opacity-60')
    labels.forEach((label) => {
      expect(label.className).not.toContain('font-mono')
    })

    // 值 span 应有 font-mono
    const valueSpans = infoGrid!.querySelectorAll('.font-mono')
    expect(valueSpans.length).toBeGreaterThan(0)
  })

  it('统计栏数字有 font-mono，外层 span 无 font-mono', async () => {
    const { default: MonitorPage } = await import('../../../web/src/pages/Monitor')
    render(React.createElement(MonitorPage))

    const stats = await screen.findByTestId('monitor-stats')
    const outerSpan = stats.querySelector('span.flex')
    expect(outerSpan?.className).not.toContain('font-mono')

    const monoSpans = stats.querySelectorAll('.font-mono')
    expect(monoSpans.length).toBeGreaterThan(0)
  })
})
