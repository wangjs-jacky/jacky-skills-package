export default {
  testCaseId: 'T-D5',
  page: 'Develop',
  title: 'Preview 空状态 - 未选择 skill 时显示提示文案',
  link: '/develop',
  tags: ['待实现'],
  path: [
    'Develop 页面',
    'Preview',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Develop 页面，未选择任何 skill',
      expectation: 'Preview 区域显示 "Select a skill to preview" 提示文案',
    },
    {
      stepId: 2,
      description: '确认空状态图标和副标题',
      expectation: 'Preview 区域显示 FileText 图标和 "Content will appear here" 副标题',
    },
  ],
}
