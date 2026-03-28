export default {
  testCaseId: 'T-D4',
  page: 'Develop',
  title: '点击路径回填输入框',
  link: '/develop',
  tags: ['待实现'],
  path: [
    'Develop 页面',
    'Source Folders',
    '点击路径回填',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Develop 页面，Source Folders 列表中有文件夹',
      expectation: 'Source Folders 列表显示文件夹路径',
    },
    {
      stepId: 2,
      description: '点击 Source Folder 中的路径文本',
      expectation: 'Batch Link 输入框的值变为该路径',
    },
    {
      stepId: 3,
      description: '点击另一个 Source Folder 路径',
      expectation: '输入框的值更新为新点击的路径',
    },
  ],
}
