export default {
  testCaseId: 'T-ST5',
  page: 'Settings',
  title: '页面初始化 - 首次加载使用默认值',
  link: '/settings',
  tags: ['待实现'],
  path: [
    'Settings 页面',
    '初始化',
  ],
  steps: [
    {
      stepId: 1,
      description: '首次进入 Settings 页面，无历史配置',
      expectation: 'Install Method 默认选中 copy',
    },
    {
      stepId: 2,
      description: '确认 Default Environments 默认值',
      expectation: 'Default Environments 列表从 API 加载，初始选中状态由 config.defaultEnvironments 决定',
    },
    {
      stepId: 3,
      description: '修改配置后刷新页面',
      expectation: '页面重新从 API 加载配置，恢复为上次保存的状态',
    },
  ],
}
