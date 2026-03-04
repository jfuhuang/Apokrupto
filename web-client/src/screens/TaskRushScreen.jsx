import { useState, useEffect, useRef, useCallback } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { TASKS, MECHANIC } from '../data/tasks.js'
import { submitMovementBTask, submitMovementBFail } from '../utils/api.js'
import RapidTapTask from '../tasks/RapidTapTask.jsx'
import HoldTask from '../tasks/HoldTask.jsx'
import TriviaTask from '../tasks/TriviaTask.jsx'
import ScriptureBlankTask from '../tasks/ScriptureBlankTask.jsx'
import SlingTask from '../tasks/SlingTask.jsx'
import CollectTask from '../tasks/CollectTask.jsx'
import DragPlaceTask from '../tasks/DragPlaceTask.jsx'
import GuardTask from '../tasks/GuardTask.jsx'
import PatienceTask from '../tasks/PatienceTask.jsx'
import BuildTask from '../tasks/BuildTask.jsx'
import BailWaterTask from '../tasks/BailWaterTask.jsx'
import MarchJerichoTask from '../tasks/MarchJerichoTask.jsx'
import FocusTask from '../tasks/FocusTask.jsx'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Build a task queue with uniform mechanic-type distribution.
 * Each "round" picks one random task from each mechanic type (in shuffled type
 * order), so every type appears equally often regardless of how many individual
 * tasks exist per type.
 */
function typeUniformQueue(tasks, rounds = 3) {
  const byType = {}
  for (const t of tasks) {
    const key = t.mechanic || 'unknown'
    if (!byType[key]) byType[key] = []
    byType[key].push(t)
  }
  const types = Object.keys(byType)
  if (types.length === 0) return [...tasks]

  const queue = []
  for (let r = 0; r < rounds; r++) {
    for (const type of shuffle(types)) {
      const pool = byType[type]
      queue.push(pool[Math.floor(Math.random() * pool.length)])
    }
  }
  return queue
}

function TaskRouter({ task, onSuccess, onFail }) {
  if (!task) return null
  const props = { config: task.config, taskId: task.id, onSuccess, onFail, timeLimit: task.timeLimit || 30 }
  switch (task.mechanic) {
    case MECHANIC.RAPID_TAP: return <RapidTapTask {...props} />
    case MECHANIC.HOLD: return <HoldTask {...props} />
    case MECHANIC.TRIVIA: return <TriviaTask {...props} />
    case MECHANIC.SCRIPTURE_BLANK: return <ScriptureBlankTask {...props} />
    case MECHANIC.SLING: return <SlingTask {...props} />
    case MECHANIC.COLLECT: return <CollectTask {...props} />
    case MECHANIC.DRAG_PLACE: return <DragPlaceTask {...props} />
    case MECHANIC.GUARD: return <GuardTask {...props} />
    case MECHANIC.PATIENCE: return <PatienceTask {...props} />
    case MECHANIC.BUILD: return <BuildTask {...props} />
    case MECHANIC.BAIL_WATER: return <BailWaterTask {...props} />
    case MECHANIC.MARCH_JERICHO: return <MarchJerichoTask {...props} />
    case MECHANIC.FOCUS: return <FocusTask {...props} />
    default: return <TriviaTask {...props} />
  }
}

export default function TaskRushScreen({ token, gameId, movementTimeLeft, onBack }) {
  const [queue] = useState(() => typeUniformQueue(TASKS))
  const [taskIndex, setTaskIndex] = useState(0)
  const [result, setResult] = useState(null) // null | 'success' | 'fail'
  const [streak, setStreak] = useState(0)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [showing, setShowing] = useState(true)
  const taskKey = useRef(0)
  // Guards against task components double-firing onSuccess/onFail (e.g. stale
  // state in touch-move event handlers fires the callback multiple times before
  // React re-renders with done=true).
  const advancingRef = useRef(false)

  const currentTask = queue[taskIndex % queue.length]
  const multiplier = Math.min(2, 1 + streak * 0.25)
  const mins = Math.floor((movementTimeLeft || 0) / 60)
  const secs = (movementTimeLeft || 0) % 60

  function advance(isSuccess) {
    if (advancingRef.current) return  // drop duplicate fires from same task
    advancingRef.current = true
    const pts = isSuccess ? Math.round((currentTask.points?.alive || 2) * multiplier) : 0
    const bonusPoints = pts - (currentTask.points?.alive || 2)  // streak increment above base
    setResult(isSuccess ? 'success' : 'fail')
    setStreak(isSuccess ? s => s + 1 : 0)
    setSessionPoints(p => p + pts)
    if (token && gameId) {
      if (isSuccess) {
        submitMovementBTask(token, gameId, currentTask.id, Math.max(0, bonusPoints)).catch(() => {})
      } else {
        submitMovementBFail(token, gameId, currentTask.id).catch(() => {})
      }
    }
    setShowing(false)
    setTimeout(() => {
      setResult(null)
      setTaskIndex(i => i + 1)
      taskKey.current++
      setShowing(true)
      advancingRef.current = false   // allow next task to fire
    }, 400)
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>← BACK</button>
          <div style={styles.timerChip}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <div style={styles.statsChip}>
            <span style={styles.pts}>{sessionPoints} pts</span>
            {streak >= 2 && <span style={styles.streak}>🔥 ×{multiplier.toFixed(2)}</span>}
          </div>
        </div>

        {/* Task info bar */}
        <div style={styles.taskBar}>
          <span style={styles.taskTitle}>{currentTask.title}</span>
          <span style={styles.taskSynopsis}>{currentTask.synopsis}</span>
        </div>

        {/* Result overlay */}
        {result && (
          <div style={{ ...styles.resultOverlay, color: result === 'success' ? '#00FF9F' : '#FF3366' }}>
            {result === 'success' ? '✓ SUCCESS' : '✗ FAILED'}
          </div>
        )}

        {/* Task */}
        {showing && (
          <div style={styles.taskCard} key={taskKey.current}>
            <TaskRouter
              task={currentTask}
              onSuccess={() => advance(true)}
              onFail={() => advance(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', position: 'relative', padding: '16px' },
  inner: { position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { background: 'none', border: 'none', color: '#ADB5BD', fontFamily: 'Rajdhani, sans-serif', fontSize: 13, cursor: 'pointer', padding: 0 },
  timerChip: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#FFA63D' },
  statsChip: { display: 'flex', gap: 8, alignItems: 'center' },
  pts: { fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700, color: '#00FF9F' },
  streak: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#FF9F00' },
  taskBar: { background: 'rgba(31,40,51,0.9)', border: '1px solid rgba(255,166,61,0.2)', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  taskTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700, color: '#FFA63D', letterSpacing: '0.08em' },
  taskSynopsis: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#ADB5BD' },
  resultOverlay: { position: 'absolute', top: 80, left: 0, right: 0, textAlign: 'center', fontFamily: 'Orbitron, sans-serif', fontSize: 28, fontWeight: 700, zIndex: 10, textShadow: '0 0 20px currentColor' },
  taskCard: { background: 'rgba(31,40,51,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden', minHeight: 200 },
}
