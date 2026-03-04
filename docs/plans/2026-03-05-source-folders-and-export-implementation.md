# 源文件夹管理与导出功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 统一管理散落在各处的 skills，支持导出分享给他人

**Architecture:**
- 后端扩展 registry 数据结构，记录源文件夹信息
- 后端新增导出 API，支持复制 skills 到指定目录
- 前端 GUI 显示 skill 来源信息，支持导出操作

**Tech Stack:** Express.js + React + Zustand + Tailwind CSS

---

## Task 1: 扩展 Registry 数据结构

**Files:**
- Modify: `src/lib/registry.ts:17-26`

**Step 1: 添加 SourceFolder 接口**

```typescript
// 在 RegistrySkill 接口后添加

/**
 * 源文件夹记录
 */
export interface SourceFolder {
  path: string              // 文件夹路径
  addedAt: string          // 添加时间
  lastScanned: string      // 最后扫描时间
  skillNames: string[]     // 包含的 skill 名称列表
}
```

**Step 2: 更新 Registry 接口**

```typescript
export interface Registry {
  version: string
  skills: Record<string, RegistrySkill>
  sourceFolders: SourceFolder[]  // 新增
}
```

**Step 3: 更新 readRegistry 默认值**

```typescript
// 在 readRegistry 函数中，更新默认返回值
return {
  version: REGISTRY_VERSION,
  skills: {},
  sourceFolders: [],  // 新增
}
```

**Step 4: 添加源文件夹管理函数**

```typescript
/**
 * 添加源文件夹记录
 */
export function addSourceFolder(folder: SourceFolder): void {
  const registry = readRegistry()
  const existing = registry.sourceFolders.findIndex(f => f.path === folder.path)
  if (existing >= 0) {
    registry.sourceFolders[existing] = folder
  } else {
    registry.sourceFolders.push(folder)
  }
  writeRegistry(registry)
}

/**
 * 获取源文件夹列表
 */
export function listSourceFolders(): SourceFolder[] {
  const registry = readRegistry()
  return registry.sourceFolders || []
}

/**
 * 移除源文件夹记录
 */
export function removeSourceFolder(path: string): boolean {
  const registry = readRegistry()
  const index = registry.sourceFolders.findIndex(f => f.path === path)
  if (index >= 0) {
    registry.sourceFolders.splice(index, 1)
    writeRegistry(registry)
    return true
  }
  return false
}
```

**Step 5: 更新 registerSkill 函数**

```typescript
// 修改 registerSkill，添加 sourceFolder 参数
export function registerSkill(skill: RegistrySkill, sourceFolder?: string): void {
  const registry = readRegistry()
  registry.skills[skill.name] = {
    ...skill,
    sourceFolder,  // 新增：记录来源文件夹
    installedAt: skill.installedAt || new Date().toISOString(),
  }
  writeRegistry(registry)
}
```

**Step 6: 更新 RegistrySkill 接口**

```typescript
export interface RegistrySkill {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  sourceFolder?: string  // 新增：来源文件夹路径
  installedEnvironments?: string[]
  installedAt?: string
  version?: string
}
```

**Step 7: Run tests to verify**

Run: `pnpm --filter @j-skills/cli test` (如果有测试)
Expected: PASS

**Step 8: Commit**

```bash
git add src/lib/registry.ts
git commit -m "feat(registry): 添加源文件夹记录功能"
```

---

## Task 2: 修改批量链接逻辑

**Files:**
- Modify: `packages/server/src/routes/skills.ts:120-180`

**Step 1: 在批量链接时记录源文件夹**

在 `POST /api/skills/link` 路由中，添加源文件夹记录：

```typescript
// 导入新函数
import { addSourceFolder } from '../../../../src/lib/registry.js'

// 在批量链接成功后，记录源文件夹
const linkedSkills: string[] = []
// ... 现有的链接逻辑 ...

if (linkedSkills.length > 0) {
  // 记录源文件夹
  addSourceFolder({
    path: resolvedPath,
    addedAt: new Date().toISOString(),
    lastScanned: new Date().toISOString(),
    skillNames: linkedSkills,
  })
}
```

**Step 2: 注册 skill 时记录来源**

```typescript
registerSkill({
  name: skillName,
  path: subDirPath,
  source: 'linked',
  sourceFolder: resolvedPath,  // 新增
})
```

**Step 3: Commit**

```bash
git add packages/server/src/routes/skills.ts
git commit -m "feat(server): 批量链接时记录源文件夹"
```

---

## Task 3: 添加源文件夹 API

**Files:**
- Modify: `packages/server/src/routes/skills.ts`

**Step 1: 添加 GET /api/source-folders 路由**

```typescript
import { listSourceFolders, removeSourceFolder } from '../../../../src/lib/registry.js'

// GET /api/source-folders - 获取源文件夹列表
router.get('/source-folders', (_req, res) => {
  try {
    const folders = listSourceFolders()
    res.json({ success: true, data: folders, error: null })
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: (err as Error).message,
    })
  }
})

// DELETE /api/source-folders/:path - 移除源文件夹记录
router.delete('/source-folders/*', (req, res) => {
  try {
    const folderPath = decodeURIComponent(req.params[0])
    const removed = removeSourceFolder(folderPath)
    res.json({ success: removed, data: { path: folderPath }, error: null })
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: (err as Error).message,
    })
  }
})
```

**Step 2: Commit**

```bash
git add packages/server/src/routes/skills.ts
git commit -m "feat(server): 添加源文件夹管理 API"
```

---

## Task 4: 添加导出 API

**Files:**
- Modify: `packages/server/src/routes/skills.ts`

**Step 1: 添加导出路由**

```typescript
import { cpSync, mkdirSync } from 'fs'
import { join, basename } from 'path'

// POST /api/skills/export - 导出 skills
router.post('/export', (req, res) => {
  try {
    const { skillNames, targetPath } = req.body

    if (!skillNames || !Array.isArray(skillNames) || skillNames.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'skillNames array is required',
      })
    }

    if (!targetPath) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'targetPath is required',
      })
    }

    // 确保目标目录存在
    mkdirSync(targetPath, { recursive: true })

    const exported: string[] = []
    const errors: string[] = []

    for (const skillName of skillNames) {
      const skill = getSkill(skillName)
      if (!skill) {
        errors.push(`Skill "${skillName}" not found`)
        continue
      }

      try {
        const destPath = join(targetPath, skillName)
        // 如果目标已存在，先删除
        if (existsSync(destPath)) {
          rmSync(destPath, { recursive: true, force: true })
        }
        // 复制实际文件
        cpSync(skill.path, destPath, { recursive: true })
        exported.push(skillName)
      } catch (err) {
        errors.push(`Failed to export "${skillName}": ${(err as Error).message}`)
      }
    }

    res.json({
      success: errors.length === 0,
      data: { exported, errors, targetPath },
      error: errors.length > 0 ? errors.join('; ') : null,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: (err as Error).message,
    })
  }
})
```

**Step 2: Commit**

```bash
git add packages/server/src/routes/skills.ts
git commit -m "feat(server): 添加 skills 导出 API"
```

---

## Task 5: 前端 API 客户端更新

**Files:**
- Modify: `packages/web/src/api/client.ts`

**Step 1: 添加类型定义**

```typescript
export interface SourceFolder {
  path: string
  addedAt: string
  lastScanned: string
  skillNames: string[]
}
```

**Step 2: 添加 API 方法**

```typescript
// 在 skillsApi 中添加
export const skillsApi = {
  // ... 现有方法 ...

  // 源文件夹管理
  listSourceFolders: () =>
    api.get('skills/source-folders').json<ApiResponse<SourceFolder[]>>(),

  removeSourceFolder: (path: string) =>
    api.delete(`skills/source-folders/${encodeURIComponent(path)}`).json<ApiResponse<{ path: string }>>(),

  // 导出
  export: (skillNames: string[], targetPath: string) =>
    api.post('skills/export', { json: { skillNames, targetPath } }).json<ApiResponse<{ exported: string[]; errors: string[]; targetPath: string }>>(),
}
```

**Step 3: 更新 SkillInfo 类型**

```typescript
export interface SkillInfo {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  sourceFolder?: string  // 新增
  installedEnvironments?: string[]
  installedAt?: string
}
```

**Step 4: Commit**

```bash
git add packages/web/src/api/client.ts
git commit -m "feat(web): 添加源文件夹和导出 API 客户端"
```

---

## Task 6: Skills 页面显示来源信息

**Files:**
- Modify: `packages/web/src/pages/Skills/SkillCard.tsx`

**Step 1: 显示来源文件夹**

在 SkillCard 组件中添加来源信息显示：

```tsx
// 在 skill.path 显示区域下方添加
{skill.sourceFolder && (
  <div className="mt-2 text-xs text-[var(--color-text-muted)]">
    <span className="opacity-60">From: </span>
    <span className="font-mono">{skill.sourceFolder}</span>
  </div>
)}
```

**Step 2: Commit**

```bash
git add packages/web/src/pages/Skills/SkillCard.tsx
git commit -m "feat(web): Skill 卡片显示来源文件夹"
```

---

## Task 7: 添加导出功能到 GUI

**Files:**
- Modify: `packages/web/src/pages/Skills/index.tsx`
- Modify: `packages/web/src/pages/Skills/SkillList.tsx`
- Modify: `packages/web/src/pages/Skills/SkillCard.tsx`

**Step 1: 在 SkillCard 添加导出按钮**

```tsx
// 添加 export 图标导入
import { Package, Trash2, Terminal, MousePointer2, Download } from 'lucide-react'

// 添加 onExport prop
interface SkillCardProps {
  skill: SkillInfo
  onUnlink: (name: string) => void
  onToggleEnv: (name: string, env: string, enable: boolean) => void
  onExport: (name: string) => void  // 新增
}

// 在操作按钮区域添加导出按钮
<button
  onClick={() => onExport(skill.name)}
  className="p-2 hover:bg-[var(--color-blue-dim)] rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-blue)]"
  title="Export"
>
  <Download size={16} />
</button>
```

**Step 2: 在 SkillsPage 添加导出处理函数**

```tsx
// 添加状态
const [exportingSkill, setExportingSkill] = useState<string | null>(null)

// 添加导出函数
async function handleExport(name: string) {
  // 使用系统文件选择器（需要 electron 或其他方式）
  // 简化版本：导出到 ~/Downloads/j-skills-export/
  const defaultPath = join(process.env.HOME || '~', 'Downloads', 'j-skills-export')

  try {
    const response = await skillsApi.export([name], defaultPath)
    if (response.success) {
      showToast(`Exported ${name} to ${defaultPath}`, 'success')
    }
  } catch (err) {
    showToast('Failed to export skill', 'error')
  }
}
```

**Step 3: Commit**

```bash
git add packages/web/src/pages/Skills/
git commit -m "feat(web): 添加单个 skill 导出功能"
```

---

## Task 8: 测试与验证

**Step 1: 重启服务测试**

```bash
# 重启 server 和 web
pnpm --filter @j-skills/server dev &
pnpm --filter @j-skills/web dev &
```

**Step 2: 手动测试清单**

- [ ] 批量链接文件夹后，检查 registry.json 是否记录了 sourceFolders
- [ ] Skills 页面是否显示来源信息
- [ ] 点击导出按钮是否正常工作
- [ ] API GET /api/source-folders 是否返回正确数据

**Step 3: Final Commit**

```bash
git add -A
git commit -m "feat: 完成源文件夹管理与导出功能"
git push origin main
```

---

## 后续优化（可选）

- [ ] 添加批量导出功能（选择多个 skills）
- [ ] 添加源文件夹管理页面
- [ ] 添加重新扫描功能
- [ ] 导出时支持选择目标目录
