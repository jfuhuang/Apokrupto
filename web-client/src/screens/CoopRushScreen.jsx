import { useState, useEffect } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import DeceptionTask from '../tasks/coop/DeceptionTask.jsx'
import SecretBallotTask from '../tasks/coop/SecretBallotTask.jsx'
import CoopTapTask from '../tasks/coop/CoopTapTask.jsx'
import CoopHoldTask from '../tasks/coop/CoopHoldTask.jsx'
import SimonSaysTask from '../tasks/coop/SimonSaysTask.jsx'

function CoopTaskRouter({ task, role, currentTeam, onAction, update }) {
  if (!task) return null
  const props = { task, role, currentTeam, onAction, update }
  switch (task.taskType) {
    case 'deception': return <DeceptionTask {...props} />
    case 'secret_ballot': return <SecretBallotTask {...props} />
    case 'coop_tap': return <CoopTapTask {...props} />
    case 'coop_hold': return <CoopHoldTask {...props} />
    case 'simon_says': return <SimonSaysTask {...props} />
    default: return <CoopTapTask {...props} />
  }
}

export default function CoopRushScreen({ token, gameId, sessionId, partnerUsername, role, currentTeam, initialTask, movementTimeLeft, socket, onEnd }) {
  const [task, setTask] = useState(initialTask)
  const [taskUpdate, setTaskUpdate] = useState(null)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [result, setResult] = useState(null)

  const mins = Math.floor((movementTimeLeft || 0) / 60)
  const secs = (movementTimeLeft || 0) % 60

  useEffect(() => {
    if (!socket) return

    socket.emit('joinRoom', { lobbyId: `coop:${sessionId}` })

    function onTaskUpdate(data) {
      setTaskUpdate(data)
    }

    function onNextTask(data) {
      setResult(data.success ? 'success' : 'fail')
      setSessionPoints(p => p + (data.pointsEarned || 0))
      setTimeout(() => {
        setTask(data.nextTask)
        setTaskUpdate(null)
        setResult(null)
      }, 600)
    }

    function onSessionEnd(data) {
      onEnd(data)
    }

    socket.on('coopTaskUpdate', onTaskUpdate)
    socket.on('coopNextTask', onNextTask)
    socket.on('coopSessionEnd', onSessionEnd)

    return () => {
      socket.off('coopTaskUpdate', onTaskUpdate)
      socket.off('coopNextTask', onNextTask)
      socket.off('coopSessionEnd', onSessionEnd)
    }
  }, [socket, sessionId, onEnd])

  function handleAction(payload) {
    socket?.emit('coopAction', { sessionId, ...payload })
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <div style={styles.partnerChip}>🤝 {partnerUsername}</div>
          <span style={styles.timer}>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
          <span style={styles.pts}>{sessionPoints} pts</span>
        </div>

        {task && (
          <div style={styles.taskBar}>
            <span style={styles.taskTitle}>{task.title}</span>
            <span style={styles.roleLabel}>{role === 'A' ? '🅰 Role A' : '🅱 Role B'}</span>
          </div>
        )}

        {result && (
          <div style={{ ...styles.resultOverlay, color: result === 'success' ? '#00FF9F' : '#FF3366' }}>
            {result === 'success' ? '✓ SUCCESS' : '✗ FAILED'}
          </div>
        )}

        <div style={styles.taskCard}>
          <CoopTaskRouter
            task={task}
            role={role}
            currentTeam={currentTeam}
            onAction={handleAction}
            update={taskUpdate}
          />
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', position: 'relative', padding: '16px' },
  inner: { position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  partnerChip: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#00D4FF' },
  timer: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#FFA63D' },
  pts: { fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700, color: '#00FF9F' },
  taskBar: { background: 'rgba(31,40,51,0.9)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700, color: '#00D4FF' },
  roleLabel: { fontFamily: 'Rajdhani, sans-serif', fontSize: 12, fontWeight: 600, color: '#ADB5BD' },
  resultOverlay: { textAlign: 'center', fontFamily: 'Orbitron, sans-serif', fontSize: 28, fontWeight: 700, textShadow: '0 0 20px currentColor' },
  taskCard: { background: 'rgba(31,40,51,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden', minHeight: 200 },
}
