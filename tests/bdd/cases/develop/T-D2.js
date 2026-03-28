export default {
  testCaseId: 'T-D2',
  page: 'Develop',
  title: 'Batch Link - Link 成功后自动刷新源文件夹列表',
  link: '/develop',
  tags: ['待实现'],
  path: [
    'Develop 页面',
    'Batch Link',
    'Source Folders 联动',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Develop 页面，Source Folders 为空',
      expectation: 'Source Folders 卡片显示 "No source folders yet"',
    },
    {
      stepId: 2,
      description: '输入路径 "/Users/demo/my-skills" 并点击 "Link All"',
      expectation: '调用 skillsApi.link 成功后，自动调用 listSourceFolders 刷新列表',
    },
    {
      stepId: 3,
      description: '等待列表刷新完成',
      expectation: 'Source Folders 列表更新，显示新链接的文件夹及其 skill 名称',
    },
  ],
}
