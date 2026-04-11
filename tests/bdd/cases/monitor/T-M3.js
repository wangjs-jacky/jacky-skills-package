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
      description: 'Daemon 在线且无会话时，显示空状态',
      expectation: '页面渲染 data-testid="no-sessions"，显示 "No active sessions" 文字',
    },
    {
      stepId: 2,
      description: '返回 2 个会话（status: "thinking", "idle"）',
      expectation: '渲染 2 张会话卡片（data-testid="session-card-{pid}"），每张显示项目名和状态',
    },
    {
      stepId: 3,
      description: '会话状态为 "thinking" 时，状态指示器使用琥珀色并带脉冲动画',
      expectation: 'thinking 状态的 StatusBadge 包含 animate-pulse 类，颜色为 var(--color-amber)',
    },
    {
      stepId: 4,
      description: '会话包含 terminal 字段为 "vscode"',
      expectation: '卡片中显示终端类型 "VSCode"',
    },
    {
      stepId: 5,
      description: '会话包含 startedAt 时间戳',
      expectation: '卡片中显示持续时间（如 "5s", "1m 23s" 格式）',
    },
  ],
}
