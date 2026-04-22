import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { readSkillMetadata } from '../../src/lib/skill-metadata'

describe('readSkillMetadata', () => {
  let tmpDir = ''

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'j-skills-metadata-'))
  })

  it('从 SKILL.md frontmatter 解析 category', () => {
    const skillPath = join(tmpDir, 'agent-browser')
    mkdirSync(skillPath, { recursive: true })

    writeFileSync(
      join(skillPath, 'SKILL.md'),
      `---\nname: agent-browser\ncategory: browser-debug\n---\n\n# Agent Browser\n`,
      'utf-8'
    )

    const metadata = readSkillMetadata(skillPath)
    expect(metadata.category).toBe('browser-debug')
  })

  it('没有 frontmatter 时返回空对象', () => {
    const skillPath = join(tmpDir, 'plain-skill')
    mkdirSync(skillPath, { recursive: true })

    writeFileSync(
      join(skillPath, 'SKILL.md'),
      `# Plain Skill\n\nNo frontmatter here.\n`,
      'utf-8'
    )

    const metadata = readSkillMetadata(skillPath)
    expect(metadata.category).toBeUndefined()
  })

  it('从 package.json fallback 读取 category', () => {
    const skillPath = join(tmpDir, 'npm-skill')
    mkdirSync(skillPath, { recursive: true })

    writeFileSync(
      join(skillPath, 'package.json'),
      JSON.stringify({
        name: '@wangjs-jacky/npm-skill',
        'j-skills': {
          category: 'testing',
        },
      }, null, 2),
      'utf-8'
    )

    const metadata = readSkillMetadata(skillPath)
    expect(metadata.category).toBe('testing')
  })

  it('SKILL.md 优先于 package.json', () => {
    const skillPath = join(tmpDir, 'mixed-skill')
    mkdirSync(skillPath, { recursive: true })

    writeFileSync(
      join(skillPath, 'SKILL.md'),
      `---\ncategory: frontend\n---\n\n# Mixed Skill\n`,
      'utf-8'
    )

    writeFileSync(
      join(skillPath, 'package.json'),
      JSON.stringify({
        'j-skills': {
          category: 'backend',
        },
      }, null, 2),
      'utf-8'
    )

    const metadata = readSkillMetadata(skillPath)
    expect(metadata.category).toBe('frontend')
  })

  it('没有 SKILL.md 和 package.json 时返回空对象', () => {
    const skillPath = join(tmpDir, 'empty-skill')
    mkdirSync(skillPath, { recursive: true })

    const metadata = readSkillMetadata(skillPath)
    expect(metadata.category).toBeUndefined()
  })
})
