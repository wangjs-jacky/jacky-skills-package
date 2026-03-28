export default {
  testCaseId: 'T-ST1',
  page: 'Settings',
  title: '读取配置 - 页面加载默认配置',
  link: '/settings',
  tags: ['待实现'],
  path: [
    'Settings 页面',
    '配置读取',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Settings 页面',
      expectation: '页面加载完成，显示 Default Environments 和 Install Method 卡片',
    },
    {
      stepId: 2,
      description: '环境列表正确加载',
      expectation: 'Default Environments 卡片显示环境选项（如 Claude Code、Cursor），已配置的显示选中状态',
    },
    {
      stepId: 3,
      description: '安装方式正确加载',
      expectation: 'Install Method 卡片中，当前配置项（copy 或 symlink）为选中高亮状态',
    },
    {
      stepId: 4,
      description: '配置读取失败',
      expectation: 'Toast 提示 "Failed to load config"，类型为 error',
    },
    {
      stepId: 5,
      description: '环境列表读取失败',
      expectation: 'Toast 提示 "Failed to load environments"，类型为 error',
    },
  ],
}
