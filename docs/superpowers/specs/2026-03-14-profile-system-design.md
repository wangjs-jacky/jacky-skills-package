# j-skills Profile 系统设计

> 创建时间: 2026-03-14
> 状态: 设计完成，待实现

## 背景

### 问题描述

用户当前面临两个主要问题：

1. **Skills 数量过多**: 74 个全局 skills，难以快速筛选和安装
2. **工作流方案冲突**: 安装了多个工作流方案（Superpowers、OpenSpec、SpiderKit），切换困难，经常默认触发错误的方案

### 目标

设计一个 Profile 系统，实现：
- 预设配置组合，一键切换工作环境
- 混合模式：默认全局切换，支持项目级覆盖
- 完整配置：包含 skills 列表 + 工作流方案 + IDE 配置

## 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      j-skills CLI                           │
├─────────────────────────────────────────────────────────────┤
│  profile    │  workflow   │  recommend  │  existing cmds    │
├─────────────────────────────────────────────────────────────┤
│                      Profile Manager                        │
├──────────────┬──────────────┬───────────────────────────────┤
│ Profile Store│Workflow Mgr  │ Project Detector (Phase 4)    │
├──────────────┴──────────────┴───────────────────────────────┤
│                      Tauri Web App (Phase 3)                │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Profile 基础系统

### 1.1 目录结构

```
~/.claude/profiles/
├── _active.json          # 当前激活的 Profile 引用
├── default.json          # 默认 Profile
├── frontend.json         # 前端开发
├── backend.json          # 后端开发
├── mobile.json           # 移动端开发
└── full-stack.json       # 全栈开发

<project>/.j-skills/
└── profile.json          # 项目级 Profile 覆盖
```

### 1.2 Profile Schema

```typescript
interface Profile {
  name: string;                    // Profile 名称
  description?: string;            // 描述
  version: string;                 // 配置版本

  // 工作流方案
  workflow: 'superpowers' | 'openspec' | 'spiderkit' | 'native';

  // Skills 配置
  skills: {
    include: string[];             // 包含的 skills
    exclude?: string[];            // 排除的 skills（用于继承时）
  };

  // 插件配置
  plugins?: {
    name: string;
    version?: string;
    enabled: boolean;
  }[];

  // IDE 特定配置
  ideConfig?: {
    claude?: {
      planMode?: string;           // 计划模式
      hooks?: Record<string, any>; // 钩子配置
    };
    cursor?: Record<string, any>;
    windsurf?: Record<string, any>;
  };

  // 元数据
  metadata?: {
    author?: string;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
}
```

### 1.3 Profile 配置示例

```json
{
  "name": "frontend",
  "description": "前端开发配置 - React + TypeScript",
  "version": "1.0.0",
  "workflow": "superpowers",
  "skills": {
    "include": [
      "react-best-practices",
      "composition-patterns",
      "web-design-guidelines",
      "brainstorming",
      "test-driven-development"
    ]
  },
  "plugins": [
    {
      "name": "superpowers@superpowers-marketplace",
      "version": "5.0.2",
      "enabled": true
    }
  ],
  "ideConfig": {
    "claude": {
      "planMode": "superpowers"
    }
  },
  "metadata": {
    "author": "jacky",
    "tags": ["frontend", "react", "typescript"],
    "createdAt": "2026-03-14T00:00:00Z"
  }
}
```

### 1.4 CLI 命令

```bash
# 查看 Profile
j-skills profile list              # 列出所有 Profile
j-skills profile show [name]       # 显示 Profile 详情
j-skills profile current           # 显示当前激活的 Profile

# 切换 Profile
j-skills profile use <name>        # 全局切换
j-skills profile use <name> -p     # 项目级切换
j-skills profile use <name> --project

# 管理 Profile
j-skills profile create [name]     # 交互式创建
j-skills profile edit <name>       # 编辑 Profile
j-skills profile delete <name>     # 删除 Profile
j-skills profile duplicate <from> <to>  # 复制 Profile

# 导入导出
j-skills profile export <name>     # 导出为 JSON
j-skills profile import <file>     # 从文件导入
```

### 1.5 切换逻辑

```
切换 Profile 流程:
1. 读取目标 Profile 配置
2. 验证配置有效性
   - 检查 skills 是否存在
   - 检查插件是否已安装
3. 保存当前 Profile 状态（用于回滚）
4. 应用新 Profile
   - 更新 _active.json
   - 同步 skills 到各环境
   - 启用/禁用相关插件
5. 输出切换结果
```

## Phase 2: 工作流方案管理

### 2.1 工作流方案定义

```typescript
interface WorkflowScheme {
  id: string;                      // superpowers | openspec | spiderkit | native
  name: string;
  description: string;

  // 依赖的插件
  plugins: {
    packageId: string;             // 如 superpowers@claude-plugins-official
    version?: string;
    required: boolean;
  }[];

  // 自带的 skills（切换时自动启用）
  bundledSkills?: string[];

  // 互斥声明
  conflictsWith?: string[];        // 与哪些方案互斥

  // 特定配置
  config?: Record<string, any>;
}
```

### 2.2 预定义方案

| 方案 | 插件 | 互斥 |
|------|------|------|
| superpowers | superpowers@superpowers-marketplace | openspec |
| openspec | openspec | superpowers |
| spiderkit | spiderkit | - |
| native | 无 | - |

### 2.3 CLI 命令

```bash
j-skills workflow list             # 列出所有工作流方案
j-skills workflow current          # 显示当前方案
j-skills workflow use <name>       # 切换方案
```

### 2.4 切换流程

```
1. 检查目标方案是否可用
2. 检查互斥方案是否已启用
   - 如果有互斥方案，提示用户确认禁用
3. 禁用互斥方案
4. 启用目标方案
5. 更新 Profile 配置
```

### 2.5 交互提示

```bash
# 启用交互提示
j-skills config:set promptOnTask true

# 任务开始时显示
? 检测到新任务，请选择工作流方案：
  ❯ Superpowers (当前激活)
    OpenSpec
    SpiderKit
    Claude Code 原生
    跳过，使用当前方案
```

## Phase 3: Web 界面

### 3.1 技术方案

| 层级 | 技术选型 |
|------|----------|
| 桌面框架 | Tauri v2 |
| 前端框架 | React 18 |
| UI 组件 | Radix UI + Tailwind |
| 状态管理 | Zustand |
| 图标 | Lucide Icons |

### 3.2 页面结构

```
/skills          Skills 管理
  /skills/list   Skills 列表（支持分类筛选、搜索）
  /skills/install 安装 Skills
  /skills/linked 已链接 Skills

/profiles       Profile 管理
  /profiles/list Profile 列表
  /profiles/create 创建 Profile
  /profiles/:id  Profile 详情/编辑

/workflows      工作流方案管理
  /workflows/list 方案列表
  /workflows/current 当前方案

/settings       设置
  /settings/general 通用设置
  /settings/paths 路径配置
```

### 3.3 Tauri Commands

```rust
// Profile 相关
#[tauri::command]
fn list_profiles() -> Result<Vec<Profile>, String>;

#[tauri::command]
fn get_active_profile() -> Result<Profile, String>;

#[tauri::command]
fn switch_profile(name: String, scope: String) -> Result<(), String>;

#[tauri::command]
fn create_profile(profile: Profile) -> Result<(), String>;

// Skills 相关
#[tauri::command]
fn list_skills(scope: String) -> Result<Vec<Skill>, String>;

#[tauri::command]
fn install_skill(name: String, envs: Vec<String>) -> Result<(), String>;

// Workflow 相关
#[tauri::command]
fn list_workflows() -> Result<Vec<Workflow>, String>;

#[tauri::command]
fn switch_workflow(name: String) -> Result<(), String>;
```

## Phase 4: 智能推荐系统（后期）

### 4.1 项目类型检测

```typescript
interface ProjectDetector {
  // 检测文件
  files: string[];                 // package.json, Cargo.toml, etc.

  // 检测规则
  rules: {
    dependencies?: string[];       // 依赖关键词
    devDependencies?: string[];
    scripts?: string[];
    files?: string[];              // 文件存在检测
  };

  // 推荐结果
  recommendation: {
    profile: string;               // 推荐的 Profile
    skills: string[];              // 推荐的 Skills
    confidence: number;            // 置信度 0-1
  };
}
```

### 4.2 预定义检测规则

| 技术栈 | 检测条件 | 推荐 Profile | 推荐 Skills |
|--------|----------|--------------|-------------|
| React | package.json 含 react | frontend | react-best-practices, composition-patterns |
| Next.js | package.json 含 next | frontend | react-best-practices, vercel-* |
| React Native | package.json 含 react-native | mobile | react-native-skills |
| Node.js | package.json 含 express/koa/nest | backend | - |
| Tauri | 含 src-tauri/ | desktop | tauri-* |
| Python | 含 requirements.txt/pyproject.toml | backend | - |

### 4.3 CLI 命令

```bash
# 检测当前项目并推荐
j-skills recommend

# 带自动检测的切换
j-skills profile use --auto-detect

# 项目初始化
j-skills init
```

### 4.4 输出示例

```
╭─────────────────────────────────────────────╮
│ 🔍 项目检测结果                              │
├─────────────────────────────────────────────┤
│ 技术栈: React + TypeScript + Tauri          │
│ 置信度: 95%                                 │
├─────────────────────────────────────────────┤
│ 📦 推荐 Profile: frontend                   │
│ 🛠️ 推荐安装 Skills:                        │
│   - react-best-practices                    │
│   - composition-patterns                    │
│   - tauri-v2                                │
│   - web-design-guidelines                   │
├─────────────────────────────────────────────┤
│ [Apply Profile] [Install Skills] [Skip]     │
╰─────────────────────────────────────────────╯
```

## 实现计划

### 优先级

| Phase | 优先级 | 预计工作量 |
|-------|--------|-----------|
| Phase 1 | P0 | 2-3 天 |
| Phase 2 | P0 | 1-2 天 |
| Phase 3 | P1 | 3-5 天 |
| Phase 4 | P2 | 2-3 天 |

### 依赖关系

```
Phase 1 ──► Phase 2 ──► Phase 3
                         │
                         ▼
                      Phase 4
```

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 插件管理需要 Claude Code API | 高 | 先实现 skills 管理，插件切换作为增强功能 |
| 项目检测可能不准确 | 中 | 提供手动覆盖选项 |
| Profile 配置格式变化 | 低 | 版本控制 + 迁移脚本 |
