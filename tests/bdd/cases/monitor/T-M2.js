export default {
  testCaseId: 'T-M2',
  page: 'Monitor',
  title: 'Daemon 离线状态 - 显示引导页和启动提示',
  link: '/monitor',
  tags: [],
  path: [
    'Monitor 页面',
    'Daemon 离线',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Monitor 页面，monitor_status 返回 { running: false }',
      expectation: '页面显示 daemon 离线提示区域（data-testid="daemon-offline"），包含启动命令说明',
    },
    {
      stepId: 2,
      description: '确认离线提示中包含有用的引导信息',
      expectation: '提示区域包含 "claude-monitor start" 或类似的启动命令',
    },
  ],
}
