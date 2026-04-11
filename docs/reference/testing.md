# 测试策略与规范

## 优先级：BDD 驱动 > 截图测试 > 集成测试 > 单元测试

**核心原则：BDD 优先，截图测试第二，单元测试不作为重点。**

执行顺序：
1. **BDD 测试**（当前重点）— 建立 BDD 流程：定义 case → 生成测试脚本 → 全部跑通
2. **截图测试**（待办，BDD 完成后推进）— 已发现多处样式问题，需要视觉回归测试兜底
3. **集成测试**（辅助）— 前端→Tauri 联调、插件注册一致性
4. **单元测试**（不重点）— 按需补充

## 测试工具：@wangjs-jacky/tdd-kit

> **tdd-kit 处于快速迭代阶段，API 可能随时变化。每次写测试时以当前最新 API 为准。**

**仓库位置**：`/Users/jiashengwang/jacky-github/jacky-tdd-kit`

**必须使用 tdd-kit 的场景**：
- 通过 `data-testid` 定位和断言元素
- 等待异步元素出现（替代 `waitFor` + `getByText`/`getByTestId`）
- 链式断言（文本 → 属性 → 样式）
- 在子树内查找元素（传入 `HTMLElement` 或 `within()` 返回值）

**核心 API**：

```ts
import { expectElement, expectElementAsync } from '@wangjs-jacky/tdd-kit'

// 1. 同步断言：元素存在 + 条件验证
expectElement(screen, 'card', { text: 'Hello' })

// 2. 异步等待：轮询直到元素出现并满足条件
const el = await expectElementAsync(screen, 'develop-page')

// 3. 子树查找：传入 HTMLElement 或 within() 返回值
expectElement(el, 'batch-link-card')                        // HTMLElement
expectElement(within(el).getByTestId('card'), 'button')     // HTMLElement
expectElement(within(el), 'button')                          // within() 返回值

// 4. 链式断言
expectElement(screen, 'card')
  .expectText('Hello')
  .expectProps({ className: 'active' })
  .expectStyle({ color: 'red' })

// 5. 否定断言：元素存在但条件不匹配
expectElement(screen, 'card', { text: 'old' }, { not: true })

// 6. 断言不存在
expectElement(screen, 'removed-item', undefined, { exists: false })
```

**什么时候仍用原生 testing-library**：
- `userEvent` 交互（点击、输入、hover）
- `vi.fn()` mock 断言（`toHaveBeenCalledWith`）
- 非 testid 的查询（`getByRole`、`getByText`、`getByPlaceholderText`）

**tdd-kit 迭代流程**：
1. 写测试时发现 tdd-kit API 不够用 → 先在 tdd-kit 中补充 API
2. 在 tdd-kit 中 `npx tsup` 构建
3. 在本项目中 `pnpm install` 刷新依赖
4. 运行 `npx vitest run` 验证

## 测试目录结构

```
tests/
├── bdd/
│   ├── cases/                        # BDD 用例定义（步骤描述）
│   │   └── develop/T-D8.js
│   └── develop/T-D8.test.ts          # BDD 测试脚本
├── e2e/                              # E2E 测试（Tauri 应用级）
│   ├── tauri/
│   │   ├── app-launch.spec.ts
│   │   ├── develop-page.spec.ts
│   │   ├── settings-page.spec.ts
│   │   └── skills-page.spec.ts
│   └── tauri-smoke.spec.ts
├── integration/                      # 集成测试（前端→Tauri 联调、配置一致性）
│   ├── api-tauri-bridge.test.ts
│   ├── api-transport.test.ts
│   └── tauri-plugin-consistency.test.ts
└── unit/                             # 单元测试（不重点）
    ├── config.test.ts
    ├── hooks.test.ts
    └── snapshot-skills-page.test.tsx
```

## BDD 流程

当前流程：
1. 在 `tests/bdd/cases/<page>/` 定义 BDD case（步骤描述）
2. 在 `tests/bdd/<page>/` 编写对应的测试脚本（mock + 断言）
3. `pnpm test` 全部跑通

### 编号规则

| 页面 | 前缀 | 示例 |
|------|------|------|
| Develop | `T-D` | T-D1, T-D2, ..., T-D8 |
| Skills | `T-S` | T-S1, T-S2, ... |
| Settings | `T-ST` | T-ST1, T-ST2, ... |

### 用例编写规范

1. **步骤要具体**：写清楚"点击哪个按钮"、"输入什么内容"
2. **期望要可验证**：描述可以在 DOM 中断言的结果（元素出现/消失/变化）
3. **一个用例一个场景**：不要把多个独立功能混在一个用例中
4. **覆盖正常和异常路径**：如"选择目录后确认"和"选择目录后取消"

### 待完善（待讨论）

- BDD case 的完整覆盖范围（哪些页面、哪些关键流程）
- case 文件格式规范（是否需要标准化字段）
- 是否需要 case → test 脚本的批量生成工具

## 截图测试（待办）

> **前置条件：BDD 测试流程跑通后再推进**

已发现多处样式问题（布局错位、间距不一致、响应式适配等），需要建立截图测试来兜底。

待设计：
- 技术方案（Playwright 截图对比 / 其他方案）
- 覆盖范围（哪些页面、哪些状态需要截图）
- 基线图片管理策略
- CI 集成方式

## Mock 方案

Tauri 原生能力（文件选择、系统对话框等）在 jsdom 中无法触发，**必须 mock**。详细方案见：

- **Mock 指南**：`docs/reference/test-mock-guide.md`
  - 必须 mock 的模块清单
  - 页面组件测试 / Tauri Bridge 测试 / Store 的完整 mock 模板
  - Mock 核心原则与常见场景速查
