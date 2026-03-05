import { useState, useEffect, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { fetchGameState } from '../utils/api.js'

export default function RoundHubScreen({
  token,
  gameId,
  lobbyId,
  currentRound,
  totalRounds,
  currentTeam,
  currentGroupMembers,
  teamPoints,
  isMarked,
  socket,
  onNavigateMovement,
  onGameOver,
}) {
  const [state, setState] = useState({
    round: currentRound,
    totalRounds,
    movement: null,
    groupMembers: currentGroupMembers || [],
    teamPoints: teamPoints || { phos: 0, skotia: 0 },
    isMarked: isMarked || false,
  })
  const [announcement, setAnnouncement] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadState = useCallback(async () => {
    if (!gameId) return
    const res = await fetchGameState(token, gameId)
    if (!res.ok) return
    const d = res.data
    setState((prev) => ({
      ...prev,
      round: d.currentRound ?? prev.round,
      totalRounds: d.totalRounds ?? prev.totalRounds,
      movement: d.currentMovement ?? prev.movement,
      groupMembers: d.groupMembers ?? prev.groupMembers,
      teamPoints: d.teamPoints ?? prev.teamPoints,
      isMarked: d.isMarked ?? prev.isMarked,
    }))
    if (d.gameStatus === 'completed') {
      onGameOver({ winner: d.winner, winCondition: d.winCondition, teamPoints: d.teamPoints })
    }
    if (d.currentMovement && d.currentMovement !== 'hub') {
      onNavigateMovement(d.currentMovement)
    }
  }, [token, gameId, onNavigateMovement, onGameOver])

  useEffect(() => {
    loadState()
    const interval = setInterval(loadState, 3000)
    return () => clearInterval(interval)
  }, [loadState])

  useEffect(() => {
    if (!socket) return

    // Ensure socket is in the lobby room to receive movementStart events
    if (lobbyId) socket.emit('joinRoom', { lobbyId })

    function onMovementStart(data) {
      if (data.roundNumber) setState((prev) => ({ ...prev, round: data.roundNumber }))
      if (data.totalRounds) setState((prev) => ({ ...prev, totalRounds: data.totalRounds }))
      if (data.teamPoints) setState((prev) => ({ ...prev, teamPoints: data.teamPoints }))
      if (data.movement) onNavigateMovement(data.movement)
    }

    function onGameOverEvent(data) {
      onGameOver(data)
    }

    function onAnnouncement(data) {
      setAnnouncement(data.message)
      setTimeout(() => setAnnouncement(null), 5000)
    }

    function onGameStateUpdate(data) {
      if (data.teamPoints) setState((prev) => ({ ...prev, teamPoints: data.teamPoints }))
      if (data.gameState) {
        setState((prev) => ({
          ...prev,
          round: data.gameState.round ?? prev.round,
          totalRounds: data.gameState.totalRounds ?? prev.totalRounds,
        }))
        if (data.gameState.status === 'completed') {
          onGameOver({ teamPoints: data.teamPoints })
        }
        if (data.gameState.movement) onNavigateMovement(data.gameState.movement)
      }
    }

    socket.on('movementStart', onMovementStart)
    socket.on('gameOver', onGameOverEvent)
    socket.on('announcement', onAnnouncement)
    socket.on('gameStateUpdate', onGameStateUpdate)

    return () => {
      socket.off('movementStart', onMovementStart)
      socket.off('gameOver', onGameOverEvent)
      socket.off('announcement', onAnnouncement)
      socket.off('gameStateUpdate', onGameStateUpdate)
    }
  }, [socket, lobbyId, onNavigateMovement, onGameOver])

  async function handleRefresh() {
    setRefreshing(true)
    await loadState()
    setRefreshing(false)
  }

  const phosPoints = state.teamPoints?.phos ?? 0
  const skotiaPoints = state.teamPoints?.skotia ?? 0

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        {announcement && (
          <div style={styles.announcement}>
            <span style={styles.announcementIcon}>📢</span>
            <span>{announcement}</span>
          </div>
        )}

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.roundBadge}>
            <span style={styles.roundLabel}>ROUND</span>
            <span style={styles.roundNum}>{state.round}/{state.totalRounds}</span>
          </div>
          <button style={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '...' : '↻'}
          </button>
        </div>

        {/* Team points */}
        <div style={styles.pointsRow}>
          <div style={styles.teamBox}>
            <span style={styles.teamLabel}>ΦΩΣ</span>
            <span style={{ ...styles.teamPoints, color: '#00D4FF' }}>{phosPoints}</span>
          </div>
          <div style={styles.divider}>VS</div>
          <div style={styles.teamBox}>
            <span style={styles.teamLabel}>ΣΚΟΤΊΑ</span>
            <span style={{ ...styles.teamPoints, color: '#FF3366' }}>{skotiaPoints}</span>
          </div>
        </div>

        {/* Marked status */}
        {state.isMarked && (
          <div style={styles.markedBanner}>
            ⚠️ You are currently MARKED as suspected ΣΚΟΤΊΑ
          </div>
        )}

        {/* Group members */}
        {state.groupMembers && state.groupMembers.length > 0 && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>YOUR GROUP</p>
            <div style={styles.memberList}>
              {state.groupMembers.map((m) => (
                <div key={m.id} style={styles.memberRow}>
                  <div style={styles.memberLeft}>
                    <div
                      style={{
                        ...styles.teamDot,
                        background: m.isYou ? '#00D4FF' : '#6C757D',
                      }}
                    />
                    <span style={styles.memberName}>
                      {m.username}
                      {m.isYou && <span style={styles.youTag}> (you)</span>}
                    </span>
                  </div>
                  {m.isMarked && (
                    <span style={styles.susBadge}>SUS</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current movement status */}
        <div style={styles.movementStatus}>
          <p style={styles.movementLabel}>
            {state.movement
              ? `Movement ${state.movement} is active`
              : 'Waiting for Game Master...'}
          </p>
          <p style={styles.movementHint}>
            {state.movement === 'A' && 'Social deduction round in progress'}
            {state.movement === 'B' && 'Task challenge in progress'}
            {state.movement === 'C' && 'Voting round in progress'}
            {!state.movement && 'The GM will advance the game when ready'}
          </p>
        </div>
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
    gap: 16,
  },
  announcement: {
    background: 'rgba(255,166,61,0.15)',
    border: '1px solid rgba(255,166,61,0.4)',
    borderRadius: 6,
    padding: '12px 16px',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#FFA63D',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    animation: 'fadeIn 0.3s ease-out',
  },
  announcementIcon: {
    fontSize: 18,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundBadge: {
    display: 'flex',
    flexDirection: 'column',
  },
  roundLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#6C757D',
    letterSpacing: '0.15em',
  },
  roundNum: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 28,
    fontWeight: 700,
    color: '#F8F9FA',
  },
  refreshBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 4,
    color: '#ADB5BD',
    fontSize: 18,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  pointsRow: {
    display: 'flex',
    gap: 0,
    background: 'rgba(31,40,51,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  teamBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '14px 12px',
  },
  teamLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#ADB5BD',
    letterSpacing: '0.1em',
  },
  teamPoints: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 32,
    fontWeight: 900,
    marginTop: 4,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    color: '#495057',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  },
  markedBanner: {
    background: 'rgba(255,51,102,0.1)',
    border: '1px solid rgba(255,51,102,0.4)',
    borderRadius: 6,
    padding: '10px 16px',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    color: '#FF3366',
    textAlign: 'center',
  },
  section: {
    background: 'rgba(31,40,51,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 16,
  },
  sectionLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#6C757D',
    letterSpacing: '0.15em',
    marginBottom: 10,
  },
  memberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  memberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    background: 'rgba(11,12,16,0.4)',
    borderRadius: 4,
  },
  memberLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  memberName: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#F8F9FA',
  },
  youTag: {
    color: '#6C757D',
    fontSize: 12,
  },
  susBadge: {
    background: 'rgba(255,51,102,0.2)',
    border: '1px solid rgba(255,51,102,0.5)',
    borderRadius: 3,
    color: '#FF3366',
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '1px 6px',
  },
  movementStatus: {
    background: 'rgba(31,40,51,0.6)',
    border: '1px solid rgba(0,212,255,0.15)',
    borderRadius: 8,
    padding: '16px',
    textAlign: 'center',
  },
  movementLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    color: '#00D4FF',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  movementHint: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
    animation: 'pulse 2s infinite',
  },
}
