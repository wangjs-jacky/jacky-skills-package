export default {
  testCaseId: 'T-S6',
  page: 'Skills',
  title: '空状态 - 无 skill 时显示空状态提示',
  link: '/skills',
  tags: ['待实现'],
  path: [
    'Skills 页面',
    '空状态',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Skills 页面，API 返回空列表',
      expectation: '显示 "No skills found" 空状态',
    },
    {
      stepId: 2,
      description: '确认空状态提示文案',
      expectation: '显示 "Try linking one first with j-skills link" 提示文案',
    },
    {
      stepId: 3,
      description: '确认 Stats Bar 统计数据',
      expectation: 'Stats Bar 显示 "0 skills linked" 和 "0 installed"',
    },
  ],
}
