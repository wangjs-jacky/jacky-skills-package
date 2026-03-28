import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { mergeSkillHooks } from '../../src/lib/hooks'

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
})
