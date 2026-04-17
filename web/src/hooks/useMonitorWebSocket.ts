import { useEffect, useRef, useCallback, useState } from 'react'
import type { Session, SessionEvent, ToolCall, SubagentCall } from '../api/monitor'

const MONITOR_WS_URL = 'ws://127.0.0.1:17530/ws'
const RECONNECT_INTERVAL = 3000
const MAX_EVENTS = 50

export type ServerMessage =
  | { type: 'init'; sessions: Session[]; events: SessionEvent[] }
  | { type: 'session_update'; session: Session }
  | { type: 'session_removed'; pid: number }
  | { type: 'new_event'; event: SessionEvent }
  // 增强功能：实时过程监控
  | { type: 'tool_start'; sessionId: number; toolCall: ToolCall }
  | { type: 'tool_end'; sessionId: number; toolCallId: string; duration: number; success: boolean }
  | { type: 'subagent_start'; sessionId: number; subagent: SubagentCall }
  | { type: 'subagent_stop'; sessionId: number; subagentId: string; duration: number; success: boolean }

interface UseMonitorWebSocketOptions {
  enabled: boolean
  onSessionsInit?: (sessions: Session[]) => void
  onSessionUpdate?: (session: Session) => void
  onSessionRemoved?: (pid: number) => void
  onNewEvent?: (event: SessionEvent) => void
  onToolStart?: (sessionId: number, toolCall: ToolCall) => void
  onToolEnd?: (sessionId: number, toolCallId: string) => void
  onSubagentStart?: (sessionId: number, subagent: SubagentCall) => void
  onError?: (error: string) => void
  onReconnected?: () => void
}

export function useMonitorWebSocket({
  enabled,
  onSessionsInit,
  onSessionUpdate,
  onSessionRemoved,
  onNewEvent,
  onToolStart,
  onToolEnd,
  onSubagentStart,
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
    onToolStart,
    onToolEnd,
    onSubagentStart,
    onError,
    onReconnected,
  })
  callbacksRef.current = {
    onSessionsInit,
    onSessionUpdate,
    onSessionRemoved,
    onNewEvent,
    onToolStart,
    onToolEnd,
    onSubagentStart,
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
            case 'tool_start':
              callbacksRef.current.onToolStart?.(msg.sessionId, msg.toolCall)
              break
            case 'tool_end':
              callbacksRef.current.onToolEnd?.(msg.sessionId, msg.toolCallId)
              break
            case 'subagent_start':
              callbacksRef.current.onSubagentStart?.(msg.sessionId, msg.subagent)
              break
            case 'subagent_stop':
              // subagent_stop 无需额外处理，session_update 会更新 activeSubagents
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
