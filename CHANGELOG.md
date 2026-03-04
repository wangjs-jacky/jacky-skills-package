# Changelog

All notable changes to this project will be documented in this file.

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
