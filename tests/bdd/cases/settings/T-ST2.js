export default {
  testCaseId: 'T-ST2',
  page: 'Settings',
  title: '默认环境多选 - 点击切换环境选择状态',
  link: '/settings',
  tags: ['待实现'],
  path: [
    'Settings 页面',
    'Default Environments',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Settings 页面，Claude Code 和 Cursor 均已选中',
      expectation: '两个环境按钮显示选中状态（高亮背景 + 勾号图标）',
    },
    {
      stepId: 2,
      description: '点击 Claude Code 取消选择',
      expectation: 'Claude Code 按钮恢复未选中状态（默认背景 + 无勾号）',
    },
    {
      stepId: 3,
      description: '再次点击 Claude Code 重新选中',
      expectation: 'Claude Code 按钮恢复选中状态（高亮背景 + 勾号图标）',
    },
  ],
}
