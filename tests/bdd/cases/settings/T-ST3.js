export default {
  testCaseId: 'T-ST3',
  page: 'Settings',
  title: '安装方式切换 - Copy 和 Symlink 切换',
  link: '/settings',
  tags: ['待实现'],
  path: [
    'Settings 页面',
    'Install Method',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Settings 页面，当前选中 copy',
      expectation: 'Copy 按钮高亮（绿色背景 + 勾号），Symlink 按钮未高亮',
    },
    {
      stepId: 2,
      description: '点击 Symlink 按钮',
      expectation: 'Symlink 按钮高亮（绿色背景 + 勾号），Copy 按钮恢复未选中',
    },
    {
      stepId: 3,
      description: '点击 Copy 按钮',
      expectation: 'Copy 按钮高亮（绿色背景 + 勾号），Symlink 按钮恢复未选中',
    },
  ],
}
