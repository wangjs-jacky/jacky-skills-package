export default {
  testCaseId: 'T-S5',
  page: 'Skills',
  title: 'Unlink Skill - 解除技能链接',
  link: '/skills',
  tags: ['待实现'],
  path: [
    'Skills 页面',
    'Skill Card',
    'Unlink',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Skills 页面，API 返回含 skill',
      expectation: 'Skill Card 可见，hover 时显示 Unlink 按钮',
    },
    {
      stepId: 2,
      description: '点击 Unlink 按钮',
      expectation: '调用 skillsApi.unlink，成功后自动刷新列表，Toast 提示 "Unlinked: xxx"，类型为 success',
    },
    {
      stepId: 3,
      description: 'Unlink API 失败',
      expectation: 'Toast 提示 "Failed to unlink skill"，类型为 error',
    },
  ],
}
