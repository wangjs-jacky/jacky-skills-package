export default {
  testCaseId: 'T-D8',
  page: 'Develop',
  title: '系统目录选择器 - 点击唤起文件管理器并回填路径',
  link: '/develop',
  tags: ['待实现'],
  path: [
    'Develop 页面',
    'Batch Link',
    '系统目录选择器',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Develop 页面',
      expectation: '页面加载完成，Batch Link 卡片可见',
    },
    {
      stepId: 2,
      description: '确认输入框初始状态',
      expectation: '输入框为空，placeholder 为 "/path/to/skills/directory"',
    },
    {
      stepId: 3,
      description: '点击 "Choose Directory" 按钮',
      expectation: '调用 pickDirectory，系统弹出本地目录选择器',
    },
    {
      stepId: 4,
      description: '选择 "/Users/demo/my-skills" 并确认',
      expectation: '目录选择器关闭',
    },
    {
      stepId: 5,
      description: '确认路径回填',
      expectation: '输入框的值变为 "/Users/demo/my-skills"',
    },
    {
      stepId: 6,
      description: '再次点击 "Choose Directory" 按钮，点击取消',
      expectation: '输入框的值不变，仍为 "/Users/demo/my-skills"',
    },
    {
      stepId: 7,
      description: 'pickDirectory 抛出异常',
      expectation: 'Toast 提示 "Failed to open directory picker"，类型为 error',
    },
  ],
}
