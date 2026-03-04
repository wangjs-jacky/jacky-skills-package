# Skills 源文件夹管理与导出功能设计

> **目标**: 统一管理散落在各处的 skills，支持导出分享给他人

## 核心概念

```
散落的 skills:                    统一管理:
├── /path/folder1/skill-a/       →    ~/.j-skills/linked/
├── /path/folder2/skill-b/            ├── skill-a → /path/folder1/skill-a
├── /path/folder3/skill-c/            ├── skill-b → /path/folder2/skill-b
                                      └── skill-c → /path/folder3/skill-c

导出功能:
~/.j-skills/linked/  →  export/skills/
                         ├── skill-a/  (实际文件)
                         ├── skill-b/  (实际文件)
                         └── skill-c/  (实际文件)
```

## 数据结构

### 源文件夹记录

```typescript
interface SourceFolder {
  path: string              // 文件夹路径
  addedAt: string          // 添加时间
  lastScanned: string      // 最后扫描时间
  skillCount: number       // 包含的 skill 数量
}
```

### 注册表更新

```typescript
interface Registry {
  skills: SkillInfo[]
  sourceFolders: SourceFolder[]  // 新增：记录所有源文件夹
}
```

## 功能模块

### 1. 源文件夹管理

**记录功能:**
- 每次批量链接时，记录源文件夹路径
- 存储到 registry.json 中

**界面展示:**
- 在 GUI 中显示已添加的源文件夹列表
- 显示每个文件夹包含的 skill 数量
- 显示最后扫描时间

**操作功能:**
- 重新扫描：检测文件夹下新增的 skills
- 移除源文件夹：可选同时移除已链接的 skills
- 来源追溯：查看每个 skill 来自哪个文件夹

### 2. 导出功能

**导出方式:**
- **批量导出**: 选择多个 skills 导出为一个 skill 包
- **单个导出**: 导出单个 skill

**导出结构:**
```
exported-skills/
├── skill-a/
│   └── SKILL.md
├── skill-b/
│   └── SKILL.md
└── skill-c/
    └── SKILL.md
```

**导出特点:**
- 复制实际文件（不是软链接）
- 保持标准 skill 项目结构
- 方便分享给他人使用

## 实现范围

### Phase 1: 源文件夹记录
- 修改 registry 数据结构
- 批量链接时记录源文件夹
- API 支持获取源文件夹列表

### Phase 2: GUI 展示
- Skills 页面显示 skill 来源信息
- 新增源文件夹管理界面（可选）

### Phase 3: 导出功能
- API 支持导出 skills
- GUI 支持选择导出
- 支持单个/批量导出
