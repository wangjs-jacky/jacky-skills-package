# 前端测试 Mock 方案

> 本项目前端测试是 DOM 快照测试（非函数级单元测试），关注"用户看到什么"。
> Tauri 桌面应用中存在大量原生能力（文件选择、系统对话框等），在 jsdom 环境中无法直接触发，必须 mock。

---

## 一、必须 Mock 的模块

| 模块 | 原因 | Mock 方式 |
|------|------|----------|
| `@tauri-apps/api/core` | Tauri invoke 在 jsdom 中不可用 | `vi.mock('@tauri-apps/api/core')` 返回 `vi.fn()` |
| `directoryPicker` | 系统文件选择器无法在测试中弹出 | `vi.mock('.../directoryPicker')` 返回预设路径 |
| `stores` (zustand) | 全局状态管理 | `vi.mock('.../stores')` 返回所需状态 |
| `api/client` | 网络请求/Tauri 通信 | `vi.mock('.../api/client')` 返回 mock 函数 |
| `ky` (HTTP 库) | 防止真实网络请求 | `vi.mock('ky')` 直接抛错或返回预设数据 |

---

## 二、Mock 模板

### 2.1 页面组件测试（DOM 快照）

适用于：渲染完整页面，验证 DOM 结构和交互行为。

```tsx
// @vitest-environment jsdom

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── 1. 声明 mock 函数（在 vi.mock 外部，方便测试中访问） ──

const pickDirectoryMock = vi.fn()
const listSourceFoldersMock = vi.fn()
const showToastMock = vi.fn()

// ── 2. Mock 原生能力（模拟"用户已选择"） ──

vi.mock('../../packages/web/src/utils/directoryPicker', () => ({
  pickDirectory: pickDirectoryMock,
}))

// ── 3. Mock 全局 store ──

vi.mock('../../packages/web/src/stores', () => ({
  useStore: () => ({
    showToast: showToastMock,
  }),
}))

// ── 4. Mock API 请求 ──

vi.mock('../../packages/web/src/api/client', () => ({
  skillsApi: {
    listSourceFolders: listSourceFoldersMock,
  },
}))

// ── 5. 测试 ──

describe('Develop page directory picker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 设置默认返回值
    listSourceFoldersMock.mockResolvedValue({ success: true, data: [] })
  })

  it('点击"选择目录"后会打开目录选择器并自动回填输入框', async () => {
    // 模拟用户选择了目录
    pickDirectoryMock.mockResolvedValue('/Users/demo/skills')

    const { default: DevelopPage } = await import(
      '../../packages/web/src/pages/Develop'
    )

    render(React.createElement(DevelopPage))
    await waitFor(() => {
      expect(listSourceFoldersMock).toHaveBeenCalledTimes(1)
    })

    const chooseButton = screen.getByRole('button', { name: /choose directory/i })
    await userEvent.click(chooseButton)

    expect(pickDirectoryMock).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const input = screen.getByPlaceholderText(
        '/path/to/skills/directory'
      ) as HTMLInputElement
      expect(input.value).toBe('/Users/demo/skills')
    })
  })
})
```

### 2.2 Tauri Bridge 测试（invoke 调用验证）

适用于：验证前端 API 层正确调用 Tauri 命令并处理返回值。

```ts
// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.fn()

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
  isTauri: () => false,
}))

// Mock ky，确保 HTTP 分支不被触发
vi.mock('ky', () => ({
  default: {
    create: () => {
      throw new Error('HTTP 分支不应在 Tauri 环境下被调用')
    },
  },
}))

// 强制 getApiTransport 返回 'tauri'
vi.mock('../../packages/web/src/api/client', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../packages/web/src/api/client')>()
  return {
    ...original,
    getApiTransport: () => 'tauri' as const,
  }
})

// 模拟 window.__TAURI__ 使环境检测通过
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, '__TAURI_INTERNALS__', {
    value: {},
    configurable: true,
  })
})

describe('前端 → Tauri invoke 联调测试', () => {
  it('skillsApi.list 调用 list_skills 命令', async () => {
    const mockSkills = [
      { name: 'test-skill', path: '/skills/test-skill', source: 'linked' },
    ]
    invokeMock.mockResolvedValue(mockSkills)

    const { skillsApi } = await import('../../packages/web/src/api/client')
    const result = await skillsApi.list()

    expect(invokeMock).toHaveBeenCalledWith('list_skills')
    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockSkills)
  })
})
```

### 2.3 Store Mock 模板

不同页面需要的 store 字段不同，按需提供：

```ts
// Skills 页面
vi.mock('../../packages/web/src/stores', () => ({
  useStore: () => ({
    skills: [],
    setSkills: vi.fn(),
    isLoading: false,
    setIsLoading: vi.fn(),
    showToast: vi.fn(),
    updateSkillEnvironments: vi.fn(),
  }),
}))

// Develop 页面
vi.mock('../../packages/web/src/stores', () => ({
  useStore: () => ({
    showToast: vi.fn(),
  }),
}))

// Settings 页面（按需补充）
vi.mock('../../packages/web/src/stores', () => ({
  useStore: () => ({
    showToast: vi.fn(),
    config: {},
    setConfig: vi.fn(),
  }),
}))
```

---

## 三、Mock 核心原则

1. **Mock 的是用户交互的结果**，不是函数内部实现
   - 点击"选择目录" → mock `pickDirectory` 返回路径 → 验证输入框显示该路径
   - 而不是 mock 内部某个 state setter

2. **每个测试前重置 mock 状态**
   ```ts
   beforeEach(() => {
     vi.clearAllMocks()
   })
   ```

3. **使用动态 `import()` 加载组件**，确保 mock 先于组件注册
   ```ts
   // ✅ 正确：先 mock 再 import
   const { default: SkillsPage } = await import('../../packages/web/src/pages/Skills')

   // ❌ 错误：静态 import 在文件顶部，mock 还没注册
   import SkillsPage from '../../packages/web/src/pages/Skills'
   ```

4. **Mock 粒度最小化**：只 mock 测试场景需要的模块，不要一次性 mock 所有东西

5. **快照测试中 mock 返回空数据**，保持快照稳定：
   ```ts
   listMock.mockResolvedValue({ success: true, data: [] })
   ```

---

## 四、常见 Mock 场景速查

| 场景 | Mock 目标 | 返回值示例 |
|------|----------|-----------|
| 用户选择文件夹 | `pickDirectory` | `'/Users/demo/skills'` |
| 用户取消选择 | `pickDirectory` | `null` 或 `undefined` |
| 选择器异常 | `pickDirectory` | `throw new Error('...')` |
| API 成功返回 | `skillsApi.list` | `{ success: true, data: [...] }` |
| API 失败返回 | `skillsApi.get` | invoke mock reject |
| Tauri 命令成功 | `invoke` | 具体返回数据 |
| Tauri 命令失败 | `invoke` | `throw new Error('...')` |
