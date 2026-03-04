import { useState, useEffect, useCallback, useRef } from 'react'

export default function CoopHoldTask({ task, role, currentTeam, onAction, update }) {
  const [holding, setHolding] = useState(false)
  const [timeLeft, setTimeLeft] = useState(task?.timeLimit || 20)
  const [localElapsedMs, setLocalElapsedMs] = useState(0)
  const timeoutFiredRef = useRef(false)
  const holdCheckFiredRef = useRef(false)

  const teamColor = currentTeam === 'skotia' ? '#FF3366' : '#00D4FF'
  const targetMs = task?.config?.targetMs || 5000

  const partnerHolding = role === 'A' ? (update?.holdB ?? false) : (update?.holdA ?? false)
  const bothHolding = holding && partnerHolding

  // Sync local elapsed from server
  useEffect(() => {
    if (update?.elapsed !== undefined) setLocalElapsedMs(update.elapsed)
  }, [update?.elapsed])

  // Client-side ticker: advance elapsed while both holding
  useEffect(() => {
    if (!bothHolding || update?.phase === 'resolved') return
    holdCheckFiredRef.current = false
    const TICK = 50
    const id = setInterval(() => {
      setLocalElapsedMs(prev => {
        const next = Math.min(prev + TICK, targetMs)
        if (next >= targetMs && !holdCheckFiredRef.current) {
          holdCheckFiredRef.current = true
          onAction('holdCheck', {})
        }
        return next
      })
    }, TICK)
    return () => clearInterval(id)
  }, [bothHolding, update?.phase, targetMs, onAction])

  const progress = Math.min(localElapsedMs / targetMs, 1)

  // Client-side countdown
  useEffect(() => {
    if (update?.phase === 'resolved') return
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [update?.phase])

  // Fire holdTimeout when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !timeoutFiredRef.current && update?.phase !== 'resolved') {
      timeoutFiredRef.current = true
      onAction('holdTimeout', {})
    }
  }, [timeLeft, update?.phase, onAction])

  const handlePressIn = useCallback((e) => {
    e?.preventDefault?.()
    if (update?.phase === 'resolved') return
    setHolding(true)
    onAction('holdStart', {})
  }, [update?.phase, onAction])

  const handlePressOut = useCallback(() => {
    if (update?.phase === 'resolved') return
    setHolding(false)
    onAction('holdEnd', {})
  }, [update?.phase, onAction])

  // Resolved
  if (update?.phase === 'resolved') {
    const success = update.success
    return (
      <div style={styles.wrap}>
        <p style={{ ...styles.resultTitle, color: success ? '#00FF9F' : '#FF3366' }}>
          {success ? 'SYNCHRONIZED!' : 'OUT OF SYNC!'}
        </p>
        <p style={{ ...styles.resultPoints, color: success ? '#00FF9F' : '#6C757D' }}>
          +{update.pointsAwarded ?? 0}
        </p>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <span style={{ ...styles.timer, color: timeLeft <= 5 ? '#FF3366' : '#F8F9FA' }}>
        {timeLeft}s
      </span>

      <p style={styles.instruction}>Both players must hold down at the same time</p>

      {/* Ring indicators */}
      <div style={styles.ringRow}>
        <div style={styles.ringWrapper}>
          <div style={{
            ...styles.ring,
            borderColor: holding ? teamColor : 'rgba(255,255,255,0.1)',
            background: holding ? teamColor + '20' : 'transparent',
          }}>
            <span style={styles.ringEmoji}>{holding ? '✋' : '👋'}</span>
          </div>
          <span style={styles.ringLabel}>YOU</span>
        </div>
        <div style={styles.ringWrapper}>
          <div style={{
            ...styles.ring,
            borderColor: partnerHolding ? teamColor : 'rgba(255,255,255,0.1)',
            background: partnerHolding ? teamColor + '20' : 'transparent',
          }}>
            <span style={styles.ringEmoji}>{partnerHolding ? '✋' : '👋'}</span>
          </div>
          <span style={styles.ringLabel}>PARTNER</span>
        </div>
      </div>

      {/* Elapsed */}
      <span style={{ ...styles.elapsed, color: teamColor }}>
        {(localElapsedMs / 1000).toFixed(1)}s / {(targetMs / 1000).toFixed(1)}s
      </span>

      {/* Progress bar */}
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%`, background: teamColor }} />
      </div>

      {/* Hold area */}
      <button
        style={{
          ...styles.holdButton,
          borderColor: holding ? teamColor : 'rgba(255,255,255,0.08)',
          background: holding ? teamColor + '15' : 'rgba(11,12,16,0.8)',
        }}
        onMouseDown={handlePressIn}
        onMouseUp={handlePressOut}
        onMouseLeave={handlePressOut}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
      >
        <span style={{ ...styles.holdLabel, color: holding ? teamColor : '#6C757D' }}>
          {holding ? 'HOLDING...' : 'HOLD HERE'}
        </span>
      </button>
    </div>
  )
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  timer: { fontFamily: 'Rajdhani, sans-serif', fontSize: 20, fontWeight: 700, letterSpacing: '0.1em' },
  instruction: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#ADB5BD', textAlign: 'center' },
  ringRow: { display: 'flex', gap: 24, alignItems: 'center' },
  ringWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  ring: {
    width: 52, height: 52, borderRadius: 26, border: '3px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
  },
  ringEmoji: { fontSize: 22 },
  ringLabel: { fontFamily: 'Orbitron, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#6C757D' },
  elapsed: { fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' },
  progressTrack: { width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.05s' },
  holdButton: {
    width: '100%', height: 64, borderRadius: 16, border: '2px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', userSelect: 'none', touchAction: 'none',
  },
  holdLabel: { fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 700, letterSpacing: '0.2em' },
  resultTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 24, fontWeight: 700, letterSpacing: '0.2em' },
  resultPoints: { fontFamily: 'Rajdhani, sans-serif', fontSize: 36, fontWeight: 700, letterSpacing: '0.1em' },
}
