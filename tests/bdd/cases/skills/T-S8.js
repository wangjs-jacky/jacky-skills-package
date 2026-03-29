export default {
  testCaseId: 'T-S8',
  page: 'Skills',
  title: '快速安装按钮 - 一键安装所有 skills 到指定环境',
  link: '/skills',
  tags: ['待实现'],
  path: [
    'Skills 页面',
    'Stats Bar',
    '快速安装',
  ],
  steps: [
    {
      stepId: 1,
      description: '进入 Skills 页面，Settings 中配置了默认环境（claude-code, cursor），API 返回多个 skills',
      expectation: 'Stats Bar 右侧为每个默认环境显示一个 "Install All to {env.label}" 按钮',
    },
    {
      stepId: 2,
      description: '点击 "Install All to Claude Code" 按钮',
      expectation: '按钮显示 loading 状态（spinner + "Installing..."），对所有未安装到 claude-code 的 skill 调用 install API',
    },
    {
      stepId: 3,
      description: '安装过程中，已安装到 claude-code 的 skill 被跳过',
      expectation: '只对未安装的 skill 调用 install API，已安装的不重复调用',
    },
    {
      stepId: 4,
      description: '所有安装完成后',
      expectation: '按钮恢复普通状态，显示 toast 提示 "Installed X skills to Claude Code"',
    },
    {
      stepId: 5,
      description: 'Settings 中未配置默认环境（defaultEnvironments 为空）',
      expectation: 'Stats Bar 中不显示任何快速安装按钮',
    },
    {
      stepId: 6,
      description: 'Skills 列表为空（无已链接 skills）',
      expectation: 'Stats Bar 中不显示任何快速安装按钮',
    },
  ],
}
