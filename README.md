# j-skills

> CLI tool for managing Agent Skills - link, install, and manage skills across 35+ coding agent environments

j-skills 是一个用于管理 Agent Skills 的命令行工具，支持 Claude Code、Cursor、OpenCode 等 35+ 个主流 AI 编码助手。它允许你轻松地在多个环境之间链接、安装和管理 skills。

## 特性

- **多环境支持** - 支持 35+ 个主流 AI 编码助手
- **灵活的安装方式** - 支持项目级和全局级安装
- **软链接管理** - 使用符号链接实现本地开发热更新
- **统一管理** - 一条命令安装到多个环境
- **交互式界面** - 友好的命令行交互体验

## 支持的 Agents

j-skills 支持以下主流 AI 编码助手（遵循 [Vercel Skills 规范](https://github.com/vercel-labs/skills#available-agents)）：

| Agent | 项目路径 | 全局路径 |
|-------|---------|----------|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| OpenCode | `.agents/skills/` | `~/.config/opencode/skills/` |
| Cline | `.cline/skills/` | `~/.cline/skills/` |
| Continue | `.continue/skills/` | `~/.continue/skills/` |
| Codex | `.agents/skills/` | `~/.codex/skills/` |
| GitHub Copilot | `.agents/skills/` | `~/.copilot/skills/` |
| Augment | `.augment/skills/` | `~/.augment/skills/` |
| Roo Code | `.roo/skills/` | `~/.roo/skills/` |
| Windsurf | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| ...还有 25+ 更多 | | |

<details>
<summary>查看完整列表</summary>

- Amp / Kimi CLI / Replit - `.agents/skills/` / `~/.config/agents/skills/`
- Antigravity - `.agent/skills/` / `~/.gemini/antigravity/skills/`
- OpenClaw - `skills/` / `~/.moltbot/skills/`
- CodeBuddy - `.codebuddy/skills/` / `~/.codebuddy/skills/`
- Command Code - `.commandcode/skills/` / `~/.commandcode/skills/`
- Crush - `.crush/skills/` / `~/.config/crush/skills/`
- Droid - `.factory/skills/` / `~/.factory/skills/`
- Gemini CLI - `.agents/skills/` / `~/.gemini/skills/`
- Goose - `.goose/skills/` / `~/.config/goose/skills/`
- Junie - `.junie/skills/` / `~/.junie/skills/`
- iFlow CLI - `.iflow/skills/` / `~/.iflow/skills/`
- Kilo Code - `.kilocode/skills/` / `~/.kilocode/skills/`
- Kiro CLI - `.kiro/skills/` / `~/.kiro/skills/`
- Kode - `.kode/skills/` / `~/.kode/skills/`
- MCPJam - `.mcpjam/skills/` / `~/.mcpjam/skills/`
- Mistral Vibe - `.vibe/skills/` / `~/.vibe/skills/`
- Mux - `.mux/skills/` / `~/.mux/skills/`
- OpenHands - `.openhands/skills/` / `~/.openhands/skills/`
- Pi - `.pi/skills/` / `~/.pi/agent/skills/`
- Qoder - `.qoder/skills/` / `~/.qoder/skills/`
- Qwen Code - `.qwen/skills/` / `~/.qwen/skills/`
- Trae - `.trae/skills/` / `~/.trae/skills/`
- Trae CN - `.trae/skills/` / `~/.trae-cn/skills/`
- Zencoder - `.zencoder/skills/` / `~/.zencoder/skills/`
- Neovate - `.neovate/skills/` / `~/.neovate/skills/`
- Pochi - `.pochi/skills/` / `~/.pochi/skills/`
- AdaL - `.adal/skills/` / `~/.adal/skills/`

</details>

## 安装

```bash
# 全局安装
npm install -g j-skills

# 或使用 npx（无需安装）
npx j-skills <command>
```

## 命令

### link - 链接本地 skill

将本地 skill 目录链接到全局注册表，使用软链接实现热更新。

```bash
# 链接当前目录（必须包含 skill.md）
j-skills link

# 链接指定目录
j-skills link /path/to/skill

# 列出已链接的 skills
j-skills link --list

# 取消链接
j-skills link --unlink <skill-name>
```

### install - 安装 skill

将 skill 安装到指定环境的项目或全局目录。

```bash
# 交互式安装
j-skills install <skill-name>

# 全局安装
j-skills install <skill-name> --global

# 指定环境
j-skills install <skill-name> --env claude-code,cursor

# 显示详细日志
j-skills install <skill-name> --verbose
```

### uninstall - 卸载 skill

从已安装的环境中移除 skill。

```bash
# 交互式卸载
j-skills uninstall <skill-name>

# 全局卸载
j-skills uninstall <skill-name> --global

# 跳过确认
j-skills uninstall <skill-name> --yes
```

### list - 列出 skills

查看已安装的 skills。

```bash
# 列出项目级 skills（默认）
j-skills list

# 列出全局 skills
j-skills list --global

# 列出所有 skills（项目 + 全局）
j-skills list --all

# 搜索 skills
j-skills list --search <keyword>

# JSON 格式输出
j-skills list --json
```

### config - 配置管理

管理全局配置。

```bash
# 查看配置
j-skills config

# 设置配置项
j-skills config set <key> <value>

# 删除配置项
j-skills config delete <key>
```

## 工作流程

### 1. 创建 Skill

在项目中创建一个包含 `skill.md` 的目录：

```bash
my-skill/
├── skill.md          # 必需：skill 描述文件
└── [其他资源...]    # 可选：附加文件、模板等
```

`skill.md` 格式示例：

```markdown
---
name: my-skill
description: 一个用于生成 TypeScript 类型的 skill
---

# My Skill

这是 skill 的详细说明...

## 使用方法

1. 首先...
2. 然后...
```

### 2. 链接本地 Skill

```bash
cd my-skill
j-skills link
```

### 3. 安装到目标环境

```bash
# 安装到当前项目
j-skills install my-skill

# 全局安装
j-skills install my-skill --global
```

### 4. 热更新开发

由于 `link` 使用软链接，你对本地 skill 的修改会立即反映到所有已安装的环境：

```bash
# 编辑 skill.md
vim skill.md

# 修改立即可见，无需重新安装！
```

## 软链接 vs 复制

j-skills 使用**软链接（符号链接）**作为默认的链接方式：

| 特性 | 软链接 | 复制 |
|-----|-------|------|
| 磁盘占用 | ❗ 极低 | ✅ 高 |
| 热更新 | ✅ 支持 | ❌ 不支持 |
| 跨平台 | ✅ 良好支持 | ✅ 完美支持 |
| 推荐场景 | 开发调试 | 生产部署 |

## 配置文件

配置文件位置：`~/.j-skills/config.json`

```json
{
  "defaultEnvironments": ["claude-code", "cursor"],
  "autoConfirm": false
}
```

## 与 Vercel Skills 的区别

| 特性 | j-skills | Vercel Skills |
|-----|----------|--------------|
| 支持环境数 | 35+ | 35+ |
| 本地链接 | ✅ | ❌ |
| 注册表管理 | ✅ | ❌ |
| 交互式安装 | ✅ | ✅ |
| 全局/项目级 | ✅ | ✅ |

## 许可证

MIT

## 相关资源

- [Vercel Skills 规范](https://github.com/vercel-labs/skills)
- [Claude Code 文档](https://docs.anthropic.com)
- [Agent Skills Directory](https://skills.sh)

## Web GUI

j-skills 提供了一个本地 Web GUI 界面，方便可视化管理 Skills。

### 启动 GUI

```bash
# 同时启动前后端
pnpm dev:server &  # 后端 :3001
pnpm dev:web       # 前端 :5173

# 或在项目根目录运行
pnpm dev:all
```

### GUI 功能

- **Skills 管理** - 查看已链接/安装的 Skills，支持搜索和卸载
- **Develop** - 链接本地 Skill 目录，预览 SKILL.md 内容
- **Settings** - 配置默认安装环境

### 技术架构

- **后端**: Express + TypeScript (端口 3001)
- **前端**: React + Vite + Tailwind CSS + Zustand (端口 5173)
- **通信**: 前端通过 Vite 代理访问后端 API
