export default {
  testCaseId: 'T-S3',
  page: 'Skills',
  title: '环境开关安装/卸载 - 切换 Toggle 成功安装/卸载 skill',
  link: '/skills',
  tags: ['待实现'],
  path: [
    'Skills 页面',
    'Skill Card',
    '环境 Toggle',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Skills 页面，API 返回含已安装环境的 skill',
      expectation: 'Skill Card 显示已安装环境标签（如 Claude Code 显示 "ON"）',
    },
    {
      stepId: 2,
      description: '点击某个已安装环境的 Toggle（从 ON 切换到 OFF）',
      expectation: '调用 skillsApi.uninstall，成功后 updateSkillEnvironments 更新状态，Toast 提示 "Removed xxx from xxx"，类型为 success',
    },
    {
      stepId: 3,
      description: '再次点击同一个环境 Toggle（从 OFF 切换到 ON）',
      expectation: '调用 skillsApi.install，成功后 updateSkillEnvironments 更新状态，Toast 提示 "Installed xxx to xxx"，类型为 success',
    },
    {
      stepId: 4,
      description: '安装/卸载 API 失败',
      expectation: 'Toast 提示 "Failed to install to xxx" 或 "Failed to remove from xxx"，类型为 error',
    },
  ],
}
