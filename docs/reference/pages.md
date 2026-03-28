# 页面功能清单

## 目录结构

```
packages/web/src/pages/
├── Skills/                   # S-x
│   ├── index.tsx             # 页面入口 + Stats Bar + 事件处理
│   └── SkillList.tsx         # 列表渲染 + 搜索 + 卡片
├── Develop/                  # D-x
│   └── index.tsx             # 页面入口 + Batch Link + Source Folders + Preview
└── Settings/                 # ST-x
    └── index.tsx             # 页面入口 + 配置读取/保存

tests/
├── web/api-client.test.ts    # API 传输层
├── config.test.ts            # 配置校验
└── lib/hooks.test.ts         # hooks 合并
e2e/
└── tauri-smoke.spec.ts       # 启动冒烟
```

## Skills `/skills`

- [x] S1 列表加载与统计（X linked / Y installed）
- [x] S2 搜索过滤（name contains 实时匹配）
- [x] S3 环境开关安装/卸载（Claude Code、Cursor Toggle）
- [x] S4 导出（→ ~/Downloads/j-skills-export/）
- [x] S5 Unlink
- [x] S6 空状态 "No skills found"
- [ ] S7 批量操作（多选 → 一键安装/卸载/导出）
- [ ] S8 筛选排序（source / installed / name）
- [ ] S9 操作二次确认与撤销

## Develop `/develop`

- [x] D1 Batch Link（输入路径 → Link All → 扫描子目录软链接）
- [x] D2 Source Folders 列表展示
- [x] D3 刷新 / 删除源文件夹
- [x] D4 点击路径回填输入框
- [x] D5 Preview 空状态
- [ ] D6 点击 skillName 加载 SKILL.md
- [ ] D7 Link 结果明细（成功/失败分项）
- [ ] D8 系统目录选择器 → `tests/bdd-cases/develop/T-D8.js`
- [ ] D9 历史路径辅助

## Settings `/settings`

- [x] ST1 读取配置
- [x] ST2 环境列表加载
- [x] ST3 默认环境多选（点击切换）
- [x] ST4 安装方式切换（copy / symlink）
- [x] ST5 保存设置
- [ ] ST6 重置为默认配置
- [ ] ST7 配置导入/导出
- [ ] ST8 保存前 diff 预览
