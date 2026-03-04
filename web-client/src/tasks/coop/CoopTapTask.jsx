import { useState, useEffect, useCallback, useRef } from 'react'

export default function CoopTapTask({ task, role, currentTeam, onAction, update }) {
  const [localTaps, setLocalTaps] = useState(0)
  const [timeLeft, setTimeLeft] = useState(task?.timeLimit || 15)
  const timeoutFiredRef = useRef(false)

  const teamColor = currentTeam === 'skotia' ? '#FF3366' : '#00D4FF'
  const targetTaps = task?.config?.targetTaps || 50
  const serverTotal = update?.totalTaps ?? 0
  const totalTaps = Math.max(serverTotal, localTaps)
  const progress = Math.min(totalTaps / targetTaps, 1)
  const myTaps = role === 'A' ? (update?.tapsA ?? localTaps) : (update?.tapsB ?? localTaps)
  const partnerTaps = role === 'A' ? (update?.tapsB ?? 0) : (update?.tapsA ?? 0)

  // Client-side countdown
  useEffect(() => {
    if (update?.phase === 'resolved') return
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [update?.phase])

  // Fire tapTimeout when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !timeoutFiredRef.current && update?.phase !== 'resolved') {
      timeoutFiredRef.current = true
      onAction('tapTimeout', {})
    }
  }, [timeLeft, update?.phase, onAction])

  const handleTap = useCallback(() => {
    if (update?.phase === 'resolved') return
    setLocalTaps(t => t + 1)
    onAction('tap', {})
  }, [update?.phase, onAction])

  // Resolved
  if (update?.phase === 'resolved') {
    const success = update.success
    return (
      <div style={styles.wrap}>
        <p style={{ ...styles.resultTitle, color: success ? '#00FF9F' : '#FF3366' }}>
          {success ? 'SUCCESS!' : 'TIME UP!'}
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

      {/* Progress bar */}
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%`, background: teamColor }} />
      </div>
      <span style={styles.progressText}>{totalTaps} / {targetTaps}</span>

      {/* Tap button */}
      <button
        style={{ ...styles.tapButton, borderColor: teamColor }}
        onMouseDown={handleTap}
        onTouchStart={(e) => { e.preventDefault(); handleTap() }}
      >
        <span style={styles.tapEmoji}>👆</span>
        <span style={{ ...styles.tapLabel, color: teamColor }}>TAP!</span>
      </button>

      {/* Score breakdown */}
      <div style={styles.scoreRow}>
        <span style={styles.scoreText}>You: {myTaps}</span>
        <span style={styles.scoreDivider}>|</span>
        <span style={styles.scoreText}>Partner: {partnerTaps}</span>
      </div>
    </div>
  )
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  timer: { fontFamily: 'Rajdhani, sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: '0.1em' },
  progressTrack: { width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.1s' },
  progressText: { fontFamily: 'Rajdhani, sans-serif', fontSize: 20, fontWeight: 700, color: '#F8F9FA', letterSpacing: '0.05em' },
  tapButton: {
    width: 140, height: 140, borderRadius: 70, border: '3px solid',
    background: 'rgba(11,12,16,0.8)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    cursor: 'pointer', boxShadow: '0 0 20px rgba(0,212,255,0.2)',
    userSelect: 'none', touchAction: 'none',
  },
  tapEmoji: { fontSize: 40 },
  tapLabel: { fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 700, letterSpacing: '0.2em' },
  scoreRow: { display: 'flex', alignItems: 'center', gap: 12 },
  scoreText: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD' },
  scoreDivider: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#6C757D' },
  resultTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: '0.2em' },
  resultPoints: { fontFamily: 'Rajdhani, sans-serif', fontSize: 36, fontWeight: 700, letterSpacing: '0.1em' },
}
