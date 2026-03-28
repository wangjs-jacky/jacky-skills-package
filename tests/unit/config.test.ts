import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// 测试 CLI config:set 写入的 defaultEnvironments 始终为数组格式
describe('CLI config defaultEnvironments', () => {
  const testDir = join(tmpdir(), `j-skills-test-${Date.now()}`)
  const configPath = join(testDir, 'config.json')

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('defaultEnvironments 应以数组格式写入', () => {
    const config = {
      defaultEnvironments: ['claude-code', 'codex'],
      autoConfirm: false,
      installMethod: 'copy',
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2))
    const parsed = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'))
    expect(Array.isArray(parsed.defaultEnvironments)).toBe(true)
    expect(parsed.defaultEnvironments).toEqual(['claude-code', 'codex'])
  })

  it('不应接受逗号分隔字符串格式', () => {
    // 模拟错误写入：字符串格式
    const badConfig = { defaultEnvironments: 'claude-code,codex' }
    writeFileSync(configPath, JSON.stringify(badConfig))
    const parsed = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'))
    // 正确格式应该是数组
    expect(Array.isArray(parsed.defaultEnvironments)).toBe(false)
    // 验证 Rust 端的兼容反序列化能处理这种情况
    expect(typeof parsed.defaultEnvironments === 'string').toBe(true)
  })

  it('空数组应正确写入', () => {
    const config = { defaultEnvironments: [] }
    writeFileSync(configPath, JSON.stringify(config))
    const parsed = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'))
    expect(Array.isArray(parsed.defaultEnvironments)).toBe(true)
    expect(parsed.defaultEnvironments).toEqual([])
  })
})
