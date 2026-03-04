import AnimatedBackground from '../components/AnimatedBackground.jsx'

export default function GameOverScreen({ result, onReturnToLobbyList }) {
  const winner = result?.winner || result?.winner
  const phosPoints = result?.phosPoints ?? result?.teamPoints?.phos ?? 0
  const skotiaPoints = result?.skotiaPoints ?? result?.teamPoints?.skotia ?? 0
  const skotiaPlayers = result?.skotiaPlayers || []

  const phosWon = winner === 'phos'
  const accentColor = phosWon ? '#00D4FF' : '#FF3366'
  const winnerLabel = phosWon ? 'ΦΩΣ VICTORY' : 'ΣΚΟΤΊΑ VICTORY'
  const winnerSub = phosWon ? 'The light has prevailed' : 'Darkness has consumed all'

  return (
    <div style={{ ...styles.container, background: phosWon
      ? 'radial-gradient(ellipse at center, rgba(0,212,255,0.12) 0%, #0B0C10 70%)'
      : 'radial-gradient(ellipse at center, rgba(255,51,102,0.12) 0%, #0B0C10 70%)'
    }}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.trophy}>{phosWon ? '☀️' : '🌑'}</div>

        <div style={styles.winnerBlock}>
          <h1 style={{ ...styles.winnerTitle, color: accentColor, textShadow: `0 0 30px ${accentColor}, 0 0 60px ${accentColor}60` }}>
            {winnerLabel}
          </h1>
          <p style={styles.winnerSub}>{winnerSub}</p>
        </div>

        {/* Score */}
        <div style={styles.scoreRow}>
          <div style={styles.scoreBox}>
            <span style={styles.scoreLabel}>ΦΩΣ</span>
            <span style={{ ...styles.scoreValue, color: '#00D4FF' }}>{phosPoints}</span>
          </div>
          <div style={styles.scoreDivider}>VS</div>
          <div style={styles.scoreBox}>
            <span style={styles.scoreLabel}>ΣΚΟΤΊΑ</span>
            <span style={{ ...styles.scoreValue, color: '#FF3366' }}>{skotiaPoints}</span>
          </div>
        </div>

        {/* Skotia reveal */}
        {skotiaPlayers.length > 0 && (
          <div style={styles.revealCard}>
            <p style={styles.revealTitle}>THE ΣΚΟΤΊΑ WERE</p>
            <div style={styles.revealList}>
              {skotiaPlayers.map((p, i) => (
                <div key={p.id || i} style={styles.revealItem}>
                  <span style={styles.revealDot}>🌑</span>
                  <span style={styles.revealName}>{p.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button style={styles.returnBtn} onClick={onReturnToLobbyList}>
          RETURN TO LOBBY LIST
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    padding: '24px 16px',
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    paddingTop: 40,
    animation: 'fadeIn 0.6s ease-out',
  },
  trophy: {
    fontSize: 64,
    filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))',
  },
  winnerBlock: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  winnerTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 'clamp(28px, 8vw, 48px)',
    fontWeight: 900,
    letterSpacing: '0.08em',
  },
  winnerSub: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 16,
    color: '#ADB5BD',
    fontStyle: 'italic',
  },
  scoreRow: {
    display: 'flex',
    gap: 0,
    width: '100%',
    background: 'rgba(31,40,51,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  scoreBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 12px',
  },
  scoreLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#ADB5BD',
    letterSpacing: '0.1em',
  },
  scoreValue: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 36,
    fontWeight: 900,
    marginTop: 4,
  },
  scoreDivider: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    color: '#495057',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  },
  revealCard: {
    width: '100%',
    background: 'rgba(255,51,102,0.05)',
    border: '1px solid rgba(255,51,102,0.3)',
    borderRadius: 8,
    padding: '16px 20px',
  },
  revealTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    color: '#FF3366',
    letterSpacing: '0.15em',
    marginBottom: 12,
  },
  revealList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  revealItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  revealDot: {
    fontSize: 14,
  },
  revealName: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 15,
    fontWeight: 600,
    color: '#F8F9FA',
  },
  returnBtn: {
    width: '100%',
    padding: '14px',
    background: 'transparent',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: '#F8F9FA',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    marginTop: 8,
    transition: 'all 0.2s',
  },
}
