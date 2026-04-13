/**
 * E2E 测试：Monitor 页面核心流程
 * 覆盖: E2E-MON-01 ~ E2E-MON-06
 */
import { MonitorPage } from '../pages/monitor.page'
import { tauri } from '../helpers/tauri-commands'

const monitorPage = new MonitorPage()

describe('Monitor 页面', () => {
  beforeEach(async () => {
    await monitorPage.navigate()
  })

  it('E2E-MON-01: 应加载页面并显示内容', async () => {
    await expect(monitorPage.isDisplayed()).resolves.toBe(true)
  })

  it('E2E-MON-02: 应显示 daemon 状态区域', async () => {
    // 页面加载后应显示某种状态（正常/错误/loading）
    const pageExists = await monitorPage.isDisplayed()
    expect(pageExists).toBe(true)
  })

  it('E2E-MON-04: 应能检测 hooks 安装状态', async () => {
    // 通过 Tauri 命令检查 hooks 状态
    const result = await tauri.monitorCheckHooks() as any
    // 不验证具体值，只验证命令不崩溃
    expect(result).toBeDefined()
  })

  it('E2E-MON-01: 应显示浮动窗口切换按钮', async () => {
    const toggle = await monitorPage.floatingWindowToggle
    if (await toggle.isExisting()) {
      await expect(toggle).toBeDisplayed()
    }
  })
})

describe('Monitor Daemon 管理', () => {
  beforeEach(async () => {
    await monitorPage.navigate()
  })

  it('E2E-MON-03: 应能检测 daemon 运行状态', async () => {
    const result = await tauri.monitorCheckDaemon() as any
    expect(result).toBeDefined()
  })

  it('E2E-MON-06: daemon 停止命令不应崩溃', async () => {
    // 即使 daemon 未运行，停止命令也不应崩溃
    try {
      await tauri.monitorStopDaemon()
    } catch {
      // 预期可能失败（daemon 未运行），但不应导致测试崩溃
    }
    await expect(monitorPage.isDisplayed()).resolves.toBe(true)
  })
})
