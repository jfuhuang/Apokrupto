import { useState, useEffect, useRef } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function CollectTask({ config, onSuccess, onFail, timeLimit = 8 }) {
  const isWolfMode = !!(config.wolves)
  const [targets, setTargets] = useState(() => {
    if (isWolfMode) {
      const all = [
        ...Array(config.wolves || 4).fill({ label: '🐺', isWolf: true }),
        ...Array(config.sheep || 16).fill({ label: '🐑', isWolf: false }),
      ]
      return shuffle(all).map((t, i) => ({
        ...t,
        id: i,
        collected: false,
        x: 10 + Math.random() * 75,
        y: 10 + Math.random() * 75,
      }))
    }
    const emojis = { Cloak: '🧥', Parchments: '📜', Books: '📚', Manna: '🍯', Stone: '🪨' }
    const items = config.items || []
    return items.map((label, i) => ({
      id: i,
      label: emojis[label] || label,
      collected: false,
      x: 10 + Math.random() * 75,
      y: 10 + Math.random() * 75,
    }))
  })
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const missRef = useRef(0)

  useEffect(() => {
    if (done || failed) return
    if (timeLeft <= 0) { setFailed(true); onFail(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done, failed])

  function tap(id) {
    const target = targets.find(t => t.id === id)
    if (!target || target.collected) return

    if (isWolfMode && !target.isWolf) {
      // Accidentally tapped a sheep — penalise
      missRef.current++
      if (missRef.current >= 2) { setFailed(true); onFail(); return }
      return
    }

    const updated = targets.map(t => t.id === id ? { ...t, collected: true } : t)
    setTargets(updated)
    const remaining = updated.filter(t => (isWolfMode ? t.isWolf : true) && !t.collected)
    if (remaining.length === 0) { setDone(true); onSuccess() }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.timerRow}>
        <span style={{ ...styles.timer, color: timeLeft > 5 ? '#00FF9F' : '#FF3366' }}>{timeLeft}s</span>
        <span style={styles.inst}>
          {isWolfMode ? `Tap the 🐺 wolves! (${targets.filter(t => t.isWolf && !t.collected).length} left)` : `Collect all items! (${targets.filter(t => !t.collected).length} left)`}
        </span>
      </div>
      <div style={styles.field}>
        {targets.map(t => (
          <button
            key={t.id}
            onClick={() => tap(t.id)}
            style={{
              position: 'absolute',
              left: `${t.x}%`,
              top: `${t.y}%`,
              fontSize: 28,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              opacity: t.collected ? 0.2 : 1,
              transform: 'translate(-50%, -50%)',
              transition: 'opacity 0.2s',
              userSelect: 'none',
            }}
            disabled={t.collected}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  wrap: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  timerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700 },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#ADB5BD' },
  field: { position: 'relative', width: '100%', height: 220, background: 'rgba(0,0,0,0.3)', borderRadius: 8, overflow: 'hidden' },
}
