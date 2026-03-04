/**
 * SocketDebugPanel — dev-only floating overlay for verifying socket connectivity.
 *
 * Features:
 *  • Shows connection status, socket ID, and transport type
 *  • Captures every incoming event via socket.onAny()
 *  • Captures every outgoing event by wrapping socket.emit
 *  • Ping button: emits a custom 'ping' event and waits for a 'pong' response
 *  • Toggled by pressing the backtick key (`) anywhere in the page
 *  • Only rendered when import.meta.env.DEV === true
 */

import { useEffect, useRef, useState, useCallback } from 'react'

const MAX_EVENTS = 50

function timestamp() {
  return new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm
}

export default function SocketDebugPanel({ socket, isConnected }) {
  // Only render in dev mode
  if (!import.meta.env.DEV) return null

  return <_Panel socket={socket} isConnected={isConnected} />
}

function _Panel({ socket, isConnected }) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('')
  const [pingStatus, setPingStatus] = useState(null) // null | 'waiting' | 'ok' | 'timeout'
  const logRef = useRef(null)
  const originalEmitRef = useRef(null)

  // Toggle panel with backtick key
  useEffect(() => {
    function onKey(e) {
      if (e.key === '`' && !e.ctrlKey && !e.metaKey) {
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const addEvent = useCallback((direction, name, args) => {
    setEvents((prev) => {
      const entry = {
        id: Date.now() + Math.random(),
        ts: timestamp(),
        direction,   // 'in' | 'out'
        name,
        payload: args,
      }
      return [entry, ...prev].slice(0, MAX_EVENTS)
    })
  }, [])

  // Re-attach listeners whenever socket instance changes
  useEffect(() => {
    if (!socket) return

    // Listen to all incoming events
    function onAny(name, ...args) {
      addEvent('in', name, args)
    }
    socket.onAny(onAny)

    // Wrap emit to capture outgoing events (restore on cleanup)
    const originalEmit = socket.emit.bind(socket)
    originalEmitRef.current = originalEmit
    socket.emit = function (name, ...args) {
      addEvent('out', name, args)
      return originalEmit(name, ...args)
    }

    return () => {
      socket.offAny(onAny)
      // Restore original emit if our wrapper is still in place
      if (socket.emit !== originalEmit) {
        socket.emit = originalEmit
      }
    }
  }, [socket, addEvent])

  // Auto-scroll log to top (newest first) when panel opens
  useEffect(() => {
    if (open && logRef.current) {
      logRef.current.scrollTop = 0
    }
  }, [open, events.length])

  function handlePing() {
    if (!socket || !isConnected) return
    setPingStatus('waiting')
    const timeout = setTimeout(() => setPingStatus('timeout'), 3000)
    socket.once('debug:pong', () => {
      clearTimeout(timeout)
      setPingStatus('ok')
      setTimeout(() => setPingStatus(null), 2000)
    })
    // Use the original emit to avoid logging internal ping noise
    const emit = originalEmitRef.current || socket.emit.bind(socket)
    emit('debug:ping')
  }

  const filtered = filter
    ? events.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
    : events

  const socketId = socket?.id || '—'
  const transport = socket?.io?.engine?.transport?.name || '—'

  return (
    <>
      {/* Collapsed toggle pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={pillStyle(isConnected)}
        title="Toggle socket debug panel (` key)"
      >
        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
          {isConnected ? '● WS' : '○ WS'}
        </span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div style={panelStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <span style={{ color: '#00D4FF', fontWeight: 700, letterSpacing: 1 }}>
              SOCKET DEBUG
            </span>
            <button onClick={() => setOpen(false)} style={closeBtnStyle}>✕</button>
          </div>

          {/* Status row */}
          <div style={statusRowStyle}>
            <StatusBadge label="STATUS" value={isConnected ? 'CONNECTED' : 'DISCONNECTED'} ok={isConnected} />
            <StatusBadge label="ID" value={socketId.slice(0, 12)} ok={isConnected} mono />
            <StatusBadge label="TRANSPORT" value={transport} ok={isConnected} />
          </div>

          {/* Controls */}
          <div style={controlsStyle}>
            <input
              placeholder="Filter events…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handlePing} style={pingBtnStyle(pingStatus)} disabled={!isConnected || pingStatus === 'waiting'} title="Emits 'debug:ping' — server must respond with 'debug:pong' to register OK">
              {pingStatus === 'waiting' ? '…' : pingStatus === 'ok' ? '✓ PONG' : pingStatus === 'timeout' ? '✗ TIMEOUT' : 'PING'}
            </button>
            <button onClick={() => setEvents([])} style={clearBtnStyle}>CLEAR</button>
          </div>

          {/* Event log */}
          <div ref={logRef} style={logStyle}>
            {filtered.length === 0 && (
              <div style={{ color: '#555', textAlign: 'center', paddingTop: 16, fontSize: 12 }}>
                {events.length === 0 ? 'No events yet — connect and interact.' : 'No events match filter.'}
              </div>
            )}
            {filtered.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>

          <div style={footerStyle}>
            {events.length} events captured · backtick to toggle
          </div>
        </div>
      )}
    </>
  )
}

function EventRow({ event }) {
  const [expanded, setExpanded] = useState(false)
  const isIn = event.direction === 'in'
  const payloadStr = JSON.stringify(event.payload, null, 2)
  const hasPayload = event.payload && event.payload.length > 0 && payloadStr !== '[[]]' && payloadStr !== '[]'

  return (
    <div style={eventRowStyle(isIn)} onClick={() => hasPayload && setExpanded((v) => !v)}>
      <span style={arrowStyle(isIn)}>{isIn ? '▼ IN' : '▲ OUT'}</span>
      <span style={eventNameStyle}>{event.name}</span>
      <span style={tsStyle}>{event.ts}</span>
      {hasPayload && (
        <span style={expandHintStyle}>{expanded ? '▴' : '▾'}</span>
      )}
      {expanded && hasPayload && (
        <pre style={payloadStyle}>{payloadStr}</pre>
      )}
    </div>
  )
}

function StatusBadge({ label, value, ok, mono }) {
  return (
    <div style={badgeWrapStyle}>
      <span style={badgeLabelStyle}>{label}</span>
      <span style={{ ...badgeValueStyle(ok), fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value}
      </span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function pillStyle(connected) {
  return {
    position: 'fixed',
    bottom: 40,
    right: 12,
    zIndex: 99998,
    background: connected ? 'rgba(0,40,20,0.92)' : 'rgba(40,0,0,0.92)',
    border: `1px solid ${connected ? '#00FF88' : '#FF3366'}`,
    color: connected ? '#00FF88' : '#FF3366',
    borderRadius: 20,
    padding: '4px 10px',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
    userSelect: 'none',
    fontSize: 11,
  }
}

const panelStyle = {
  position: 'fixed',
  bottom: 74,
  right: 12,
  width: 420,
  maxWidth: 'calc(100vw - 24px)',
  maxHeight: '70vh',
  background: 'rgba(10,12,18,0.97)',
  border: '1px solid #00D4FF55',
  borderRadius: 8,
  boxShadow: '0 4px 32px rgba(0,212,255,0.15)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 99997,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  color: '#CCC',
  backdropFilter: 'blur(8px)',
  overflow: 'hidden',
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  borderBottom: '1px solid #00D4FF33',
  background: 'rgba(0,212,255,0.06)',
}

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#777',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  padding: '0 4px',
}

const statusRowStyle = {
  display: 'flex',
  gap: 8,
  padding: '8px 12px',
  borderBottom: '1px solid #1a1a2e',
}

const badgeWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flex: 1,
}

const badgeLabelStyle = {
  fontSize: 9,
  color: '#555',
  letterSpacing: 1,
  textTransform: 'uppercase',
}

function badgeValueStyle(ok) {
  return {
    fontSize: 11,
    color: ok ? '#00FF88' : '#FF3366',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
}

const controlsStyle = {
  display: 'flex',
  gap: 6,
  padding: '6px 12px',
  borderBottom: '1px solid #1a1a2e',
}

const inputStyle = {
  flex: 1,
  background: '#111',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#CCC',
  padding: '3px 8px',
  fontSize: 11,
  outline: 'none',
}

function pingBtnStyle(status) {
  const colors = {
    waiting: ['#555', '#333'],
    ok:      ['#00FF88', '#002a10'],
    timeout: ['#FF3366', '#2a0010'],
    null:    ['#00D4FF', '#001a2a'],
  }
  const [fg, bg] = colors[String(status)] || colors.null
  return {
    background: bg,
    border: `1px solid ${fg}`,
    borderRadius: 4,
    color: fg,
    padding: '3px 10px',
    cursor: 'pointer',
    fontSize: 11,
    whiteSpace: 'nowrap',
  }
}

const clearBtnStyle = {
  background: '#111',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#777',
  padding: '3px 8px',
  cursor: 'pointer',
  fontSize: 11,
}

const logStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '4px 0',
}

function eventRowStyle(isIn) {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 4,
    padding: '4px 12px',
    borderBottom: '1px solid #0d0d1a',
    cursor: 'pointer',
    background: isIn ? 'rgba(0,212,255,0.03)' : 'rgba(255,160,0,0.03)',
    ':hover': { background: '#1a1a2a' },
  }
}

function arrowStyle(isIn) {
  return {
    fontSize: 9,
    color: isIn ? '#00D4FF' : '#FFB800',
    fontWeight: 700,
    letterSpacing: 1,
    minWidth: 36,
  }
}

const eventNameStyle = {
  flex: 1,
  color: '#EEE',
  fontFamily: 'monospace',
  fontSize: 12,
}

const tsStyle = {
  color: '#444',
  fontSize: 10,
  fontFamily: 'monospace',
}

const expandHintStyle = {
  color: '#555',
  fontSize: 10,
}

const payloadStyle = {
  width: '100%',
  margin: '4px 0 0',
  padding: '6px 8px',
  background: '#0a0a12',
  border: '1px solid #1a1a2e',
  borderRadius: 4,
  color: '#99BBFF',
  fontSize: 11,
  overflow: 'auto',
  maxHeight: 200,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
}

const footerStyle = {
  padding: '4px 12px',
  borderTop: '1px solid #1a1a2e',
  color: '#333',
  fontSize: 10,
  textAlign: 'right',
}
