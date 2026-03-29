export default {
  testCaseId: 'T-S9',
  page: 'Skills',
  title: '失效技能自动清理 - 加载时自动清理 broken skills 并提示用户',
  link: '/skills',
  tags: ['待实现'],
  path: [
    'Skills 页面',
    '加载逻辑',
    '失效清理',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Skills 页面，API 返回 { skills: [skill-a, skill-b], cleanedCount: 0 }（无失效技能）',
      expectation: '页面正常渲染所有技能卡片，不显示任何 toast 提示',
    },
    {
      stepId: 2,
      description: '进入 Skills 页面，API 返回 { skills: [skill-a], cleanedCount: 2 }（有 2 个失效技能被清理）',
      expectation: '页面只渲染 skill-a 的卡片，并显示 toast："Auto-cleaned 2 broken skill(s)"',
    },
    {
      stepId: 3,
      description: '进入 Skills 页面，API 返回 { skills: [], cleanedCount: 5 }（所有技能都失效）',
      expectation: '页面显示空状态，toast 提示清理了 5 个失效技能',
    },
  ],
}
