import { useState, useCallback } from 'react'

function DecreeCard({ decree, onPress, disabled, teamColor }) {
  const borderColor = decree.team === 'phos' ? '#00D4FF' : '#FF3366'
  const teamLabel = decree.team === 'phos' ? 'ΦΩΣ' : 'ΣΚΟΤΊΑ'

  return (
    <button
      style={{
        ...styles.decreeCard,
        borderColor,
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={() => onPress(decree.index)}
      disabled={disabled}
    >
      <span style={{ ...styles.decreeTeam, color: borderColor }}>{teamLabel}</span>
      <span style={styles.decreeLabel}>{decree.label}</span>
      <span style={{ ...styles.decreePoints, color: borderColor }}>+{decree.points}</span>
    </button>
  )
}

export default function SecretBallotTask({ task, role, currentTeam, onAction, update }) {
  const [discarded, setDiscarded] = useState(false)
  const [enacted, setEnacted] = useState(false)

  const handleDiscard = useCallback((decreeIndex) => {
    if (discarded) return
    setDiscarded(true)
    onAction('discardDecree', { decreeIndex })
  }, [discarded, onAction])

  const handleEnact = useCallback((decreeIndex) => {
    if (enacted) return
    setEnacted(true)
    onAction('enactDecree', { decreeIndex })
  }, [enacted, onAction])

  // Resolved state
  if (update?.phase === 'resolved') {
    return (
      <div style={styles.wrap}>
        <p style={styles.resolvedTitle}>DECREE ENACTED</p>
        <div style={styles.mysteryCard}>
          <p style={styles.mysteryPoints}>+??</p>
          <p style={styles.mysterySubtext}>Points awarded in secret</p>
        </div>
      </div>
    )
  }

  // Player A — initial: show decrees to discard one
  if (role === 'A' && !update && !discarded) {
    const decrees = task.config?.decrees || []
    return (
      <div style={styles.wrap}>
        <p style={styles.instruction}>Discard one decree. The remaining two will be passed to your partner.</p>
        <div style={styles.decreeList}>
          {decrees.map((decree) => (
            <DecreeCard
              key={decree.index}
              decree={decree}
              onPress={handleDiscard}
              disabled={discarded}
            />
          ))}
        </div>
      </div>
    )
  }

  // Player A — waiting for B
  if (role === 'A' && (discarded || update?.phase === 'waitingForB')) {
    return (
      <div style={styles.wrap}>
        <p style={styles.waitingText}>Waiting for partner to enact a decree...</p>
      </div>
    )
  }

  // Player B — waiting for A to discard
  if (role === 'B' && !update) {
    return (
      <div style={styles.wrap}>
        <p style={styles.waitingText}>Waiting for partner to discard a decree...</p>
      </div>
    )
  }

  // Player B — choose from remaining
  if (role === 'B' && update?.phase === 'playerB') {
    const remaining = update.remainingDecrees || []
    return (
      <div style={styles.wrap}>
        <p style={styles.instruction}>Partner discarded one. Choose which decree to enact:</p>
        <div style={styles.decreeList}>
          {remaining.map((decree) => (
            <DecreeCard
              key={decree.index}
              decree={decree}
              onPress={handleEnact}
              disabled={enacted}
            />
          ))}
        </div>
        {enacted && <p style={styles.waitingText}>Submitted! Waiting...</p>}
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.waitingText}>Loading...</p>
    </div>
  )
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  instruction: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  decreeList: { display: 'flex', flexDirection: 'column', gap: 10, width: '100%' },
  decreeCard: {
    width: '100%', background: 'rgba(11,12,16,0.8)', borderRadius: 16, border: '2px solid',
    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
    textAlign: 'left',
  },
  decreeTeam: { fontFamily: 'Orbitron, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', minWidth: 50 },
  decreeLabel: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#F8F9FA', flex: 1 },
  decreePoints: { fontFamily: 'Rajdhani, sans-serif', fontSize: 16, fontWeight: 700 },
  waitingText: { fontFamily: 'Exo 2, sans-serif', fontSize: 16, color: '#ADB5BD', textAlign: 'center', animation: 'pulse 2s infinite' },
  resolvedTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', color: '#6C757D' },
  mysteryCard: {
    background: 'rgba(11,12,16,0.8)', borderRadius: 16, border: '2px solid rgba(255,255,255,0.08)',
    padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  mysteryPoints: { fontFamily: 'Rajdhani, sans-serif', fontSize: 36, fontWeight: 700, color: '#F8F9FA' },
  mysterySubtext: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#6C757D' },
}
