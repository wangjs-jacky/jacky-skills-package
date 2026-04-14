import { useEffect, useRef, useCallback, useState } from 'react'
import type { Session, SessionEvent } from '../api/monitor'

const MONITOR_WS_URL = 'ws://127.0.0.1:17530/ws'
const RECONNECT_INTERVAL = 3000
const MAX_EVENTS = 50

export type ServerMessage =
  | { type: 'init'; sessions: Session[]; events: SessionEvent[] }
  | { type: 'session_update'; session: Session }
  | { type: 'session_removed'; pid: number }
  | { type: 'new_event'; event: SessionEvent }

interface UseMonitorWebSocketOptions {
  enabled: boolean
  onSessionsInit?: (sessions: Session[]) => void
  onSessionUpdate?: (session: Session) => void
  onSessionRemoved?: (pid: number) => void
  onNewEvent?: (event: SessionEvent) => void
  onError?: (error: string) => void
  onReconnected?: () => void
}

export function useMonitorWebSocket({
  enabled,
  onSessionsInit,
  onSessionUpdate,
  onSessionRemoved,
  onNewEvent,
  onError,
  onReconnected,
}: UseMonitorWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const wasConnectedRef = useRef(false)

  // 用 ref 持有回调，避免频繁重连
  const callbacksRef = useRef({
    onSessionsInit,
    onSessionUpdate,
    onSessionRemoved,
    onNewEvent,
    onError,
    onReconnected,
  })
  callbacksRef.current = {
    onSessionsInit,
    onSessionUpdate,
    onSessionRemoved,
    onNewEvent,
    onError,
    onReconnected,
  }

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(MONITOR_WS_URL)

      ws.onopen = () => {
        const isReconnect = wasConnectedRef.current
        setConnected(true)
        setReconnecting(false)
        setLastError(null)
        wasConnectedRef.current = true
        if (isReconnect) {
          callbacksRef.current.onReconnected?.()
        }
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage
          switch (msg.type) {
            case 'init':
              callbacksRef.current.onSessionsInit?.(msg.sessions)
              msg.events.slice(-MAX_EVENTS).forEach((e) => {
                callbacksRef.current.onNewEvent?.(e)
              })
              break
            case 'session_update':
              callbacksRef.current.onSessionUpdate?.(msg.session)
              break
            case 'session_removed':
              callbacksRef.current.onSessionRemoved?.(msg.pid)
              break
            case 'new_event':
              callbacksRef.current.onNewEvent?.(msg.event)
              break
          }
        } catch (err) {
          console.error('[monitor-ws] Failed to parse message:', err)
        }
      }

      ws.onclose = (ev) => {
        setConnected(false)
        wsRef.current = null
        if (ev.code !== 1000) {
          const errMsg = 'WebSocket 连接异常关闭'
          setLastError(errMsg)
          callbacksRef.current.onError?.(errMsg)
        }
        if (enabled) {
          setReconnecting(true)
          reconnectTimerRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_INTERVAL)
        }
      }

      ws.onerror = () => {
        const errMsg = 'WebSocket 连接失败'
        setLastError(errMsg)
        callbacksRef.current.onError?.(errMsg)
        ws.close()
      }

      wsRef.current = ws
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[monitor-ws] Connection error:', err)
      setLastError(errMsg)
      callbacksRef.current.onError?.(errMsg)
      if (enabled) {
        setReconnecting(true)
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_INTERVAL)
      }
    }
  }, [enabled])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
    setReconnecting(false)
    wasConnectedRef.current = false
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }
    return disconnect
  }, [enabled, connect, disconnect])

  return { connected, reconnecting, lastError }
}
