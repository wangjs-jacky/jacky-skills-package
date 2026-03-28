export default {
  testCaseId: 'T-D7',
  page: 'Develop',
  title: 'Link 结果明细 - 成功链接后显示链接的 skill 名称列表',
  link: '/develop',
  tags: ['待实现'],
  path: [
    'Develop 页面',
    'Batch Link',
    'Link 结果',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Develop 页面',
      expectation: 'Batch Link Skills 卡片可见，输入框为空',
    },
    {
      stepId: 2,
      description: '输入路径 "/Users/demo/my-skills" 并点击 "Link All"',
      expectation: 'API 返回成功，Toast 提示包含链接数量和 skill 名称列表，如 "Linked 3 skills: skill-a, skill-b, skill-c"',
    },
    {
      stepId: 3,
      description: '链接 1 个 skill',
      expectation: 'Toast 提示 "Linked 1 skill: xxx"（单数形式，无 s）',
    },
    {
      stepId: 4,
      description: '链接成功后输入框清空',
      expectation: 'Batch Link 输入框的值变为空字符串',
    },
    {
      stepId: 5,
      description: '链接成功后 Source Folders 自动刷新',
      expectation: '新链接的文件夹出现在 Source Folders 列表中',
    },
  ],
}
