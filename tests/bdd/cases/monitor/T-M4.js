export default {
  testCaseId: 'T-M4',
  page: 'Monitor',
  title: 'WebSocket 实时更新 - 连接、消息处理、自动重连',
  link: '/monitor',
  tags: [],
  path: [
    'Monitor 页面',
    '实时更新',
  ],
  steps: [
    {
      stepId: 1,
      description: 'hooks 已安装且 daemon 运行时，WebSocket 自动连接',
      expectation: 'useMonitorWebSocket hook 的 enabled=true，调用 connect()',
    },
    {
      stepId: 2,
      description: 'WebSocket 收到 init 消息，初始化会话列表和事件',
      expectation: 'onSessionsInit 回调被调用，会话列表更新',
    },
    {
      stepId: 3,
      description: 'WebSocket 收到 session_update 消息，更新对应会话',
      expectation: 'onSessionUpdate 回调被调用，对应 PID 的会话数据更新',
    },
    {
      stepId: 4,
      description: 'WebSocket 收到 session_removed 消息，移除对应会话',
      expectation: 'onSessionRemoved 回调被调用，对应 PID 的会话从列表移除',
    },
    {
      stepId: 5,
      description: 'WebSocket 断开后自动重连',
      expectation: 'onclose 后设置 reconnecting=true，3s 后自动 reconnect',
    },
  ],
}
