# Skills 自动发现设计

> 将 `~/.agents/skills/` 的扫描从手动按钮触发改为自动发现，每次 `list_skills` 调用时自动同步。

## 背景

当前 Skills 页面需要用户手动点击 "Scan" 按钮才能发现 `~/.agents/skills/` 下的 skill。该目录包含 100+ 个 skill（如 superpowers、brainstorming、code-review 等），与通过 Link 注册的 skill 共存、地位平等。

**问题**：手动扫描容易遗忘，新 skill 不会自动出现在列表中。

## 设计方案

### 核心思路

在 `list_skills` 命令中嵌入自动扫描逻辑，使其在每次被前端调用时自动发现新 skill。前端只需打开 Skills 页面即触发同步，无需任何手动操作。

### 执行流程

```
前端 loadSkills()
  → invoke('list_skills')
  → Rust:
      1. [新增] 扫描 ~/.agents/skills/，注册新发现的 skill
      2. [现有] 校验已有 skill 路径有效性，清理失效项
      3. [现有] 同步安装状态、提取元数据
      4. 返回 ListSkillsResult { skills, cleaned_count }
```

### 变更详情

#### 1. Rust 后端 — `src-tauri/src/commands/skills.rs`

- 将 `scan_agents_directory` 的核心扫描逻辑提取为内部函数 `_sync_agents_skills(registry)`
- 在 `list_skills` 命令开头调用 `_sync_agents_skills`
- 移除 `scan_agents_directory` 的 `#[tauri::command]` 宏，改为纯内部函数
- `_sync_agents_skills` 的去重逻辑保持不变：
  - Linked skill 不覆盖
  - 已注册的同名 marketplace skill 跳过
  - 仅注册 registry 中不存在的新 skill

#### 2. Rust 后端 — `src-tauri/src/main.rs`

- 从 `tauri::generate_handler![]` 中移除 `scan_agents_directory`

#### 3. 前端 — `web/src/api/client.ts`

- 移除 `scanAgents()` 方法

#### 4. 前端 — `web/src/pages/Skills/index.tsx`

- 移除 `handleScanAgents` 函数
- 移除 `scanning` state 及相关 UI
- 移除两处 Scan 按钮（External tab 内和空状态）

### 不变的部分

| 项目 | 说明 |
|------|------|
| CLI `scan-agents` 命令 | CLI 用户仍需手动扫描，保持不变 |
| Linked skill 优先级 | 自动发现不覆盖 linked skill |
| `registry_watcher` | 继续监听 `registry.json` 变化 |
| Source folders 概念 | `link_skill` 管理的 source folders 不受影响 |
| `remove_external_skill` 命令 | 保留，用于手动移除不需要的 skill |

### 性能考虑

- `~/.agents/skills/` 目录扫描为 `readdir` + 检查 `SKILL.md` 是否存在，100 个 skill 耗时 <50ms
- 仅注册新 skill 时写 registry.json，无变更时不写磁盘
- `list_skills` 在页面挂载时调用一次，频率低

### 涉及文件

| 文件 | 变更类型 |
|------|---------|
| `src-tauri/src/commands/skills.rs` | 重构：提取内部函数 + 嵌入 list_skills |
| `src-tauri/src/main.rs` | 删除：移除 handler 注册 |
| `web/src/api/client.ts` | 删除：移除 scanAgents API |
| `web/src/pages/Skills/index.tsx` | 删除：移除 Scan 按钮及相关逻辑 |
