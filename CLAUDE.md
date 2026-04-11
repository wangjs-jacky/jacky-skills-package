# j-skills 工作区指南（精简索引）

## 项目概述

j-skills 是一个 Agent Skills 管理工具，包含：
- **CLI 工具** (`src/`)：Node.js 命令行工具
- **Web GUI** (`packages/web/`)：React + Vite 前端
- **Tauri 桌面应用** (`src-tauri/`)：Rust 后端 + WebView 前端

## 文档导航（Reference）

- 页面定义（Skills / Develop / Settings）：
  - `docs/reference/pages.md`
- Troubleshooting（疑难杂症，原 travel 板块）：
  - `docs/reference/troubleshooting.md`
- 开发、调试、构建（开发包 / 生产包）：
  - `docs/reference/dev-debug-build.md`
- 测试用例库（BDD 步骤描述）：
  - `docs/reference/test-cases.md`
- 测试 Mock 方案（模板与速查）：
  - `docs/reference/test-mock-guide.md`
- Changelog 生成指南（发布文案规范）：
  - `docs/reference/changelog-guide.md`
- Hooks 合并机制（Claude Code 环境 hooks 合并流程）：
  - `docs/reference/hooks-merge.md`
- **测试策略与规范（BDD 流程、tdd-kit 用法、Mock 方案）**：
  - `docs/reference/testing.md`

## 常用命令速查

```bash
# 前端开发（仅 Web）
pnpm dev:web

# 完整桌面开发（Tauri + Web）
pnpm dev

# 构建开发包（Debug）
pnpm exec tauri build --debug

# 构建生产包（Release）
pnpm build:tauri

# 运行测试
pnpm test
```

## 关键文件位置

| 功能 | 文件路径 |
|-----|---------|
| Tauri 配置 | `src-tauri/tauri.conf.json` |
| Rust 命令 | `src-tauri/src/commands/*.rs` |
| 前端 API | `packages/web/src/api/client.ts` |
| Skills 页面 | `packages/web/src/pages/Skills/index.tsx` |
| Develop 页面 | `packages/web/src/pages/Develop/index.tsx` |
| Settings 页面 | `packages/web/src/pages/Settings/index.tsx` |
| Cargo 配置 | `src-tauri/Cargo.toml` |

## 测试策略

> **⚠️ 测试是不可协商的开发环节。每个功能变更都必须有对应的测试覆盖，未测试的代码视为未完成。**

**优先级：BDD 驱动 > 截图测试 > 集成测试 > 单元测试**

完整测试策略、tdd-kit 用法、BDD 流程、Mock 方案详见：
- **`docs/reference/testing.md`**

快速参考：
- BDD 用例库：`docs/reference/test-cases.md`
- Mock 模板：`docs/reference/test-mock-guide.md`
- 运行测试：`pnpm test`

## 外部文档

- [Tauri 官方文档](https://tauri.app/)
- [项目 README](./README.md)

## 发布文案规范

Release 与 Changelog 规范已迁移到 Reference：
- `docs/reference/changelog-guide.md`
