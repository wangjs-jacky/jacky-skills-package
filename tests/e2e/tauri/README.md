# Tauri E2E 测试指南

## 前置条件

1. 已安装 `tauri-wd` CLI：
   ```bash
   cargo install tauri-webdriver-automation --locked
   ```

2. 已编译 debug 二进制（包含 webdriver 插件）：
   ```bash
   cd src-tauri && cargo build
   ```

## 运行步骤

### 1. 启动前端开发服务器

```bash
pnpm dev:web
```

保持运行，等待 `http://localhost:5173` 可访问。

### 2. 启动 tauri-wd WebDriver 服务

```bash
# 新开一个终端
~/.cargo/bin/tauri-wd --port 4444
```

### 3. 运行 E2E 测试

```bash
# 新开一个终端
npx wdio run wdio.tauri.conf.ts
```

### 一键运行（自动启动 dev server）

```bash
pnpm test:e2e:tauri
```

### Debug 模式

```bash
pnpm test:e2e:tauri:debug
```

## 测试文件结构

```
e2e/tauri/
├── app-launch.spec.ts      # 应用启动与窗口基线
├── skills-page.spec.ts     # Skills 页面核心流程
├── settings-page.spec.ts   # Settings 页面核心流程
└── develop-page.spec.ts    # Develop 页面核心流程
```

## 架构

```
WebDriverIO (测试脚本)
    ↓ HTTP :4444
tauri-wd CLI (W3C WebDriver 协议)
    ↓ HTTP :{动态端口}
tauri-plugin-webdriver-automation (应用内插件，debug-only)
    ↓ JS Bridge
WKWebView (真实 Tauri 窗口)
```

## 注意事项

- E2E 测试需要 **真实的 macOS 窗口环境**（不支持 headless）
- 测试期间会启动和关闭真实的 .app 应用
- 插件仅在 debug 构建中启用，release 不受影响
- 每个测试 session 会启动独立的 app 进程
