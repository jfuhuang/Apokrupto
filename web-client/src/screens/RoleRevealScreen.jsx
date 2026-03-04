import { useState, useEffect } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'

export default function RoleRevealScreen({ team, skotiaTeammates, groupNumber, onComplete }) {
  const [phase, setPhase] = useState('revealing') // 'revealing' | 'details'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('details'), 1500)
    const t2 = setTimeout(() => onComplete(), 6000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onComplete])

  // Both teams use ultraviolet to prevent onlookers reading roles
  const roleLabel = team === 'phos' ? 'ΦΩΣ' : 'ΣΚΟΤΊΑ'
  const roleSubtext = team === 'phos' ? 'φῶς — The Light' : 'σκοτία — The Darkness'

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.content}>
        <p style={styles.youAre}>YOU ARE</p>

        <div style={styles.roleWrapper}>
          <h1 style={styles.roleText}>{roleLabel}</h1>
          <div style={styles.roleGlow} />
        </div>

        <p style={styles.roleSubtext}>{roleSubtext}</p>

        {phase === 'details' && (
          <div style={styles.details}>
            {team === 'skotia' && skotiaTeammates && skotiaTeammates.length > 0 && (
              <div style={styles.teammatesBox}>
                <p style={styles.teammatesLabel}>YOUR ΣΚΟΤΊΑ TEAMMATES</p>
                {skotiaTeammates.map((name, i) => (
                  <p key={i} style={styles.teammateItem}>{name}</p>
                ))}
              </div>
            )}
            {groupNumber != null && (
              <p style={styles.groupText}>Group {groupNumber}</p>
            )}
          </div>
        )}

        <p style={styles.hint}>Advancing in a moment...</p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, #0B0C10 70%)',
    position: 'relative',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: 32,
    animation: 'fadeIn 0.6s ease-out',
  },
  youAre: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 18,
    fontWeight: 600,
    color: '#ADB5BD',
    letterSpacing: '0.3em',
  },
  roleWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 40px',
  },
  roleText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 'clamp(48px, 12vw, 80px)',
    fontWeight: 900,
    color: '#8B5CF6',
    textShadow: '0 0 30px #8B5CF6, 0 0 60px rgba(139,92,246,0.6)',
    letterSpacing: '0.1em',
  },
  roleGlow: {
    position: 'absolute',
    inset: -20,
    background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.2) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  roleSubtext: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 16,
    color: 'rgba(139,92,246,0.7)',
    letterSpacing: '0.1em',
    fontStyle: 'italic',
  },
  details: {
    marginTop: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    animation: 'fadeIn 0.5s ease-out',
  },
  teammatesBox: {
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 8,
    padding: '12px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  teammatesLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#8B5CF6',
    letterSpacing: '0.15em',
    marginBottom: 4,
  },
  teammateItem: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 15,
    color: '#F8F9FA',
    fontWeight: 600,
  },
  groupText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#ADB5BD',
  },
  hint: {
    marginTop: 20,
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 12,
    color: '#495057',
    animation: 'pulse 1.5s infinite',
  },
}
