import { useState } from 'react'

const COLORS = ['🔴', '🟡', '🟢', '🔵']
const COLOR_LABELS = ['Red', 'Yellow', 'Green', 'Blue']

const SEQUENCES = {
  phos: [0, 2, 1, 3],    // Red, Green, Yellow, Blue
  skotia: [3, 0, 2, 1],  // Blue, Red, Green, Yellow
}

export default function SimonSaysTask({ task, role, currentTeam, onAction, update }) {
  const [chosenTeam, setChosenTeam] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [sequence, setSequence] = useState([])
  const state = update?.state || {}

  // Role B: choose which sequence to communicate
  function chooseSeq(team) {
    if (chosenTeam) return
    setChosenTeam(team)
    onAction({ action: 'chooseSequence', team })
  }

  // Role A: tap colors in order
  function tapColor(colorIdx) {
    if (submitted) return
    const newSeq = [...sequence, colorIdx]
    setSequence(newSeq)
    if (newSeq.length === 4) {
      setSubmitted(true)
      onAction({ action: 'submitSequence', sequence: newSeq })
    }
  }

  if (role === 'B') {
    const seq = chosenTeam ? SEQUENCES[chosenTeam] : null
    return (
      <div style={styles.wrap}>
        <p style={styles.role}>📣 READER</p>
        {!chosenTeam ? (
          <>
            <p style={styles.inst}>Choose which sequence to communicate to your partner:</p>
            <div style={styles.seqRow}>
              {['phos', 'skotia'].map(team => (
                <button key={team} onClick={() => chooseSeq(team)}
                  style={{ ...styles.seqBtn, borderColor: team === 'phos' ? '#00D4FF' : '#FF3366', color: team === 'phos' ? '#00D4FF' : '#FF3366' }}>
                  {team.toUpperCase()}: {SEQUENCES[team].map(i => COLORS[i]).join(' ')}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p style={styles.inst}>Tell your partner this sequence <strong>verbally</strong>:</p>
            <div style={styles.display}>
              {seq.map((i, idx) => (
                <span key={idx} style={styles.colorIcon}>{COLORS[i]}</span>
              ))}
            </div>
            <p style={styles.sub}>{seq.map(i => COLOR_LABELS[i]).join(' → ')}</p>
          </>
        )}
        {state.resolved && <p style={styles.result}>{state.correct ? '✓ CORRECT!' : '✗ WRONG'}</p>}
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.role}>👆 TAPPER</p>
      <p style={styles.inst}>Listen to your partner and tap the colors in order:</p>
      <div style={styles.seqDisplay}>
        {sequence.map((c, i) => <span key={i} style={styles.colorIcon}>{COLORS[c]}</span>)}
        {Array(4 - sequence.length).fill(null).map((_, i) => <span key={i} style={styles.empty}>⬜</span>)}
      </div>
      <div style={styles.grid}>
        {COLORS.map((c, i) => (
          <button key={i} onClick={() => tapColor(i)}
            style={{ ...styles.colorBtn }}
            disabled={submitted}>
            {c}
          </button>
        ))}
      </div>
      {submitted && !state.resolved && <p style={styles.waiting}>Submitted! Waiting...</p>}
      {state.resolved && <p style={styles.result}>{state.correct ? '✓ CORRECT!' : '✗ WRONG'}</p>}
    </div>
  )
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  role: { fontFamily: 'Orbitron, sans-serif', fontSize: 13, fontWeight: 700, color: '#FFA63D', letterSpacing: '0.1em' },
  inst: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  seqRow: { display: 'flex', flexDirection: 'column', gap: 10, width: '100%' },
  seqBtn: { padding: '14px', border: '2px solid', borderRadius: 8, background: 'transparent', fontFamily: 'Exo 2, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  display: { display: 'flex', gap: 12 },
  colorIcon: { fontSize: 32 },
  sub: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#6C757D' },
  seqDisplay: { display: 'flex', gap: 10, minHeight: 40 },
  empty: { fontSize: 28, opacity: 0.3 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  colorBtn: { width: 72, height: 72, fontSize: 36, background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer' },
  waiting: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#6C757D', animation: 'pulse 2s infinite' },
  result: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#00FF9F' },
}
