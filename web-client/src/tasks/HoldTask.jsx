import { useState, useEffect, useRef } from 'react'

export default function HoldTask({ config, taskId, onSuccess, onFail, timeLimit = 30 }) {
  const holdMs = config?.holdMs ?? 3000
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const holdStart = useRef(null)
  const holdInterval = useRef(null)
  const countdownRef = useRef(null)

  // Countdown timer
  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail?.(); return }
    countdownRef.current = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(countdownRef.current)
  }, [timeLeft, done, onFail])

  function startHold(e) {
    e.preventDefault()
    if (done) return
    setHolding(true)
    holdStart.current = Date.now()
    holdInterval.current = setInterval(() => {
      const elapsed = Date.now() - holdStart.current
      const pct = Math.min(elapsed / holdMs, 1)
      setProgress(pct)
      if (pct >= 1) {
        clearInterval(holdInterval.current)
        setDone(true)
        setHolding(false)
        onSuccess?.()
      }
    }, 50)
  }

  function endHold(e) {
    e.preventDefault()
    if (done) return
    clearInterval(holdInterval.current)
    setHolding(false)
    setProgress(0)
    holdStart.current = null
  }

  const timerColor = timeLeft > 10 ? '#00FF9F' : timeLeft > 5 ? '#FFA63D' : '#FF3366'
  const circumference = 2 * Math.PI * 60
  const dashOffset = circumference * (1 - progress)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>HOLD</span>
        <span style={{ ...styles.timer, color: timerColor }}>{timeLeft}s</span>
      </div>
      <p style={styles.instruction}>
        Hold the button for {(holdMs / 1000).toFixed(1)}s
      </p>

      <div
        style={styles.holdArea}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
      >
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ position: 'absolute' }}>
          <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="70" cy="70" r="60"
            fill="none"
            stroke={done ? '#00FF9F' : holding ? '#00D4FF' : 'rgba(0,212,255,0.3)'}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px', transition: 'stroke 0.1s' }}
          />
        </svg>
        <div style={styles.holdInner}>
          <span style={styles.holdLabel}>
            {done ? '✓' : holding ? 'HOLD' : 'PRESS'}
          </span>
        </div>
      </div>

      {done && <p style={styles.doneText}>✓ COMPLETE!</p>}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    padding: '24px 16px',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    color: '#8B5CF6',
    letterSpacing: '0.1em',
  },
  timer: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    fontWeight: 700,
  },
  instruction: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#ADB5BD',
    textAlign: 'center',
  },
  holdArea: {
    position: 'relative',
    width: 140,
    height: 140,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
  },
  holdInner: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(139,92,246,0.3), rgba(139,92,246,0.05))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    color: '#8B5CF6',
    letterSpacing: '0.1em',
  },
  doneText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    fontWeight: 700,
    color: '#00FF9F',
    textShadow: '0 0 15px #00FF9F',
  },
}
