# Monitor 重构方案

## 问题

当前 claude-monitor 的 hooks 同时做两件事：
1. 守护进程通信（curl → daemon）— 捕获终端状态
2. Swift 悬浮弹窗 — macOS 原生通知

两者耦合在一起，无法独立控制。Monitor 页面的 Enable/Disable 语义混乱。

## 设计

### 职责拆分

| 职责 | 行为 | 控制 |
|------|------|------|
| 守护进程通信 | hooks 始终向 daemon 发送状态 | 默认开启，跟随 daemon 是否运行 |
| 悬浮弹窗 | hooks 检查配置后决定是否弹窗 | 用户开关控制，默认关闭 |

### 配置存储

使用 `~/.config/j-skills/monitor-config.json`：

```json
{
  "floatingWindow": {
    "enabled": false
  }
}
```

- Tauri app 通过 Rust 命令读写此文件
- hooks 脚本读取此文件决定是否弹窗
- 不污染官方 `settings.json`

### Hooks 修改

每个 hook 脚本的执行流程：

```
hook 触发
  ├── curl → daemon（始终执行，静默失败）
  └── 检查 monitor-config.json
       └── floatingWindow.enabled == true?
            ├── 是 → 显示 Swift 悬浮窗
            └── 否 → 跳过
```

### Monitor 页面改造

- 去掉当前的 Enable/Disable 按钮（守护进程自动连接，无需手动控制）
- 新增悬浮弹窗开关（Toggle Switch）
- 开关状态持久化到 `monitor-config.json`

### 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `plugins/monitoring/claude-monitor/hooks/*.sh` | 修改 | 拆分 daemon 通信和弹窗逻辑 |
| `plugins/monitoring/claude-monitor/hooks/common/config.sh` | 修改 | 新增浮动窗配置读取 |
| `src-tauri/src/commands/monitor.rs` | 修改 | 新增读写配置的 Tauri 命令 |
| `web/src/api/monitor.ts` | 修改 | 新增配置 API |
| `web/src/pages/Monitor/index.tsx` | 修改 | UI 改造：去掉 Enable/Disable，加 Toggle |
