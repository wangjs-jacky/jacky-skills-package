import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('skillsApi transport selection', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { isTauri?: unknown }).isTauri
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { isTauri?: unknown }).isTauri
  })

  it('在官方 Tauri 运行时检测为 true 时走 invoke 而不是 /api', async () => {
    ;(globalThis as { isTauri?: boolean }).isTauri = true

    ;(globalThis as { window?: unknown }).window = {
      location: { protocol: 'https:', host: 'tauri.localhost' },
    }

    const { getApiTransport } = await import('../../web/src/api/client')

    expect(getApiTransport()).toBe('tauri')
  })

  it('在普通浏览器环境中继续走 HTTP /api', async () => {
    ;(globalThis as { window?: unknown }).window = {
      location: { protocol: 'http:', host: 'localhost:5173' },
    }

    const { getApiTransport } = await import('../../web/src/api/client')

    expect(getApiTransport()).toBe('http')
  })

  it('在旧版全局对象存在时仍识别为 Tauri', async () => {
    ;(globalThis as { window?: unknown }).window = {
      __TAURI_INTERNALS__: {},
      location: { protocol: 'https:', host: 'tauri.localhost' },
    }

    const { getApiTransport } = await import('../../web/src/api/client')

    expect(getApiTransport()).toBe('tauri')
  })
})
