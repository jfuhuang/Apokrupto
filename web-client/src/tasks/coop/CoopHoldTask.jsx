import { useState, useEffect, useRef } from 'react'

export default function CoopHoldTask({ task, role, onAction, update }) {
  const targetMs = task?.config?.targetMs || 3000
  const [holding, setHolding] = useState(false)
  const [done, setDone] = useState(false)
  const holdStartRef = useRef(null)
  const state = update?.state || {}
  // Progress comes from server state, or local if no update
  const myProgress = holding ? Math.min(1, (Date.now() - (holdStartRef.current || Date.now())) / targetMs) : 0
  const bothProgress = state.progress ?? myProgress

  function startHold(e) {
    e.preventDefault()
    if (done) return
    setHolding(true)
    holdStartRef.current = Date.now()
    onAction({ action: 'holdStart' })
  }

  function endHold() {
    if (!holding) return
    setHolding(false)
    holdStartRef.current = null
    onAction({ action: 'holdEnd' })
  }

  // Local progress animation
  const [localPct, setLocalPct] = useState(0)
  useEffect(() => {
    if (!holding) { setLocalPct(0); return }
    const interval = setInterval(() => {
      const elapsed = Date.now() - (holdStartRef.current || Date.now())
      const pct = Math.min(100, (elapsed / targetMs) * 100)
      setLocalPct(pct)
      if (pct >= 100) {
        setDone(true)
        clearInterval(interval)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [holding, targetMs])

  const displayPct = state.progress !== undefined ? state.progress * 100 : localPct

  return (
    <div style={styles.wrap}>
      <p style={styles.inst}>Both players must hold simultaneously for {targetMs / 1000}s</p>
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={80} cy={80} r={60} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={12} />
        <circle
          cx={80} cy={80} r={60}
          fill="none"
          stroke="#00D4FF"
          strokeWidth={12}
          strokeDasharray={`${2 * Math.PI * 60}`}
          strokeDashoffset={`${2 * Math.PI * 60 * (1 - displayPct / 100)}`}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dashoffset 0.1s' }}
        />
        <text x={80} y={88} textAnchor="middle" fill="#00D4FF" fontFamily="Orbitron, sans-serif" fontSize={18} fontWeight={700}>
          {Math.round(displayPct)}%
        </text>
      </svg>
      <div style={styles.statRow}>
        <span style={{ ...styles.indicator, background: holding ? '#00FF9F' : 'rgba(255,255,255,0.1)' }}>You: {holding ? '✓ HOLDING' : '○'}</span>
        <span style={{ ...styles.indicator, background: state.partnerHolding ? '#00FF9F' : 'rgba(255,255,255,0.1)' }}>Partner: {state.partnerHolding ? '✓ HOLDING' : '○'}</span>
      </div>
      <button
        style={{ ...styles.holdBtn, background: holding ? 'rgba(0,255,159,0.15)' : 'rgba(0,212,255,0.1)', borderColor: holding ? '#00FF9F' : '#00D4FF' }}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        disabled={done}
      >
        {holding ? '🔒 HOLDING...' : '🤝 HOLD'}
      </button>
    </div>
  )
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  statRow: { display: 'flex', gap: 12 },
  indicator: { padding: '4px 12px', borderRadius: 20, fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#0B0C10' },
  holdBtn: { padding: '20px 48px', border: '2px solid', borderRadius: 12, color: '#00D4FF', fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 700, cursor: 'pointer', userSelect: 'none', touchAction: 'none' },
}
