import * as vscode from 'vscode'

/**
 * J-Skills Terminal Focus 扩展
 *
 * 通过 URI Handler 精确聚焦指定终端 Tab。
 * URI 格式: {vscode|cursor}://jackywjs.focus-terminal/focus?pid=123&pid=456
 *
 * 匹配逻辑：
 * 1. 从 URI query 中解析 pid 参数列表
 * 2. 遍历 vscode.window.terminals，获取每个终端的 processId
 * 3. 找到 processId 在 pid 列表中的终端
 * 4. 调用 terminal.show() 聚焦该终端
 */
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      async handleUri(uri: vscode.Uri) {
        const path = uri.path // "/focus"
        if (!path.includes('focus')) {
          return
        }

        // 解析 pid 参数: ?pid=123&pid=456
        const targetPids = new Set<number>()
        const params = new URLSearchParams(uri.query)
        for (const raw of params.getAll('pid')) {
          const pid = parseInt(raw, 10)
          if (!isNaN(pid)) {
            targetPids.add(pid)
          }
        }

        if (targetPids.size === 0) {
          return
        }

        // 遍历终端，匹配 processId
        const terminals = vscode.window.terminals
        for (const terminal of terminals) {
          try {
            const pid = await terminal.processId
            if (pid !== undefined && targetPids.has(pid)) {
              terminal.show()
              return
            }
          } catch {
            // 某些终端可能无法获取 processId，跳过
          }
        }

        // 未匹配到特定终端，回退：仅显示终端面板
        vscode.commands.executeCommand('workbench.action.terminal.focus')
      },
    }),
  )
}

export function deactivate() {}
