import { useState, useEffect } from 'react'

export default function ScriptureBlankTask({ config, taskId, onSuccess, onFail, timeLimit = 30 }) {
  const before = config?.before ?? '"For God so loved the'
  const after = config?.after ?? 'that he gave his one and only Son"'
  const answer = config?.answer ?? 'world'
  const hint = config?.hint ?? `Starts with "${answer[0]}"`

  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [input, setInput] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [done, setDone] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail?.(); return }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done, onFail])

  function handleSubmit() {
    if (!input.trim() || done) return
    const isCorrect = input.trim().toLowerCase() === answer.toLowerCase()
    setDone(true)
    setCorrect(isCorrect)
    if (isCorrect) {
      setTimeout(() => onSuccess?.(), 800)
    } else {
      setError(`Incorrect. The answer was "${answer}"`)
      setTimeout(() => onFail?.(), 1500)
    }
  }

  const timerColor = timeLeft > 10 ? '#00FF9F' : timeLeft > 5 ? '#FFA63D' : '#FF3366'

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>SCRIPTURE BLANK</span>
        <span style={{ ...styles.timer, color: timerColor }}>{timeLeft}s</span>
      </div>

      <div style={styles.scriptureBox}>
        <p style={styles.scriptureText}>
          {before}&nbsp;
          <span style={{
            ...styles.blank,
            borderColor: done ? (correct ? '#00FF9F' : '#FF3366') : '#8B5CF6',
            color: done ? (correct ? '#00FF9F' : '#FF3366') : '#8B5CF6',
          }}>
            {done ? (input.trim() || '___') : (input.trim() || '______')}
          </span>
          &nbsp;{after}
        </p>
      </div>

      {!done && (
        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Fill in the blank..."
            autoFocus
          />
          <button style={styles.submitBtn} onClick={handleSubmit}>SUBMIT</button>
        </div>
      )}

      {!done && !showHint && (
        <button style={styles.hintBtn} onClick={() => setShowHint(true)}>
          I DON'T KNOW
        </button>
      )}

      {showHint && !done && (
        <div style={styles.hintBox}>
          <p style={styles.hintLabel}>HINT</p>
          <p style={styles.hintText}>{hint}</p>
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}
      {done && correct && <p style={styles.successText}>✓ CORRECT!</p>}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: '24px 16px',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    color: '#8B5CF6',
    letterSpacing: '0.1em',
  },
  timer: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    fontWeight: 700,
  },
  scriptureBox: {
    background: 'rgba(139,92,246,0.05)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 8,
    padding: '16px 20px',
  },
  scriptureText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 17,
    color: '#E9ECEF',
    lineHeight: 1.8,
    fontStyle: 'italic',
  },
  blank: {
    display: 'inline-block',
    minWidth: 80,
    padding: '2px 8px',
    borderBottom: '2px solid',
    fontStyle: 'normal',
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    background: 'rgba(11,12,16,0.8)',
    border: '1px solid rgba(139,92,246,0.4)',
    borderRadius: 4,
    padding: '10px 14px',
    color: '#F8F9FA',
    fontSize: 16,
    outline: 'none',
  },
  submitBtn: {
    padding: '10px 16px',
    background: 'transparent',
    border: '2px solid #8B5CF6',
    borderRadius: 4,
    color: '#8B5CF6',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.08em',
  },
  hintBtn: {
    padding: '10px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 4,
    color: '#ADB5BD',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    cursor: 'pointer',
  },
  hintBox: {
    background: 'rgba(255,166,61,0.1)',
    border: '1px solid rgba(255,166,61,0.4)',
    borderRadius: 6,
    padding: '12px 16px',
  },
  hintLabel: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#FFA63D',
    letterSpacing: '0.15em',
    marginBottom: 4,
  },
  hintText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#F8F9FA',
  },
  error: {
    color: '#FF3366',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    textAlign: 'center',
  },
  successText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    color: '#00FF9F',
    textShadow: '0 0 12px #00FF9F',
    textAlign: 'center',
  },
}
