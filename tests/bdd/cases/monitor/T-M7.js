export default {
  testCaseId: 'T-M7',
  page: 'Monitor',
  title: '字体样式 - 标签使用 sans-serif，值使用 mono',
  link: '/monitor',
  tags: [],
  path: [
    'Monitor 页面',
    '会话卡片',
    '字体样式',
  ],
  steps: [
    {
      stepId: 1,
      description: '基本信息网格的标签文字（PID:、Started:、CWD:）不使用 font-mono',
      expectation: '标签 span 不包含 font-mono class，值 span 包含 font-mono class',
    },
    {
      stepId: 2,
      description: '卡片头部项目名使用 font-mono',
      expectation: 'project 名称 span 包含 font-mono class',
    },
    {
      stepId: 3,
      description: '统计栏数字使用 font-mono，文字不使用',
      expectation: 'sessions count 数字有 font-mono，"active sessions" 文字无 font-mono',
    },
  ],
}
