import { useEffect } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'

export default function RoundSummaryScreen({
  roundSummary,
  currentRound,
  totalRounds,
  isMarked,
  lobbyId,
  socket,
  onNextRound,
  onGameOver,
}) {
  const s = roundSummary || {}

  // Re-join lobby room in case socket reconnected
  useEffect(() => {
    if (!socket || !lobbyId) return
    socket.emit('joinRoom', { lobbyId })
  }, [socket, lobbyId])

  useEffect(() => {
    if (!socket) return

    function onMovementStart(data) {
      if (data.movement === 'A') {
        onNextRound(data)
      }
    }

    function onMovementComplete() {
      // Movement done; next movementStart will drive navigation
    }

    function onGameStateUpdate(data) {
      if (data.gameState?.status === 'completed') {
        onGameOver({ teamPoints: data.teamPoints })
      }
    }

    function onSusStatusUpdate() {
      // Mark status updated — parent App.jsx polls will reflect this
    }

    function onGameOverEvent(data) {
      onGameOver(data)
    }

    socket.on('movementStart', onMovementStart)
    socket.on('movementComplete', onMovementComplete)
    socket.on('gameStateUpdate', onGameStateUpdate)
    socket.on('susStatusUpdate', onSusStatusUpdate)
    socket.on('gameOver', onGameOverEvent)

    return () => {
      socket.off('movementStart', onMovementStart)
      socket.off('movementComplete', onMovementComplete)
      socket.off('gameStateUpdate', onGameStateUpdate)
      socket.off('susStatusUpdate', onSusStatusUpdate)
      socket.off('gameOver', onGameOverEvent)
    }
  }, [socket, lobbyId, onNextRound, onGameOver])

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <p style={styles.label}>ROUND COMPLETE</p>
          <h2 style={styles.title}>Round {currentRound} of {totalRounds}</h2>
        </div>

        {/* Personal status */}
        <div style={{
          ...styles.personalStatus,
          borderColor: isMarked ? 'rgba(255,51,102,0.5)' : 'rgba(0,255,159,0.5)',
          background: isMarked ? 'rgba(255,51,102,0.08)' : 'rgba(0,255,159,0.06)',
        }}>
          <span style={{ ...styles.statusIcon }}>
            {isMarked ? '🔴' : '🟢'}
          </span>
          <span style={{
            ...styles.statusText,
            color: isMarked ? '#FF3366' : '#00FF9F',
          }}>
            {isMarked ? 'You are MARKED as ΣΚΟΤΊΑ' : 'You are CLEARED as ΦΩΣ'}
          </span>
        </div>

        {/* Summary stats */}
        <div style={styles.statsGrid}>
          <StatCard
            label="MARKED"
            value={s.marksApplied ?? 0}
            color="#FF3366"
            icon="🔴"
          />
          <StatCard
            label="CLEARED"
            value={s.unmarksApplied ?? 0}
            color="#00FF9F"
            icon="🟢"
          />
          <StatCard
            label="ΦΩΣ POINTS"
            value={`+${s.phosPointsEarned ?? 0}`}
            color="#00D4FF"
            icon="⚡"
          />
          <StatCard
            label="ΣΚΟΤΊΑ POINTS"
            value={`+${s.skotiaPointsEarned ?? 0}`}
            color="#FF3366"
            icon="🌑"
          />
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>WAITING FOR GM...</p>
          <p style={styles.footerHint}>
            {currentRound < totalRounds
              ? `Round ${currentRound + 1} coming up`
              : 'Final round — game ending soon'}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: 'rgba(31,40,51,0.8)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: '16px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{
        fontFamily: 'Orbitron, sans-serif',
        fontSize: 24,
        fontWeight: 700,
        color,
        textShadow: `0 0 10px ${color}80`,
      }}>{value}</span>
      <span style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 10,
        fontWeight: 700,
        color: '#6C757D',
        letterSpacing: '0.12em',
        textAlign: 'center',
      }}>{label}</span>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    padding: '24px 16px',
    background: 'radial-gradient(ellipse at top, rgba(0,212,255,0.05) 0%, #0B0C10 60%)',
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    animation: 'fadeIn 0.5s ease-out',
  },
  header: {
    textAlign: 'center',
  },
  label: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    color: '#ADB5BD',
    letterSpacing: '0.2em',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 26,
    fontWeight: 700,
    color: '#F8F9FA',
  },
  personalStatus: {
    border: '2px solid',
    borderRadius: 8,
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  statusText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 15,
    fontWeight: 600,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  footer: {
    textAlign: 'center',
    padding: '20px 0',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  footerText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    color: '#ADB5BD',
    letterSpacing: '0.15em',
    animation: 'pulse 2s infinite',
  },
  footerHint: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    color: '#495057',
    marginTop: 6,
  },
}
