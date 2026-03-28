export default {
  testCaseId: 'T-D6',
  page: 'Develop',
  title: 'Preview 加载 SKILL.md - 点击 skill 名称显示内容',
  link: '/develop',
  tags: ['待实现'],
  path: [
    'Develop 页面',
    'Preview',
    'Source Folders skill name',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Develop 页面，Source Folders 列表中有包含 skill 的文件夹',
      expectation: '文件夹条目中显示 skill 名称标签（如 "task-memory"）',
    },
    {
      stepId: 2,
      description: '点击 skill 名称标签',
      expectation: '调用 skillsApi.getFileContent，Preview 区域切换为内容视图',
    },
    {
      stepId: 3,
      description: '确认 Preview 显示标题和内容',
      expectation: 'Preview 区域显示 "{skillName}/SKILL.md" 标题和文件内容',
    },
    {
      stepId: 4,
      description: 'API getFileContent 失败',
      expectation: 'Toast 提示 "Failed to load skill content"，类型为 error',
    },
  ],
}
