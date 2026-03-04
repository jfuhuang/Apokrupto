import { useState, useEffect, useRef } from 'react'

// Simplified trace: draw on canvas, measure coverage of waypoints
export default function TraceTask({ config, onSuccess, onFail, timeLimit = 15 }) {
  const canvasRef = useRef(null)
  const [coverage, setCoverage] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [done, setDone] = useState(false)
  const isDrawing = useRef(false)
  const visitedRef = useRef(new Set())
  const doneRef = useRef(false)

  const waypoints = [
    { x: 50, y: 350 }, { x: 100, y: 250 }, { x: 150, y: 200 },
    { x: 200, y: 150 }, { x: 250, y: 100 }, { x: 300, y: 150 },
    { x: 350, y: 200 },
  ]

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done])

  function checkWaypoints(x, y) {
    waypoints.forEach((wp, i) => {
      const dist = Math.sqrt((x - wp.x) ** 2 + (y - wp.y) ** 2)
      if (dist < 30) visitedRef.current.add(i)
    })
    const pct = (visitedRef.current.size / waypoints.length) * 100
    setCoverage(pct)
    if (pct >= 70 && !doneRef.current) {
      doneRef.current = true
      setDone(true)
      onSuccess()
    }
  }

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return [(e.touches[0].clientX - rect.left) * scaleX, (e.touches[0].clientY - rect.top) * scaleY]
    }
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY]
  }

  function startDraw(e) {
    e.preventDefault()
    isDrawing.current = true
    const canvas = canvasRef.current
    const [x, y] = getPos(e, canvas)
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
    checkWaypoints(x, y)
  }

  function draw(e) {
    if (!isDrawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const [x, y] = getPos(e, canvas)
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#FFA63D'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
    checkWaypoints(x, y)
  }

  function endDraw() { isDrawing.current = false }

  return (
    <div style={styles.wrap}>
      <div style={styles.row}>
        <span style={{ ...styles.timer, color: timeLeft > 5 ? '#00FF9F' : '#FF3366' }}>{timeLeft}s</span>
        <span style={styles.inst}>Trace the path! {Math.round(coverage)}% covered</span>
      </div>
      <div style={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          width={400} height={400}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 400 400">
          <polyline
            points={waypoints.map(w => `${w.x},${w.y}`).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="4"
            strokeDasharray="8,8"
          />
          {waypoints.map((wp, i) => (
            <circle key={i} cx={wp.x} cy={wp.y} r={12}
              fill={visitedRef.current.has(i) ? 'rgba(0,212,255,0.6)' : 'rgba(255,255,255,0.15)'}
              stroke={visitedRef.current.has(i) ? '#00D4FF' : 'rgba(255,255,255,0.3)'}
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

const styles = {
  wrap: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700 },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#ADB5BD' },
  canvasWrap: { position: 'relative', width: '100%', height: 220, background: 'rgba(0,0,0,0.3)', borderRadius: 8, overflow: 'hidden' },
}
