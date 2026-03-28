export default {
  testCaseId: 'T-S1',
  page: 'Skills',
  title: '列表加载 - 页面显示 skill 列表与统计',
  link: '/skills',
  tags: ['待实现'],
  path: [
    'Skills 页面',
    'Stats Bar',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Skills 页面',
      expectation: '页面显示加载状态（Loading spinner + "Loading skills..."）',
    },
    {
      stepId: 2,
      description: 'API 返回空列表',
      expectation: '加载完成，显示 Stats Bar 和 Skills 列表空状态',
    },
    {
      stepId: 3,
      description: 'API 返回 3 个 skill',
      expectation: 'Stats Bar 显示 "3 skills linked" 和已安装数量，Skills 列表正确显示 3 张 skill 卡片',
    },
    {
      stepId: 4,
      description: 'API 请求失败',
      expectation: 'Toast 提示 "Failed to load skills"，类型为 error',
    },
  ],
}
