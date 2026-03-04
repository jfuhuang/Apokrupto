import { useState, useCallback } from 'react'

export default function DeceptionTask({ task, role, currentTeam, onAction, update }) {
  const [chosen, setChosen] = useState(null)

  const teamColor = currentTeam === 'skotia' ? '#FF3366' : '#00D4FF'

  const handleSelect = useCallback((index) => {
    if (chosen !== null) return
    setChosen(index)
    onAction('selectOption', { choice: index })
  }, [chosen, onAction])

  // Resolved state
  if (update?.phase === 'resolved') {
    return (
      <div style={styles.wrap}>
        <p style={styles.resolvedTitle}>OPTION CHOSEN</p>
        <div style={styles.resolvedCard}>
          <p style={styles.resolvedOption}>
            {update.chosenIndex === 0
              ? task.config?.optionA?.label
              : task.config?.optionB?.label}
          </p>
        </div>
        <p style={{ ...styles.pointsText, color: teamColor }}>
          +{update.pointsAwarded}
        </p>
      </div>
    )
  }

  // Player A — listener
  if (role === 'A') {
    if (chosen !== null) {
      return (
        <div style={styles.wrap}>
          <p style={styles.waitingText}>Waiting for result...</p>
        </div>
      )
    }

    return (
      <div style={styles.wrap}>
        <p style={styles.instruction}>Tap the word your partner says — but listen carefully.</p>
        <div style={styles.optionRow}>
          <button
            style={{ ...styles.optionCard, borderColor: teamColor }}
            onClick={() => handleSelect(0)}
          >
            <span style={styles.optionDisplay}>{task.config?.optionA?.display}</span>
            <span style={{ ...styles.optionLabel, color: teamColor }}>{task.config?.optionA?.label}</span>
          </button>
          <button
            style={{ ...styles.optionCard, borderColor: teamColor }}
            onClick={() => handleSelect(1)}
          >
            <span style={styles.optionDisplay}>{task.config?.optionB?.display}</span>
            <span style={{ ...styles.optionLabel, color: teamColor }}>{task.config?.optionB?.label}</span>
          </button>
        </div>
      </div>
    )
  }

  // Player B — speaker
  return (
    <div style={styles.wrap}>
      <p style={{ ...styles.themeTitle, color: teamColor }}>{task.config?.theme}</p>
      <p style={styles.instruction}>Say the word out loud. Your partner has to figure out which one you mean.</p>

      <div style={{ ...styles.infoBlock, borderColor: '#00D4FF' }}>
        <span style={{ ...styles.infoLabel, color: '#00D4FF' }}>ΦΩΣ</span>
        <p style={styles.infoMessage}>{task.config?.phosMessage}</p>
      </div>

      <div style={{ ...styles.infoBlock, borderColor: '#FF3366' }}>
        <span style={{ ...styles.infoLabel, color: '#FF3366' }}>ΣΚΟΤΊΑ</span>
        <p style={styles.infoMessage}>{task.config?.skotiaMessage}</p>
      </div>

      <p style={styles.waitingSub}>Waiting for Player A to choose...</p>
    </div>
  )
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  instruction: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  optionRow: { display: 'flex', gap: 12, width: '100%' },
  optionCard: {
    flex: 1, background: 'rgba(11,12,16,0.8)', borderRadius: 16, border: '2px solid',
    padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
    cursor: 'pointer', boxShadow: '0 0 12px rgba(0,212,255,0.15)',
  },
  optionDisplay: { fontSize: 36, textAlign: 'center' },
  optionLabel: { fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textAlign: 'center' },
  themeTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center' },
  infoBlock: {
    width: '100%', background: 'rgba(11,12,16,0.8)', borderRadius: 16, border: '2px solid',
    padding: '16px', display: 'flex', flexDirection: 'column', gap: 6,
  },
  infoLabel: { fontFamily: 'Orbitron, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em' },
  infoMessage: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#F8F9FA', lineHeight: 1.5 },
  waitingSub: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#6C757D' },
  waitingText: { fontFamily: 'Exo 2, sans-serif', fontSize: 16, color: '#ADB5BD', textAlign: 'center' },
  resolvedTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', color: '#6C757D' },
  resolvedCard: {
    background: 'rgba(11,12,16,0.8)', borderRadius: 16, border: '2px solid rgba(255,255,255,0.08)',
    padding: '24px', display: 'flex', alignItems: 'center', gap: 8,
  },
  resolvedOption: { fontFamily: 'Exo 2, sans-serif', fontSize: 18, fontWeight: 700, color: '#F8F9FA' },
  pointsText: { fontFamily: 'Rajdhani, sans-serif', fontSize: 36, fontWeight: 700, letterSpacing: '0.1em' },
}
