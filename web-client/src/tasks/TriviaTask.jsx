import { useState, useEffect } from 'react'

export default function TriviaTask({ config, taskId, onSuccess, onFail, timeLimit = 30 }) {
  const question = config?.question ?? 'Who built the ark?'
  const options = config?.options ?? ['Noah', 'Moses', 'Abraham', 'David']
  // Support both `answerIndex` (task data format) and legacy `answer` string.
  // Validate that answerIndex is within bounds before using it.
  const answer = (() => {
    const opts = config?.options ?? options
    if (config?.answerIndex != null && config.answerIndex >= 0 && config.answerIndex < opts.length) {
      return opts[config.answerIndex]
    }
    return config?.answer ?? 'Noah'
  })()

  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(false)
  const [correct, setCorrect] = useState(false)

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail?.(); return }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done, onFail])

  function handleSelect(opt) {
    if (done) return
    setSelected(opt)
    setDone(true)
    if (opt === answer) {
      setCorrect(true)
      setTimeout(() => onSuccess?.(), 800)
    } else {
      setCorrect(false)
      setTimeout(() => onFail?.(), 800)
    }
  }

  const timerColor = timeLeft > 10 ? '#00FF9F' : timeLeft > 5 ? '#FFA63D' : '#FF3366'

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>TRIVIA</span>
        <span style={{ ...styles.timer, color: timerColor }}>{timeLeft}s</span>
      </div>
      <p style={styles.question}>{question}</p>
      <div style={styles.options}>
        {options.map((opt, i) => {
          let borderColor = 'rgba(255,255,255,0.12)'
          let color = '#F8F9FA'
          let bg = 'rgba(11,12,16,0.8)'
          if (done && selected === opt) {
            borderColor = correct ? '#00FF9F' : '#FF3366'
            color = correct ? '#00FF9F' : '#FF3366'
            bg = correct ? 'rgba(0,255,159,0.1)' : 'rgba(255,51,102,0.1)'
          } else if (done && opt === answer) {
            borderColor = '#00FF9F'
            color = '#00FF9F'
            bg = 'rgba(0,255,159,0.05)'
          }
          return (
            <button
              key={i}
              style={{ ...styles.optionBtn, border: `1px solid ${borderColor}`, color, background: bg }}
              onClick={() => handleSelect(opt)}
              disabled={done}
            >
              <span style={styles.optionLetter}>{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          )
        })}
      </div>
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
    fontSize: 14,
    fontWeight: 700,
    color: '#FFA63D',
    letterSpacing: '0.1em',
  },
  timer: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    fontWeight: 700,
  },
  question: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 17,
    color: '#F8F9FA',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  optionBtn: {
    padding: '12px 16px',
    borderRadius: 4,
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 15,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    transition: 'all 0.2s',
  },
  optionLetter: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    color: 'inherit',
    opacity: 0.7,
    minWidth: 20,
  },
}
