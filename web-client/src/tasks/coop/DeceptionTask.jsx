import { useState } from 'react'

// Role A (listener): choose an option. Role B (speaker): sees which word to communicate per team.
export default function DeceptionTask({ task, role, currentTeam, onAction, update }) {
  const [chosen, setChosen] = useState(null)
  const state = update?.state || {}
  const resolved = state.resolved || false

  function choose(idx) {
    if (chosen !== null || resolved) return
    setChosen(idx)
    onAction({ action: 'selectOption', choice: idx })
  }

  if (role === 'B') {
    return (
      <div style={styles.wrap}>
        <p style={styles.role}>🎙️ SPEAKER</p>
        <p style={styles.inst}>Say this word aloud to your partner:</p>
        <div style={styles.wordBox}>
          <p style={styles.word}>{currentTeam === 'phos' ? task.config?.phosWord : task.config?.skotiaWord}</p>
        </div>
        <p style={styles.hint}>Partner must choose the right option without seeing your screen.</p>
        {resolved && <p style={styles.result}>{state.correct ? '✓ CORRECT!' : '✗ WRONG'}</p>}
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.role}>👂 LISTENER</p>
      <p style={styles.inst}>Your partner will say a word. Choose the matching option:</p>
      <div style={styles.optionRow}>
        {[task.config?.optionA, task.config?.optionB].map((opt, i) => (
          <button
            key={i}
            onClick={() => choose(i)}
            style={{
              ...styles.optBtn,
              border: chosen === i ? '2px solid #00D4FF' : '2px solid rgba(255,255,255,0.15)',
              background: chosen === i ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
              opacity: resolved && chosen !== i ? 0.5 : 1,
            }}
            disabled={chosen !== null || resolved}
          >
            {opt}
          </button>
        ))}
      </div>
      {resolved && <p style={styles.result}>{state.correct ? '✓ CORRECT!' : '✗ WRONG'}</p>}
    </div>
  )
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  role: { fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700, color: '#00D4FF', letterSpacing: '0.1em' },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  wordBox: { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, padding: '16px 32px' },
  word: { fontFamily: 'Orbitron, sans-serif', fontSize: 22, fontWeight: 700, color: '#00D4FF' },
  hint: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#6C757D', textAlign: 'center' },
  optionRow: { display: 'flex', gap: 12 },
  optBtn: { flex: 1, padding: '16px 24px', borderRadius: 8, color: '#F8F9FA', fontFamily: 'Exo 2, sans-serif', fontSize: 15, cursor: 'pointer' },
  result: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#00FF9F' },
}
