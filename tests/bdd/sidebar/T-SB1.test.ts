// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

// --- Mock react-router-dom ---
// Sidebar 中 NavLink 使用 render prop: children={({ isActive }) => ...)}
vi.mock('react-router-dom', () => ({
  NavLink: ({ children, to, className }: any) => {
    const child = typeof children === 'function' ? children({ isActive: to === '/skills' }) : children
    return React.createElement('a', { href: to, className: typeof className === 'function' ? className({ isActive: to === '/skills' }) : className }, child)
  },
}))

// --- Mock Tauri getVersion ---
const getVersionMock = vi.fn()

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: getVersionMock,
}))

// --- Mock lucide-react icons ---
vi.mock('lucide-react', () => ({
  Package: () => React.createElement('span', null, 'Package'),
  Code: () => React.createElement('span', null, 'Code'),
  Settings: () => React.createElement('span', null, 'Settings'),
  Terminal: () => React.createElement('span', null, 'Terminal'),
}))

// --- Mock Store ---
const showToastMock = vi.fn()

vi.mock('../../../web/src/stores', () => ({
  useStore: () => ({
    showToast: showToastMock,
  }),
}))

// --- Mock API ---
vi.mock('../../../web/src/api/client', () => ({
  skillsApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: { skills: [], cleanedCount: 0 } }),
    unlink: vi.fn(),
    install: vi.fn(),
    uninstall: vi.fn(),
    export: vi.fn(),
  },
  environmentsApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: { skills: [], cleanedCount: 0 } }),
  },
  configApi: {
    get: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}))

describe('T-SB1 Sidebar 版本号显示', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Step 1: 渲染时调用 getVersion()，版本号初始显示 "v..."', async () => {
    // 让 getVersion 挂起，观察初始状态
    getVersionMock.mockReturnValue(new Promise(() => {}))

    const Sidebar = (await import('../../../web/src/components/Sidebar')).default
    render(React.createElement(Sidebar))

    expect(getVersionMock).toHaveBeenCalledTimes(1)
    expectElement(screen, 'sidebar-version', { text: 'v...' })
  })

  it('Step 2: getVersion() 返回 "0.3.1" → 显示 "v0.3.1"', async () => {
    getVersionMock.mockResolvedValue('0.3.1')

    const Sidebar = (await import('../../../web/src/components/Sidebar')).default
    render(React.createElement(Sidebar))

    await expectElementAsync(screen, 'sidebar-version', { text: 'v0.3.1' })
  })

  it('Step 3: getVersion() 失败 → fallback 显示 "vdev"', async () => {
    getVersionMock.mockRejectedValue(new Error('Not in Tauri'))

    const Sidebar = (await import('../../../web/src/components/Sidebar')).default
    render(React.createElement(Sidebar))

    await expectElementAsync(screen, 'sidebar-version', { text: 'vdev' })
  })

  it('Step 4: 标题显示 "j-skills"', async () => {
    getVersionMock.mockResolvedValue('0.3.1')

    const Sidebar = (await import('../../../web/src/components/Sidebar')).default
    render(React.createElement(Sidebar))

    await expectElementAsync(screen, 'sidebar-app-title', { text: 'j-skills' })
  })
})
