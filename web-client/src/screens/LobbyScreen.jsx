import { useState, useEffect, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { fetchLobbyPlayers, leaveLobby, kickPlayer } from '../utils/api.js'

export default function LobbyScreen({
  token,
  lobbyId,
  currentUserId,
  isGm,
  socket,
  onLeave,
  onGameStarted,
  onRoleAssigned,
}) {
  const [players, setPlayers] = useState([])
  const [hostId, setHostId] = useState(null)
  const [lobbyInfo, setLobbyInfo] = useState(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  const isHost = hostId && String(hostId) === String(currentUserId)

  const loadPlayers = useCallback(async () => {
    const res = await fetchLobbyPlayers(token, lobbyId)
    if (res.ok) {
      setPlayers(res.data.players || [])
      setHostId(res.data.hostId)
      setLobbyInfo(res.data.lobbyInfo || null)
    }
  }, [token, lobbyId])

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  useEffect(() => {
    if (!socket) return

    socket.emit('joinRoom', { lobbyId })

    function onLobbyUpdate(data) {
      if (data.players) setPlayers(data.players)
      if (data.hostId) setHostId(data.hostId)
    }

    function onRoleAssignedEvent(data) {
      onRoleAssigned(data)
    }

    function onGameStartedEvent(data) {
      onGameStarted(data)
    }

    function onPlayerKicked(data) {
      if (String(data.userId) === String(currentUserId)) {
        onLeave()
      }
    }

    function onLobbyClosed() {
      onLeave()
    }

    socket.on('lobbyUpdate', onLobbyUpdate)
    socket.on('roleAssigned', onRoleAssignedEvent)
    socket.on('gameStarted', onGameStartedEvent)
    socket.on('playerKicked', onPlayerKicked)
    socket.on('lobbyClosed', onLobbyClosed)

    return () => {
      socket.off('lobbyUpdate', onLobbyUpdate)
      socket.off('roleAssigned', onRoleAssignedEvent)
      socket.off('gameStarted', onGameStartedEvent)
      socket.off('playerKicked', onPlayerKicked)
      socket.off('lobbyClosed', onLobbyClosed)
    }
  }, [socket, lobbyId, currentUserId, onRoleAssigned, onGameStarted, onLeave])

  async function handleLeave() {
    await leaveLobby(token, lobbyId)
    onLeave()
  }

  async function handleKick(userId) {
    const res = await kickPlayer(token, lobbyId, userId)
    if (!res.ok) setError(res.data?.error || 'Could not kick player.')
  }

  function handleStartGame() {
    if (!socket) return
    setStarting(true)
    socket.emit('startGame', { lobbyId })
    setTimeout(() => setStarting(false), 3000)
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              {lobbyInfo?.name || 'Lobby'}
            </h1>
            <p style={styles.sub}>
              {players.length} player{players.length !== 1 ? 's' : ''} waiting
            </p>
          </div>
          <button style={styles.leaveBtn} onClick={handleLeave}>LEAVE</button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.section}>
          <p style={styles.sectionLabel}>PLAYERS</p>
          <div style={styles.playerList}>
            {players.map((p) => (
              <div key={p.id} style={styles.playerRow}>
                <div style={styles.playerLeft}>
                  <div
                    style={{
                      ...styles.connDot,
                      background: p.isConnected ? '#00FF9F' : '#6C757D',
                      boxShadow: p.isConnected ? '0 0 6px #00FF9F' : 'none',
                    }}
                  />
                  <span style={styles.playerName}>
                    {p.username}
                    {String(p.id) === String(currentUserId) && (
                      <span style={styles.youTag}> (you)</span>
                    )}
                  </span>
                  {String(p.id) === String(hostId) && (
                    <span style={styles.hostTag}>HOST</span>
                  )}
                </div>
                {isHost && String(p.id) !== String(currentUserId) && (
                  <button style={styles.kickBtn} onClick={() => handleKick(p.id)}>
                    KICK
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <div style={styles.startSection}>
            <p style={styles.startHint}>
              You are the host. Start the game when everyone is ready.
            </p>
            <button
              style={styles.startBtn}
              onClick={handleStartGame}
              disabled={starting || players.length < 5}
            >
              {starting ? 'STARTING...' : 'START GAME'}
            </button>
            {players.length < 5 && (
              <p style={styles.minWarning}>Minimum 5 players required</p>
            )}
          </div>
        )}

        {!isHost && (
          <p style={styles.waitingText}>
            Waiting for the host to start the game...
          </p>
        )}
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
    gap: 20,
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
    fontSize: 22,
    fontWeight: 700,
    color: '#00D4FF',
    textShadow: '0 0 10px rgba(0,212,255,0.4)',
  },
  sub: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    color: '#ADB5BD',
    marginTop: 2,
  },
  leaveBtn: {
    background: 'none',
    border: '1px solid rgba(255,51,102,0.4)',
    borderRadius: 4,
    color: '#FF3366',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    letterSpacing: '0.1em',
    padding: '6px 12px',
    cursor: 'pointer',
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
    marginBottom: 12,
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    background: 'rgba(11,12,16,0.4)',
    borderRadius: 4,
  },
  playerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'all 0.3s',
  },
  playerName: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#F8F9FA',
  },
  youTag: {
    color: '#6C757D',
    fontSize: 12,
  },
  hostTag: {
    background: 'rgba(0,212,255,0.15)',
    border: '1px solid rgba(0,212,255,0.4)',
    borderRadius: 3,
    color: '#00D4FF',
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '1px 6px',
  },
  kickBtn: {
    background: 'none',
    border: '1px solid rgba(255,51,102,0.3)',
    borderRadius: 3,
    color: '#FF3366',
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '2px 8px',
    cursor: 'pointer',
  },
  startSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    alignItems: 'center',
  },
  startHint: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    color: '#ADB5BD',
    textAlign: 'center',
  },
  startBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,212,255,0.05))',
    border: '2px solid #00D4FF',
    borderRadius: 6,
    color: '#00D4FF',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    boxShadow: '0 0 20px rgba(0,212,255,0.3)',
    animation: 'glowPulse 2s infinite',
  },
  minWarning: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 12,
    color: '#FFA63D',
    textAlign: 'center',
  },
  waitingText: {
    textAlign: 'center',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#ADB5BD',
    padding: '20px 0',
    animation: 'pulse 2s infinite',
  },
}
