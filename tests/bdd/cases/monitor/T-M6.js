export default {
  testCaseId: 'T-M6',
  page: 'Monitor',
  title: 'SessionCard 信息展示 - Subagent 徽标、活跃工具',
  link: '/monitor',
  tags: [],
  path: [
    'Monitor 页面',
    '会话卡片',
    '信息展示',
  ],
  steps: [
    {
      stepId: 1,
      description: '会话有活跃子代理时，卡片头部显示 Subagent 计数徽标',
      expectation: '徽标包含 Bot 图标和数量数字，背景为 primary-dim',
    },
    {
      stepId: 2,
      description: '会话无活跃子代理时，不显示 Subagent 徽标',
      expectation: '头部无 Bot 图标相关的徽标元素',
    },
    {
      stepId: 3,
      description: '展开区域显示活跃工具列表（如有）',
      expectation: 'Active Tools 标题可见，工具名以标签形式展示',
    },
    {
      stepId: 4,
      description: '展开区域显示活跃子代理列表（如有）',
      expectation: 'Subagents 标题可见，每个子代理有脉冲指示点',
    },
  ],
}
