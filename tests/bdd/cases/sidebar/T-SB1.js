export default {
  testCaseId: 'T-SB1',
  page: 'Sidebar',
  title: '版本号显示 - 从 Tauri API 动态读取并展示',
  link: '/skills',
  tags: ['已完成'],
  path: [
    'Sidebar',
    'Logo 区域',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入任意页面，Sidebar 渲染时调用 getVersion()',
      expectation: '版本号区域初始显示 "v..." 加载状态',
    },
    {
      stepId: 2,
      description: 'getVersion() 返回 "0.3.1"',
      expectation: '版本号区域更新显示 "v0.3.1"',
    },
    {
      stepId: 3,
      description: 'getVersion() 调用失败（非 Tauri 环境）',
      expectation: '版本号区域 fallback 显示 "vdev"',
    },
    {
      stepId: 4,
      description: '确认 app 标题为 "j-skills"',
      expectation: 'Sidebar 标题显示 "j-skills"，其中 "j" 为强调色',
    },
  ],
}
