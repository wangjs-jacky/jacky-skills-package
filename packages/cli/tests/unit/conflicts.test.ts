import { describe, expect, it } from 'vitest'

import { detectConflicts } from '../../src/lib/conflicts'
import type { RegistrySkill } from '../../src/lib/registry'

describe('detectConflicts', () => {
  it('没有冲突时返回空结果', () => {
    const skills: RegistrySkill[] = [
      { name: 'skill-a', path: '/a', source: 'linked', category: 'cat-a' },
      { name: 'skill-b', path: '/b', source: 'linked', category: 'cat-b' },
    ]

    const result = detectConflicts(['skill-a', 'skill-b'], skills)
    expect(result.conflicts).toHaveLength(0)
  })

  it('检测同 category 冲突', () => {
    const skills: RegistrySkill[] = [
      {
        name: 'agent-browser',
        path: '/a',
        source: 'linked',
        category: 'browser-debug',
      },
      {
        name: 'web-access',
        path: '/w',
        source: 'linked',
        category: 'browser-debug',
      },
    ]

    const result = detectConflicts(['agent-browser', 'web-access'], skills)
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].category).toBe('browser-debug')
    expect(result.conflicts[0].skills).toContain('agent-browser')
    expect(result.conflicts[0].skills).toContain('web-access')
  })

  it('不同 category 不产生冲突', () => {
    const skills: RegistrySkill[] = [
      { name: 'skill-a', path: '/a', source: 'linked', category: 'testing' },
      { name: 'skill-b', path: '/b', source: 'linked', category: 'deployment' },
    ]

    const result = detectConflicts(['skill-a', 'skill-b'], skills)
    expect(result.conflicts).toHaveLength(0)
  })

  it('未在列表中的 skill 被忽略', () => {
    const skills: RegistrySkill[] = []

    const result = detectConflicts(['unknown-skill'], skills)
    expect(result.conflicts).toHaveLength(0)
  })

  it('单个 skill 不产生冲突', () => {
    const skills: RegistrySkill[] = [
      { name: 'skill-a', path: '/a', source: 'linked', category: 'testing' },
    ]

    const result = detectConflicts(['skill-a'], skills)
    expect(result.conflicts).toHaveLength(0)
  })

  it('多个同 category 技能在一个冲突组中', () => {
    const skills: RegistrySkill[] = [
      { name: 'a', path: '/a', source: 'linked', category: 'testing' },
      { name: 'b', path: '/b', source: 'linked', category: 'testing' },
      { name: 'c', path: '/c', source: 'linked', category: 'testing' },
    ]

    const result = detectConflicts(['a', 'b', 'c'], skills)
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].skills).toHaveLength(3)
  })

  it('无 category 的 skill 不产生冲突', () => {
    const skills: RegistrySkill[] = [
      { name: 'a', path: '/a', source: 'linked' },
      { name: 'b', path: '/b', source: 'linked' },
    ]

    const result = detectConflicts(['a', 'b'], skills)
    expect(result.conflicts).toHaveLength(0)
  })

  it('混合场景：部分有 category，部分没有', () => {
    const skills: RegistrySkill[] = [
      { name: 'a', path: '/a', source: 'linked', category: 'browser-debug' },
      { name: 'b', path: '/b', source: 'linked', category: 'browser-debug' },
      { name: 'c', path: '/c', source: 'linked' },
    ]

    const result = detectConflicts(['a', 'b', 'c'], skills)
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].skills).toEqual(['a', 'b'])
  })
})
