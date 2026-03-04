import { useState, useEffect } from 'react'

export default function PatienceTask({ config, onSuccess, onFail }) {
  const duration = config?.duration || 5
  const [timeLeft, setTimeLeft] = useState(duration)
  const [failed, setFailed] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done || failed) return
    if (timeLeft <= 0) { setDone(true); onSuccess(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done, failed])

  function handleTap() {
    if (done || failed) return
    setFailed(true)
    onFail()
  }

  const pct = ((duration - timeLeft) / duration) * 100

  return (
    <div style={styles.wrap}>
      <p style={styles.title}>🤫 BE STILL</p>
      <p style={styles.inst}>Do NOT tap anything for {duration} seconds</p>

      {/* Progress bar */}
      <div style={styles.barBg}>
        <div style={{ ...styles.barFill, width: `${pct}%` }} />
      </div>
      <p style={styles.timeText}>{timeLeft}s remaining</p>

      <button
        onClick={handleTap}
        style={{
          ...styles.trapBtn,
          opacity: failed ? 0.4 : 1,
        }}
      >
        {failed ? 'YOU TAPPED IT 😬' : 'TAP ME! (don\'t)'}
      </button>
    </div>
  )
}

const styles = {
  wrap: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  title: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#8B5CF6', letterSpacing: '0.1em' },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  barBg: { width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, #8B5CF6, #00D4FF)', borderRadius: 4, transition: 'width 1s linear' },
  timeText: { fontFamily: 'Orbitron, sans-serif', fontSize: 24, fontWeight: 700, color: '#8B5CF6' },
  trapBtn: {
    marginTop: 16,
    padding: '20px 40px',
    background: 'rgba(255,51,102,0.15)',
    border: '2px solid rgba(255,51,102,0.4)',
    borderRadius: 8,
    color: '#FF3366',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.08em',
    animation: 'pulse 1.5s infinite',
  },
}
