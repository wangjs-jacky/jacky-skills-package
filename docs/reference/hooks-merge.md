# Hooks 合并机制（Claude Code 环境）

> Skill 安装到 Claude Code 时，hooks 自动合并到 `~/.claude/settings.json` 的完整流程。

## 触发条件

仅当安装目标环境为 **claude-code** 时触发 hooks 合并：

- CLI 侧：`src/commands/install.ts:294` — `targetEnvs.includes('claude-code') && hasSkillHooks(found.path)`
- Tauri 侧：`src-tauri/src/commands/skills.rs:705` — `env == "claude-code"`

## 核心文件

| 层级 | 文件 | 说明 |
|------|------|------|
| CLI（TypeScript） | `src/lib/hooks.ts` | Node.js 端 hooks 合并/移除实现 |
| Tauri（Rust） | `src-tauri/src/services/hooks.rs` | Rust 端 hooks 合并/移除实现 |
| CLI 入口 | `src/commands/install.ts` | `j-skills install` 命令中调用 |
| Tauri 入口 | `src-tauri/src/commands/skills.rs` | `install_skill` / `uninstall_skill` command |
| 测试 | `tests/unit/hooks.test.ts` | hooks 合并单元测试 |

## 双端实现对照

两端的合并逻辑完全一致（互为镜像）：

| 功能 | TypeScript | Rust |
|------|-----------|------|
| 读取 skill hooks | `readSkillHooks()` | `read_skill_hooks()` |
| 检查 skill 有无 hooks | `hasSkillHooks()` | `has_skill_hooks()` |
| 合并到 settings | `mergeSkillHooks()` | `merge_skill_hooks()` |
| 从 settings 移除 | `removeSkillHooks()` | `remove_skill_hooks()` |
| 检查是否已安装 hooks | `hasSkillHooksInSettings()` | `has_skill_hooks_in_settings()` |
| 列出所有已安装 hooks | `listInstalledSkillHooks()` | `list_installed_skill_hooks()` |
| 变量替换 | `resolveHookVariables()` | `resolve_hook_variables()` |

## 前置验证机制

> **目的**：`~/.claude/settings.json` 是 Claude Code 核心配置，hooks 写坏会导致 Claude Code 无法启动。因此在每次合并/移除操作前，必须验证 hooks 结构。

### 验证函数

| 层级 | 函数 | 说明 |
|------|------|------|
| TypeScript | `validateHooksConfig(hooks)` | 返回 `{ valid: boolean; errors: string[] }` |
| Rust | `validate_hooks_config(hooks: &Value)` | 返回 `Result<(), Vec<String>>` |

### 验证规则

```
validateHooksConfig(hooks):
  1. hooks 不是 object（或为 null/数组）→ 错误
  2. 对每个 hookType：
     a. 值不是数组 → 错误
     b. 每个 matcher 不是 object → 错误
     c. matcher 缺少 hooks 属性或 hooks 不是数组 → 错误
     d. matcher 字段存在但不是 string/null → 错误
     e. 每个 hook 不是 object → 错误
     f. hook 缺少 type 或 type 不是 string → 错误
     g. hook 缺少 command 或 command 不是 string → 错误
```

### 调用位置

1. **`mergeSkillHooks`** — 合并前验证：
   - 验证 skill `hooks.json` 结构 → 异常则中止，return false
   - 验证 settings.json 现有 hooks 结构 → 异常则中止，return false
   - 两项都通过后再执行合并

2. **`removeSkillHooks`** — 移除前验证：
   - 验证 settings.json hooks 结构 → 异常则中止，return false

### 设计原则

- **宁可跳过，不可损坏**：验证不通过时，安全地跳过操作（return false），绝不写入异常数据
- **不修复**：验证函数只做检查，不做自动修复。异常数据应交由人工处理
- **双端一致**：TypeScript 和 Rust 实现完全相同的验证规则

## 合并流程详解

### 1. Skill Hooks 声明

Skill 通过 `hooks/hooks.json` 声明 hooks：

```
<skill-dir>/hooks/hooks.json
```

结构示例：

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/on-stop.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/pre-write.sh"
          }
        ]
      }
    ]
  }
}
```

### 2. 变量替换

合并前，`${CLAUDE_PLUGIN_ROOT}` 被替换为 skill 的实际路径：

```
bash ${CLAUDE_PLUGIN_ROOT}/hooks/on-stop.sh
→ bash /Users/x/.claude/skills/task-memory/hooks/on-stop.sh
```

### 3. Skill 标记（Marker）

每个 command 末尾追加 `# skill: <skillName>` 标记，用于：
- 去重：防止同一 skill 重复合并
- 定位：卸载时精确移除该 skill 的 hooks

```
bash /Users/x/.claude/skills/task-memory/hooks/on-stop.sh # skill: task-memory
```

### 4. Matcher 合并策略

```
settings.json 中 hooks 结构：
{
  "hooks": {
    "<HookType>": [           // 如 "Stop", "PreToolUse"
      {
        "matcher": "<value>", // 匹配器（空字符串=全局匹配）
        "hooks": [...]        // 该 matcher 下的 command 列表
      }
    ]
  }
}
```

**合并规则**（逐层遍历）：

```
对 skill hooks.json 中的每个 hookType：
  对每个 matcher：
    1. 归一化 matcher（null/undefined → 空字符串）
    2. 在 settings.json 中查找相同 matcher 值的条目
    3a. 若找到：追加新 hooks（去重：command 完全相同时跳过）
    3b. 若未找到：新增 matcher 条目
```

**关键细节**：
- matcher 归一化：`null`、`undefined`、`""` 视为同一个 matcher bucket
- 去重标准：`command` 字符串完全一致（含 marker）才视为重复
- 额外字段保留：hook 中的 `async` 等非标准字段会被保留

### 5. 卸载移除逻辑

卸载 skill 时（从 claude-code 环境移除）：

```
对 settings.json 中每个 hookType 的每个 matcher：
  1. 过滤掉包含 "# skill: <skillName>" 的 hooks
  2. 若 matcher 下无剩余 hooks → 移除整个 matcher
  3. 若 hookType 下无剩余 matchers → 移除整个 hookType
```

## settings.json 结构示例

合并多个 skill 后的 settings.json：

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "/Users/x/.superset/hooks/notify.sh" },
          { "type": "command", "command": "bash /path/to/skill-a/hooks/on-stop.sh # skill: skill-a" },
          { "type": "command", "command": "bash /path/to/skill-b/hooks/on-stop.sh # skill: skill-b" }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "bash /path/to/skill-a/hooks/pre-write.sh # skill: skill-a" }
        ]
      }
    ]
  }
}
```

## Broken Skill 自动清理

`list_skills` 加载时，如果 skill 路径无效（broken symlink / 目录不存在）：

1. 从环境目录删除安装文件
2. 调用 `remove_skill_hooks()` 清理 settings.json 中的 hooks
3. 从 registry 注销

相关代码：`src-tauri/src/commands/skills.rs:441-481`
