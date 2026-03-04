import { useState, useEffect, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { fetchGameState } from '../utils/api.js'
import RapidTapTask from '../tasks/RapidTapTask.jsx'
import HoldTask from '../tasks/HoldTask.jsx'
import TriviaTask from '../tasks/TriviaTask.jsx'
import ScriptureBlankTask from '../tasks/ScriptureBlankTask.jsx'

const MOVEMENT_B_DURATION_MS = 3 * 60 * 1000

function TaskRouter({ task, onSuccess, onFail }) {
  if (!task) return null
  const props = { config: task.config, taskId: task.id, onSuccess, onFail, timeLimit: task.timeLimit || 30 }
  switch (task.type) {
    case 'rapid_tap': return <RapidTapTask {...props} />
    case 'hold': return <HoldTask {...props} />
    case 'trivia': return <TriviaTask {...props} />
    case 'scripture_blank': return <ScriptureBlankTask {...props} />
    default: return <TriviaTask {...props} />
  }
}

export default function MovementBScreen({
  token,
  gameId,
  socket,
  onMovementEnd,
}) {
  const [task, setTask] = useState(null)
  const [taskResult, setTaskResult] = useState(null)
  const [timeLeft, setTimeLeft] = useState(MOVEMENT_B_DURATION_MS / 1000)

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
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  useEffect(() => {
    if (!socket) return

    function onMovementStart(data) {
      if (data.movement && data.movement !== 'B') {
        onMovementEnd(data.movement)
      }
    }

    function onTaskAssigned(data) {
      setTask(data)
      setTaskResult(null)
    }

    socket.on('movementStart', onMovementStart)
    socket.on('taskAssigned', onTaskAssigned)

    return () => {
      socket.off('movementStart', onMovementStart)
      socket.off('taskAssigned', onTaskAssigned)
    }
  }, [socket, onMovementEnd])

  function handleTaskSuccess() {
    setTaskResult('success')
    setTask(null)
  }

  function handleTaskFail() {
    setTaskResult('fail')
    setTask(null)
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <h2 style={styles.title}>MOVEMENT B</h2>
          <span style={styles.movLabel}>Challenges</span>
        </div>

        {/* Timer */}
        <div style={styles.timerBox}>
          <p style={styles.timerLabel}>TIME REMAINING</p>
          <p style={styles.timerText}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </p>
        </div>

        {/* Task or waiting */}
        {task ? (
          <div style={styles.taskCard}>
            <TaskRouter task={task} onSuccess={handleTaskSuccess} onFail={handleTaskFail} />
          </div>
        ) : (
          <div style={styles.waitingCard}>
            {taskResult === 'success' && (
              <p style={styles.successText}>✓ Task Completed! Well done.</p>
            )}
            {taskResult === 'fail' && (
              <p style={styles.failText}>✗ Task failed. Better luck next time.</p>
            )}
            {!taskResult && (
              <>
                <div style={styles.waitIcon}>⚡</div>
                <p style={styles.waitTitle}>CHALLENGES STAGE</p>
                <p style={styles.waitSubtitle}>
                  Waiting for task assignment...
                </p>
                <p style={styles.waitHint}>
                  The Game Master will assign tasks when ready.
                </p>
              </>
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
    color: '#FFA63D',
  },
  movLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    fontWeight: 600,
    color: '#ADB5BD',
    letterSpacing: '0.1em',
  },
  timerBox: {
    background: 'rgba(255,166,61,0.08)',
    border: '1px solid rgba(255,166,61,0.3)',
    borderRadius: 8,
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#FFA63D',
    letterSpacing: '0.12em',
  },
  timerText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 24,
    fontWeight: 700,
    color: '#FFA63D',
    textShadow: '0 0 10px rgba(255,166,61,0.4)',
  },
  taskCard: {
    background: 'rgba(31,40,51,0.9)',
    border: '1px solid rgba(0,212,255,0.2)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  waitingCard: {
    background: 'rgba(31,40,51,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    textAlign: 'center',
  },
  waitIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  waitTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 16,
    fontWeight: 700,
    color: '#FFA63D',
    letterSpacing: '0.1em',
  },
  waitSubtitle: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#F8F9FA',
    animation: 'pulse 2s infinite',
  },
  waitHint: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 12,
    color: '#6C757D',
  },
  successText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    color: '#00FF9F',
    textShadow: '0 0 12px #00FF9F',
  },
  failText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    color: '#FF3366',
    textShadow: '0 0 12px #FF3366',
  },
}
