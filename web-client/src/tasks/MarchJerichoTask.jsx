import { useState, useEffect, useRef } from 'react'

// 7 full laps around a ring — track total angle traveled
export default function MarchJerichoTask({ config, onSuccess, onFail, timeLimit = 45 }) {
  const LAPS_REQUIRED = 7
  const canvasRef = useRef(null)
  const lastAngleRef = useRef(null)
  const totalAngleRef = useRef(0)
  const [laps, setLaps] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [done, setDone] = useState(false)
  const isTracking = useRef(false)

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done])

  function getAngle(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI
  }

  function handleMove(e) {
    if (!isTracking.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const angle = getAngle(e, canvas)
    if (lastAngleRef.current !== null) {
      let delta = angle - lastAngleRef.current
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      totalAngleRef.current += Math.abs(delta)
      const completedLaps = Math.floor(totalAngleRef.current / 360)
      setLaps(completedLaps)
      drawProgress(completedLaps)
      if (completedLaps >= LAPS_REQUIRED && !done) {
        setDone(true)
        onSuccess()
      }
    }
    lastAngleRef.current = angle
  }

  function drawProgress(currentLaps) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2, r = w * 0.35

    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 12
    ctx.stroke()

    const lapFraction = (totalAngleRef.current % 360) / 360
    const start = -Math.PI / 2
    const end = start + lapFraction * Math.PI * 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, start, end)
    ctx.strokeStyle = '#FFA63D'
    ctx.lineWidth = 12
    ctx.stroke()

    ctx.font = `${w * 0.14}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🏰', cx, cy)
  }

  useEffect(() => { drawProgress(0) }, [])

  return (
    <div style={styles.wrap}>
      <div style={styles.timerRow}>
        <span style={{ ...styles.timer, color: timeLeft > 10 ? '#FFA63D' : '#FF3366' }}>{timeLeft}s</span>
        <span style={styles.laps}>Lap {Math.min(laps + 1, LAPS_REQUIRED)}/{LAPS_REQUIRED}</span>
      </div>
      <p style={styles.inst}>Keep circling — {LAPS_REQUIRED} full laps to bring down the walls!</p>
      <canvas
        ref={canvasRef}
        width={260} height={260}
        style={{ touchAction: 'none', cursor: 'crosshair', display: 'block', margin: '0 auto' }}
        onMouseDown={() => { isTracking.current = true; lastAngleRef.current = null }}
        onMouseMove={handleMove}
        onMouseUp={() => { isTracking.current = false; lastAngleRef.current = null }}
        onMouseLeave={() => { isTracking.current = false; lastAngleRef.current = null }}
        onTouchStart={() => { isTracking.current = true; lastAngleRef.current = null }}
        onTouchMove={handleMove}
        onTouchEnd={() => { isTracking.current = false; lastAngleRef.current = null }}
      />
    </div>
  )
}

const styles = {
  wrap: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  timerRow: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700 },
  laps: { fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 700, color: '#FFA63D' },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#ADB5BD', textAlign: 'center' },
}
