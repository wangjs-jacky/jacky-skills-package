import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../..')

// 从 Node.js 底层读取完整的环境定义
import {
  ENVIRONMENTS,
  getAllowedEnvironments,
  type Environment,
} from '../../packages/cli/src/lib/environments'

describe('扩展环境配置项 Harness', () => {
  // M1: Node.js 底层定义完整性
  describe('M1: Node.js ENVIRONMENTS 完整性', () => {
    it('should define all expected environment types', () => {
      const envs = getAllowedEnvironments()
      expect(envs.length).toBeGreaterThanOrEqual(39)
    })

    it('should have name, label, globalPath, projectPaths for each env', () => {
      const envs = getAllowedEnvironments()
      for (const env of envs) {
        const config = ENVIRONMENTS[env]
        expect(config.name).toBeTruthy()
        expect(config.label).toBeTruthy()
        expect(config.globalPath).toBeTruthy()
        expect(config.projectPaths.length).toBeGreaterThan(0)
      }
    })

    it('should include all expected environment names', () => {
      const expected: Environment[] = [
        'amp', 'antigravity', 'augment', 'claude-code', 'openclaw',
        'cline', 'codebuddy', 'codex', 'command-code', 'continue',
        'crush', 'cursor', 'droid', 'gemini-cli', 'github-copilot',
        'goose', 'junie', 'iflow-cli', 'kilo', 'kiro-cli',
        'kode', 'mcpjam', 'mistral-vibe', 'mux', 'opencode',
        'openhands', 'pi', 'qoder', 'qwen-code', 'roo',
        'trae', 'trae-cn', 'windsurf', 'zencoder', 'neovate',
        'pochi', 'adal', 'kimi-cli', 'replit',
      ]
      const actual = getAllowedEnvironments()
      for (const name of expected) {
        expect(actual).toContain(name)
      }
    })
  })

  // M2 + M3: Rust 与 Node.js 一致性
  describe('M2+M3: Rust env_definitions 与 Node.js 一致性', () => {
    // 解析 Rust env_definitions 函数，提取所有环境名
    function parseRustEnvNames(): string[] {
      const rustFile = readFileSync(
        resolve(root, 'src-tauri/src/commands/skills.rs'),
        'utf-8',
      )
      // 匹配 name: "xxx".to_string()
      const matches = [...rustFile.matchAll(/name:\s*"([^"]+)"/g)]
      return matches.map((m) => m[1])
    }

    // 解析 Rust env_definitions 函数，提取所有环境 label
    function parseRustEnvLabels(): Map<string, string> {
      const rustFile = readFileSync(
        resolve(root, 'src-tauri/src/commands/skills.rs'),
        'utf-8',
      )
      const nameMatches = [...rustFile.matchAll(/name:\s*"([^"]+)"/g)]
      const labelMatches = [...rustFile.matchAll(/label:\s*"([^"]+)"/g)]

      const map = new Map<string, string>()
      for (let i = 0; i < nameMatches.length; i++) {
        if (i < labelMatches.length) {
          map.set(nameMatches[i][1], labelMatches[i][1])
        }
      }
      return map
    }

    it('should have same environment count as Node.js', () => {
      const rustNames = parseRustEnvNames()
      const nodeNames = getAllowedEnvironments()
      expect(
        rustNames.length,
        `Rust 有 ${rustNames.length} 种环境, Node.js 有 ${nodeNames.length} 种`,
      ).toBe(nodeNames.length)
    })

    it('should match environment names between Rust and Node.js', () => {
      const rustNames = parseRustEnvNames()
      const nodeNames = getAllowedEnvironments()

      const missing = nodeNames.filter((n) => !rustNames.includes(n))
      const extra = rustNames.filter((n) => !nodeNames.includes(n))

      expect(
        missing,
        `Rust 缺失: ${missing.join(', ')}`,
      ).toEqual([])
      expect(
        extra,
        `Rust 多余: ${extra.join(', ')}`,
      ).toEqual([])
    })

    it('should match environment labels between Rust and Node.js', () => {
      const rustLabels = parseRustEnvLabels()
      const mismatches: string[] = []

      for (const env of getAllowedEnvironments()) {
        const nodeLabel = ENVIRONMENTS[env].label
        const rustLabel = rustLabels.get(env)
        if (rustLabel !== nodeLabel) {
          mismatches.push(
            `${env}: Rust="${rustLabel}" vs Node.js="${nodeLabel}"`,
          )
        }
      }

      expect(
        mismatches,
        `Label 不匹配:\n${mismatches.join('\n')}`,
      ).toEqual([])
    })
  })
})
