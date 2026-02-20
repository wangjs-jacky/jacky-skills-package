# 项目简介 - j-skills

## 核心需求

CLI 工具，用于管理 Claude Code Skills - 链接、安装和管理跨多个环境的 skills。

## 技术栈

- **语言**: TypeScript
- **CLI 框架**: cac
- **交互 UI**: @clack/prompts
- **构建工具**: tsup
- **运行时**: Node.js >= 18

## 项目结构

```
src/
├── index.ts           # CLI 入口
├── commands/          # 命令实现
│   ├── link.ts        # link 命令
│   ├── install.ts     # install 命令
│   ├── uninstall.ts   # uninstall 命令
│   ├── list.ts        # list 命令
│   └── config.ts      # config 命令
└── lib/               # 工具库
    ├── paths.ts       # 路径管理
    ├── registry.ts    # 注册表管理
    ├── log.ts         # 日志输出
    └── environments.ts # 环境管理
```

## 全局目录结构

```
~/.j-skills/
├── registry.json      # 注册表
├── config.json        # 配置
├── linked/            # link 的符号链接
├── global/            # 全局安装的 skills
└── cache/             # 缓存
```
