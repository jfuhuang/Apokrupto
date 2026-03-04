import { useState, useEffect, useRef } from 'react'

const ITEMS = [
  { id: 'lamp', emoji: '🪔', label: 'Lamp' },
  { id: 'ark', emoji: '📦', label: 'Ark' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
]

export default function DragPlaceTask({ config, taskId, onSuccess, onFail, timeLimit = 8 }) {
  const item = ITEMS.find(i => taskId && taskId.includes(i.id)) || ITEMS[0]
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [done, setDone] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pos, setPos] = useState({ x: 50, y: 30 })
  const [placed, setPlaced] = useState(false)
  const containerRef = useRef(null)
  const snapTolerance = config?.snapTolerance || 60

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done])

  function getRelPos(e, rect) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    }
  }

  function handleMove(e) {
    if (!dragging) return
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const { x, y } = getRelPos(e, rect)
    setPos({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) })
  }

  function handleEnd() {
    if (!dragging) return
    setDragging(false)
    // Target zone is at ~50%, 70%
    const dx = pos.x - 50
    const dy = pos.y - 70
    const dist = Math.sqrt(dx * dx + dy * dy) * 3 // approximate pixel dist
    if (dist < snapTolerance) {
      setPos({ x: 50, y: 70 })
      setPlaced(true)
      setDone(true)
      setTimeout(() => onSuccess(), 200)
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.timerRow}>
        <span style={{ ...styles.timer, color: timeLeft > 5 ? '#00FF9F' : '#FF3366' }}>{timeLeft}s</span>
        <span style={styles.inst}>Drag {item.label} to the target zone</span>
      </div>
      <div
        ref={containerRef}
        style={styles.field}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        {/* Target zone */}
        <div style={{ position: 'absolute', left: '40%', top: '60%', width: '20%', height: '20%', border: '2px dashed rgba(0,212,255,0.6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(0,212,255,0.6)', fontFamily: 'Rajdhani, sans-serif' }}>DROP HERE</span>
        </div>
        {/* Draggable item */}
        <div
          onMouseDown={(e) => { e.preventDefault(); setDragging(true) }}
          onTouchStart={(e) => { setDragging(true) }}
          style={{
            position: 'absolute',
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: 40,
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            filter: placed ? 'drop-shadow(0 0 8px #00D4FF)' : 'none',
          }}
        >
          {item.emoji}
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  timerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700 },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#ADB5BD' },
  field: { position: 'relative', width: '100%', height: 220, background: 'rgba(0,0,0,0.3)', borderRadius: 8, overflow: 'hidden', touchAction: 'none' },
}
