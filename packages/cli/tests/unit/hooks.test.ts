import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { mergeSkillHooks, validateHooksConfig } from '../../src/lib/hooks'

describe('validateHooksConfig', () => {
  it('正常结构通过验证', () => {
    const hooks = {
      Stop: [
        {
          matcher: '',
          hooks: [
            { type: 'command', command: 'echo hello' },
          ],
        },
      ],
    }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('matcher 为 null 时通过验证', () => {
    const hooks = {
      Stop: [
        {
          matcher: null,
          hooks: [
            { type: 'command', command: 'echo hello' },
          ],
        },
      ],
    }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(true)
  })

  it('多个 hookType 通过验证', () => {
    const hooks = {
      SessionStart: [
        {
          matcher: '',
          hooks: [
            { type: 'command', command: 'bash start.sh' },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            { type: 'command', command: 'bash check.sh' },
          ],
        },
      ],
    }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(true)
  })

  it('hooks 为 null 时失败', () => {
    const result = validateHooksConfig(null)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('hooks 为数组时失败', () => {
    const result = validateHooksConfig([])
    expect(result.valid).toBe(false)
  })

  it('hooks 为字符串时失败', () => {
    const result = validateHooksConfig('not an object')
    expect(result.valid).toBe(false)
  })

  it('hookType 值不是数组时失败', () => {
    const hooks = { Stop: 'not an array' }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('不是数组')
  })

  it('matcher 不是 object 时失败', () => {
    const hooks = { Stop: ['not an object'] }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('不是 object')
  })

  it('matcher 缺少 hooks 属性时失败', () => {
    const hooks = { Stop: [{ matcher: '' }] }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('缺少 hooks 属性')
  })

  it('matcher.hooks 不是数组时失败', () => {
    const hooks = { Stop: [{ matcher: '', hooks: 'not array' }] }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('不是数组')
  })

  it('hook 缺少 type 时失败', () => {
    const hooks = {
      Stop: [{
        matcher: '',
        hooks: [{ command: 'echo hello' }],
      }],
    }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('缺少 type')
  })

  it('hook 缺少 command 时失败', () => {
    const hooks = {
      Stop: [{
        matcher: '',
        hooks: [{ type: 'command' }],
      }],
    }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('缺少 command')
  })

  it('hook type 不是 string 时失败', () => {
    const hooks = {
      Stop: [{
        matcher: '',
        hooks: [{ type: 123, command: 'echo' }],
      }],
    }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('type')
  })

  it('hook command 不是 string 时失败', () => {
    const hooks = {
      Stop: [{
        matcher: '',
        hooks: [{ type: 'command', command: 123 }],
      }],
    }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('command')
  })

  it('累积多个错误', () => {
    const hooks = {
      Stop: 'not array',
      PreToolUse: [{ hooks: [{ type: 1 }] }],
    }
    const result = validateHooksConfig(hooks)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})

describe('mergeSkillHooks', () => {
  const originalHome = process.env.HOME
  let homeDir = ''

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), 'j-skills-hooks-'))
    process.env.HOME = homeDir

    mkdirSync(join(homeDir, '.claude'), { recursive: true })

    const initialSettings = {
      hooks: {
        Stop: [
          {
            matcher: null,
            hooks: [
              {
                type: 'command',
                command: '/Users/jiashengwang/.superset/hooks/notify.sh',
              },
            ],
          },
        ],
      },
    }

    writeFileSync(
      join(homeDir, '.claude', 'settings.json'),
      JSON.stringify(initialSettings, null, 2),
      'utf-8'
    )
  })

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.HOME = originalHome
    } else {
      delete process.env.HOME
    }
  })

  it('merges empty-string matcher into existing null matcher bucket', () => {
    const skillPath = join(homeDir, 'skills', 'task-memory')
    mkdirSync(join(skillPath, 'hooks'), { recursive: true })

    const skillHooks = {
      hooks: {
        Stop: [
          {
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'bash ${CLAUDE_PLUGIN_ROOT}/hooks/on-stop.sh',
              },
            ],
          },
        ],
      },
    }

    writeFileSync(
      join(skillPath, 'hooks', 'hooks.json'),
      JSON.stringify(skillHooks, null, 2),
      'utf-8'
    )

    const merged = mergeSkillHooks(skillPath, 'task-memory')
    expect(merged).toBe(true)

    const settings = JSON.parse(
      readFileSync(join(homeDir, '.claude', 'settings.json'), 'utf-8')
    )

    expect(settings.hooks.Stop).toHaveLength(1)
    expect(settings.hooks.Stop[0].matcher).toBe('')

    const commands = settings.hooks.Stop[0].hooks.map((h: { command: string }) => h.command)
    expect(commands).toContain('/Users/jiashengwang/.superset/hooks/notify.sh')
    expect(commands).toContain(`bash ${skillPath}/hooks/on-stop.sh # skill: task-memory`)
  })

  it('aborts merge when settings.json hooks structure is corrupted', () => {
    // 写入异常结构的 settings.json
    writeFileSync(
      join(homeDir, '.claude', 'settings.json'),
      JSON.stringify({ hooks: { Stop: 'not-an-array' } }, null, 2),
      'utf-8'
    )

    const skillPath = join(homeDir, 'skills', 'test-skill')
    mkdirSync(join(skillPath, 'hooks'), { recursive: true })

    const skillHooks = {
      hooks: {
        Stop: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'echo hello' }],
          },
        ],
      },
    }

    writeFileSync(
      join(skillPath, 'hooks', 'hooks.json'),
      JSON.stringify(skillHooks, null, 2),
      'utf-8'
    )

    const merged = mergeSkillHooks(skillPath, 'test-skill')
    expect(merged).toBe(false)

    // 确认 settings.json 没有被修改
    const settings = JSON.parse(
      readFileSync(join(homeDir, '.claude', 'settings.json'), 'utf-8')
    )
    expect(settings.hooks.Stop).toBe('not-an-array')
  })

  it('aborts merge when skill hooks.json structure is corrupted', () => {
    const skillPath = join(homeDir, 'skills', 'bad-skill')
    mkdirSync(join(skillPath, 'hooks'), { recursive: true })

    const badSkillHooks = {
      hooks: {
        Stop: [
          {
            matcher: '',
            hooks: 'not-an-array',
          },
        ],
      },
    }

    writeFileSync(
      join(skillPath, 'hooks', 'hooks.json'),
      JSON.stringify(badSkillHooks, null, 2),
      'utf-8'
    )

    const merged = mergeSkillHooks(skillPath, 'bad-skill')
    expect(merged).toBe(false)
  })
})
