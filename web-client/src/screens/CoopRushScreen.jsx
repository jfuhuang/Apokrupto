import { useState, useEffect, useRef, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { COOP_TASK_LABELS, COOP_TASK_ICONS } from '../data/coopTasks.js'
import DeceptionTask from '../tasks/coop/DeceptionTask.jsx'
import SecretBallotTask from '../tasks/coop/SecretBallotTask.jsx'
import CoopTapTask from '../tasks/coop/CoopTapTask.jsx'
import CoopHoldTask from '../tasks/coop/CoopHoldTask.jsx'
import SimonSaysTask from '../tasks/coop/SimonSaysTask.jsx'

function CoopTaskRouter({ task, role, currentTeam, onAction, update, simonPatterns }) {
  if (!task) return null
  const key = task.taskId || task.taskType
  const props = { task, role, currentTeam, onAction, update }
  switch (task.taskType) {
    case 'deception':       return <DeceptionTask key={key} {...props} />
    case 'secret_ballot':   return <SecretBallotTask key={key} {...props} />
    case 'coop_tap':        return <CoopTapTask key={key} {...props} />
    case 'coop_hold':       return <CoopHoldTask key={key} {...props} />
    case 'simon_says':      return <SimonSaysTask key={key} {...props} simonPatterns={simonPatterns} />
    default:                return <CoopTapTask key={key} {...props} />
  }
}

export default function CoopRushScreen({
  token,
  gameId,
  sessionId,
  partnerUsername,
  role: initialRole,
  currentTeam,
  initialTask,
  movementTimeLeft,
  socket,
  onEnd,
}) {
  const [task, setTask] = useState(initialTask)
  const [myRole, setMyRole] = useState(initialRole)
  const [taskUpdate, setTaskUpdate] = useState(null)
  const [simonPatterns, setSimonPatterns] = useState(null)
  const [sessionPoints, setSessionPoints] = useState(0)
  const sessionPointsRef = useRef(0)
  const [showResult, setShowResult] = useState(false)
  const sessionEndedRef = useRef(false)
  const [timeLeft, setTimeLeft] = useState(movementTimeLeft || 180)

  const teamColor = currentTeam === 'skotia' ? '#FF3366' : '#00D4FF'
  const taskType = task?.taskType
  const taskLabel = COOP_TASK_LABELS[taskType] || 'TASK'
  const taskIcon = COOP_TASK_ICONS[taskType] || '❓'

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  // Timer expiry → end session
  useEffect(() => {
    if (timeLeft <= 0 && !sessionEndedRef.current) {
      sessionEndedRef.current = true
      onEnd({ reason: 'movementEnd', sessionPoints: sessionPointsRef.current, teamPoints: null })
    }
  }, [timeLeft, onEnd])

  // Socket events — matches mobile CoopRushScreen protocol
  useEffect(() => {
    if (!socket) return

    // Rejoin room on reconnect
    if (sessionId) {
      socket.emit('coopRejoin', { sessionId }, (res) => {
        if (res?.error) console.warn('[CoopRush] Rejoin error:', res.error)
      })
    }

    function onTaskUpdate(data) {
      if (data.sessionId !== sessionId) return
      setTaskUpdate(data)
    }

    function onSimonPatterns(data) {
      if (data.sessionId !== sessionId) return
      setSimonPatterns({ phosPattern: data.phosPattern, skotiaPattern: data.skotiaPattern })
    }

    function onNextTask(data) {
      if (data.sessionId !== sessionId) return
      if (data.role) setMyRole(data.role)
      setTask(data.task)
      setTaskUpdate(null)
      setSimonPatterns(null)
      setSessionPoints(data.sessionPoints || 0)
      sessionPointsRef.current = data.sessionPoints || 0
      setShowResult(true)
      setTimeout(() => setShowResult(false), 1000)
    }

    function onSessionEnd(data) {
      if (data.sessionId !== sessionId) return
      if (sessionEndedRef.current) return
      sessionEndedRef.current = true
      onEnd({ reason: data.reason, sessionPoints: data.sessionPoints, teamPoints: data.teamPoints })
    }

    function onMovementStart(data) {
      if (data.movement && data.movement !== 'B') {
        if (sessionEndedRef.current) return
        sessionEndedRef.current = true
        onEnd({ reason: 'movementEnd', sessionPoints: sessionPointsRef.current, teamPoints: null })
      }
    }

    socket.on('coopTaskUpdate', onTaskUpdate)
    socket.on('coopSimonPatterns', onSimonPatterns)
    socket.on('coopNextTask', onNextTask)
    socket.on('coopSessionEnd', onSessionEnd)
    socket.on('movementStart', onMovementStart)

    return () => {
      socket.off('coopTaskUpdate', onTaskUpdate)
      socket.off('coopSimonPatterns', onSimonPatterns)
      socket.off('coopNextTask', onNextTask)
      socket.off('coopSessionEnd', onSessionEnd)
      socket.off('movementStart', onMovementStart)
    }
  }, [socket, sessionId, onEnd])

  // Action handler — matches server's { sessionId, action, data } format
  const handleAction = useCallback((action, data) => {
    if (!socket) return
    socket.emit('coopAction', { sessionId, action, data }, (res) => {
      if (res?.error) console.warn('[CoopRush] Action error:', res.error)
    })
  }, [socket, sessionId])

  // Exit
  function handleExit() {
    if (socket) {
      socket.emit('coopExit', { sessionId }, () => {})
    }
    if (sessionEndedRef.current) return
    sessionEndedRef.current = true
    onEnd({ reason: 'exit', sessionPoints: sessionPointsRef.current, teamPoints: null })
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timerUrgent = timeLeft <= 30

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        {/* HUD */}
        <div style={styles.hud}>
          <div style={styles.hudLeft}>
            <span style={styles.hudIcon}>{taskIcon}</span>
            <div>
              <span style={{ ...styles.hudTaskLabel, color: teamColor }}>{taskLabel}</span>
              <br />
              <span style={styles.hudPartner}>w/ {partnerUsername} · Role {myRole}</span>
            </div>
          </div>
          <div style={styles.hudRight}>
            <button style={styles.exitBtn} onClick={handleExit}>EXIT</button>
          </div>
        </div>

        {/* Timer */}
        <div style={styles.timerBarTrack}>
          <div style={{ ...styles.timerBarFill, width: `${(timeLeft / 180) * 100}%`, background: timerUrgent ? '#FF3366' : '#00D4FF' }} />
        </div>
        <span style={{ ...styles.timerText, color: timerUrgent ? '#FF3366' : '#F8F9FA' }}>
          {mins}:{String(secs).padStart(2, '0')}
        </span>

        {/* Result overlay */}
        {showResult && (
          <div style={{ ...styles.resultOverlay, color: teamColor }}>NEXT TASK!</div>
        )}

        {/* Task card */}
        <div style={styles.taskCard}>
          <CoopTaskRouter
            task={task}
            role={myRole}
            currentTeam={currentTeam}
            onAction={handleAction}
            update={taskUpdate}
            simonPatterns={simonPatterns}
          />
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', position: 'relative', padding: '16px' },
  inner: { position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 },
  hud: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  hudLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  hudIcon: { fontSize: 24 },
  hudTaskLabel: { fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em' },
  hudPartner: { fontFamily: 'Exo 2, sans-serif', fontSize: 11, color: '#6C757D' },
  hudRight: { display: 'flex', alignItems: 'center', gap: 14 },
  exitBtn: { background: 'none', border: 'none', fontFamily: 'Orbitron, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#FF3366', cursor: 'pointer' },
  timerBarTrack: { height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  timerBarFill: { height: '100%', transition: 'width 1s linear' },
  timerText: { fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 700, textAlign: 'center', padding: '4px 0' },
  resultOverlay: { position: 'absolute', top: 80, left: 0, right: 0, textAlign: 'center', fontFamily: 'Orbitron, sans-serif', fontSize: 28, fontWeight: 700, zIndex: 10, textShadow: '0 0 20px currentColor', animation: 'fadeIn 0.3s ease-out', pointerEvents: 'none' },
  taskCard: { background: 'rgba(31,40,51,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden', minHeight: 200 },
}
