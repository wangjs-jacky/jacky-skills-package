import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

const root = resolve(__dirname, '../..')
const cargoToml = readFileSync(resolve(root, 'src-tauri/Cargo.toml'), 'utf-8')
const mainRs = readFileSync(resolve(root, 'src-tauri/src/main.rs'), 'utf-8')
const capabilities = JSON.parse(
  readFileSync(resolve(root, 'src-tauri/capabilities/default.json'), 'utf-8'),
)

// 从 Cargo.toml 提取所有 tauri-plugin-xxx 依赖名
const pluginDeps = [...cargoToml.matchAll(/tauri-plugin-(\w+)/g)].map((m) => m[1])

// 递归读取目录下所有 .ts/.tsx 文件内容
function readAllSourceFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      results.push(...readAllSourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(readFileSync(full, 'utf-8'))
    }
  }
  return results
}

// 扫描前端代码中实际 import 的 @tauri-apps/plugin-xxx
const webSrc = resolve(root, 'web/src')
const allSourceContents = readAllSourceFiles(webSrc)
const frontendPlugins = new Set<string>()
for (const content of allSourceContents) {
  for (const m of content.matchAll(/@tauri-apps\/plugin-(\w+)/g)) {
    frontendPlugins.add(m[1])
  }
}

describe('Tauri 插件注册一致性', () => {
  // 校验链路：前端 import → Cargo.toml 声明 → main.rs 注册 → capabilities 权限
  // 任何一环断裂，运行时就会报 "plugin not registered" 或权限错误

  it('前端使用的插件必须在 main.rs 中注册 .plugin()', () => {
    const missing: string[] = []

    for (const plugin of frontendPlugins) {
      if (plugin === 'log') {
        if (!mainRs.includes('tauri_plugin_log')) missing.push(plugin)
        continue
      }
      if (!mainRs.includes(`tauri_plugin_${plugin}::init()`)) {
        missing.push(plugin)
      }
    }

    expect(
      missing,
      `以下插件前端有使用但 main.rs 未注册: ${missing.join(', ')}`,
    ).toEqual([])
  })

  it('前端使用的插件必须在 capabilities/default.json 中声明权限', () => {
    const permissionMap: Record<string, string> = {
      dialog: 'dialog:default',
      fs: 'fs:default',
      shell: 'shell:default',
    }

    const permissions: string[] = capabilities.permissions
    const missing: string[] = []

    for (const plugin of frontendPlugins) {
      const perm = permissionMap[plugin]
      if (perm && !permissions.includes(perm)) {
        missing.push(`${plugin} → ${perm}`)
      }
    }

    expect(missing, `以下权限缺失: ${missing.join(', ')}`).toEqual([])
  })
})
