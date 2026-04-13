# Tauri E2E 测试体系设计

> 日期：2026-04-13
> 状态：已确认

## 背景

j-skills 桌面端已有 WebDriverIO + tauri-plugin-webdriver-automation 的 e2e 基础，但存在以下问题：

1. **配置路径错误**：`wdio.tauri.conf.ts` 的 `specs` 指向 `./e2e/tauri/`，实际文件在 `./tests/e2e/tauri/`
2. **Playwright 配置同理**：`testDir: './e2e'` 但文件在 `tests/e2e/`
3. **覆盖面窄**：4 个 WebDriverIO spec + 1 个 Playwright smoke，均为浅层元素检查
4. **缺失页面**：无 Monitor、ClaudeMD 页面测试
5. **无 POM**：缺少 Page Object Model 和共享工具函数

## 方案决策

**统一 WebDriverIO**：所有 e2e 测试通过 WebDriverIO 在真实 Tauri App 窗口中执行。

理由：
- 用户选择统一框架，避免双轨维护
- WebDriverIO + tauri-plugin-webdriver-automation 已有基础
- 真实窗口测试覆盖 Tauri invoke、文件系统、原生交互

Playwright 侧保留 `tauri-smoke.spec.ts` 作为 Web 模式快速验证，不做扩展。

## 目录结构

```
tests/e2e/
├── tauri/
│   ├── pages/                    # Page Object Model
│   │   ├── base.page.ts          # 基类：通用导航、等待、Tauri invoke
│   │   ├── skills.page.ts        # Skills 页面操作
│   │   ├── settings.page.ts      # Settings 页面操作
│   │   ├── develop.page.ts       # Develop 页面操作
│   │   ├── monitor.page.ts       # Monitor 页面操作
│   │   └── claudemd.page.ts      # ClaudeMD 页面操作
│   ├── specs/                    # 测试用例
│   │   ├── app-launch.spec.ts    # 应用启动基线（优化）
│   │   ├── skills-page.spec.ts   # Skills 页面（扩充）
│   │   ├── settings-page.spec.ts # Settings 页面（扩充）
│   │   ├── develop-page.spec.ts  # Develop 页面（扩充）
│   │   ├── monitor-page.spec.ts  # 🆕 Monitor 页面
│   │   ├── claudemd-page.spec.ts # 🆕 ClaudeMD 页面
│   │   └── navigation.spec.ts    # 🆕 全局导航测试
│   ├── fixtures/                 # 测试数据
│   │   └── test-skill/           # 用于 link/install 测试的 mock skill
│   │       └── SKILL.md
│   ├── helpers/                  # 工具函数
│   │   ├── tauri-commands.ts     # Tauri invoke 封装
│   │   └── assertions.ts         # 自定义断言
│   └── README.md                 # 运行指南
├── tauri-smoke.spec.ts           # 保留：Playwright Web 模式 smoke
└── README.md                     # E2E 测试总览
```

## Page Object Model

### 基类

```typescript
// pages/base.page.ts
export class BasePage {
  protected get pageId(): string { throw new Error('子类必须实现') }

  async navigate(): Promise<void> {
    await browser.url(`tauri://localhost/${this.pageId}`)
    await this.waitForLoad()
  }

  async waitForLoad(timeout = 10000): Promise<void> {
    const el = await $(`#${this.pageId}`)
    await el.waitForExist({ timeout })
  }

  async isDisplayed(): Promise<boolean> {
    const el = await $(`#${this.pageId}`)
    return el.isDisplayed()
  }

  async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    return browser.execute(`
      return window.__TAURI_INTERNALS__.invoke('${command}', ${JSON.stringify(args || {})})
    `) as Promise<T>
  }
}
```

### 页面子类示例

```typescript
// pages/skills.page.ts
import { BasePage } from './base.page'

export class SkillsPage extends BasePage {
  protected get pageId() { return 'skills-page' }

  get statsBar() { return $('#skills-stats') }
  get searchInput() { return $('#skills-search-input') }
  get skillsList() { return $('#skills-list') }
  get emptyState() { return $('#skills-empty-state') }

  async getStatsText(): Promise<string> {
    return this.statsBar.getText()
  }

  async search(query: string): Promise<void> {
    await this.searchInput.setValue(query)
  }

  async getSkillCount(): Promise<number> {
    const items = await $$('[data-testid="skill-item"]')
    return items.length
  }
}
```

## Tauri Commands 封装

```typescript
// helpers/tauri-commands.ts
export const tauri = {
  async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    return browser.execute(`
      return window.__TAURI_INTERNALS__.invoke('${cmd}', ${JSON.stringify(args || {})})
    `) as Promise<T>
  },

  // Skills
  listSkills() { return this.invoke('list_skills') },
  linkSkill(path: string) { return this.invoke('link_skill', { path }) },
  unlinkSkill(name: string) { return this.invoke('unlink_skill', { name }) },

  // Config
  getConfig() { return this.invoke('get_config') },
  updateConfig(config: any) { return this.invoke('update_config', { config }) },

  // Monitor
  monitorCheckDaemon() { return this.invoke('monitor_check_daemon') },
  monitorStartDaemon() { return this.invoke('monitor_start_daemon') },
  monitorStopDaemon() { return this.invoke('monitor_stop_daemon') },
  monitorCheckHooks() { return this.invoke('monitor_check_hooks') },
  monitorInstallHooks() { return this.invoke('monitor_install_hooks') },
}
```

## 测试覆盖矩阵

### 应用启动与导航（5 个用例）

| ID | 场景 | 验证点 |
|---|---|---|
| E2E-NAV-01 | 应用启动 | 窗口标题包含 'j-skills'，默认显示 Skills 页 |
| E2E-NAV-02 | 窗口尺寸 | 宽 ≥ 900，高 ≥ 600 |
| E2E-NAV-03 | 侧边栏导航 | 点击每个导航项 → URL 和页面 ID 正确切换 |
| E2E-NAV-04 | 直接 URL 导航 | 输入各页面 URL → 正确渲染 |
| E2E-NAV-05 | 页面刷新不崩溃 | 刷新当前页面 → 正常加载 |

### Skills 管理（8 个用例）

| ID | 场景 | 验证点 |
|---|---|---|
| E2E-SK-01 | 列表加载 | 显示统计栏（linked/installed 数量） |
| E2E-SK-02 | 空状态 | 无 skill 时显示空状态提示 |
| E2E-SK-03 | 搜索过滤 | 输入关键词 → 列表更新 |
| E2E-SK-04 | Skill 详情 | 点击 skill → 显示文件列表 |
| E2E-SK-05 | 安装 Skill | 点击安装 → 状态变化、toast 提示 |
| E2E-SK-06 | 卸载 Skill | 点击卸载 → 状态变化、toast 提示 |
| E2E-SK-07 | 环境 Status | 各环境显示正确的安装状态 |
| E2E-SK-08 | Broken Skill 清理 | 触发清理 → cleanedCount toast |

### Settings（5 个用例）

| ID | 场景 | 验证点 |
|---|---|---|
| E2E-CFG-01 | 配置加载 | 环境列表显示、安装方式显示 |
| E2E-CFG-02 | 环境切换 | 点击环境按钮 → 状态切换 |
| E2E-CFG-03 | 安装方式切换 | Copy ↔ Symlink 切换 |
| E2E-CFG-04 | 保存配置 | 点击保存 → toast 提示成功 |
| E2E-CFG-05 | 配置持久化 | 修改 → 保存 → 刷新 → 验证恢复 |

### Develop（5 个用例）

| ID | 场景 | 验证点 |
|---|---|---|
| E2E-DEV-01 | 批量链接卡片 | 显示路径输入、选择目录、链接按钮 |
| E2E-DEV-02 | 空路径校验 | 空路径点击链接 → 错误提示 |
| E2E-DEV-03 | 无效路径链接 | 输入不存在的路径 → 错误提示 |
| E2E-DEV-04 | 源文件夹列表 | 显示已注册的源文件夹 |
| E2E-DEV-05 | 有效 skill 链接 | 用 fixtures/test-skill 执行真实链接 → 成功 |

### Monitor（6 个用例）

| ID | 场景 | 验证点 |
|---|---|---|
| E2E-MON-01 | 页面加载 | 显示 daemon 状态卡片 |
| E2E-MON-02 | Daemon 未运行状态 | 显示"未运行" + 启动按钮 |
| E2E-MON-03 | 启动 Daemon | 点击启动 → 状态变为运行中 |
| E2E-MON-04 | Hooks 安装检测 | 检测 hooks 是否已安装 |
| E2E-MON-05 | 会话列表 | daemon 运行后显示会话卡片 |
| E2E-MON-06 | 停止 Daemon | 点击停止 → 状态变为未运行 |

### ClaudeMD（4 个用例）

| ID | 场景 | 验证点 |
|---|---|---|
| E2E-CMD-01 | 页面加载 | 显示 ClaudeMD 编辑器 |
| E2E-CMD-02 | 文件列表 | 显示已有 CLAUDE.md 文件 |
| E2E-CMD-03 | 查看/编辑 | 选择文件 → 内容加载到编辑器 |
| E2E-CMD-04 | 保存文件 | 编辑 → 保存 → toast 提示 |

**总计：33 个用例**

## 配置修复

### wdio.tauri.conf.ts

```typescript
// 修改前
specs: ['./e2e/tauri/**/*.spec.ts'],

// 修改后
specs: ['./tests/e2e/tauri/specs/**/*.spec.ts'],
```

### playwright.config.ts

```typescript
// 修改前
testDir: './e2e',

// 修改后
testDir: './tests/e2e',
```

## 测试数据

`fixtures/test-skill/` 包含最小可用 skill 用于 link/install 测试：

```markdown
---
name: e2e-test-skill
description: 用于 e2e 测试的 mock skill
trigger: e2e-test
---

# E2E Test Skill

这是一个用于 e2e 测试的 mock skill，不包含实际功能。
```

## 执行方式

```bash
# 一键运行所有 Tauri e2e 测试
pnpm test:e2e:tauri

# 底层执行链
# 1. pnpm dev:web          → 启动前端 dev server
# 2. tauri-wd --port 4444  → 启动 WebDriver 服务
# 3. wdio run wdio.tauri.conf.ts → 执行测试

# 运行单个 spec 文件
npx wdio run wdio.tauri.conf.ts --spec ./tests/e2e/tauri/specs/skills-page.spec.ts
```

## 约束

- 需要 **真实 macOS 窗口**（不支持 headless）
- 需要 **debug 构建的 Tauri App**（tauri-plugin-webdriver-automation 仅 debug 模式）
- 需要 **tauri-wd CLI 已安装**（`cargo install tauri-webdriver-automation --locked`）
- Monitor 测试依赖 **外部 daemon**（`@wangjs-jacky/claude-monitor`）

## 实施顺序

1. 修复配置路径（wdio + playwright）
2. 创建 POM 基类和 helpers
3. 迁移现有 4 个 spec 到新结构（使用 POM）
4. 新增 navigation.spec.ts
5. 新增 monitor-page.spec.ts
6. 新增 claudemd-page.spec.ts
7. 创建 fixtures/test-skill
8. 扩充 skills-page、settings-page、develop-page 用例
9. 更新 README
