import { useState, useEffect, useRef, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import SketchCanvas from '../components/SketchCanvas.jsx'
import { fetchMovementAPrompt, submitMovementAWord, submitMovementASketch, fetchGameState } from '../utils/api.js'

function SketchThumbnail({ sketchData, size = 120, isMe }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sketchData?.strokes) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#00D4FF'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    sketchData.strokes.forEach(stroke => {
      if (stroke.length < 2) return
      ctx.beginPath()
      ctx.moveTo(stroke[0][0], stroke[0][1])
      stroke.slice(1).forEach(([x, y]) => ctx.lineTo(x, y))
      ctx.stroke()
    })
  }, [sketchData])
  return (
    <canvas
      ref={canvasRef}
      width={400} height={400}
      style={{ width: size, height: size, border: `2px solid ${isMe ? '#00D4FF' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, background: '#1F2833' }}
    />
  )
}

export default function MovementAScreen({
  token,
  gameId,
  currentUserId,
  currentGroupId,
  currentGroupMembers,
  lobbyId,
  socket,
  onMovementEnd,
}) {
  const [prompt, setPrompt] = useState(null)
  const [themeLabel, setThemeLabel] = useState('')
  const [promptMode, setPromptMode] = useState('word') // 'word' | 'sketch'
  const [word, setWord] = useState('')
  const [phase, setPhase] = useState('waiting') // 'waiting' | 'my_turn' | 'deliberation'
  const [words, setWords] = useState([])
  const [sketches, setSketches] = useState([])
  const [currentPlayerId, setCurrentPlayerId] = useState(null)
  const [currentPlayerName, setCurrentPlayerName] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitMsg, setSubmitMsg] = useState('')
  const timerRef = useRef(null)
  const sketchRef = useRef(null)

  const loadPrompt = useCallback(async () => {
    const res = await fetchMovementAPrompt(token, gameId)
    if (res.ok) {
      setPrompt(res.data.prompt)
      setThemeLabel(res.data.themeLabel || '')
      setPromptMode(res.data.promptMode || 'word')
      setTotalCount(res.data.totalCount || 0)
      setCompletedCount(res.data.completedCount || 0)
    }
  }, [token, gameId])

  useEffect(() => {
    loadPrompt()
  }, [loadPrompt])

  // Safety-net poll
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetchGameState(token, gameId)
      if (res.ok && res.data.currentMovement && res.data.currentMovement !== 'A') {
        onMovementEnd(res.data.currentMovement)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [token, gameId, onMovementEnd])

  // Timer for active turn
  useEffect(() => {
    if (phase !== 'my_turn') {
      clearInterval(timerRef.current)
      return
    }
    setTimeLeft(30)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  useEffect(() => {
    if (!socket) return

    // Join group room and lobby room
    if (currentGroupId) socket.emit('joinRoom', { lobbyId: currentGroupId })
    if (lobbyId) socket.emit('joinRoom', { lobbyId })

    function onTurnStart(data) {
      setCurrentPlayerId(data.currentPlayerId)
      setCompletedCount(data.completedCount || 0)
      // Find name
      const member = currentGroupMembers?.find((m) => String(m.id) === String(data.currentPlayerId))
      setCurrentPlayerName(member?.username || 'Unknown')

      if (String(data.currentPlayerId) === String(currentUserId)) {
        setPhase('my_turn')
        setWord('')
      } else {
        setPhase('waiting')
      }
    }

    function onDeliberationStart(data) {
      setPhase('deliberation')
      setWords(data.words || [])
      setSketches(data.sketches || [])
      clearInterval(timerRef.current)
    }

    function onMovementStart(data) {
      if (data.movement && data.movement !== 'A') {
        onMovementEnd(data.movement)
      }
    }

    socket.on('turnStart', onTurnStart)
    socket.on('deliberationStart', onDeliberationStart)
    socket.on('movementStart', onMovementStart)

    return () => {
      socket.off('turnStart', onTurnStart)
      socket.off('deliberationStart', onDeliberationStart)
      socket.off('movementStart', onMovementStart)
    }
  }, [socket, currentGroupId, lobbyId, currentUserId, currentGroupMembers, onMovementEnd])

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    let res
    if (promptMode === 'sketch') {
      const sketchData = sketchRef.current?.getSketchData() || { strokes: [] }
      res = await submitMovementASketch(token, gameId, sketchData)
    } else {
      if (!word.trim()) { setSubmitting(false); return }
      res = await submitMovementAWord(token, gameId, word.trim())
    }
    setSubmitting(false)
    if (!res.ok) {
      setError(res.data?.error || 'Could not submit.')
    } else {
      setSubmitMsg(promptMode === 'sketch' ? 'Sketch submitted! Waiting...' : 'Word submitted! Waiting...')
      setPhase('waiting')
      setWord('')
      sketchRef.current?.clear()
    }
  }

  const timerColor = timeLeft > 10 ? '#00FF9F' : timeLeft > 5 ? '#FFA63D' : '#FF3366'

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <h2 style={styles.title}>MOVEMENT A</h2>
          <span style={styles.movLabel}>Social Deduction</span>
        </div>

        {/* Theme + Prompt */}
        {prompt && (
          <div style={styles.promptCard}>
            {themeLabel && <p style={styles.themeLabel}>{themeLabel}</p>}
            <p style={styles.promptText}>{prompt}</p>
          </div>
        )}

        {/* Progress */}
        {totalCount > 0 && (
          <div style={styles.progressRow}>
            <span style={styles.progressText}>
              {completedCount}/{totalCount} submitted
            </span>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${(completedCount / totalCount) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Turn status */}
        {phase === 'waiting' && !submitMsg && currentPlayerId && (
          <div style={styles.statusBox}>
            <p style={styles.statusText}>
              Waiting for <strong style={{ color: '#00D4FF' }}>{currentPlayerName}</strong>...
            </p>
          </div>
        )}

        {submitMsg && phase === 'waiting' && (
          <div style={{ ...styles.statusBox, borderColor: 'rgba(0,255,159,0.3)' }}>
            <p style={{ ...styles.statusText, color: '#00FF9F' }}>{submitMsg}</p>
          </div>
        )}

        {/* My turn */}
        {phase === 'my_turn' && (
          <div style={styles.myTurnCard}>
            <div style={styles.timerRow}>
              <span style={styles.yourTurnLabel}>YOUR TURN</span>
              <span style={{ ...styles.timer, color: timerColor }}>{timeLeft}s</span>
            </div>
            {promptMode === 'sketch' ? (
              <>
                <SketchCanvas
                  ref={sketchRef}
                  strokeColor="#00D4FF"
                  strokeWidth={3}
                  style={{ width: '100%', height: 280, background: 'rgba(0,0,0,0.4)', borderRadius: 4, border: '1px solid rgba(0,212,255,0.4)' }}
                />
                <button
                  style={{ ...styles.submitBtn, marginTop: 4, background: 'rgba(255,255,255,0.05)', color: '#ADB5BD', border: '1px solid rgba(255,255,255,0.15)', fontSize: 11 }}
                  onClick={() => sketchRef.current?.clear()}
                >
                  CLEAR
                </button>
              </>
            ) : (
              <input
                style={styles.wordInput}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your word..."
                autoFocus
                maxLength={30}
              />
            )}
            {error && <p style={styles.error}>{error}</p>}
            <button
              style={styles.submitBtn}
              onClick={handleSubmit}
              disabled={submitting || (promptMode === 'word' && !word.trim()) || timeLeft === 0}
            >
              {submitting ? 'SUBMITTING...' : promptMode === 'sketch' ? 'SUBMIT SKETCH' : 'SUBMIT WORD'}
            </button>
          </div>
        )}

        {/* Deliberation */}
        {phase === 'deliberation' && (
          <div style={styles.deliberationCard}>
            <p style={styles.deliberationTitle}>DELIBERATION</p>
            <p style={styles.deliberationSub}>Discuss with your group — who is ΣΚΟΤΊΑ?</p>
            {sketches.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, justifyContent: 'center' }}>
                {sketches.map((s, i) => {
                  let parsed = null
                  try { parsed = typeof s.sketchData === 'string' ? JSON.parse(s.sketchData) : s.sketchData } catch (e) {
                    console.warn('Failed to parse sketchData:', e)
                  }
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <SketchThumbnail
                        sketchData={parsed}
                        size={120}
                        isMe={String(s.userId) === String(currentUserId)}
                      />
                      <span style={{ fontFamily: 'Exo 2, sans-serif', fontSize: 11, color: '#ADB5BD' }}>
                        {s.username}{String(s.userId) === String(currentUserId) ? ' (you)' : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={styles.wordList}>
                {words.map((w, i) => (
                  <div key={i} style={styles.wordChip}>{w}</div>
                ))}
              </div>
            )}
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
    color: '#00D4FF',
  },
  movLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    fontWeight: 600,
    color: '#ADB5BD',
    letterSpacing: '0.1em',
  },
  promptCard: {
    background: 'rgba(31,40,51,0.9)',
    border: '1px solid rgba(0,212,255,0.3)',
    borderRadius: 8,
    padding: '20px 20px',
    boxShadow: '0 0 20px rgba(0,212,255,0.08)',
  },
  themeLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#00D4FF',
    letterSpacing: '0.15em',
    marginBottom: 8,
  },
  promptText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 16,
    color: '#F8F9FA',
    lineHeight: 1.5,
  },
  progressRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  progressText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 12,
    color: '#ADB5BD',
  },
  progressBar: {
    height: 4,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00D4FF, #8B5CF6)',
    borderRadius: 2,
    transition: 'width 0.3s',
  },
  statusBox: {
    background: 'rgba(31,40,51,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '16px',
    textAlign: 'center',
  },
  statusText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 15,
    color: '#ADB5BD',
    animation: 'pulse 2s infinite',
  },
  myTurnCard: {
    background: 'rgba(0,212,255,0.05)',
    border: '2px solid rgba(0,212,255,0.4)',
    borderRadius: 8,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 0 20px rgba(0,212,255,0.1)',
  },
  timerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yourTurnLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    color: '#00D4FF',
    letterSpacing: '0.1em',
  },
  timer: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 22,
    fontWeight: 700,
    transition: 'color 0.3s',
  },
  wordInput: {
    background: 'rgba(11,12,16,0.8)',
    border: '1px solid rgba(0,212,255,0.4)',
    borderRadius: 4,
    padding: '12px 14px',
    color: '#F8F9FA',
    fontSize: 18,
    outline: 'none',
    letterSpacing: '0.05em',
  },
  error: {
    color: '#FF3366',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    textAlign: 'center',
  },
  submitBtn: {
    padding: '12px',
    background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.05))',
    border: '2px solid #00D4FF',
    borderRadius: 4,
    color: '#00D4FF',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.12em',
    cursor: 'pointer',
  },
  deliberationCard: {
    background: 'rgba(139,92,246,0.05)',
    border: '2px solid rgba(139,92,246,0.4)',
    borderRadius: 8,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 0 20px rgba(139,92,246,0.1)',
  },
  deliberationTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 16,
    fontWeight: 700,
    color: '#8B5CF6',
    letterSpacing: '0.1em',
  },
  deliberationSub: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    color: '#ADB5BD',
  },
  wordList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  wordChip: {
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid rgba(139,92,246,0.4)',
    borderRadius: 20,
    padding: '6px 16px',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#F8F9FA',
    fontWeight: 500,
  },
}
