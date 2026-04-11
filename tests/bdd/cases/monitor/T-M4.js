export default {
  testCaseId: 'T-M4',
  page: 'Monitor',
  title: '自动刷新和手动刷新 - 轮询机制',
  link: '/monitor',
  tags: [],
  path: [
    'Monitor 页面',
    '刷新机制',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Monitor 页面，确认加载时有 loading 状态',
      expectation: '页面初始加载显示 loading 指示器（data-testid="loading"）',
    },
    {
      stepId: 2,
      description: '数据加载完成后 loading 消失',
      expectation: 'loading 指示器消失，会话列表或空状态显示',
    },
    {
      stepId: 3,
      description: '页面存在手动刷新按钮',
      expectation: '渲染 data-testid="refresh-btn" 按钮',
    },
    {
      stepId: 4,
      description: '点击刷新按钮，重新调用 monitor_sessions',
      expectation: 'API 被再次调用，数据刷新',
    },
  ],
}
