# ob-topic Skill 设计文档

> 对话中快速收集通用知识点到 Obsidian 知识库

## 定位

| 维度 | ob-topic | ob-collect | ob-project-log |
|------|----------|------------|----------------|
| 来源 | 对话上下文 | 外部 URL/视频/PDF | 对话上下文（项目相关） |
| 绑定 | 不绑定项目 | 不绑定项目 | 绑定 git 项目 |
| 触发 | 手动 + 自动提醒 | 手动 | Stop hook 自动 |
| 目标 | wiki/{theme}/ | raw/ → wiki/{theme}/ | wiki/projects/{project}/ |
| 重量级 | 轻量（一步到位） | 重量（多步骤） | 中等 |

## 触发方式

**触发词**：`/save`、`/collect`、`收藏`、`记录一下`、`ob-topic`

**两种使用方式**：
1. 手动触发：用户主动说触发词 + 知识点描述
2. 自动提醒：SessionStart hook 注入"知识收集意识"，对话中识别到有价值知识点时主动询问

## 手动收藏流程

```
用户: "/save React Server Components 的流式渲染原理"
  → Claude 识别为收藏指令
  → 从当前对话上下文中提取相关内容（如有）
  → 自动分类主题目录（关键词匹配）
  → 生成 wiki 笔记内容（≤ 500 字，精炼概括）
  → 写入 wiki/{theme}/{YYYY-MM-DD}-{slug}.md
  → 更新 wiki/{theme}/index.md
  → 更新 wiki/index.md（新主题时）
  → 返回结果摘要
```

## 自动提醒规则

SessionStart hook 注入提示，告诉 Claude：

- 识别到**通用独立知识点**时主动询问是否收藏
- 判断标准：概念解释、技术原理、最佳实践、经验总结等
- 不提醒：临时调试、代码修改细节、项目特定配置
- 使用 `/save` 等触发词时立即执行，不再询问

## 主题分类

复用 ob-collect 关键词映射：

| 主题 | 目录 | 关键词 |
|------|------|--------|
| AI 技术 | `wiki/ai/` | AI, LLM, GPT, transformer, 机器学习, 深度学习 |
| Claude 生态 | `wiki/claude/` | Claude, Claude Code, Skills, MCP, hooks |
| 开发工具 | `wiki/dev-tools/` | VSCode, IDE, 编辑器, CLI, 终端, Git |
| 前端开发 | `wiki/front-end/` | React, JavaScript, TypeScript, CSS, 前端 |
| 时事分析 | `wiki/current-affairs/` | 经济, 政治, 国际, 金融, 投资 |
| 职业发展 | `wiki/career/` | 职级, 面试, 求职, 职业规划 |
| Obsidian | `wiki/obsidian/` | Obsidian, 知识管理, 笔记 |
| 综合 | `wiki/synthesis/` | 兜底 |

## 输出格式

```markdown
---
tags: [{主题标签}, {关键词}]
type: topic
created_at: {YYYY-MM-DD}
source: conversation
---

# {知识点标题}

> 从对话中整理 · {主题分类}

## 核心内容

{精炼概括，≤ 500 字}

## 关键要点

1. {要点一}
2. {要点二}
3. {要点三}
```

## 索引更新规则

- `wiki/{theme}/index.md`：追加新条目到对应分类下
- `wiki/index.md`：新主题分类时追加；已有分类时只更新子索引
- 主题目录不存在时自动创建 + 生成 index.md

## 文件结构

```
plugins/obsidian-tools/ob-topic/
├── SKILL.md                    # Skill 定义
└── hooks/
    ├── hooks.json              # Hook 声明（SessionStart）
    └── topic-awareness.sh      # 注入知识收集意识
```

## SessionStart Hook

脚本 `topic-awareness.sh` 输出约 100 字的提示，注入知识收集意识。与 `load-ob-index.sh`（ob-project-log 的索引加载 hook）独立，互不干扰。

## 依赖

- `OBSIDIAN_REPO` 环境变量（和其他 obsidian-tools skill 一致）
- 未配置时通过 AskUserQuestion 询问
