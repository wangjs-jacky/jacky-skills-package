export default {
  testCaseId: 'T-D3',
  page: 'Develop',
  title: 'Source Folders 列表展示 - 加载、刷新和删除',
  link: '/develop',
  tags: ['待实现'],
  path: [
    'Develop 页面',
    'Source Folders',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Develop 页面，API 返回 Source Folders 为空',
      expectation: 'Source Folders 卡片可见，显示 "No source folders yet" 空状态提示',
    },
    {
      stepId: 2,
      description: 'API 返回 Source Folder 列表（2 个文件夹，各包含若干 skill）',
      expectation: '列表显示 2 个 Source Folder 条目，每个显示路径和 skill 名称标签',
    },
    {
      stepId: 3,
      description: '点击 Refresh 按钮',
      expectation: '重新调用 listSourceFolders，列表刷新',
    },
    {
      stepId: 4,
      description: '点击文件夹的删除按钮',
      expectation: '调用 skillsApi.removeSourceFolder，文件夹从列表中移除，Toast 提示 "Folder removed"，类型为 success',
    },
    {
      stepId: 5,
      description: '删除最后一个 Source Folder',
      expectation: 'Source Folders 卡片显示 "No source folders yet" 空状态',
    },
    {
      stepId: 6,
      description: 'API removeSourceFolder 失败',
      expectation: 'Toast 提示 "Failed to remove folder"，类型为 error',
    },
  ],
}
