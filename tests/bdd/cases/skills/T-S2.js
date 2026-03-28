export default {
  testCaseId: 'T-S2',
  page: 'Skills',
  title: '搜索过滤 - 输入关键词实时匹配 skill 名称',
  link: '/skills',
  tags: ['待实现'],
  path: [
    'Skills 页面',
    'Search Bar',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Skills 页面，API 返回 3 个 skill',
      expectation: '页面显示 3 张 skill 卡片',
    },
    {
      stepId: 2,
      description: '在搜索框输入 "task"',
      expectation: '只显示名称包含 "task" 的 skill（如 task-memory），其他卡片隐藏',
    },
    {
      stepId: 3,
      description: '清空搜索框',
      expectation: '恢复显示所有 skill 卡片',
    },
    {
      stepId: 4,
      description: '输入不存在的关键词 "xyz-not-exist"',
      expectation: '显示 "No skills found" 空状态',
    },
    {
      stepId: 5,
      description: '搜索框 placeholder 验证',
      expectation: '搜索框 placeholder 为 "Search skills..."',
    },
  ],
}
