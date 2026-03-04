import { useState, useEffect, useRef } from 'react'

// A cross icon drifts; keep cursor on it to fill faith bar
export default function FocusTask({ config, onSuccess, onFail }) {
  const duration = config?.duration || 8
  const drainRate = config?.drainRate || 1.8
  const iconSpeed = config?.iconSpeed || 0.6
  const tolerance = config?.tolerance || 45
  const startFaith = config?.startFaith || 0.5

  const [faith, setFaith] = useState(startFaith)
  const [timeOnTarget, setTimeOnTarget] = useState(0)
  const [done, setDone] = useState(false)
  const [iconPos, setIconPos] = useState({ x: 50, y: 50 })
  const cursorRef = useRef({ x: -999, y: -999 })
  const iconRef = useRef({ x: 150, y: 150, vx: iconSpeed * (Math.random() > 0.5 ? 1 : -1), vy: iconSpeed * (Math.random() > 0.5 ? 1 : -1) })
  const faithRef = useRef(startFaith)
  const timeOnTargetRef = useRef(0)
  const frameRef = useRef(null)
  const containerRef = useRef(null)
  const doneRef = useRef(false)

  function tick() {
    if (doneRef.current) return

    // Move icon
    const ic = iconRef.current
    ic.x += ic.vx
    ic.y += ic.vy
    const W = containerRef.current?.offsetWidth || 300
    const H = containerRef.current?.offsetHeight || 220
    if (ic.x < 20 || ic.x > W - 20) ic.vx *= -1
    if (ic.y < 20 || ic.y > H - 20) ic.vy *= -1
    setIconPos({ x: ic.x, y: ic.y })

    // Check if cursor is on icon
    const dx = cursorRef.current.x - ic.x
    const dy = cursorRef.current.y - ic.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const onTarget = dist < tolerance

    // Update faith
    if (onTarget) {
      faithRef.current = Math.min(1, faithRef.current + 0.016)
      timeOnTargetRef.current += 1 / 60
    } else {
      faithRef.current = Math.max(0, faithRef.current - 0.016 * drainRate)
    }
    setFaith(faithRef.current)
    setTimeOnTarget(timeOnTargetRef.current)

    if (timeOnTargetRef.current >= duration && !doneRef.current) {
      doneRef.current = true
      onSuccess()
      return
    }
    if (faithRef.current <= 0 && !doneRef.current) {
      doneRef.current = true
      onFail()
      return
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  function handleMouseMove(e) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleTouchMove(e) {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    cursorRef.current = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
  }

  const pct = (timeOnTarget / duration) * 100

  return (
    <div style={styles.wrap}>
      <div style={styles.row}>
        <span style={styles.label}>FAITH</span>
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: `${faith * 100}%` }} />
        </div>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>TIME ON TARGET</span>
        <div style={{ ...styles.barBg }}>
          <div style={{ ...styles.barFill, width: `${pct}%`, background: 'linear-gradient(90deg,#FFA63D,#FFDD00)' }} />
        </div>
      </div>
      <div
        ref={containerRef}
        style={styles.field}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        <div style={{
          position: 'absolute',
          left: iconPos.x,
          top: iconPos.y,
          transform: 'translate(-50%,-50%)',
          fontSize: 36,
          userSelect: 'none',
          filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.8))',
        }}>
          ✝️
        </div>
      </div>
      <p style={styles.inst}>Keep your cursor on the ✝️ for {duration}s</p>
    </div>
  )
}

const styles = {
  wrap: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  row: { display: 'flex', alignItems: 'center', gap: 10 },
  label: { fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 700, color: '#ADB5BD', letterSpacing: '0.08em', minWidth: 110 },
  barBg: { flex: 1, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, #00D4FF, #8B5CF6)', borderRadius: 4, transition: 'width 0.05s' },
  field: { position: 'relative', width: '100%', height: 200, background: 'rgba(0,0,0,0.4)', borderRadius: 8, overflow: 'hidden', cursor: 'none', touchAction: 'none' },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#ADB5BD', textAlign: 'center' },
}
