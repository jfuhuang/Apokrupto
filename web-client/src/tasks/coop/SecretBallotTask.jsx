import { useState } from 'react'

const DECREES = [
  { id: 'a', label: 'Decree Alpha', points: 3 },
  { id: 'b', label: 'Decree Beta', points: 2 },
  { id: 'c', label: 'Decree Gamma', points: 1 },
]

export default function SecretBallotTask({ task, role, onAction, update }) {
  const [discarded, setDiscarded] = useState(null)
  const [enacted, setEnacted] = useState(null)
  const state = update?.state || {}
  const aDiscarded = state.discarded ?? discarded
  const resolved = state.resolved || false

  function discard(idx) {
    if (discarded !== null) return
    setDiscarded(idx)
    onAction({ action: 'discardDecree', decreeIndex: idx })
  }

  function enact(idx) {
    if (enacted !== null) return
    setEnacted(idx)
    onAction({ action: 'enactDecree', decreeIndex: idx })
  }

  if (role === 'A') {
    return (
      <div style={styles.wrap}>
        <p style={styles.role}>🗑️ DISCARD ONE DECREE</p>
        <p style={styles.inst}>Choose one to discard — partner will enact from the remaining two.</p>
        <div style={styles.list}>
          {DECREES.map((d, i) => (
            <button key={i} onClick={() => discard(i)}
              style={{ ...styles.decree, opacity: discarded === i ? 0.3 : 1, textDecoration: discarded === i ? 'line-through' : 'none' }}
              disabled={discarded !== null}
            >
              {d.label}
            </button>
          ))}
        </div>
        {discarded !== null && !resolved && <p style={styles.waiting}>Waiting for partner to enact...</p>}
        {resolved && <p style={styles.result}>DECREE ENACTED +{DECREES[enacted ?? 0]?.points ?? 2}</p>}
      </div>
    )
  }

  // Role B
  const remaining = DECREES.filter((_, i) => i !== aDiscarded)
  return (
    <div style={styles.wrap}>
      <p style={styles.role}>📜 ENACT A DECREE</p>
      {aDiscarded === null ? (
        <p style={styles.waiting}>Waiting for partner to discard...</p>
      ) : (
        <>
          <p style={styles.inst}>Partner discarded one. Choose which decree to enact:</p>
          <div style={styles.list}>
            {remaining.map((d, i) => (
              <button key={i} onClick={() => enact(DECREES.indexOf(d))}
                style={{ ...styles.decree, border: enacted !== null && enacted === DECREES.indexOf(d) ? '2px solid #00D4FF' : '2px solid rgba(255,255,255,0.15)' }}
                disabled={enacted !== null}
              >
                {d.label}
              </button>
            ))}
          </div>
        </>
      )}
      {resolved && <p style={styles.result}>DECREE ENACTED +{DECREES[enacted ?? 0]?.points ?? 2}</p>}
    </div>
  )
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  role: { fontFamily: 'Orbitron, sans-serif', fontSize: 13, fontWeight: 700, color: '#8B5CF6', letterSpacing: '0.1em' },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: 10, width: '100%' },
  decree: { padding: '14px 20px', background: 'rgba(139,92,246,0.08)', border: '2px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#F8F9FA', fontFamily: 'Exo 2, sans-serif', fontSize: 15, cursor: 'pointer', textAlign: 'left' },
  waiting: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#6C757D', animation: 'pulse 2s infinite' },
  result: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#00FF9F' },
}
