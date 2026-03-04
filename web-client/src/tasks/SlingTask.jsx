import { useState, useEffect, useRef } from 'react'

// Track which 30-degree sectors (12 sectors) have been visited while dragging around circle
export default function SlingTask({ config, onSuccess, onFail, timeLimit = 8 }) {
  const canvasRef = useRef(null)
  const angleRef = useRef(null)
  const visitedRef = useRef(new Set())
  const [coverage, setCoverage] = useState(0)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)  // ref version for event handler stale-state guard
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const isTracking = useRef(false)

  // Timer
  useEffect(() => {
    if (done || timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done])

  useEffect(() => {
    if (!done && timeLeft === 0) onFail()
  }, [timeLeft, done])

  function getAngle(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI
  }

  function getSector(deg) {
    const norm = ((deg % 360) + 360) % 360
    return Math.floor(norm / 30)
  }

  function handleMove(e) {
    if (!isTracking.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const angle = getAngle(e, canvas)
    visitedRef.current.add(getSector(angle))
    const pct = (visitedRef.current.size / 12) * 100
    setCoverage(pct)
    drawArc()
    if (visitedRef.current.size >= 10 && !doneRef.current) {
      doneRef.current = true
      setDone(true)
      onSuccess()
    }
  }

  function drawArc() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2, r = w * 0.35

    // Background ring
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 12
    ctx.stroke()

    // Visited sectors
    visitedRef.current.forEach(sector => {
      const start = (sector * 30 - 90) * Math.PI / 180
      const end = ((sector + 1) * 30 - 90) * Math.PI / 180
      ctx.beginPath()
      ctx.arc(cx, cy, r, start, end)
      ctx.strokeStyle = '#00D4FF'
      ctx.lineWidth = 12
      ctx.stroke()
    })

    // Center emoji
    ctx.font = `${w * 0.18}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🗡️', cx, cy)
  }

  useEffect(() => { drawArc() }, [])

  return (
    <div style={styles.wrap}>
      <p style={styles.inst}>Drag around the ring ({Math.round((visitedRef.current.size / 12) * 100)}% covered)</p>
      <div style={styles.timerRow}>
        <span style={{ ...styles.timer, color: timeLeft > 5 ? '#00FF9F' : '#FF3366' }}>{timeLeft}s</span>
      </div>
      <canvas
        ref={canvasRef}
        width={260} height={260}
        style={{ touchAction: 'none', cursor: 'crosshair', display: 'block', margin: '0 auto' }}
        onMouseDown={() => { isTracking.current = true }}
        onMouseMove={handleMove}
        onMouseUp={() => { isTracking.current = false }}
        onMouseLeave={() => { isTracking.current = false }}
        onTouchStart={(e) => { isTracking.current = true; handleMove(e) }}
        onTouchMove={handleMove}
        onTouchEnd={() => { isTracking.current = false }}
      />
    </div>
  )
}

const styles = {
  wrap: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#ADB5BD', textAlign: 'center' },
  timerRow: { display: 'flex', justifyContent: 'center' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700 },
}
