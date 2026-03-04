import { useState, useEffect, useMemo } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ScriptureBlankTask({ config, taskId, onSuccess, onFail, timeLimit = 45 }) {
  // Config format: verseParts (N+1 strings), blanks (N correct words), distractors (wrong options)
  const verseParts = config?.verseParts ?? ['"For God so loved the ', ', that he gave his one and only Son"']
  const correctBlanks = config?.blanks ?? ['world']
  const distractors = config?.distractors ?? ['earth', 'people']
  const reference = config?.reference ?? 'John 3:16'

  // Shuffle the combined word bank once per task instance
  const wordBank = useMemo(() => shuffle([...correctBlanks, ...distractors]), [taskId])

  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [filled, setFilled] = useState(() => Array(correctBlanks.length).fill(null))
  const [usedWords, setUsedWords] = useState(new Set())
  const [showHint, setShowHint] = useState(false)
  const [done, setDone] = useState(false)
  const [allCorrect, setAllCorrect] = useState(false)
  const [wrongSlots, setWrongSlots] = useState(new Set())

  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { onFail?.(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, done, onFail])

  function placeWord(word) {
    if (done || usedWords.has(word)) return
    const slotIdx = filled.findIndex(f => f === null)
    if (slotIdx === -1) return
    const next = [...filled]
    next[slotIdx] = word
    setFilled(next)
    setUsedWords(prev => new Set([...prev, word]))
  }

  function removeFromSlot(slotIdx) {
    if (done) return
    const word = filled[slotIdx]
    if (!word) return
    const next = [...filled]
    next[slotIdx] = null
    setFilled(next)
    setUsedWords(prev => { const s = new Set(prev); s.delete(word); return s })
    setWrongSlots(prev => { const s = new Set(prev); s.delete(slotIdx); return s })
  }

  function handleSubmit() {
    if (done || filled.some(f => f === null)) return
    const wrongs = new Set()
    filled.forEach((word, i) => {
      if (word?.toLowerCase() !== correctBlanks[i]?.toLowerCase()) wrongs.add(i)
    })
    setDone(true)
    if (wrongs.size === 0) {
      setAllCorrect(true)
      setTimeout(() => onSuccess?.(), 900)
    } else {
      setWrongSlots(wrongs)
      setAllCorrect(false)
      setTimeout(() => onFail?.(), 1600)
    }
  }

  const allFilled = filled.every(f => f !== null)
  const timerColor = timeLeft > 15 ? '#00FF9F' : timeLeft > 6 ? '#FFA63D' : '#FF3366'

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>SCRIPTURE BLANK</span>
        <span style={{ ...styles.timer, color: timerColor }}>{timeLeft}s</span>
      </div>

      {/* Verse with inline blank slots */}
      <div style={styles.scriptureBox}>
        <p style={styles.scriptureText}>
          {verseParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < correctBlanks.length && (
                <span
                  style={{
                    ...styles.slot,
                    borderColor: done
                      ? wrongSlots.has(i) ? '#FF3366' : '#00FF9F'
                      : filled[i] ? '#8B5CF6' : 'rgba(139,92,246,0.4)',
                    color: done
                      ? wrongSlots.has(i) ? '#FF3366' : '#00FF9F'
                      : filled[i] ? '#E9ECEF' : 'rgba(139,92,246,0.45)',
                    cursor: filled[i] && !done ? 'pointer' : 'default',
                  }}
                  onClick={() => removeFromSlot(i)}
                  title={filled[i] && !done ? 'Click to remove' : undefined}
                >
                  {filled[i] ?? '______'}
                </span>
              )}
            </span>
          ))}
        </p>
        <p style={styles.reference}>{reference}</p>
      </div>

      {/* Word bank */}
      {!done && (
        <div style={styles.wordBank}>
          {wordBank.map((word, i) => {
            const used = usedWords.has(word)
            return (
              <button
                key={i}
                style={{ ...styles.wordChip, opacity: used ? 0.25 : 1, cursor: used ? 'default' : 'pointer' }}
                onClick={() => placeWord(word)}
                disabled={used}
              >
                {word}
              </button>
            )
          })}
        </div>
      )}

      {/* Submit */}
      {!done && (
        <button
          style={{ ...styles.submitBtn, opacity: allFilled ? 1 : 0.4, cursor: allFilled ? 'pointer' : 'default' }}
          onClick={handleSubmit}
          disabled={!allFilled}
        >
          SUBMIT
        </button>
      )}

      {/* Hint */}
      {!done && !showHint && (
        <button style={styles.hintBtn} onClick={() => setShowHint(true)}>
          I DON'T KNOW
        </button>
      )}
      {showHint && !done && (
        <div style={styles.hintBox}>
          <p style={styles.hintLabel}>CORRECT WORDS (in order)</p>
          <p style={styles.hintText}>{correctBlanks.join(' · ')}</p>
        </div>
      )}

      {/* Result */}
      {done && allCorrect && <p style={styles.successText}>✓ CORRECT!</p>}
      {done && !allCorrect && (
        <p style={styles.errorText}>✗ Incorrect — answers: {correctBlanks.join(', ')}</p>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '20px 16px',
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
    fontSize: 16,
    color: '#E9ECEF',
    lineHeight: 2,
    fontStyle: 'italic',
    margin: 0,
  },
  slot: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 4,
    borderBottom: '2px solid',
    fontStyle: 'normal',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: '0.04em',
    transition: 'all 0.15s',
    margin: '0 3px',
    verticalAlign: 'middle',
  },
  reference: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 600,
    color: '#8B5CF6',
    letterSpacing: '0.12em',
    marginTop: 10,
    marginBottom: 0,
    opacity: 0.8,
  },
  wordBank: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  wordChip: {
    padding: '8px 16px',
    background: 'rgba(139,92,246,0.12)',
    border: '1.5px solid rgba(139,92,246,0.5)',
    borderRadius: 20,
    color: '#C4B5FD',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    fontWeight: 600,
    transition: 'opacity 0.15s',
    outline: 'none',
    letterSpacing: '0.03em',
  },
  submitBtn: {
    padding: '12px',
    background: 'transparent',
    border: '2px solid #8B5CF6',
    borderRadius: 6,
    color: '#8B5CF6',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    transition: 'opacity 0.15s',
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
    margin: '0 0 4px',
  },
  hintText: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#F8F9FA',
    margin: 0,
  },
  successText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    color: '#00FF9F',
    textShadow: '0 0 12px #00FF9F',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF3366',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    textAlign: 'center',
  },
}
