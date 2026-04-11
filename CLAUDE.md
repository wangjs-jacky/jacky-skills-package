# j-skills 工作区指南

## 项目概述

j-skills 是一个 Agent Skills 管理工具，采用 pnpm Monorepo 结构：

```
jacky-skills-package/
├── packages/
│   └── cli/              → @wangjs-jacky/j-skills（npm 发布）
│       ├── src/          → CLI 源码（commands + lib）
│       ├── bin/          → CLI 入口脚本
│       ├── tests/        → CLI 单元测试
│       ├── tsup.config.ts
│       ├── vitest.config.ts
│       └── package.json
├── src-tauri/            → Tauri 桌面应用（Rust，暂搁置）
├── tests/
│   ├── integration/      → 跨包集成测试（Rust ↔ Node.js 一致性）
│   └── bdd/cases/        → BDD 用例定义
├── docs/reference/       → 开发文档
├── skills/               → 内置 skill
└── scripts/              → 工具脚本
```

## 常用命令

```bash
# CLI 开发（watch 模式）
pnpm dev:cli

# CLI 构建
pnpm build:cli

# 运行 CLI 测试
pnpm --filter @wangjs-jacky/j-skills test

# 运行根级集成测试
pnpm test:integration

# 运行所有测试
pnpm test

# 类型检查
pnpm typecheck
```

## 关键文件

| 功能 | 路径 |
|-----|------|
| CLI 入口 | `packages/cli/src/index.ts` |
| CLI 命令 | `packages/cli/src/commands/*.ts` |
| CLI 核心库 | `packages/cli/src/lib/*.ts` |
| 环境定义 | `packages/cli/src/lib/environments.ts`（35+ IDE） |
| Hooks 合并 | `packages/cli/src/lib/hooks.ts` |
| Tauri 配置 | `src-tauri/tauri.conf.json` |
| Rust 命令 | `src-tauri/src/commands/*.rs` |

## 文档导航

| 文档 | 路径 |
|------|------|
| 测试策略 | `docs/reference/testing.md` |
| BDD 用例库 | `docs/reference/test-cases.md` |
| Mock 方案 | `docs/reference/test-mock-guide.md` |
| 开发调试构建 | `docs/reference/dev-debug-build.md` |
| Hooks 合并机制 | `docs/reference/hooks-merge.md` |
| Changelog 规范 | `docs/reference/changelog-guide.md` |
| Troubleshooting | `docs/reference/troubleshooting.md` |

## 测试

**优先级：单元测试 > 集成测试 > BDD 驱动**

- CLI 单元测试：`packages/cli/tests/`（vitest）
- 根级集成测试：`tests/integration/`（Rust ↔ Node.js 环境定义一致性校验）
- BDD 用例定义：`tests/bdd/cases/`

## 发布

```bash
cd packages/cli && npm publish
```

## 外部文档

- [Tauri 官方文档](https://tauri.app/)
- [项目 README](./README.md)
