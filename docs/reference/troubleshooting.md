# Troubleshooting（疑难杂症 / travel）

本页用于快速定位和解决开发中的疑难杂症。

## 一、先判断问题层级

打开 DevTools 的 Console，先判断错误类型：

| 错误类型 | 问题位置 | 优先检查 |
|---|---|---|
| `Tauri command xxx failed` | Rust 后端 | `src-tauri/src/commands/` + `src-tauri/src/main.rs` 注册 |
| `Failed to fetch /api/xxx` | 前端走 HTTP 分支 | 是否在 Tauri 环境，`window.__TAURI_INTERNALS__` 是否存在 |
| React 渲染错误 | 前端页面 | `packages/web/src/` 对应页面与组件 |

## 二、调用链排查

前端 API 客户端会检测是否处于 Tauri 环境：

```ts
const isTauri =
  typeof window !== "undefined" &&
  window.__TAURI_INTERNALS__ !== undefined;
```

排查原则：
- `isTauri === true`：应走 `invoke`，问题多在 Rust 命令、参数、权限。
- `isTauri === false`：应走 HTTP 分支，问题多在本地服务、路由、跨域。

## 三、日志与现场信息

macOS 日志目录：

```bash
ls ~/Library/Application\ Support/com.wangjs-jacky.j-skills/logs/
```

建议同时收集：
- 报错发生时的操作步骤
- Console 首条红色错误
- 对应命令入参与返回值

## 四、常见坑点

1. Rust 改动后编译时间明显长于前端热更新，这是预期行为。
2. 文件系统访问需要能力声明，重点看 `src-tauri/capabilities/`。
3. 开发模式与生产模式路径解析可能不同，路径请尽量走统一 helper。
4. 行为不一致时先清理构建产物再复测：

```bash
rm -rf src-tauri/target
pnpm dev
```

### 页面白屏

**现象**：Tauri 窗口打开后显示白屏，没有内容。

**原因**：前端 Vite 开发服务器没有运行或已退出，Tauri 窗口无法加载页面内容。

**排查步骤**：

1. 检查前端服务是否在运行：
   ```bash
   curl http://localhost:5173/
   ```
   如果没有响应，说明 Vite 服务已停止。

2. 检查 Vite 进程：
   ```bash
   ps aux | grep vite
   ```

3. 手动重启前端服务：
   ```bash
   cd packages/web && pnpm dev
   ```

4. 重启 Tauri 应用（必须重启才能重新加载页面）：
   ```bash
   # 先停止旧进程
   pkill j-skills
   # 重新启动
   ./src-tauri/target/debug/j-skills
   ```

**根本原因**：Vite 默认在端口被占用时会自动切换到下一个可用端口（如 5174），但 Tauri 配置固定使用 5173，导致窗口加载失败。

**解决方案**（已实施）：

1. **Vite 严格端口模式** - 修改 `packages/web/vite.config.ts`，添加 `strictPort: true`，确保 Vite 不会自动切换端口

2. **自动清理端口脚本** - 修改 `package.json`，在 `pnpm dev` 启动前自动清理 5173 端口占用：
   ```json
   "pre:dev": "lsof -ti:5173 | xargs kill -9 2>/dev/null || true",
   "dev": "pnpm pre:dev && pnpm dev:tauri",
   ```

**手动处理**（如自动脚本失效）：
```bash
# 查找占用 5173 的进程
lsof -i:5173

# 终止进程（将 <PID> 替换为实际进程号）
kill -9 <PID>

# 或一键清理
lsof -ti:5173 | xargs kill -9 2>/dev/null
```

## 五、快速回归清单

- 能启动：`pnpm dev`
- 页面切换正常：Skills / Develop / Settings
- 核心命令可调用：前端 `invoke` 到 Rust
- 构建可通过：`pnpm build:tauri`
