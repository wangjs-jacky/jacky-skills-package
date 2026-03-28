export default {
  testCaseId: 'T-D1',
  page: 'Develop',
  title: 'Batch Link - 输入路径并扫描子目录批量链接技能',
  link: '/develop',
  tags: ['待实现'],
  path: [
    'Develop 页面',
    'Batch Link',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Develop 页面',
      expectation: '页面加载完成，Batch Link Skills 卡片可见',
    },
    {
      stepId: 2,
      description: '输入框为空，点击 "Link All"',
      expectation: 'Toast 提示 "Please enter a path"，类型为 error',
    },
    {
      stepId: 3,
      description: '输入路径 "/Users/demo/my-skills" 并点击 "Link All"',
      expectation: '调用 skillsApi.link，成功链接 3 skills，显示 toast "Linked 3 skills: xxx"，输入框清空',
    },
    {
      stepId: 4,
      description: '输入空格路径并点击 "Link All"',
      expectation: 'Toast 提示 "Please enter a path"，类型为 error',
    },
    {
      stepId: 5,
      description: 'API link 失败（输入路径错误）',
      expectation: 'Toast 提示 "Failed to link skills"，类型为 error',
    },
  ],
}
