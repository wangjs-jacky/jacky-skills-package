# Changelog

All notable changes to this project will be documented in this file.

## [0.3.1] - 2026-03-29

### 功能特性
1. **支持更多编程工具环境，并修复编码/配置保留导致的切换异常**
   - 环境定义扩展到 39+ 编码助手环境。
   - 修复设置保存时字段丢失问题，避免切换工作流/环境后状态异常。
2. **支持自动修改并保存**
   - 设置项（如默认环境、安装方式）变更后自动持久化，无需额外手动保存步骤。
3. **支持批量修改并保存**
   - 支持批量 Link（扫描目录一键链接）与批量安装/卸载操作，提升多 Skill 管理效率。
4. **完善 Skills 面板能力**
   - Skills 页面支持动态环境渲染与核心管理操作，减少硬编码带来的维护成本。
5. **CLI 新增死链修复能力**
   - `j-skills link --doctor`：诊断并修复/清理断链。
   - `j-skills link --unlink <name> --force`：强制清理残留链接。

### 其他改进
- 新增 Profile 命令组：`profile:list/show/use/current/create/delete/duplicate/export/import`。
- 强化断链自动清理流程与测试覆盖（BDD / 集成测试 / Tauri E2E）。
- 补充 Profile、构建与排障相关文档。

## [0.3.0] - 2026-03-07

### Added
- **E2E Testing Framework** - Playwright integration with smoke tests
  - 5 smoke tests covering critical paths
  - Environment detection validation
  - UI rendering verification
  - Page navigation tests
- **Comprehensive Documentation**
  - L1-L8 gate checks detailed explanation
  - Migration completion report
  - E2E test report
  - GitHub publish guide
- **Test Coverage**
  - TypeScript contract tests
  - Rust unit tests
  - E2E smoke tests (5 passed)

### Changed
- **Version Unification** - All packages now use consistent version 0.3.0
  - package.json
  - packages/web/package.json
  - packages/server/package.json
  - src-tauri/Cargo.toml
  - src-tauri/tauri.conf.json
  - src/index.ts
- **Documentation Structure** - Better organized with separate files for each topic

### Technical
- Added @playwright/test dependency
- Created playwright.config.ts configuration
- Added test:e2e, test:e2e:ui, test:e2e:debug scripts
- Improved test coverage across all layers

### Quality Gates
- ✅ L1-L8 gate checks completed
- ✅ Unit tests (TypeScript + Rust)
- ✅ E2E smoke tests (5 passed)
- ✅ Build gates passed (cargo check + web build)
- ✅ Documentation updated

## [0.2.0] - 2026-03-05

### Added
- Tauri desktop application for macOS
- Native Rust backend for better performance
- Tauri Commands API for frontend-backend communication
- Environment detection and API switching (Tauri/Web)
- Desktop app build scripts (build:macos, build:macos-arm, build:macos-intel)

### Changed
- Migrated from Express backend to Rust (Tauri Commands)
- API calls now use Tauri IPC instead of HTTP
- Frontend supports both Tauri and Web environments

### Technical
- Added src-tauri directory with Rust implementation
- Created API adapter layer for Tauri/Web compatibility
- Implemented core services in Rust (Registry, Config, Paths)
- Added error handling module with thiserror
- Created data models for skills and configuration

## [0.1.0] - 2026-02-13

### Added
- Initial release
- CLI tool for skill management
- Web GUI with React
- Express backend server
- Support for 35+ agent environments
- Symlink-based skill linking
- Skill registry system
- Configuration management
