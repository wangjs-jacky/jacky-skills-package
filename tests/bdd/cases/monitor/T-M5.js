export default {
  testCaseId: 'T-M5',
  page: 'Monitor',
  title: 'SessionCard 布局 - 2 列网格、默认展开、字段展示',
  link: '/monitor',
  tags: [],
  path: [
    'Monitor 页面',
    '会话卡片',
    '布局',
  ],
  steps: [
    {
      stepId: 1,
      description: 'daemon 在线且存在会话时，会话卡片网格使用 2 列布局',
      expectation: 'session-grid 容器包含 grid-cols-1 md:grid-cols-2，不含 grid-cols-3',
    },
    {
      stepId: 2,
      description: '每个 SessionCard 默认展开显示详情',
      expectation: 'session-detail 容器默认可见（expanded=true）',
    },
    {
      stepId: 3,
      description: '展开区域包含基本信息网格（PID、Started、CWD）',
      expectation: 'detail 区域可见 PID 数值、Started 时间、CWD 路径',
    },
  ],
}
