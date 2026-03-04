import { useState, useEffect, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { fetchGmState, broadcast, advanceGame } from '../utils/api.js'

export default function GmDashboardScreen({
  token,
  gameId,
  lobbyId,
  socket,
  onGameOver,
}) {
  const [gmState, setGmState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastStatus, setBroadcastStatus] = useState('')
  const [error, setError] = useState('')

  const loadState = useCallback(async () => {
    const res = await fetchGmState(token, gameId)
    if (res.ok) {
      setGmState(res.data)
    }
    setLoading(false)
  }, [token, gameId])

  useEffect(() => {
    loadState()
    const interval = setInterval(loadState, 3000)
    return () => clearInterval(interval)
  }, [loadState])

  useEffect(() => {
    if (!socket) return

    function onGameOverEvent(data) {
      onGameOver(data)
    }

    socket.on('gameOver', onGameOverEvent)
    return () => socket.off('gameOver', onGameOverEvent)
  }, [socket, onGameOver])

  function handleAdvance() {
    setError('')
    if (socket) {
      setAdvancing(true)
      socket.emit('gmAdvance', { gameId })
      setTimeout(() => setAdvancing(false), 2000)
    }
  }

  async function handleBroadcast() {
    if (!broadcastMsg.trim()) return
    setBroadcasting(true)
    const res = await broadcast(token, gameId, lobbyId, broadcastMsg.trim())
    setBroadcasting(false)
    if (!res.ok) {
      setError(res.data?.error || 'Broadcast failed.')
    } else {
      setBroadcastStatus('Sent!')
      setBroadcastMsg('')
      setTimeout(() => setBroadcastStatus(''), 2000)
    }
  }

  const game = gmState?.gameState
  const players = gmState?.players || []
  const teamPoints = gmState?.teamPoints || {}
  const phosList = players.filter((p) => p.team === 'phos')
  const skotiaList = players.filter((p) => p.team === 'skotia')

  if (loading) {
    return (
      <div style={styles.loading}>
        <AnimatedBackground />
        <p style={styles.loadingText}>Loading GM Dashboard...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>GM DASHBOARD</h2>
            <p style={styles.sub}>Game Master Control</p>
          </div>
          <div style={styles.gmBadge}>GM</div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Game state */}
        {game && (
          <div style={styles.stateRow}>
            <div style={styles.statePill}>
              <span style={styles.stateLabel}>ROUND</span>
              <span style={styles.stateValue}>{game.round}/{game.totalRounds}</span>
            </div>
            <div style={styles.statePill}>
              <span style={styles.stateLabel}>MOVEMENT</span>
              <span style={{ ...styles.stateValue, color: '#FFA63D' }}>{game.movement || '—'}</span>
            </div>
            <div style={styles.statePill}>
              <span style={styles.stateLabel}>STATUS</span>
              <span style={{ ...styles.stateValue, color: game.status === 'active' ? '#00FF9F' : '#ADB5BD' }}>
                {game.status?.toUpperCase() || '—'}
              </span>
            </div>
          </div>
        )}

        {/* Team points */}
        <div style={styles.pointsRow}>
          <div style={styles.teamBox}>
            <span style={styles.teamLabel}>ΦΩΣ</span>
            <span style={{ ...styles.teamPoints, color: '#00D4FF' }}>{teamPoints.phos ?? 0}</span>
          </div>
          <div style={styles.teamDivider}>VS</div>
          <div style={styles.teamBox}>
            <span style={styles.teamLabel}>ΣΚΟΤΊΑ</span>
            <span style={{ ...styles.teamPoints, color: '#FF3366' }}>{teamPoints.skotia ?? 0}</span>
          </div>
        </div>

        {/* Advance button */}
        <button
          style={styles.advanceBtn}
          onClick={handleAdvance}
          disabled={advancing}
        >
          {advancing ? 'ADVANCING...' : '⚡ ADVANCE GAME'}
        </button>

        {/* Broadcast */}
        <div style={styles.broadcastSection}>
          <p style={styles.sectionLabel}>BROADCAST MESSAGE</p>
          <div style={styles.broadcastRow}>
            <input
              style={styles.broadcastInput}
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
              placeholder="Message to all players..."
            />
            <button style={styles.broadcastBtn} onClick={handleBroadcast} disabled={broadcasting}>
              {broadcastStatus || (broadcasting ? '...' : 'SEND')}
            </button>
          </div>
        </div>

        {/* Player list */}
        <div style={styles.playersSection}>
          <p style={styles.sectionLabel}>PLAYERS ({players.length})</p>
          <div style={styles.teamSection}>
            <p style={styles.teamHeader}>ΦΩΣ ({phosList.length})</p>
            {phosList.map((p) => (
              <PlayerRow key={p.id} player={p} teamColor="#00D4FF" />
            ))}
          </div>
          <div style={styles.teamSection}>
            <p style={{ ...styles.teamHeader, color: '#FF3366' }}>ΣΚΟΤΊΑ ({skotiaList.length})</p>
            {skotiaList.map((p) => (
              <PlayerRow key={p.id} player={p} teamColor="#FF3366" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayerRow({ player, teamColor }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '7px 10px',
      background: 'rgba(11,12,16,0.4)',
      borderRadius: 4,
      marginBottom: 4,
    }}>
      <span style={{
        fontFamily: 'Exo 2, sans-serif',
        fontSize: 14,
        color: '#F8F9FA',
      }}>
        {player.username}
      </span>
      {player.is_marked && (
        <span style={{
          background: 'rgba(255,51,102,0.2)',
          border: '1px solid rgba(255,51,102,0.4)',
          borderRadius: 3,
          color: '#FF3366',
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 10,
          fontWeight: 700,
          padding: '1px 6px',
          letterSpacing: '0.1em',
        }}>
          MARKED
        </span>
      )}
    </div>
  )
}

const styles = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loadingText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#ADB5BD',
    position: 'relative',
    zIndex: 1,
    animation: 'pulse 1.5s infinite',
  },
  container: {
    minHeight: '100vh',
    position: 'relative',
    padding: '24px 16px',
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 520,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    fontWeight: 700,
    color: '#FFA63D',
    textShadow: '0 0 10px rgba(255,166,61,0.4)',
  },
  sub: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    color: '#ADB5BD',
    marginTop: 2,
  },
  gmBadge: {
    background: 'rgba(255,166,61,0.15)',
    border: '2px solid rgba(255,166,61,0.5)',
    borderRadius: 6,
    color: '#FFA63D',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    padding: '4px 12px',
    letterSpacing: '0.1em',
  },
  error: {
    color: '#FF3366',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    textAlign: 'center',
    background: 'rgba(255,51,102,0.1)',
    borderRadius: 4,
    padding: '8px 12px',
  },
  stateRow: {
    display: 'flex',
    gap: 8,
  },
  statePill: {
    flex: 1,
    background: 'rgba(31,40,51,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
  },
  stateLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 9,
    fontWeight: 700,
    color: '#6C757D',
    letterSpacing: '0.12em',
  },
  stateValue: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 16,
    fontWeight: 700,
    color: '#F8F9FA',
  },
  pointsRow: {
    display: 'flex',
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
    padding: '12px',
  },
  teamLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    color: '#ADB5BD',
    letterSpacing: '0.1em',
  },
  teamPoints: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 28,
    fontWeight: 900,
    marginTop: 2,
  },
  teamDivider: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    color: '#495057',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  },
  advanceBtn: {
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(255,166,61,0.2), rgba(255,166,61,0.05))',
    border: '2px solid #FFA63D',
    borderRadius: 6,
    color: '#FFA63D',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    boxShadow: '0 0 20px rgba(255,166,61,0.25)',
    animation: 'glowPulse 2s infinite',
    transition: 'all 0.2s',
  },
  broadcastSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#6C757D',
    letterSpacing: '0.15em',
  },
  broadcastRow: {
    display: 'flex',
    gap: 8,
  },
  broadcastInput: {
    flex: 1,
    background: 'rgba(11,12,16,0.8)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4,
    padding: '10px 12px',
    color: '#F8F9FA',
    fontSize: 14,
    outline: 'none',
  },
  broadcastBtn: {
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    color: '#F8F9FA',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.08em',
    minWidth: 60,
  },
  playersSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  teamSection: {
    background: 'rgba(31,40,51,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6,
    padding: '12px',
  },
  teamHeader: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#00D4FF',
    letterSpacing: '0.1em',
    marginBottom: 8,
  },
}
