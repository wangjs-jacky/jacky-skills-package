# Changelog

All notable changes to this project will be documented in this file.

## [0.3.1] - 2026-03-29

### Added
- **Profile 系统（CLI）**
  - 新增 `profile:list`, `profile:show`, `profile:use`, `profile:current`
  - 新增 `profile:create`, `profile:delete`, `profile:duplicate`
  - 新增 `profile:export`, `profile:import`，支持 Profile 导入导出
- **Skills Link 健康诊断与修复**
  - `j-skills link --doctor` 支持断链诊断
  - `j-skills link --unlink --force` 支持强制清理残留
- **Skill Hooks 自动管理能力**
  - 安装/卸载流程自动合并与移除 hooks
  - Tauri 侧修复 settings 字段保留问题，避免配置丢失
- **断链自动清理流程**
  - 增加 broken-skill auto-cleanup 处理路径
  - 补充相应测试覆盖与设计文档

### Changed
- **环境定义升级**：扩展到 39+ 编码助手环境
- **Web Skills 页面**：环境列表改为动态来源，去除硬编码
- **测试体系完善**：补充 BDD、集成测试与 Tauri E2E 用例
- **文档补强**：新增 Profile 设计/实现文档与构建排障说明

### Technical
- 新增/完善 `src/lib/profiles.ts` 与相关命令注册链路
- 调整 `link/install/uninstall` 命令的异常处理与数据一致性逻辑
- 增加配置、hooks、环境一致性等测试项

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
