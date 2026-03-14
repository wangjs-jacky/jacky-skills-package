# j-skills Profile 系统实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 j-skills CLI 添加 Profile 系统，支持预设配置组合一键切换工作环境

**Architecture:** 扩展现有 j-skills CLI，添加 Profile 管理模块。Profile 存储在 `~/.j-skills/profiles/` 目录，支持全局和项目级切换。

**Tech Stack:** TypeScript, Node.js, @clack/prompts, cac

---

## 文件结构

```
src/
├── lib/
│   ├── paths.ts          # [修改] 添加 getProfilesDir()
│   ├── profiles.ts       # [新建] Profile 存储管理
│   ├── workflows.ts      # [新建] 工作流方案管理
│   └── types.ts          # [新建] 类型定义
├── commands/
│   └── profile.ts        # [新建] profile 命令实现
└── index.ts              # [修改] 注册 profile 命令

~/.j-skills/
├── profiles/
│   ├── _active.json      # 当前激活的 Profile
│   ├── default.json      # 默认 Profile
│   └── ...               # 用户自定义 Profile
└── ...

tests/
└── lib/
    ├── profiles.test.ts  # [新建] Profile 管理测试
    └── workflows.test.ts # [新建] 工作流管理测试
```

---

## Chunk 1: 类型定义与基础工具

### Task 1: 创建类型定义文件

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
/**
 * j-skills 类型定义
 */

/**
 * 工作流方案类型
 */
export type WorkflowType = 'superpowers' | 'openspec' | 'spiderkit' | 'native'

/**
 * Profile Skills 配置
 */
export interface ProfileSkills {
  include: string[]    // 包含的 skills
  exclude?: string[]   // 排除的 skills（用于继承时）
}

/**
 * 插件配置
 */
export interface ProfilePlugin {
  name: string
  version?: string
  enabled: boolean
}

/**
 * IDE 特定配置
 */
export interface ProfileIdeConfig {
  claude?: {
    planMode?: string
    hooks?: Record<string, any>
  }
  cursor?: Record<string, any>
  windsurf?: Record<string, any>
}

/**
 * Profile 元数据
 */
export interface ProfileMetadata {
  author?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

/**
 * Profile 配置
 */
export interface Profile {
  name: string
  description?: string
  version: string
  workflow: WorkflowType
  skills: ProfileSkills
  plugins?: ProfilePlugin[]
  ideConfig?: ProfileIdeConfig
  metadata?: ProfileMetadata
}

/**
 * 活跃 Profile 引用
 */
export interface ActiveProfileRef {
  name: string
  scope: 'global' | 'project'
  activatedAt: string
  projectPath?: string  // 项目级时记录路径
}

/**
 * 工作流方案定义
 */
export interface WorkflowScheme {
  id: WorkflowType
  name: string
  description: string
  plugins: {
    packageId: string
    version?: string
    required: boolean
  }[]
  bundledSkills?: string[]
  conflictsWith?: WorkflowType[]
  config?: Record<string, any>
}
```

- [ ] **Step 2: 提交类型定义**

```bash
git add src/lib/types.ts
git commit -m "feat: 添加 Profile 系统类型定义"
```

---

### Task 2: 扩展路径工具

**Files:**
- Modify: `src/lib/paths.ts:1-75`

- [ ] **Step 1: 添加 getProfilesDir 函数**

在 `src/lib/paths.ts` 末尾添加：

```typescript
/**
 * 获取 Profile 目录路径
 */
export function getProfilesDir(): string {
  return join(getGlobalDir(), 'profiles')
}

/**
 * 获取活跃 Profile 文件路径
 */
export function getActiveProfilePath(): string {
  return join(getProfilesDir(), '_active.json')
}

/**
 * 获取 Profile 文件路径
 */
export function getProfilePath(name: string): string {
  return join(getProfilesDir(), `${name}.json`)
}

/**
 * 获取项目级 Profile 文件路径
 */
export function getProjectProfilePath(projectDir: string = process.cwd()): string {
  return join(projectDir, '.j-skills', 'profile.json')
}
```

- [ ] **Step 2: 更新 ensureGlobalDir 函数**

在 `ensureGlobalDir` 函数中添加 profiles 目录创建：

```typescript
/**
 * 确保全局目录存在
 */
export function ensureGlobalDir(): void {
  const globalDir = getGlobalDir()
  const linkedDir = getLinkedDir()
  const globalSkillsDir = getGlobalSkillsDir()
  const cacheDir = getCacheDir()
  const profilesDir = getProfilesDir()

  const dirs = [globalDir, linkedDir, globalSkillsDir, cacheDir, profilesDir]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}
```

- [ ] **Step 3: 提交路径工具更新**

```bash
git add src/lib/paths.ts
git commit -m "feat: 添加 Profile 目录路径工具函数"
```

---

## Chunk 2: Profile 存储管理

### Task 3: 创建 Profile 管理模块

**Files:**
- Create: `src/lib/profiles.ts`

- [ ] **Step 1: 创建 Profile 存储模块**

```typescript
/**
 * Profile 存储管理
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { basename } from 'path'
import {
  getProfilesDir,
  getActiveProfilePath,
  getProfilePath,
  getProjectProfilePath,
  ensureGlobalDir,
} from './paths.js'
import type { Profile, ActiveProfileRef } from './types.js'

const DEFAULT_PROFILE_NAME = 'default'

/**
 * 获取默认 Profile
 */
export function getDefaultProfile(): Profile {
  return {
    name: DEFAULT_PROFILE_NAME,
    description: '默认 Profile',
    version: '1.0.0',
    workflow: 'superpowers',
    skills: {
      include: [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
    },
  }
}

/**
 * 列出所有 Profile
 */
export function listProfiles(): Profile[] {
  ensureGlobalDir()
  const profilesDir = getProfilesDir()

  if (!existsSync(profilesDir)) {
    return [getDefaultProfile()]
  }

  const files = readdirSync(profilesDir)
  const profiles: Profile[] = []

  for (const file of files) {
    if (file.endsWith('.json') && !file.startsWith('_')) {
      const filePath = getProfilePath(basename(file, '.json'))
      try {
        const content = readFileSync(filePath, 'utf-8')
        profiles.push(JSON.parse(content) as Profile)
      } catch {
        // 忽略解析错误的文件
      }
    }
  }

  // 如果没有找到任何 Profile，返回默认
  if (profiles.length === 0) {
    return [getDefaultProfile()]
  }

  return profiles
}

/**
 * 获取 Profile
 */
export function getProfile(name: string): Profile | null {
  ensureGlobalDir()
  const filePath = getProfilePath(name)

  if (!existsSync(filePath)) {
    if (name === DEFAULT_PROFILE_NAME) {
      return getDefaultProfile()
    }
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as Profile
  } catch {
    return null
  }
}

/**
 * 保存 Profile
 */
export function saveProfile(profile: Profile): void {
  ensureGlobalDir()
  const filePath = getProfilePath(profile.name)

  // 更新 metadata
  if (!profile.metadata) {
    profile.metadata = {}
  }
  profile.metadata.updatedAt = new Date().toISOString()

  writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8')
}

/**
 * 删除 Profile
 */
export function deleteProfile(name: string): boolean {
  ensureGlobalDir()

  // 不允许删除默认 Profile
  if (name === DEFAULT_PROFILE_NAME) {
    return false
  }

  const filePath = getProfilePath(name)
  if (!existsSync(filePath)) {
    return false
  }

  const { unlinkSync } = require('fs')
  unlinkSync(filePath)
  return true
}

/**
 * 获取当前激活的 Profile
 */
export function getActiveProfile(projectDir: string = process.cwd()): {
  profile: Profile
  scope: 'global' | 'project'
} {
  ensureGlobalDir()

  // 优先检查项目级 Profile
  const projectProfilePath = getProjectProfilePath(projectDir)
  if (existsSync(projectProfilePath)) {
    try {
      const content = readFileSync(projectProfilePath, 'utf-8')
      const profile = JSON.parse(content) as Profile
      return { profile, scope: 'project' }
    } catch {
      // 忽略解析错误
    }
  }

  // 检查全局激活的 Profile
  const activePath = getActiveProfilePath()
  if (existsSync(activePath)) {
    try {
      const content = readFileSync(activePath, 'utf-8')
      const ref = JSON.parse(content) as ActiveProfileRef
      const profile = getProfile(ref.name)
      if (profile) {
        return { profile, scope: 'global' }
      }
    } catch {
      // 忽略解析错误
    }
  }

  // 返回默认 Profile
  return { profile: getDefaultProfile(), scope: 'global' }
}

/**
 * 设置激活的 Profile
 */
export function setActiveProfile(
  name: string,
  scope: 'global' | 'project' = 'global',
  projectDir: string = process.cwd()
): boolean {
  ensureGlobalDir()

  const profile = getProfile(name)
  if (!profile) {
    return false
  }

  if (scope === 'project') {
    // 写入项目级 Profile
    const projectProfilePath = getProjectProfilePath(projectDir)
    const { mkdirSync } = require('fs')
    const { dirname } = require('path')

    // 确保目录存在
    const dir = dirname(projectProfilePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    writeFileSync(projectProfilePath, JSON.stringify(profile, null, 2), 'utf-8')
  } else {
    // 写入全局激活引用
    const ref: ActiveProfileRef = {
      name,
      scope: 'global',
      activatedAt: new Date().toISOString(),
    }
    writeFileSync(getActiveProfilePath(), JSON.stringify(ref, null, 2), 'utf-8')

    // 如果有项目级 Profile，删除它
    const projectProfilePath = getProjectProfilePath(projectDir)
    if (existsSync(projectProfilePath)) {
      const { unlinkSync } = require('fs')
      unlinkSync(projectProfilePath)
    }
  }

  return true
}

/**
 * 复制 Profile
 */
export function duplicateProfile(fromName: string, toName: string): Profile | null {
  const source = getProfile(fromName)
  if (!source) {
    return null
  }

  const newProfile: Profile = {
    ...source,
    name: toName,
    description: `${source.description || ''} (复制)`,
    metadata: {
      ...source.metadata,
      createdAt: new Date().toISOString(),
    },
  }

  saveProfile(newProfile)
  return newProfile
}

/**
 * 检查 Profile 是否存在
 */
export function profileExists(name: string): boolean {
  ensureGlobalDir()
  return existsSync(getProfilePath(name))
}
```

- [ ] **Step 2: 提交 Profile 管理模块**

```bash
git add src/lib/profiles.ts
git commit -m "feat: 添加 Profile 存储管理模块"
```

---

### Task 4: 创建 Profile 命令

**Files:**
- Create: `src/commands/profile.ts`

- [ ] **Step 1: 创建 profile 命令模块**

```typescript
/**
 * profile 命令 - 管理 Profile
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { isCancel } from '@clack/prompts'
import {
  listProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  getActiveProfile,
  setActiveProfile,
  duplicateProfile,
  profileExists,
  getDefaultProfile,
} from '../lib/profiles.js'
import { success, error, info, warn } from '../lib/log.js'
import type { Profile, WorkflowType } from '../lib/types.js'

/**
 * 注册 profile 命令
 */
export function registerProfileCommand(cli: ReturnType<typeof cac>): void {
  const profile = cli.command('profile', 'Manage profiles')

  // profile list
  profile
    .command('list', 'List all profiles')
    .alias('ls')
    .option('--json', 'Output as JSON')
    .action((options?: { json?: boolean }) => {
      const profiles = listProfiles()
      const { profile: active } = getActiveProfile()

      if (options?.json) {
        console.log(JSON.stringify({
          profiles,
          active: active.name,
        }, null, 2))
        return
      }

      p.intro(`Profiles (${profiles.length})`)

      for (const prof of profiles) {
        const isActive = prof.name === active.name
        const prefix = isActive ? '● ' : '○ '
        const color = isActive ? '\x1b[32m' : '\x1b[90m'
        const reset = '\x1b[0m'

        console.log('')
        console.log(`  ${color}${prefix}${prof.name}${reset}`)
        if (prof.description) {
          console.log(`    ${prof.description}`)
        }
        console.log(`    Workflow: ${prof.workflow}`)
        console.log(`    Skills: ${prof.skills.include.length}`)
        if (isActive) {
          console.log(`    \x1b[32m(active)\x1b[0m`)
        }
      }

      console.log('')
    })

  // profile show
  profile
    .command('show [name]', 'Show profile details')
    .option('--json', 'Output as JSON')
    .action((name?: string, options?: { json?: boolean }) => {
      const targetName = name || getActiveProfile().profile.name
      const prof = getProfile(targetName)

      if (!prof) {
        error(`Profile "${targetName}" not found.`)
        process.exit(1)
      }

      if (options?.json) {
        console.log(JSON.stringify(prof, null, 2))
        return
      }

      p.intro(`Profile: ${prof.name}`)
      console.log('')
      console.log(`  Description: ${prof.description || '(无)'}`)
      console.log(`  Version: ${prof.version}`)
      console.log(`  Workflow: ${prof.workflow}`)
      console.log('')
      console.log(`  Skills (${prof.skills.include.length}):`)
      for (const skill of prof.skills.include) {
        console.log(`    - ${skill}`)
      }
      if (prof.skills.exclude?.length) {
        console.log(`  Excluded (${prof.skills.exclude.length}):`)
        for (const skill of prof.skills.exclude) {
          console.log(`    - ${skill}`)
        }
      }
      if (prof.plugins?.length) {
        console.log('')
        console.log(`  Plugins (${prof.plugins.length}):`)
        for (const plugin of prof.plugins) {
          const status = plugin.enabled ? '✓' : '✗'
          console.log(`    ${status} ${plugin.name}${plugin.version ? `@${plugin.version}` : ''}`)
        }
      }
      console.log('')
    })

  // profile use
  profile
    .command('use [name]', 'Switch to a profile')
    .option('-p, --project', 'Set as project-level profile')
    .action(async (name?: string, options?: { project?: boolean }) => {
      const profiles = listProfiles()

      if (profiles.length === 0) {
        warn('No profiles found. Create one first.')
        return
      }

      let targetName = name

      if (!targetName) {
        const { profile: current } = getActiveProfile()
        const selected = await p.select({
          message: 'Select a profile to activate',
          options: profiles.map((p) => ({
            value: p.name,
            label: p.name + (p.name === current.name ? ' (current)' : ''),
            hint: p.description || p.workflow,
          })),
        })

        if (isCancel(selected)) {
          p.cancel('Operation cancelled.')
          return
        }

        targetName = selected as string
      }

      if (!profileExists(targetName)) {
        error(`Profile "${targetName}" not found.`)
        process.exit(1)
      }

      const scope = options?.project ? 'project' : 'global'
      const prof = getProfile(targetName)!

      const s = p.spinner()
      s.start(`Activating profile "${targetName}"...`)

      const ok = setActiveProfile(targetName, scope)
      if (ok) {
        s.stop(`Activated profile "${targetName}" (${scope})`)
        success(`Workflow: ${prof.workflow}`)
        success(`Skills: ${prof.skills.include.length} enabled`)
      } else {
        s.stop('Failed to activate profile')
        error('Failed to activate profile')
        process.exit(1)
      }
    })

  // profile current
  profile
    .command('current', 'Show current active profile')
    .option('--json', 'Output as JSON')
    .action((options?: { json?: boolean }) => {
      const { profile: prof, scope } = getActiveProfile()

      if (options?.json) {
        console.log(JSON.stringify({
          profile: prof,
          scope,
        }, null, 2))
        return
      }

      p.intro('Current Profile')
      console.log('')
      console.log(`  Name: ${prof.name}`)
      console.log(`  Scope: ${scope}`)
      console.log(`  Workflow: ${prof.workflow}`)
      console.log(`  Skills: ${prof.skills.include.length}`)
      console.log('')
    })

  // profile create
  profile
    .command('create [name]', 'Create a new profile')
    .action(async (name?: string) => {
      p.intro('Create Profile')

      const profileName = name || await p.text({
        message: 'Profile name',
        placeholder: 'my-profile',
        validate: (value) => {
          if (!value) return 'Name is required'
          if (profileExists(value)) return 'Profile already exists'
          return undefined
        },
      })

      if (isCancel(profileName)) {
        p.cancel('Operation cancelled.')
        return
      }

      const description = await p.text({
        message: 'Description (optional)',
        placeholder: 'My custom profile',
      })

      if (isCancel(description)) {
        p.cancel('Operation cancelled.')
        return
      }

      const workflow = await p.select({
        message: 'Select workflow',
        options: [
          { value: 'superpowers', label: 'Superpowers', hint: 'Vercel 工作流' },
          { value: 'openspec', label: 'OpenSpec', hint: '实验性工作流' },
          { value: 'spiderkit', label: 'SpiderKit', hint: '爬虫工具集' },
          { value: 'native', label: 'Native', hint: 'Claude Code 原生' },
        ],
      }) as WorkflowType | symbol

      if (isCancel(workflow)) {
        p.cancel('Operation cancelled.')
        return
      }

      // 创建 Profile
      const newProfile: Profile = {
        name: profileName as string,
        description: description as string || undefined,
        version: '1.0.0',
        workflow: workflow as WorkflowType,
        skills: {
          include: [],
        },
        metadata: {
          createdAt: new Date().toISOString(),
        },
      }

      saveProfile(newProfile)
      success(`Profile "${profileName}" created.`)
      info(`Add skills with: j-skills profile edit ${profileName}`)
    })

  // profile delete
  profile
    .command('delete [name]', 'Delete a profile')
    .alias('rm')
    .action(async (name?: string) => {
      if (name === 'default') {
        error('Cannot delete default profile.')
        return
      }

      const targetName = name || await p.text({
        message: 'Profile name to delete',
        validate: (value) => {
          if (!value) return 'Name is required'
          if (!profileExists(value)) return 'Profile not found'
          return undefined
        },
      })

      if (isCancel(targetName)) {
        p.cancel('Operation cancelled.')
        return
      }

      const confirm = await p.confirm({
        message: `Delete profile "${targetName}"?`,
        initialValue: false,
      })

      if (isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled.')
        return
      }

      const ok = deleteProfile(targetName as string)
      if (ok) {
        success(`Profile "${targetName}" deleted.`)
      } else {
        error(`Failed to delete profile "${targetName}".`)
      }
    })

  // profile duplicate
  profile
    .command('duplicate <from> <to>', 'Duplicate a profile')
    .alias('cp')
    .action((from: string, to: string) => {
      if (profileExists(to)) {
        error(`Profile "${to}" already exists.`)
        return
      }

      const newProfile = duplicateProfile(from, to)
      if (newProfile) {
        success(`Profile "${from}" duplicated to "${to}".`)
      } else {
        error(`Failed to duplicate profile "${from}".`)
      }
    })

  // profile export
  profile
    .command('export [name]', 'Export profile to JSON')
    .action((name?: string) => {
      const targetName = name || getActiveProfile().profile.name
      const prof = getProfile(targetName)

      if (!prof) {
        error(`Profile "${targetName}" not found.`)
        return
      }

      console.log(JSON.stringify(prof, null, 2))
    })

  // profile import
  profile
    .command('import <file>', 'Import profile from JSON file')
    .action(async (file: string) => {
      const { readFileSync } = require('fs')

      try {
        const content = readFileSync(file, 'utf-8')
        const prof = JSON.parse(content) as Profile

        if (!prof.name) {
          error('Invalid profile: missing name')
          return
        }

        if (profileExists(prof.name)) {
          const overwrite = await p.confirm({
            message: `Profile "${prof.name}" exists. Overwrite?`,
            initialValue: false,
          })

          if (!overwrite) {
            info('Import cancelled.')
            return
          }
        }

        saveProfile(prof)
        success(`Profile "${prof.name}" imported.`)
      } catch (err) {
        error(`Failed to import: ${(err as Error).message}`)
      }
    })
}
```

- [ ] **Step 2: 提交 profile 命令模块**

```bash
git add src/commands/profile.ts
git commit -m "feat: 添加 profile 命令实现"
```

---

### Task 5: 注册 profile 命令

**Files:**
- Modify: `src/index.ts:1-105`

- [ ] **Step 1: 导入并注册 profile 命令**

在 `src/index.ts` 中添加：

```typescript
// 在导入区域添加
import { registerProfileCommand } from './commands/profile.js'

// 在注册命令区域添加
registerProfileCommand(cli)
```

完整修改后的文件：

```typescript
/**
 * j-skills CLI 入口
 * CLI tool for managing Claude Code Skills
 */
import { cac } from 'cac'
import { setVerboseMode, error, info } from './lib/log.js'

// 导入命令
import { registerLinkCommand } from './commands/link.js'
import { registerInstallCommand } from './commands/install.js'
import { registerUninstallCommand } from './commands/uninstall.js'
import { registerListCommand } from './commands/list.js'
import { registerConfigCommand } from './commands/config.js'
import { registerProfileCommand } from './commands/profile.js'  // 新增

// 版本号
const VERSION = '0.3.0'

// 创建 CLI 实例
const cli = cac('j-skills')

// 全局选项
cli.version(VERSION)
cli.help()
cli.option('--verbose', 'Show detailed logs', { default: false })

// 注册命令
registerLinkCommand(cli)
registerInstallCommand(cli)
registerUninstallCommand(cli)
registerListCommand(cli)
registerConfigCommand(cli)
registerProfileCommand(cli)  // 新增

// ... 其余代码不变
```

- [ ] **Step 2: 构建并测试**

```bash
npm run build
node dist/index.js profile --help
```

Expected:
```
j-skills/profile

Usage:
  $ j-skills profile <command> [options]

Commands:
  list     List all profiles
  show     Show profile details
  use      Switch to a profile
  current  Show current active profile
  create   Create a new profile
  delete   Delete a profile
  duplicate  Duplicate a profile
  export   Export profile to JSON
  import   Import profile from JSON
```

- [ ] **Step 3: 提交命令注册**

```bash
git add src/index.ts
git commit -m "feat: 注册 profile 命令到 CLI"
```

---

## Chunk 3: 工作流方案管理

### Task 6: 创建工作流方案模块

**Files:**
- Create: `src/lib/workflows.ts`

- [ ] **Step 1: 创建工作流方案管理模块**

```typescript
/**
 * 工作流方案管理
 */
import type { WorkflowScheme, WorkflowType } from './types.js'

/**
 * 预定义工作流方案
 */
const WORKFLOW_SCHEMES: WorkflowScheme[] = [
  {
    id: 'superpowers',
    name: 'Superpowers',
    description: 'Vercel 官方工作流，包含 brainstorming、TDD、code review 等',
    plugins: [
      {
        packageId: 'superpowers@superpowers-marketplace',
        required: true,
      },
    ],
    bundledSkills: [
      'brainstorming',
      'test-driven-development',
      'systematic-debugging',
      'writing-plans',
      'executing-plans',
      'code-review',
    ],
    conflictsWith: ['openspec'],
  },
  {
    id: 'openspec',
    name: 'OpenSpec',
    description: '实验性工作流，基于 artifact 的变更管理',
    plugins: [],
    bundledSkills: [
      'openspec-explore',
      'openspec-new-change',
      'openspec-apply-change',
      'openspec-verify-change',
    ],
    conflictsWith: ['superpowers'],
  },
  {
    id: 'spiderkit',
    name: 'SpiderKit',
    description: '爬虫工具集',
    plugins: [],
    bundledSkills: [],
    conflictsWith: [],
  },
  {
    id: 'native',
    name: 'Claude Code Native',
    description: 'Claude Code 原生模式，不使用额外工作流',
    plugins: [],
    bundledSkills: [],
    conflictsWith: [],
  },
]

/**
 * 获取所有工作流方案
 */
export function listWorkflows(): WorkflowScheme[] {
  return WORKFLOW_SCHEMES
}

/**
 * 获取工作流方案
 */
export function getWorkflow(id: WorkflowType): WorkflowScheme | undefined {
  return WORKFLOW_SCHEMES.find((w) => w.id === id)
}

/**
 * 检查工作流是否可用
 */
export function isWorkflowAvailable(id: WorkflowType): boolean {
  return WORKFLOW_SCHEMES.some((w) => w.id === id)
}

/**
 * 获取与指定工作流冲突的方案
 */
export function getConflictingWorkflows(id: WorkflowType): WorkflowType[] {
  const workflow = getWorkflow(id)
  return workflow?.conflictsWith || []
}

/**
 * 检查两个工作流是否冲突
 */
export function areWorkflowsConflicting(
  id1: WorkflowType,
  id2: WorkflowType
): boolean {
  const conflicts = getConflictingWorkflows(id1)
  return conflicts.includes(id2)
}

/**
 * 获取工作流的绑定 skills
 */
export function getWorkflowBundledSkills(id: WorkflowType): string[] {
  const workflow = getWorkflow(id)
  return workflow?.bundledSkills || []
}

/**
 * 获取工作流需要的插件
 */
export function getWorkflowRequiredPlugins(id: WorkflowType): string[] {
  const workflow = getWorkflow(id)
  if (!workflow) return []

  return workflow.plugins
    .filter((p) => p.required)
    .map((p) => p.packageId)
}
```

- [ ] **Step 2: 提交工作流模块**

```bash
git add src/lib/workflows.ts
git commit -m "feat: 添加工作流方案管理模块"
```

---

## Chunk 4: 预设 Profile 创建

### Task 7: 创建默认 Profile 初始化

**Files:**
- Modify: `src/lib/profiles.ts`

- [ ] **Step 1: 添加初始化默认 Profile 功能**

在 `src/lib/profiles.ts` 末尾添加：

```typescript
/**
 * 初始化默认 Profiles
 */
export function initializeDefaultProfiles(): void {
  ensureGlobalDir()

  // 如果 default.json 不存在，创建它
  if (!profileExists('default')) {
    saveProfile(getDefaultProfile())
  }

  // 创建 frontend Profile
  if (!profileExists('frontend')) {
    const frontendProfile: Profile = {
      name: 'frontend',
      description: '前端开发配置 - React + TypeScript',
      version: '1.0.0',
      workflow: 'superpowers',
      skills: {
        include: [
          'react-best-practices',
          'composition-patterns',
          'web-design-guidelines',
          'brainstorming',
          'test-driven-development',
        ],
      },
      plugins: [
        {
          name: 'superpowers@superpowers-marketplace',
          enabled: true,
        },
      ],
      metadata: {
        tags: ['frontend', 'react', 'typescript'],
        createdAt: new Date().toISOString(),
      },
    }
    saveProfile(frontendProfile)
  }

  // 创建 backend Profile
  if (!profileExists('backend')) {
    const backendProfile: Profile = {
      name: 'backend',
      description: '后端开发配置 - Node.js + API',
      version: '1.0.0',
      workflow: 'superpowers',
      skills: {
        include: [
          'brainstorming',
          'test-driven-development',
          'systematic-debugging',
        ],
      },
      plugins: [
        {
          name: 'superpowers@superpowers-marketplace',
          enabled: true,
        },
      ],
      metadata: {
        tags: ['backend', 'nodejs', 'api'],
        createdAt: new Date().toISOString(),
      },
    }
    saveProfile(backendProfile)
  }
}
```

- [ ] **Step 2: 在 CLI 启动时初始化**

修改 `src/index.ts`，在命令注册前添加初始化：

```typescript
// 在导入区域添加
import { initializeDefaultProfiles } from './lib/profiles.js'
import { ensureGlobalDir } from './lib/paths.js'

// 在 cli 实例创建后添加
ensureGlobalDir()
initializeDefaultProfiles()
```

- [ ] **Step 3: 提交默认 Profile 初始化**

```bash
git add src/lib/profiles.ts src/index.ts
git commit -m "feat: 添加默认 Profile 初始化"
```

---

## Chunk 5: 测试与文档

### Task 8: 添加单元测试

**Files:**
- Create: `tests/lib/profiles.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import {
  listProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  profileExists,
  getDefaultProfile,
} from '../../src/lib/profiles.js'
import type { Profile } from '../../src/lib/types.js'

// 测试用的临时目录
const TEST_DIR = join(process.cwd(), '.test-profiles')

describe('Profile Management', () => {
  beforeEach(() => {
    // 创建测试目录
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true })
    }
  })

  afterEach(() => {
    // 清理测试目录
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  describe('getDefaultProfile', () => {
    it('should return default profile with correct structure', () => {
      const profile = getDefaultProfile()

      expect(profile.name).toBe('default')
      expect(profile.version).toBe('1.0.0')
      expect(profile.workflow).toBe('superpowers')
      expect(profile.skills.include).toEqual([])
    })
  })

  describe('saveProfile and getProfile', () => {
    it('should save and retrieve a profile', () => {
      const testProfile: Profile = {
        name: 'test-profile',
        description: 'Test description',
        version: '1.0.0',
        workflow: 'superpowers',
        skills: { include: ['skill1', 'skill2'] },
      }

      saveProfile(testProfile)
      const retrieved = getProfile('test-profile')

      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('test-profile')
      expect(retrieved?.description).toBe('Test description')
      expect(retrieved?.skills.include).toEqual(['skill1', 'skill2'])
    })
  })

  describe('listProfiles', () => {
    it('should list all profiles', () => {
      const profiles = listProfiles()

      expect(Array.isArray(profiles)).toBe(true)
      expect(profiles.length).toBeGreaterThan(0)
    })
  })

  describe('deleteProfile', () => {
    it('should delete an existing profile', () => {
      const testProfile: Profile = {
        name: 'to-delete',
        version: '1.0.0',
        workflow: 'native',
        skills: { include: [] },
      }

      saveProfile(testProfile)
      expect(profileExists('to-delete')).toBe(true)

      const result = deleteProfile('to-delete')
      expect(result).toBe(true)
      expect(profileExists('to-delete')).toBe(false)
    })

    it('should not delete default profile', () => {
      const result = deleteProfile('default')
      expect(result).toBe(false)
    })
  })

  describe('profileExists', () => {
    it('should return true for existing profile', () => {
      const testProfile: Profile = {
        name: 'existing',
        version: '1.0.0',
        workflow: 'native',
        skills: { include: [] },
      }

      saveProfile(testProfile)
      expect(profileExists('existing')).toBe(true)
    })

    it('should return false for non-existing profile', () => {
      expect(profileExists('non-existing')).toBe(false)
    })
  })
})
```

- [ ] **Step 2: 运行测试**

```bash
npm test
```

Expected: 所有测试通过

- [ ] **Step 3: 提交测试文件**

```bash
git add tests/lib/profiles.test.ts
git commit -m "test: 添加 Profile 管理单元测试"
```

---

### Task 9: 更新 README 文档

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 添加 Profile 命令文档**

在 README.md 中添加 Profile 管理部分：

```markdown
## Profile 管理

Profile 是一组预设的配置组合，包含 Skills 列表和工作流方案。

### 查看 Profile

```bash
# 列出所有 Profile
j-skills profile list

# 查看当前激活的 Profile
j-skills profile current

# 查看 Profile 详情
j-skills profile show frontend
```

### 切换 Profile

```bash
# 全局切换
j-skills profile use frontend

# 项目级切换（只在当前项目生效）
j-skills profile use frontend -p
```

### 创建和管理 Profile

```bash
# 交互式创建
j-skills profile create

# 复制 Profile
j-skills profile duplicate frontend my-frontend

# 删除 Profile
j-skills profile delete my-frontend

# 导出/导入
j-skills profile export frontend > frontend.json
j-skills profile import frontend.json
```

### Profile 配置结构

```json
{
  "name": "frontend",
  "description": "前端开发配置",
  "version": "1.0.0",
  "workflow": "superpowers",
  "skills": {
    "include": ["react-best-practices", "composition-patterns"]
  },
  "plugins": [
    { "name": "superpowers@superpowers-marketplace", "enabled": true }
  ]
}
```
```

- [ ] **Step 2: 提交文档更新**

```bash
git add README.md
git commit -m "docs: 添加 Profile 管理文档"
```

---

## Chunk 6: 发布准备

### Task 10: 版本更新与发布

**Files:**
- Modify: `package.json`
- Modify: `src/index.ts`

- [ ] **Step 1: 更新版本号**

在 `package.json` 中更新版本：

```json
{
  "version": "0.4.0"
}
```

在 `src/index.ts` 中更新版本：

```typescript
const VERSION = '0.4.0'
```

- [ ] **Step 2: 构建并测试**

```bash
npm run build
node dist/index.js --version
```

Expected: `0.4.0`

- [ ] **Step 3: 提交版本更新**

```bash
git add package.json src/index.ts
git commit -m "chore: 发布 v0.4.0"
```

- [ ] **Step 4: 创建 Git Tag**

```bash
git tag v0.4.0
git push origin main --tags
```

---

## 实现检查清单

- [ ] Phase 1: Profile 基础系统
  - [ ] 类型定义 (`src/lib/types.ts`)
  - [ ] 路径工具扩展 (`src/lib/paths.ts`)
  - [ ] Profile 存储管理 (`src/lib/profiles.ts`)
  - [ ] profile 命令实现 (`src/commands/profile.ts`)
  - [ ] CLI 命令注册 (`src/index.ts`)

- [ ] Phase 2: 工作流方案管理
  - [ ] 工作流方案定义 (`src/lib/workflows.ts`)

- [ ] Phase 3: 默认配置
  - [ ] 预设 Profile 初始化

- [ ] Phase 4: 测试与文档
  - [ ] 单元测试
  - [ ] README 文档

- [ ] Phase 5: 发布
  - [ ] 版本更新
  - [ ] Git Tag

---

## 后续计划 (Phase 4 - 智能推荐)

后期实现，不在本次范围：
- 项目类型检测
- 自动推荐 Profile
- `j-skills recommend` 命令
- `j-skills init` 命令
