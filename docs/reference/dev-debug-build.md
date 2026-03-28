# 开发、调试与构建

本页聚焦 3 件事：`开发`、`调试`、`构建（开发包/生产包）`。

## 1) 开发

### 仅前端开发

```bash
pnpm dev:web
```

- 适用场景：页面布局、组件样式、前端逻辑联调。
- 默认地址：`http://localhost:5173`

### 完整桌面开发（推荐日常）

```bash
pnpm dev
# 等价于 pnpm dev:tauri
```

- 适用场景：需要验证前端调用 Rust 命令、文件系统、系统 API。
- 特点：开发模式下更接近真实桌面运行链路。

## 2) 调试

### DevTools

- 开发模式下通常自动打开。
- 快捷键：
  - macOS: `Cmd + Option + I` 或 `F12`
  - Windows/Linux: `Ctrl + Shift + I`

### 生产包下打开 DevTools（临时）

```bash
pnpm build:tauri
J_SKILLS_DEVTOOLS=1 open src-tauri/target/release/bundle/macos/j-skills.app
```

### 生产包下永久启用 DevTools（仅调试时）

编辑 `src-tauri/Cargo.toml`：

```toml
tauri = { version = "2", features = ["devtools"] }
```

并在 `src-tauri/src/main.rs` 的 `setup` 中调用 `window.open_devtools();`。

## 3) 构建

### 构建开发包（Debug）

```bash
pnpm exec tauri build --debug
```

- 用途：本地验证“接近生产安装形态”，但保留 debug 构建信息。
- 产物目录通常在：`src-tauri/target/debug/bundle/`

### 构建生产包（Release）

```bash
pnpm build:tauri
```

- 用途：对外分发、性能与体积按 release 配置。
- 产物目录通常在：`src-tauri/target/release/bundle/`

### 多架构构建（macOS）

```bash
pnpm build:macos
pnpm build:macos-intel
pnpm build:macos-arm
```

## 4) Bug 修复建议流程

1. 先复现：固定步骤与输入。
2. 再定位：判断前端/后端/构建链路。
3. 最小修复：先保证功能恢复，再做重构。
4. 回归验证：`pnpm dev` + `pnpm build:tauri` 至少各跑一次。
