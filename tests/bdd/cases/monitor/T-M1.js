export default {
  testCaseId: 'T-M1',
  page: 'Monitor',
  title: 'Monitor 页面基础渲染 - 导航项、标题、路由',
  link: '/monitor',
  tags: [],
  path: [
    'Monitor 页面',
    '基础渲染',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 /monitor 页面，确认页面容器存在',
      expectation: '页面渲染 data-testid="monitor-page" 容器',
    },
    {
      stepId: 2,
      description: '确认页面标题和描述显示正确',
      expectation: '标题显示 "Monitor"，描述文字包含 Claude 相关说明',
    },
    {
      stepId: 3,
      description: '确认 Sidebar 中有 Monitor 导航项',
      expectation: 'Sidebar 导航列表包含 "Monitor" 链接，指向 /monitor',
    },
  ],
}
