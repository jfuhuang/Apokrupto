import { useState, useEffect, useRef } from 'react'

// 3-step loop: pickup bucket → hold over water → dump overboard
export default function BailWaterTask({ config, onSuccess, onFail, timeLimit = 25 }) {
  const cyclesRequired = config?.cyclesRequired || 3
  const fillDurationMs = config?.fillDurationMs || 1500
  const [step, setStep] = useState('pickup') // 'pickup' | 'fill' | 'dump'
  const [cycles, setCycles] = useState(0)
  const [fillProgress, setFillProgress] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [done, setDone] = useState(false)
  const fillIntervalRef = useRef(null)
  const holdRef = useRef(false)

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done])

  function pickup() {
    if (step !== 'pickup') return
    setStep('fill')
    setFillProgress(0)
  }

  function startFill() {
    if (step !== 'fill') return
    holdRef.current = true
    fillIntervalRef.current = setInterval(() => {
      if (!holdRef.current) { clearInterval(fillIntervalRef.current); return }
      setFillProgress(p => {
        if (p >= 100) {
          clearInterval(fillIntervalRef.current)
          setStep('dump')
          return 100
        }
        return p + (100 / (fillDurationMs / 50))
      })
    }, 50)
  }

  function stopFill() {
    holdRef.current = false
    clearInterval(fillIntervalRef.current)
  }

  function dump() {
    if (step !== 'dump') return
    const newCycles = cycles + 1
    setCycles(newCycles)
    if (newCycles >= cyclesRequired) {
      setDone(true)
      onSuccess()
    } else {
      setStep('pickup')
      setFillProgress(0)
    }
  }

  const stepLabels = { pickup: '1. Grab the bucket 🪣', fill: '2. Hold to fill with water 💧', dump: '3. Click OVERBOARD to dump! 🌊' }

  return (
    <div style={styles.wrap}>
      <div style={styles.timerRow}>
        <span style={{ ...styles.timer, color: timeLeft > 8 ? '#00FF9F' : '#FF3366' }}>{timeLeft}s</span>
        <span style={styles.cycles}>{cycles}/{cyclesRequired} cycles</span>
      </div>
      <p style={styles.stepLabel}>{stepLabels[step]}</p>

      {step === 'pickup' && (
        <button style={styles.actionBtn} onClick={pickup}>🪣 GRAB BUCKET</button>
      )}

      {step === 'fill' && (
        <>
          <div style={styles.fillBarBg}>
            <div style={{ ...styles.fillBarFill, width: `${fillProgress}%` }} />
          </div>
          <button
            style={{ ...styles.actionBtn, background: 'rgba(0,100,255,0.2)', borderColor: '#0099FF' }}
            onMouseDown={startFill}
            onMouseUp={stopFill}
            onMouseLeave={stopFill}
            onTouchStart={(e) => { e.preventDefault(); startFill() }}
            onTouchEnd={stopFill}
          >
            💧 HOLD TO FILL
          </button>
        </>
      )}

      {step === 'dump' && (
        <button style={{ ...styles.actionBtn, background: 'rgba(0,180,255,0.2)', borderColor: '#00D4FF' }} onClick={dump}>
          🌊 OVERBOARD!
        </button>
      )}
    </div>
  )
}

const styles = {
  wrap: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  timerRow: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700 },
  cycles: { fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: '#ADB5BD' },
  stepLabel: { fontFamily: 'Exo 2, sans-serif', fontSize: 15, color: '#F8F9FA', textAlign: 'center' },
  fillBarBg: { width: '100%', height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' },
  fillBarFill: { height: '100%', background: 'linear-gradient(90deg, #0099FF, #00D4FF)', borderRadius: 6, transition: 'width 0.05s' },
  actionBtn: {
    padding: '18px 40px',
    background: 'rgba(0,212,255,0.1)',
    border: '2px solid #00D4FF',
    borderRadius: 8,
    color: '#00D4FF',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'none',
  },
}
