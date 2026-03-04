import { useState, useEffect, useRef } from 'react'

function randomEdgePos(size) {
  const edge = Math.floor(Math.random() * 4)
  if (edge === 0) return { x: Math.random() * size, y: 0, dx: 0, dy: 1 }
  if (edge === 1) return { x: Math.random() * size, y: size, dx: 0, dy: -1 }
  if (edge === 2) return { x: 0, y: Math.random() * size, dx: 1, dy: 0 }
  return { x: size, y: Math.random() * size, dx: -1, dy: 0 }
}

export default function GuardTask({ config, onSuccess, onFail }) {
  const SIZE = 260
  const CENTER = SIZE / 2
  const SPEED = 0.8
  const waveDuration = config?.waveDuration || 8000
  const maxMisses = config?.maxMisses ?? 1
  const [wolves, setWolves] = useState([])
  const [misses, setMisses] = useState(0)
  const [done, setDone] = useState(false)
  const frameRef = useRef(null)
  const startRef = useRef(Date.now())
  const missRef = useRef(0)
  const wolvesRef = useRef([])
  const idRef = useRef(0)
  const doneRef = useRef(false)

  function spawnWolf() {
    const pos = randomEdgePos(SIZE)
    const id = idRef.current++
    const wolf = { id, x: pos.x, y: pos.y, dx: pos.dx, dy: pos.dy, alive: true }
    wolvesRef.current = [...wolvesRef.current, wolf]
    setWolves([...wolvesRef.current])
    return wolf
  }

  function tick() {
    if (doneRef.current) return
    const now = Date.now()
    const elapsed = now - startRef.current

    // Spawn wolves periodically
    if (elapsed % 1200 < 20 || wolvesRef.current.filter(w => w.alive).length === 0) {
      spawnWolf()
    }

    // Move wolves
    wolvesRef.current = wolvesRef.current.map(w => {
      if (!w.alive) return w
      const nx = w.x + w.dx * SPEED
      const ny = w.y + w.dy * SPEED
      const dist = Math.sqrt((nx - CENTER) ** 2 + (ny - CENTER) ** 2)
      if (dist < 30) {
        // Reached center — miss!
        missRef.current++
        setMisses(missRef.current)
        if (missRef.current > maxMisses) {
          doneRef.current = true
          onFail()
          return { ...w, alive: false }
        }
        return { ...w, alive: false }
      }
      return { ...w, x: nx, y: ny }
    })
    setWolves([...wolvesRef.current])

    if (elapsed >= waveDuration && !doneRef.current) {
      doneRef.current = true
      onSuccess()
      return
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  function tapWolf(id) {
    wolvesRef.current = wolvesRef.current.map(w => w.id === id ? { ...w, alive: false } : w)
    setWolves([...wolvesRef.current])
  }

  const timeLeft = Math.max(0, Math.ceil((waveDuration - (Date.now() - startRef.current)) / 1000))

  return (
    <div style={styles.wrap}>
      <div style={styles.timerRow}>
        <span style={styles.inst}>Tap wolves before they reach the center! ❤️ {maxMisses + 1 - misses}</span>
      </div>
      <div style={{ position: 'relative', width: SIZE, height: SIZE, background: 'rgba(0,0,0,0.4)', borderRadius: '50%', margin: '0 auto', overflow: 'hidden' }}>
        {/* Center flock */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 32 }}>🐑</div>
        {wolves.filter(w => w.alive).map(w => (
          <button
            key={w.id}
            onClick={() => tapWolf(w.id)}
            style={{ position: 'absolute', left: w.x, top: w.y, fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', transform: 'translate(-50%,-50%)' }}
          >
            🐺
          </button>
        ))}
      </div>
      <p style={{ fontFamily: 'Exo 2, sans-serif', fontSize: 11, color: '#6C757D', textAlign: 'center' }}>Misses: {misses}/{maxMisses + 1}</p>
    </div>
  )
}

const styles = {
  wrap: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  timerRow: { display: 'flex', justifyContent: 'center' },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#ADB5BD', textAlign: 'center' },
}
