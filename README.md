# j-skills

> CLI tool for managing Agent Skills - link, install, and manage skills across 35+ coding agent environments

[中文文档](./README_CN.md)

j-skills is a command-line tool for managing Agent Skills, supporting 35+ mainstream AI coding assistants including Claude Code, Cursor, OpenCode, and more. It allows you to easily link, install, and manage skills across multiple environments.

## Features

- **Multi-Environment Support** - Supports 35+ mainstream AI coding assistants
- **Flexible Installation** - Supports both project-level and global installation
- **Symlink Management** - Uses symbolic links for hot-reload during local development
- **Unified Management** - Install to multiple environments with a single command
- **Interactive CLI** - Friendly command-line interface with interactive prompts
- **Web GUI** - Visual management interface for easier skill management

## Supported Agents

j-skills supports the following AI coding assistants (following the [Vercel Skills Specification](https://github.com/vercel-labs/skills#available-agents)):

| Agent | Project Path | Global Path |
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
| ...and 25+ more | | |

<details>
<summary>View Full List</summary>

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

## Installation

```bash
# Global installation
npm install -g j-skills

# Or use npx (no installation required)
npx j-skills <command>
```

## Commands

### link - Link local skill

Link a local skill directory to the global registry using symbolic links for hot-reload.

```bash
# Link current directory (must contain skill.md)
j-skills link

# Link specified directory
j-skills link /path/to/skill

# List linked skills
j-skills link --list

# Unlink
j-skills link --unlink <skill-name>
```

### install - Install skill

Install a skill to specified environment's project or global directory.

```bash
# Interactive installation
j-skills install <skill-name>

# Global installation
j-skills install <skill-name> --global

# Specify environments
j-skills install <skill-name> --env claude-code,cursor

# Verbose output
j-skills install <skill-name> --verbose
```

### uninstall - Uninstall skill

Remove a skill from installed environments.

```bash
# Interactive uninstallation
j-skills uninstall <skill-name>

# Global uninstallation
j-skills uninstall <skill-name> --global

# Skip confirmation
j-skills uninstall <skill-name> --yes
```

### list - List skills

View installed skills.

```bash
# List project-level skills (default)
j-skills list

# List global skills
j-skills list --global

# List all skills (project + global)
j-skills list --all

# Search skills
j-skills list --search <keyword>

# JSON output
j-skills list --json
```

### config - Configuration management

Manage global configuration.

```bash
# View configuration
j-skills config

# Set configuration
j-skills config set <key> <value>

# Delete configuration
j-skills config delete <key>
```

## Workflow

### 1. Create a Skill

Create a directory with a `skill.md` file in your project:

```bash
my-skill/
├── skill.md          # Required: skill description file
└── [other files...]  # Optional: additional files, templates, etc.
```

`skill.md` format example:

```markdown
---
name: my-skill
description: A skill for generating TypeScript types
---

# My Skill

Detailed description of the skill...

## Usage

1. First...
2. Then...
```

### 2. Link Local Skill

```bash
cd my-skill
j-skills link
```

### 3. Install to Target Environment

```bash
# Install to current project
j-skills install my-skill

# Global installation
j-skills install my-skill --global
```

### 4. Hot-Reload Development

Since `link` uses symbolic links, changes to your local skill are immediately reflected in all installed environments:

```bash
# Edit skill.md
vim skill.md

# Changes are visible immediately, no reinstallation needed!
```

## Symlink vs Copy

j-skills uses **symbolic links (symlinks)** as the default linking method:

| Feature | Symlink | Copy |
|-----|-------|------|
| Disk Usage | ❗ Very Low | ✅ High |
| Hot-Reload | ✅ Supported | ❌ Not Supported |
| Cross-Platform | ✅ Well Supported | ✅ Perfectly Supported |
| Recommended For | Development & Debugging | Production Deployment |

## Configuration File

Configuration file location: `~/.j-skills/config.json`

```json
{
  "defaultEnvironments": ["claude-code", "cursor"],
  "autoConfirm": false
}
```

## Web GUI

j-skills provides a local Web GUI for visual skill management.

### Start GUI

```bash
# Start both frontend and backend
pnpm dev:server &  # Backend :3001
pnpm dev:web       # Frontend :5173

# Or run in project root
pnpm dev:all
```

### GUI Features

- **Skills Management** - View linked/installed skills with search and uninstall support
- **Develop** - Link local skill directories, preview SKILL.md content
- **Settings** - Configure default installation environments

### Tech Stack

- **CLI**: TypeScript + tsup + cac + @clack/prompts
- **Backend**: Express + TypeScript (port 3001)
- **Frontend**: React + Vite + Tailwind CSS + Zustand (port 5173)
- **Communication**: Frontend accesses backend API via Vite proxy

## Comparison with Vercel Skills

| Feature | j-skills | Vercel Skills |
|-----|----------|--------------|
| Supported Environments | 35+ | 35+ |
| Local Linking | ✅ | ❌ |
| Registry Management | ✅ | ❌ |
| Interactive Installation | ✅ | ✅ |
| Global/Project Level | ✅ | ✅ |
| Web GUI | ✅ | ❌ |

## License

MIT

## Related Resources

- [Vercel Skills Specification](https://github.com/vercel-labs/skills)
- [Claude Code Documentation](https://docs.anthropic.com)
- [Agent Skills Directory](https://skills.sh)
