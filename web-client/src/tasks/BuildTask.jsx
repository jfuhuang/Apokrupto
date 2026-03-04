import { useState, useEffect } from 'react'

const PIECES = ['🪨', '🪨', '🪨', '🪨', '🪨', '🪨']
const SLOTS = 6

export default function BuildTask({ config, taskId, onSuccess, onFail, timeLimit = 20 }) {
  const [slots, setSlots] = useState(Array(SLOTS).fill(null))
  const [selected, setSelected] = useState(null)
  const [pieces, setPieces] = useState(PIECES.map((p, i) => ({ id: i, emoji: p, used: false })))
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done])

  function selectPiece(id) {
    setSelected(id)
  }

  function placeInSlot(slotIdx) {
    if (selected === null) return
    if (slots[slotIdx] !== null) return
    const newSlots = [...slots]
    newSlots[slotIdx] = selected
    setSlots(newSlots)
    setPieces(prev => prev.map(p => p.id === selected ? { ...p, used: true } : p))
    setSelected(null)
    if (newSlots.every(s => s !== null)) {
      setDone(true)
      onSuccess()
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.timerRow}>
        <span style={{ ...styles.timer, color: timeLeft > 5 ? '#00FF9F' : '#FF3366' }}>{timeLeft}s</span>
        <span style={styles.inst}>Click a piece, then click a slot</span>
      </div>
      <div style={styles.slotRow}>
        {slots.map((s, i) => (
          <button
            key={i}
            onClick={() => placeInSlot(i)}
            style={{
              ...styles.slot,
              border: s !== null ? '2px solid #00D4FF' : '2px dashed rgba(255,255,255,0.2)',
              background: s !== null ? 'rgba(0,212,255,0.1)' : 'rgba(0,0,0,0.3)',
              cursor: s !== null ? 'default' : 'pointer',
            }}
          >
            {s !== null ? PIECES[s % PIECES.length] : ''}
          </button>
        ))}
      </div>
      <p style={styles.label}>PIECES</p>
      <div style={styles.pieceRow}>
        {pieces.map(p => (
          <button
            key={p.id}
            onClick={() => !p.used && selectPiece(p.id)}
            style={{
              ...styles.piece,
              opacity: p.used ? 0.2 : 1,
              border: selected === p.id ? '2px solid #00D4FF' : '2px solid transparent',
              background: selected === p.id ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
            }}
            disabled={p.used}
          >
            {p.emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  wrap: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 },
  timerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700 },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#ADB5BD' },
  slotRow: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  slot: { width: 50, height: 50, borderRadius: 6, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 700, color: '#6C757D', letterSpacing: '0.1em', textAlign: 'center' },
  pieceRow: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  piece: { width: 44, height: 44, borderRadius: 6, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}
