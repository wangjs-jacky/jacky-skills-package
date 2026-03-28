export default {
  testCaseId: 'T-ST4',
  page: 'Settings',
  title: '保存设置 - 点击保存按钮持久化配置',
  link: '/settings',
  tags: ['待实现'],
  path: [
    'Settings 页面',
    'Save Settings',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Settings 页面',
      expectation: 'Save Settings 按钮可见',
    },
    {
      stepId: 2,
      description: '修改环境选择和安装方式后点击 Save Settings',
      expectation: '调用 configApi.update，Toast 提示 "Settings saved"，类型为 success',
    },
    {
      stepId: 3,
      description: '保存失败（API 返回错误）',
      expectation: 'Toast 提示 "Failed to save settings"，类型为 error',
    },
  ],
}
