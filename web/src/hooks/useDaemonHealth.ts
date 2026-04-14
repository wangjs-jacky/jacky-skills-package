import { useEffect, useRef, useState, useCallback } from 'react'
import { monitorApi } from '../api/monitor'

interface UseDaemonHealthOptions {
  /** 是否启用轮询（通常 = daemon 离线时启用） */
  enabled: boolean
  /** 初始轮询间隔 ms，默认 5000 */
  initialInterval?: number
  /** daemon 上线回调 */
  onOnline?: () => void
  /** daemon 下线回调 */
  onOffline?: () => void
}

interface UseDaemonHealthReturn {
  /** 最近一次检查是否在线 */
  lastCheckOnline: boolean
  /** 是否正在检查中 */
  checking: boolean
  /** 连续失败次数 */
  consecutiveFailures: number
  /** 手动触发一次检查 */
  checkNow: () => Promise<boolean>
}

/** 根据连续失败次数计算间隔（阶梯退避） */
function getInterval(failures: number, base: number): number {
  if (failures < 3) return base
  if (failures < 6) return base * 2
  return Math.min(base * 6, 30000) // 封顶 30s
}

export function useDaemonHealth({
  enabled,
  initialInterval = 5000,
  onOnline,
  onOffline,
}: UseDaemonHealthOptions): UseDaemonHealthReturn {
  const [lastCheckOnline, setLastCheckOnline] = useState(false)
  const [checking, setChecking] = useState(false)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const prevOnlineRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const intervalRef = useRef(initialInterval)

  // 用 ref 持有回调
  const callbacksRef = useRef({ onOnline, onOffline })
  callbacksRef.current = { onOnline, onOffline }

  const checkNow = useCallback(async () => {
    setChecking(true)
    try {
      const result = await monitorApi.checkDaemon()
      const online = result.ok ? result.data.running : false
      setLastCheckOnline(online)

      if (online) {
        setConsecutiveFailures(0)
        if (!prevOnlineRef.current) {
          callbacksRef.current.onOnline?.()
        }
      } else {
        setConsecutiveFailures((f) => f + 1)
        if (prevOnlineRef.current) {
          callbacksRef.current.onOffline?.()
        }
      }
      prevOnlineRef.current = online
      return online
    } catch {
      setLastCheckOnline(false)
      setConsecutiveFailures((f) => f + 1)
      if (prevOnlineRef.current) {
        callbacksRef.current.onOffline?.()
      }
      prevOnlineRef.current = false
      return false
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // 立即执行一次
    checkNow()

    // 根据失败次数动态调整间隔
    const currentInterval = getInterval(consecutiveFailures, initialInterval)
    intervalRef.current = currentInterval

    timerRef.current = setInterval(checkNow, currentInterval)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, consecutiveFailures, initialInterval, checkNow])

  return { lastCheckOnline, checking, consecutiveFailures, checkNow }
}
