import { useState, useEffect, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { fetchGameState } from '../utils/api.js'
import TaskRushScreen from './TaskRushScreen.jsx'
import CoopLobbyScreen from './CoopLobbyScreen.jsx'
import CoopRushScreen from './CoopRushScreen.jsx'

const MOVEMENT_B_DURATION_MS = 3 * 60 * 1000

export default function MovementBScreen({
  token,
  gameId,
  lobbyId,
  currentUserId,
  currentTeam,
  currentGroupMembers,
  movementBEndsAt,
  socket,
  onMovementEnd,
}) {
  const [mode, setMode] = useState('hub') // 'hub' | 'taskRush' | 'coopLobby' | 'coopRush'
  const [activeTab, setActiveTab] = useState('rush') // 'rush' | 'coop'
  const [coopInvite, setCoopInvite] = useState(null) // { inviteId, fromUserId, fromUsername }
  const [coopSession, setCoopSession] = useState(null) // { sessionId, partnerUsername, role, initialTask }
  const [timeLeft, setTimeLeft] = useState(() => {
    if (movementBEndsAt) {
      const remaining = Math.max(0, Math.round((movementBEndsAt - Date.now()) / 1000))
      return remaining
    }
    return MOVEMENT_B_DURATION_MS / 1000
  })

  // Safety-net poll
  const checkState = useCallback(async () => {
    const res = await fetchGameState(token, gameId)
    if (!res.ok) return
    if (res.data.currentMovement && res.data.currentMovement !== 'B') {
      onMovementEnd(res.data.currentMovement)
    }
  }, [token, gameId, onMovementEnd])

  useEffect(() => {
    checkState()
    const interval = setInterval(checkState, 3000)
    return () => clearInterval(interval)
  }, [checkState])

  // Movement B timer
  useEffect(() => {
    if (timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  useEffect(() => {
    if (!socket) return

    function onMovementStart(data) {
      if (data.movement && data.movement !== 'B') {
        onMovementEnd(data.movement)
      }
    }

    function onCoopInviteReceived(data) {
      setCoopInvite(data)
    }

    function onCoopInviteCancelled() {
      setCoopInvite(null)
    }

    function onCoopSessionStart(data) {
      setCoopInvite(null)
      setCoopSession({
        sessionId: data.sessionId,
        role: data.role,
        partnerUsername: data.partner?.username || 'Partner',
        initialTask: data.task,
      })
      setMode('coopRush')
    }

    socket.on('movementStart', onMovementStart)
    socket.on('coopInviteReceived', onCoopInviteReceived)
    socket.on('coopInviteCancelled', onCoopInviteCancelled)
    socket.on('coopSessionStart', onCoopSessionStart)

    return () => {
      socket.off('movementStart', onMovementStart)
      socket.off('coopInviteReceived', onCoopInviteReceived)
      socket.off('coopInviteCancelled', onCoopInviteCancelled)
      socket.off('coopSessionStart', onCoopSessionStart)
    }
  }, [socket, onMovementEnd])

  function acceptInvite() {
    if (!coopInvite) return
    socket?.emit('coopAccept', { inviteId: coopInvite.inviteId })
    setCoopInvite(null)
  }

  function declineInvite() {
    if (!coopInvite) return
    socket?.emit('coopDecline', { inviteId: coopInvite.inviteId })
    setCoopInvite(null)
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  if (mode === 'taskRush') {
    return <TaskRushScreen token={token} gameId={gameId} movementTimeLeft={timeLeft} onBack={() => setMode('hub')} />
  }

  if (mode === 'coopLobby') {
    return (
      <CoopLobbyScreen
        token={token}
        gameId={gameId}
        currentUserId={currentUserId}
        groupMembers={currentGroupMembers}
        movementTimeLeft={timeLeft}
        socket={socket}
        onBack={() => setMode('hub')}
        onSessionStart={(data) => {
          setCoopSession({
            sessionId: data.sessionId,
            role: data.role,
            partnerUsername: data.partner?.username || 'Partner',
            initialTask: data.task,
          })
          setMode('coopRush')
        }}
      />
    )
  }

  if (mode === 'coopRush' && coopSession) {
    return (
      <CoopRushScreen
        token={token}
        gameId={gameId}
        sessionId={coopSession.sessionId}
        partnerUsername={coopSession.partnerUsername}
        role={coopSession.role}
        currentTeam={currentTeam}
        initialTask={coopSession.initialTask}
        movementTimeLeft={timeLeft}
        socket={socket}
        onEnd={() => setMode('hub')}
      />
    )
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <h2 style={styles.title}>MOVEMENT B</h2>
          <div style={styles.timerBox}>
            <span style={styles.timerText}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Co-op invite banner */}
        {coopInvite && (
          <div style={styles.inviteBanner}>
            <p style={styles.inviteText}>🤝 <strong style={{ color: '#00D4FF' }}>{coopInvite.fromUsername}</strong> wants to co-op!</p>
            <div style={styles.inviteActions}>
              <button style={styles.acceptBtn} onClick={acceptInvite}>ACCEPT</button>
              <button style={styles.declineBtn} onClick={declineInvite}>DECLINE</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'rush' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('rush')}
          >
            ⚡ CHALLENGE RUSH
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'coop' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('coop')}
          >
            🤝 CO-OP
          </button>
        </div>

        {activeTab === 'rush' && (
          <div style={styles.modeCard}>
            <p style={styles.modeIcon}>⚡</p>
            <p style={styles.modeTitle}>CHALLENGE RUSH</p>
            <p style={styles.modeDesc}>Race through biblical challenges. Build streaks for bonus multipliers.</p>
            <button style={styles.enterBtn} onClick={() => setMode('taskRush')}>
              ENTER RUSH →
            </button>
          </div>
        )}

        {activeTab === 'coop' && (
          <div style={styles.modeCard}>
            <p style={styles.modeIcon}>🤝</p>
            <p style={styles.modeTitle}>CO-OP MODE</p>
            <p style={styles.modeDesc}>Partner with a group member for special collaborative challenges.</p>
            <button style={styles.enterBtn} onClick={() => setMode('coopLobby')}>
              FIND PARTNER →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', position: 'relative', padding: '24px 16px' },
  inner: { position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700, color: '#FFA63D' },
  timerBox: { background: 'rgba(255,166,61,0.08)', border: '1px solid rgba(255,166,61,0.3)', borderRadius: 6, padding: '6px 14px' },
  timerText: { fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 700, color: '#FFA63D' },
  inviteBanner: { background: 'rgba(0,212,255,0.08)', border: '2px solid rgba(0,212,255,0.4)', borderRadius: 8, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  inviteText: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', flex: 1 },
  inviteActions: { display: 'flex', gap: 8 },
  acceptBtn: { padding: '8px 16px', background: 'rgba(0,255,159,0.15)', border: '1px solid #00FF9F', borderRadius: 4, color: '#00FF9F', fontFamily: 'Orbitron, sans-serif', fontSize: 11, cursor: 'pointer' },
  declineBtn: { padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#ADB5BD', fontFamily: 'Rajdhani, sans-serif', fontSize: 12, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' },
  tab: { flex: 1, padding: '12px', background: 'rgba(31,40,51,0.8)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', color: '#ADB5BD', fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em' },
  tabActive: { background: 'rgba(255,166,61,0.12)', color: '#FFA63D', borderBottom: '2px solid #FFA63D' },
  modeCard: { background: 'rgba(31,40,51,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' },
  modeIcon: { fontSize: 48 },
  modeTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#FFA63D', letterSpacing: '0.1em' },
  modeDesc: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', lineHeight: 1.5 },
  enterBtn: { marginTop: 8, padding: '14px 32px', background: 'rgba(255,166,61,0.1)', border: '2px solid #FFA63D', borderRadius: 6, color: '#FFA63D', fontFamily: 'Orbitron, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em' },
}
