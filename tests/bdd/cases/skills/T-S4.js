export default {
  testCaseId: 'T-S4',
  page: 'Skills',
  title: '导出 Skill - 导出到本地目录',
  link: '/skills',
  tags: ['待实现'],
  path: [
    'Skills 页面',
    'Skill Card',
    'Export',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Skills 页面，API 返回含 skill',
      expectation: 'Skill Card 可见，hover 时显示导出按钮',
    },
    {
      stepId: 2,
      description: '点击导出按钮',
      expectation: '调用 skillsApi.export，Toast 提示 "Exported xxx to ~/Downloads/j-skills-export"，类型为 success',
    },
    {
      stepId: 3,
      description: '导出失败（API 返回错误）',
      expectation: 'Toast 提示 "Failed to export skill"，类型为 error',
    },
    {
      stepId: 4,
      description: '导出 API 返回 response.success 但有 errors',
      expectation: 'Toast 显示 response.data.errors[0] 错误信息，类型为 error',
    },
  ],
}
