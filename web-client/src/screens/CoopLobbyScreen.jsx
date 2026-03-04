import { useState, useEffect } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'

export default function CoopLobbyScreen({ token, gameId, currentUserId, groupMembers, movementTimeLeft, socket, onBack, onSessionStart }) {
  const [sentInvite, setSentInvite] = useState(null) // { inviteId, targetUserId, targetUsername }
  const [status, setStatus] = useState('')

  const mins = Math.floor((movementTimeLeft || 0) / 60)
  const secs = (movementTimeLeft || 0) % 60

  useEffect(() => {
    if (!socket) return

    function onInviteSent(data) {
      setSentInvite({ inviteId: data.inviteId, targetUserId: data.targetUserId, targetUsername: data.targetUsername })
      setStatus('Invite sent — waiting for partner...')
    }

    function onInviteCancelled() {
      setSentInvite(null)
      setStatus('Invite cancelled.')
    }

    function onInviteExpired() {
      setSentInvite(null)
      setStatus('Invite expired.')
    }

    function handleSessionStart(data) {
      onSessionStart(data)
    }

    socket.on('coopInviteSent', onInviteSent)
    socket.on('coopInviteCancelled', onInviteCancelled)
    socket.on('coopInviteExpired', onInviteExpired)
    socket.on('coopSessionStart', handleSessionStart)

    return () => {
      socket.off('coopInviteSent', onInviteSent)
      socket.off('coopInviteCancelled', onInviteCancelled)
      socket.off('coopInviteExpired', onInviteExpired)
      socket.off('coopSessionStart', handleSessionStart)
    }
  }, [socket, onSessionStart])

  function sendInvite(member) {
    if (sentInvite) return
    socket?.emit('coopInvite', { targetUserId: member.id, gameId })
    setSentInvite({ targetUserId: member.id, targetUsername: member.username })
    setStatus(`Invited ${member.username}...`)
  }

  function cancelInvite() {
    if (!sentInvite) return
    socket?.emit('coopCancel', { inviteId: sentInvite.inviteId })
    setSentInvite(null)
    setStatus('Invite cancelled.')
  }

  const others = (groupMembers || []).filter(m => String(m.id) !== String(currentUserId))

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>← BACK</button>
          <span style={styles.title}>CO-OP LOBBY</span>
          <span style={styles.timer}>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
        </div>

        <p style={styles.sub}>Tap a group member to invite them to co-op</p>

        {status && <p style={styles.status}>{status}</p>}

        {sentInvite ? (
          <div style={styles.pendingCard}>
            <p style={styles.pendingText}>⏳ Waiting for <strong style={{ color: '#00D4FF' }}>{sentInvite.targetUsername}</strong>...</p>
            <button style={styles.cancelBtn} onClick={cancelInvite}>Cancel Invite</button>
          </div>
        ) : (
          <div style={styles.memberList}>
            {others.length === 0 && (
              <p style={styles.empty}>No other group members available.</p>
            )}
            {others.map(m => (
              <button key={m.id} style={styles.memberBtn} onClick={() => sendInvite(m)}>
                <span style={styles.memberName}>{m.username}</span>
                <span style={styles.inviteLabel}>INVITE →</span>
              </button>
            ))}
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
  backBtn: { background: 'none', border: 'none', color: '#ADB5BD', fontFamily: 'Rajdhani, sans-serif', fontSize: 13, cursor: 'pointer', padding: 0 },
  title: { fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 700, color: '#00D4FF' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 700, color: '#FFA63D' },
  sub: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  status: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#00FF9F', textAlign: 'center', animation: 'pulse 2s infinite' },
  pendingCard: { background: 'rgba(31,40,51,0.9)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  pendingText: { fontFamily: 'Exo 2, sans-serif', fontSize: 15, color: '#ADB5BD' },
  cancelBtn: { padding: '8px 24px', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#ADB5BD', fontFamily: 'Rajdhani, sans-serif', fontSize: 12, cursor: 'pointer' },
  memberList: { display: 'flex', flexDirection: 'column', gap: 10 },
  memberBtn: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(31,40,51,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer' },
  memberName: { fontFamily: 'Exo 2, sans-serif', fontSize: 16, color: '#F8F9FA' },
  inviteLabel: { fontFamily: 'Rajdhani, sans-serif', fontSize: 12, fontWeight: 600, color: '#00D4FF', letterSpacing: '0.1em' },
  empty: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#6C757D', textAlign: 'center', padding: 24 },
}
