# 版本号统计报告

## 发现的版本号位置

### 需要更新的文件（核心代码）

| 文件 | 当前版本 | 需更新到 |
|------|---------|---------|
| `package.json` | 0.2.0 | 0.3.0 |
| `package-lock.json` | 0.1.0 | 0.3.0 |
| `packages/web/package.json` | 0.1.0 | 0.3.0 |
| `packages/server/package.json` | 0.1.0 | 0.3.0 |
| `src-tauri/Cargo.toml` | 0.1.0 | 0.3.0 |
| `src-tauri/tauri.conf.json` | 0.1.0 | 0.3.0 |
| `src/index.ts` | 0.1.0 | 0.3.0 |

### 不需要更新的文件（文档引用）

| 文件 | 说明 |
|------|------|
| `docs/plans/2026-03-05-tauri-migration-implementation.md` | 计划文档，保留历史版本 |
| `docs/plans/2026-03-04-gui-web-design.md` | 设计文档，保留历史版本 |
| `docs/github-publish-report.md` | 发布报告，记录当时状态 |

## 更新策略

1. **核心代码文件**: 统一更新到 0.3.0
2. **文档引用**: 保持不变（记录历史）
3. **Lock 文件**: 通过包管理器自动更新

## 0.3.0 版本变更内容

### 新增
- E2E 烟雾测试（Playwright）
- L1-L8 门控检查文档
- 迁移完成报告
- GitHub 发布报告

### 改进
- 测试覆盖更完整
- 文档更详细
- 发布流程更规范

### 技术细节
- 添加 @playwright/test 依赖
- 创建 playwright.config.ts 配置
- 添加 5 个 E2E 测试用例
- 所有测试通过（5 passed）
