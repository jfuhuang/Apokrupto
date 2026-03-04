import { useState, useEffect } from 'react'

export default function CoopTapTask({ task, role, onAction, update }) {
  const targetTaps = task?.config?.targetTaps || 30
  const timeLimit = task?.config?.timeLimit || 10
  const [myTaps, setMyTaps] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [done, setDone] = useState(false)
  const state = update?.state || {}
  const combinedTaps = (state.tapsA || 0) + (state.tapsB || 0)
  const partnerTaps = role === 'A' ? (state.tapsB || 0) : (state.tapsA || 0)

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { setDone(true); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done])

  function tap() {
    if (done) return
    setMyTaps(p => p + 1)
    onAction({ action: 'tap' })
  }

  const pct = Math.min(100, (combinedTaps / targetTaps) * 100)

  return (
    <div style={styles.wrap}>
      <div style={styles.row}>
        <span style={{ ...styles.timer, color: timeLeft > 5 ? '#00FF9F' : '#FF3366' }}>{timeLeft}s</span>
        <span style={styles.sub}>{combinedTaps}/{targetTaps} combined taps</span>
      </div>
      <div style={styles.barBg}>
        <div style={{ ...styles.barFill, width: `${pct}%` }} />
      </div>
      <div style={styles.tapRow}>
        <span style={styles.tapStat}>You: {myTaps}</span>
        <span style={styles.tapStat}>Partner: {partnerTaps}</span>
      </div>
      <button style={styles.tapBtn} onMouseDown={tap} onTouchStart={(e) => { e.preventDefault(); tap() }} disabled={done}>
        👐 TAP!
      </button>
    </div>
  )
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  row: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 22, fontWeight: 700 },
  sub: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#ADB5BD' },
  barBg: { width: '100%', height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, #00D4FF, #00FF9F)', borderRadius: 5, transition: 'width 0.1s' },
  tapRow: { display: 'flex', justifyContent: 'space-around', width: '100%' },
  tapStat: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD' },
  tapBtn: { padding: '24px 48px', background: 'rgba(0,212,255,0.1)', border: '2px solid #00D4FF', borderRadius: 12, color: '#00D4FF', fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700, cursor: 'pointer', userSelect: 'none', touchAction: 'none' },
}
