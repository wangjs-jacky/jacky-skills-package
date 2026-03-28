export default {
  testCaseId: 'T-S7',
  page: 'Skills',
  title: 'Skill Card 信息展示 - 卡片显示 skill 完整信息',
  link: '/skills',
  tags: ['待实现'],
  path: [
    'Skills 页面',
    'Skill Card',
    '信息展示',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Skills 页面，API 返回包含完整信息的 skill',
      expectation: 'Skill Card 显示 skill 名称（字体为 mono-semibold）',
    },
    {
      stepId: 2,
      description: '确认 source 标签',
      expectation: 'Card 显示 source 标签（如 "global"、"local"），样式为小号大写标签',
    },
    {
      stepId: 3,
      description: '确认路径显示',
      expectation: 'Card 显示 skill 路径，显示在深色背景区域中，文本截断',
    },
    {
      stepId: 4,
      description: '确认 sourceFolder 显示',
      expectation: '如果 skill 有 sourceFolder，Card 显示 "From: {sourceFolder}"',
    },
    {
      stepId: 5,
      description: '确认环境 Toggle 列表',
      expectation: 'Card 底部显示 Claude Code 和 Cursor 两个环境 Toggle 按钮',
    },
    {
      stepId: 6,
      description: 'hover 状态下显示操作按钮',
      expectation: 'hover Card 时显示 Export 和 Unlink 操作按钮',
    },
  ],
}
