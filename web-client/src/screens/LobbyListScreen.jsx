import { useState, useEffect, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { fetchLobbies, createLobby, joinLobby } from '../utils/api.js'

export default function LobbyListScreen({ token, username, onJoinLobby, onLogout, onDevMenu }) {
  const [lobbies, setLobbies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [lobbyName, setLobbyName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('40')
  const [joinId, setJoinId] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(null)

  const loadLobbies = useCallback(async () => {
    const res = await fetchLobbies(token)
    if (res.ok) setLobbies(res.data.lobbies || [])
    setLoading(false)
  }, [token])

  useEffect(() => {
    loadLobbies()
    const interval = setInterval(loadLobbies, 3000)
    return () => clearInterval(interval)
  }, [loadLobbies])

  async function handleCreate() {
    setError('')
    if (!lobbyName.trim()) return setError('Enter a lobby name.')
    const mp = parseInt(maxPlayers, 10)
    if (isNaN(mp) || mp < 5 || mp > 100) return setError('Max players must be 5–100.')
    setCreating(true)
    const res = await createLobby(token, lobbyName.trim(), mp)
    setCreating(false)
    if (!res.ok) return setError(res.data?.error || 'Could not create lobby.')
    onJoinLobby(res.data.lobby.id)
  }

  async function handleJoin(lobbyId) {
    setError('')
    setJoining(lobbyId)
    const res = await joinLobby(token, lobbyId)
    setJoining(null)
    if (!res.ok) return setError(res.data?.error || 'Could not join lobby.')
    onJoinLobby(lobbyId)
  }

  async function handleJoinById() {
    if (!joinId.trim()) return
    await handleJoin(joinId.trim())
  }

  const statusColor = (s) => s === 'waiting' ? '#00FF9F' : s === 'in_progress' ? '#FFA63D' : '#6C757D'
  const statusLabel = (s) => s === 'waiting' ? 'OPEN' : s === 'in_progress' ? 'IN PROGRESS' : 'CLOSED'

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>LOBBIES</h1>
            <p style={styles.sub}>Welcome, <span style={{ color: '#00D4FF' }}>{username}</span></p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onDevMenu && (
              <button style={styles.devBtn} onClick={onDevMenu}>🛠 DEV</button>
            )}
            <button style={styles.logoutBtn} onClick={onLogout}>LOGOUT</button>
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Join by ID */}
        <div style={styles.joinRow}>
          <input
            style={{ ...styles.input, flex: 1 }}
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Lobby ID to join..."
            onKeyDown={(e) => e.key === 'Enter' && handleJoinById()}
          />
          <button style={styles.joinBtn} onClick={handleJoinById}>JOIN</button>
        </div>

        {/* Create toggle */}
        <button style={styles.createToggleBtn} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ CANCEL' : '+ CREATE LOBBY'}
        </button>

        {showCreate && (
          <div style={styles.createForm}>
            <input
              style={styles.input}
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              placeholder="Lobby name"
            />
            <input
              style={styles.input}
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              placeholder="Max players (5–100)"
              min="5"
              max="100"
            />
            <button style={styles.primaryBtn} onClick={handleCreate} disabled={creating}>
              {creating ? 'CREATING...' : 'CREATE'}
            </button>
          </div>
        )}

        {/* Lobby list */}
        {loading ? (
          <p style={styles.loadingText}>Loading lobbies...</p>
        ) : lobbies.length === 0 ? (
          <p style={styles.emptyText}>No lobbies available. Create one!</p>
        ) : (
          <div style={styles.list}>
            {lobbies.map((l) => (
              <div key={l.id} style={styles.lobbyCard}>
                <div style={styles.lobbyInfo}>
                  <span style={styles.lobbyName}>{l.name}</span>
                  <span style={{ ...styles.statusBadge, color: statusColor(l.status) }}>
                    {statusLabel(l.status)}
                  </span>
                </div>
                <div style={styles.lobbyMeta}>
                  <span style={styles.metaText}>
                    {l.current_players}/{l.max_players} players
                  </span>
                  <span style={styles.metaText}>Host: {l.host_username}</span>
                </div>
                {l.status === 'waiting' && (
                  <button
                    style={styles.joinCardBtn}
                    onClick={() => handleJoin(l.id)}
                    disabled={joining === l.id}
                  >
                    {joining === l.id ? 'JOINING...' : 'JOIN'}
                  </button>
                )}
              </div>
            ))}
          </div>
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
    gap: 16,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 8,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 24,
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
  devBtn: {
    background: 'rgba(255,166,61,0.1)',
    border: '1px solid rgba(255,166,61,0.4)',
    borderRadius: 4,
    color: '#FFA63D',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    letterSpacing: '0.1em',
    padding: '6px 12px',
    cursor: 'pointer',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 4,
    color: '#ADB5BD',
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
    border: '1px solid rgba(255,51,102,0.3)',
    borderRadius: 4,
    padding: '8px 12px',
  },
  joinRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    background: 'rgba(11,12,16,0.8)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4,
    padding: '10px 12px',
    color: '#F8F9FA',
    fontSize: 14,
    outline: 'none',
  },
  joinBtn: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid #00D4FF',
    borderRadius: 4,
    color: '#00D4FF',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.1em',
  },
  createToggleBtn: {
    padding: '10px',
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.4)',
    borderRadius: 4,
    color: '#8B5CF6',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.1em',
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 16,
    background: 'rgba(31,40,51,0.8)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 6,
  },
  primaryBtn: {
    padding: '12px',
    background: 'transparent',
    border: '2px solid #8B5CF6',
    borderRadius: 4,
    color: '#8B5CF6',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.1em',
  },
  loadingText: {
    textAlign: 'center',
    color: '#ADB5BD',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    padding: 32,
    animation: 'pulse 1.5s infinite',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6C757D',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    padding: 32,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  lobbyCard: {
    background: 'rgba(31,40,51,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  lobbyInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lobbyName: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 16,
    fontWeight: 600,
    color: '#F8F9FA',
  },
  statusBadge: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
  },
  lobbyMeta: {
    display: 'flex',
    gap: 12,
  },
  metaText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 12,
    color: '#6C757D',
  },
  joinCardBtn: {
    marginTop: 4,
    padding: '8px',
    background: 'transparent',
    border: '1px solid #00D4FF',
    borderRadius: 4,
    color: '#00D4FF',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.1em',
    alignSelf: 'flex-end',
  },
}
