// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

// mock ky，确保 HTTP 分支不被触发
vi.mock('ky', () => ({
  default: {
    create: () => {
      throw new Error('HTTP 分支不应在 Tauri 环境下被调用')
    },
  },
}))

// mock @tauri-apps/api/core 的 isTauri 返回 true，让环境检测走 tauri 分支
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => window.__TAURI_INTERNALS__!.invoke(...args),
  isTauri: () => true,
}))

const invokeMock = vi.fn()

// 设置 window.__TAURI_INTERNALS__ 使 Tauri 运行时检测通过
beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).__TAURI_INTERNALS__ = { invoke: invokeMock }
})

afterEach(() => {
  delete (window as any).__TAURI_INTERNALS__
})

describe('前端 → Tauri invoke 联调测试', () => {
  async function getApi() {
    // 动态导入确保拿到最新模块
    const mod = await import('../../web/src/api/client')
    return mod
  }

  it('skillsApi.list 调用 list_skills 命令', async () => {
    const mockSkills = [
      { name: 'test-skill', path: '/skills/test-skill', source: 'linked' },
    ]
    invokeMock.mockResolvedValue(mockSkills)

    const { skillsApi } = await getApi()
    const result = await skillsApi.list()

    // Tauri invoke 签名: invoke(cmd, args?, options?) — 只检查命令名
    expect(invokeMock.mock.calls[0][0]).toBe('list_skills')
    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockSkills)
  })

  it('skillsApi.get 调用 get_skill 命令并传递 name', async () => {
    const mockSkill = { name: 'my-skill', path: '/skills/my-skill', source: 'linked' }
    invokeMock.mockResolvedValue(mockSkill)

    const { skillsApi } = await getApi()
    const result = await skillsApi.get('my-skill')

    expect(invokeMock.mock.calls[0][0]).toBe('get_skill')
    expect(invokeMock.mock.calls[0][1]).toEqual({ name: 'my-skill' })
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('my-skill')
  })

  it('skillsApi.link 调用 link_skill 命令并传递 path', async () => {
    invokeMock.mockResolvedValue(['skill-a', 'skill-b'])

    const { skillsApi } = await getApi()
    const result = await skillsApi.link('/path/to/skills')

    expect(invokeMock.mock.calls[0][0]).toBe('link_skill')
    expect(invokeMock.mock.calls[0][1]).toEqual({ path: '/path/to/skills' })
    expect(result.success).toBe(true)
    expect(result.data.linked).toEqual(['skill-a', 'skill-b'])
    expect(result.data.count).toBe(2)
  })

  it('skillsApi.unlink 调用 unlink_skill 命令并传递 name', async () => {
    invokeMock.mockResolvedValue(undefined)

    const { skillsApi } = await getApi()
    const result = await skillsApi.unlink('old-skill')

    expect(invokeMock.mock.calls[0][0]).toBe('unlink_skill')
    expect(invokeMock.mock.calls[0][1]).toEqual({ name: 'old-skill' })
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('old-skill')
  })

  it('skillsApi.install 调用 install_skill 命令并传递正确参数', async () => {
    const mockResult = { name: 'my-skill', env: 'claude-code', path: '/.claude/skills/my-skill' }
    invokeMock.mockResolvedValue(mockResult)

    const { skillsApi } = await getApi()
    const result = await skillsApi.install('my-skill', 'claude-code', true)

    expect(invokeMock.mock.calls[0][0]).toBe('install_skill')
    expect(invokeMock.mock.calls[0][1]).toEqual({
      name: 'my-skill',
      env: 'claude-code',
      global: true,
    })
    expect(result.success).toBe(true)
    expect(result.data.env).toBe('claude-code')
  })

  it('skillsApi.uninstall 调用 uninstall_skill 命令', async () => {
    invokeMock.mockResolvedValue({ name: 'my-skill', env: 'cursor', removed: true })

    const { skillsApi } = await getApi()
    const result = await skillsApi.uninstall('my-skill', 'cursor')

    expect(invokeMock.mock.calls[0][0]).toBe('uninstall_skill')
    expect(invokeMock.mock.calls[0][1]).toEqual({
      name: 'my-skill',
      env: 'cursor',
      global: true,
    })
    expect(result.success).toBe(true)
    expect(result.data.removed).toBe(true)
  })

  it('skillsApi.export 调用 export_skills 命令', async () => {
    invokeMock.mockResolvedValue({
      exported: ['skill-a'],
      errors: [],
      targetPath: '/Downloads/export',
    })

    const { skillsApi } = await getApi()
    const result = await skillsApi.export(['skill-a'], '/Downloads/export')

    expect(invokeMock.mock.calls[0][0]).toBe('export_skills')
    expect(invokeMock.mock.calls[0][1]).toEqual({
      skillNames: ['skill-a'],
      targetPath: '/Downloads/export',
    })
    expect(result.success).toBe(true)
    expect(result.data.exported).toEqual(['skill-a'])
  })

  it('skillsApi.listSourceFolders 调用 list_source_folders 命令', async () => {
    invokeMock.mockResolvedValue([{ path: '/skills', addedAt: '2025-01-01', skillNames: ['a'] }])

    const { skillsApi } = await getApi()
    const result = await skillsApi.listSourceFolders()

    expect(invokeMock.mock.calls[0][0]).toBe('list_source_folders')
    expect(result.success).toBe(true)
  })

  it('environmentsApi.list 调用 list_environments 命令', async () => {
    const mockEnvs = [
      { name: 'claude-code', label: 'Claude Code', globalPath: '/.claude/skills', projectPaths: ['.claude/skills'] },
    ]
    invokeMock.mockResolvedValue(mockEnvs)

    const { environmentsApi } = await getApi()
    const result = await environmentsApi.list()

    expect(invokeMock.mock.calls[0][0]).toBe('list_environments')
    expect(result.success).toBe(true)
    expect(result.data[0].name).toBe('claude-code')
  })

  it('environmentsApi.status 调用 environment_status 命令', async () => {
    invokeMock.mockResolvedValue([
      { name: 'claude-code', label: 'Claude Code', globalExists: true },
    ])

    const { environmentsApi } = await getApi()
    const result = await environmentsApi.status()

    expect(invokeMock.mock.calls[0][0]).toBe('environment_status')
    expect(result.success).toBe(true)
    expect(result.data[0].globalExists).toBe(true)
  })

  it('configApi.get 调用 get_config 命令', async () => {
    invokeMock.mockResolvedValue({
      defaultEnvironments: ['claude-code'],
      autoConfirm: false,
      installMethod: 'copy',
    })

    const { configApi } = await getApi()
    const result = await configApi.get()

    expect(invokeMock.mock.calls[0][0]).toBe('get_config')
    expect(result.success).toBe(true)
    expect(result.data.installMethod).toBe('copy')
  })

  it('Tauri 命令失败时返回错误响应', async () => {
    invokeMock.mockRejectedValue(new Error("Skill 'not-found' not found"))

    const { skillsApi } = await getApi()
    const result = await skillsApi.get('not-found')

    expect(result.success).toBe(false)
    expect(result.error).toContain("Tauri command get_skill failed")
  })
})
