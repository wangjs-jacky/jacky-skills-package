export default {
  testCaseId: 'T-M3',
  page: 'Monitor',
  title: '会话列表展示 - 渲染活跃会话卡片',
  link: '/monitor',
  tags: [],
  path: [
    'Monitor 页面',
    '会话列表',
  ],
  steps: [
    {
      stepId: 1,
      description: 'Daemon 在线且无会话时，monitor_sessions 返回空数组',
      expectation: '页面显示空状态提示（data-testid="empty-sessions"）',
    },
    {
      stepId: 2,
      description: 'monitor_sessions 返回 2 个会话（status: "thinking", "idle"）',
      expectation: '渲染 2 张会话卡片（data-testid="session-card"），每张显示项目名和状态',
    },
    {
      stepId: 3,
      description: '会话状态为 "thinking" 时，状态指示器使用蓝色',
      expectation: 'thinking 状态的卡片中状态指示器包含蓝色样式',
    },
    {
      stepId: 4,
      description: '会话包含 terminal 字段为 "vscode"',
      expectation: '卡片中显示终端类型 "vscode"',
    },
    {
      stepId: 5,
      description: '会话包含 startedAt 时间戳',
      expectation: '卡片中显示持续时间（如 "5m", "1h 23m" 格式）',
    },
  ],
}
