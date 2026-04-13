# Tauri E2E 测试指南

## 前置条件

1. 已编译 debug 二进制（包含 webdriver 插件）：
   ```bash
   cd src-tauri && cargo build
   ```

2. 已安装 `tauri-wd` CLI：
   ```bash
   cargo install tauri-webdriver-automation --locked
   ```

## 运行步骤

### 一键运行

```bash
pnpm test:e2e:tauri
```

### 手动运行

```bash
# 1. 启动前端开发服务器
pnpm dev:web

# 2. 新终端：启动 WebDriver 服务
~/.cargo/bin/tauri-wd --port 4444

# 3. 新终端：运行测试
NO_PROXY='*' npx wdio run wdio.tauri.conf.ts

# 运行单个 spec
NO_PROXY='*' npx wdio run wdio.tauri.conf.ts --spec ./tests/e2e/tauri/specs/skills-page.spec.ts
```

## 目录结构

```
tests/e2e/tauri/
├── pages/          # Page Object Model（页面对象）
├── specs/          # 测试用例
├── helpers/        # Tauri 命令封装 + 断言工具
├── fixtures/       # 测试数据（mock skill）
└── README.md
```

## 选择器约定

前端页面使用 `data-testid` 属性标识元素。选择器格式：

```typescript
// 正确 ✅
$('[data-testid="skills-page"]')

// 错误 ❌
$('#skills-page')
```

## 测试覆盖

| 页面 | 用例数 | 文件 |
|------|--------|------|
| 应用启动 | 5 | app-launch.spec.ts |
| 导航 | 7 | navigation.spec.ts |
| Skills | 6 | skills-page.spec.ts |
| Settings | 5 | settings-page.spec.ts |
| Develop | 7 | develop-page.spec.ts |
| Monitor | 6 | monitor-page.spec.ts |
| ClaudeMD | 4 | claudemd-page.spec.ts |

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

- 需要 **真实 macOS 窗口**（不支持 headless）
- 插件仅在 **debug 构建** 中启用，release 不受影响
- 每个测试 session 会启动独立的 app 进程
