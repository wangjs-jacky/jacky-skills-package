export default {
  testCaseId: 'T-M2',
  page: 'Monitor',
  title: 'Monitor 状态流转 - loading、未启用、daemon 离线',
  link: '/monitor',
  tags: [],
  path: [
    'Monitor 页面',
    '状态流转',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Monitor 页面，初始加载时显示 loading 状态',
      expectation: '页面渲染 data-testid="monitor-loading"，包含 spinner 和 "Checking monitor status..." 文字',
    },
    {
      stepId: 2,
      description: 'loading 完成后，hooks 未安装时显示 "Monitor is disabled"',
      expectation: '渲染 data-testid="monitor-disabled"，包含 "Enable Monitor" 按钮（data-testid="enable-monitor-btn"）',
    },
    {
      stepId: 3,
      description: '点击 Enable Monitor → 调用 installHooks → 调用 startDaemon',
      expectation: '依次调用 monitorApi.installHooks() 和 monitorApi.startDaemon()，成功后显示会话区域',
    },
    {
      stepId: 4,
      description: 'hooks 已安装但 daemon 离线，显示 Start Daemon 按钮',
      expectation: '渲染 data-testid="start-daemon-btn"，提示 daemon 离线',
    },
  ],
}
