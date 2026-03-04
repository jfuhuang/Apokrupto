import { useState, useEffect, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { fetchGameState, submitVotes } from '../utils/api.js'

export default function VotingScreen({
  token,
  gameId,
  currentUserId,
  currentGroupMembers,
  socket,
  onMovementEnd,
}) {
  const [votes, setVotes] = useState({}) // { userId: 'phos'|'skotia' }
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const members = (currentGroupMembers || []).filter(
    (m) => String(m.id) !== String(currentUserId)
  )

  const checkState = useCallback(async () => {
    const res = await fetchGameState(token, gameId)
    if (!res.ok) return
    if (res.data.currentMovement && res.data.currentMovement !== 'C') {
      onMovementEnd(res.data.currentMovement)
    }
  }, [token, gameId, onMovementEnd])

  useEffect(() => {
    checkState()
    const interval = setInterval(checkState, 3000)
    return () => clearInterval(interval)
  }, [checkState])

  useEffect(() => {
    if (!socket) return

    function onMovementStart(data) {
      if (data.movement && data.movement !== 'C') {
        onMovementEnd(data.movement)
      }
    }

    function onVotingComplete(data) {
      setResults(data)
    }

    socket.on('movementStart', onMovementStart)
    socket.on('votingComplete', onVotingComplete)

    return () => {
      socket.off('movementStart', onMovementStart)
      socket.off('votingComplete', onVotingComplete)
    }
  }, [socket, onMovementEnd])

  function toggleVote(userId) {
    if (submitted) return
    setVotes((prev) => {
      const current = prev[userId]
      if (current === 'skotia') {
        const next = { ...prev }
        delete next[userId]
        return next
      }
      return { ...prev, [userId]: 'skotia' }
    })
  }

  async function handleSubmit() {
    setError('')
    // Build votes object: marked = skotia, unmarked = phos
    const votePayload = {}
    members.forEach((m) => {
      votePayload[m.id] = votes[m.id] === 'skotia' ? 'skotia' : 'phos'
    })
    setSubmitting(true)
    const res = await submitVotes(token, gameId, votePayload)
    setSubmitting(false)
    if (!res.ok) return setError(res.data?.error || 'Could not submit votes.')
    setSubmitted(true)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await checkState()
    setRefreshing(false)
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <h2 style={styles.title}>MOVEMENT C</h2>
          <span style={styles.movLabel}>Voting</span>
        </div>

        {!submitted ? (
          <>
            <p style={styles.instruction}>
              Tap a player to mark them as suspected <strong style={{ color: '#FF3366' }}>ΣΚΟΤΊΑ</strong>.
              Leave unmarked if you believe they are <strong style={{ color: '#00D4FF' }}>ΦΩΣ</strong>.
            </p>

            <div style={styles.memberList}>
              {members.map((m) => {
                const isMarkedSkotia = votes[m.id] === 'skotia'
                return (
                  <button
                    key={m.id}
                    style={{
                      ...styles.memberCard,
                      border: isMarkedSkotia
                        ? '2px solid #FF3366'
                        : '1px solid rgba(255,255,255,0.08)',
                      background: isMarkedSkotia
                        ? 'rgba(255,51,102,0.1)'
                        : 'rgba(31,40,51,0.8)',
                      boxShadow: isMarkedSkotia ? '0 0 15px rgba(255,51,102,0.2)' : 'none',
                    }}
                    onClick={() => toggleVote(m.id)}
                  >
                    <div style={styles.memberInfo}>
                      <div style={{
                        ...styles.avatar,
                        background: isMarkedSkotia ? 'rgba(255,51,102,0.2)' : 'rgba(0,212,255,0.1)',
                        border: isMarkedSkotia ? '1px solid rgba(255,51,102,0.4)' : '1px solid rgba(0,212,255,0.2)',
                      }}>
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                      <span style={styles.memberName}>{m.username}</span>
                      {m.isMarked && <span style={styles.currentlyMarked}>SUS</span>}
                    </div>
                    <div style={styles.voteStatus}>
                      {isMarkedSkotia ? (
                        <span style={styles.skotiaBadge}>ΣΚΟΤΊΑ</span>
                      ) : (
                        <span style={styles.phosBadge}>ΦΩΣ</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              style={styles.submitBtn}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT VOTES'}
            </button>
          </>
        ) : (
          <div style={styles.waitingSection}>
            <div style={styles.submittedBadge}>
              <p style={styles.submittedText}>✓ Votes submitted</p>
            </div>
            <p style={styles.waitingText}>Waiting for other group members...</p>
            <button style={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Checking...' : '↻ Check Status'}
            </button>
          </div>
        )}

        {/* Voting results preview */}
        {results && (
          <div style={styles.resultsCard}>
            <p style={styles.resultsTitle}>VOTING RESULTS</p>
            {results.markResults && results.markResults.map((r, i) => (
              <div key={i} style={styles.resultRow}>
                <span style={styles.resultName}>{r.username}</span>
                <span style={{
                  ...styles.resultAction,
                  color: r.action === 'mark' ? '#FF3366' : '#00FF9F',
                }}>
                  {r.action === 'mark' ? '🔴 MARKED' : '🟢 CLEARED'}
                </span>
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
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    fontWeight: 700,
    color: '#FF3366',
  },
  movLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    fontWeight: 600,
    color: '#ADB5BD',
    letterSpacing: '0.1em',
  },
  instruction: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#ADB5BD',
    lineHeight: 1.6,
  },
  memberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  memberCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    width: '100%',
    textAlign: 'left',
  },
  memberInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 16,
    fontWeight: 700,
    color: '#F8F9FA',
    flexShrink: 0,
  },
  memberName: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 16,
    fontWeight: 600,
    color: '#F8F9FA',
  },
  currentlyMarked: {
    background: 'rgba(255,51,102,0.15)',
    border: '1px solid rgba(255,51,102,0.4)',
    borderRadius: 3,
    color: '#FF3366',
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 5px',
    letterSpacing: '0.1em',
  },
  voteStatus: {
    flexShrink: 0,
  },
  skotiaBadge: {
    background: 'rgba(255,51,102,0.2)',
    border: '1px solid rgba(255,51,102,0.5)',
    borderRadius: 4,
    color: '#FF3366',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    letterSpacing: '0.05em',
  },
  phosBadge: {
    background: 'rgba(0,212,255,0.1)',
    border: '1px solid rgba(0,212,255,0.25)',
    borderRadius: 4,
    color: '#00D4FF',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    letterSpacing: '0.05em',
  },
  error: {
    color: '#FF3366',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    textAlign: 'center',
  },
  submitBtn: {
    padding: '14px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.15), rgba(255,51,102,0.05))',
    border: '2px solid #FF3366',
    borderRadius: 6,
    color: '#FF3366',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    boxShadow: '0 0 15px rgba(255,51,102,0.2)',
  },
  waitingSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '32px 16px',
  },
  submittedBadge: {
    background: 'rgba(0,255,159,0.1)',
    border: '1px solid rgba(0,255,159,0.4)',
    borderRadius: 8,
    padding: '12px 24px',
  },
  submittedText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 16,
    fontWeight: 700,
    color: '#00FF9F',
    textShadow: '0 0 10px rgba(0,255,159,0.4)',
  },
  waitingText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#ADB5BD',
    animation: 'pulse 2s infinite',
  },
  refreshBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 4,
    color: '#ADB5BD',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  resultsCard: {
    background: 'rgba(31,40,51,0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    animation: 'fadeIn 0.3s ease-out',
  },
  resultsTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    color: '#ADB5BD',
    letterSpacing: '0.15em',
    marginBottom: 4,
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultName: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#F8F9FA',
  },
  resultAction: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
}
