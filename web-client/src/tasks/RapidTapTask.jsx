import { useState, useEffect } from 'react'

const TASK_EMOJIS = {
  feeding_five_thousand: '🧺',
  walls_of_jericho: '🧱',
  water_from_rock: '🪨',
  default: '✨',
}

export default function RapidTapTask({ config, taskId, onSuccess, onFail, timeLimit = 30 }) {
  const [taps, setTaps] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [done, setDone] = useState(false)
  const targetTaps = config?.targetTaps ?? 20

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail?.(); return }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done, onFail])

  function handleTap() {
    if (done) return
    const next = taps + 1
    setTaps(next)
    if (next >= targetTaps) {
      setDone(true)
      onSuccess?.()
    }
  }

  const progress = Math.min(taps / targetTaps, 1)
  const emoji = TASK_EMOJIS[taskId] || TASK_EMOJIS.default
  const timerColor = timeLeft > 10 ? '#00FF9F' : timeLeft > 5 ? '#FFA63D' : '#FF3366'

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>RAPID TAP</span>
        <span style={{ ...styles.timer, color: timerColor }}>{timeLeft}s</span>
      </div>

      <div style={styles.progressRow}>
        <span style={styles.progressText}>{taps} / {targetTaps}</span>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
        </div>
      </div>

      <button
        style={{
          ...styles.tapButton,
          transform: done ? 'scale(0.95)' : 'scale(1)',
          opacity: done ? 0.6 : 1,
        }}
        onPointerDown={handleTap}
        disabled={done}
      >
        <span style={styles.tapEmoji}>{emoji}</span>
        <span style={styles.tapLabel}>TAP!</span>
      </button>

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
    color: '#00D4FF',
    letterSpacing: '0.1em',
  },
  timer: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    fontWeight: 700,
  },
  progressRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  progressText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 13,
    color: '#ADB5BD',
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00D4FF, #00FF9F)',
    borderRadius: 4,
    transition: 'width 0.1s',
  },
  tapButton: {
    width: 160,
    height: 160,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(0,212,255,0.3), rgba(0,212,255,0.05))',
    border: '3px solid #00D4FF',
    boxShadow: '0 0 30px rgba(0,212,255,0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'transform 0.05s, box-shadow 0.05s',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'manipulation',
  },
  tapEmoji: {
    fontSize: 48,
    lineHeight: 1,
  },
  tapLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    color: '#00D4FF',
    letterSpacing: '0.15em',
  },
  doneText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    fontWeight: 700,
    color: '#00FF9F',
    textShadow: '0 0 15px #00FF9F',
    animation: 'fadeIn 0.3s ease-out',
  },
}
