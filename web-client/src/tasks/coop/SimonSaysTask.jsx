/**
 * SimonSaysTask — Co-op colour-sequence task matching the mobile client protocol.
 *
 * PLAYER B (Reader): sees both colour patterns, picks one to communicate verbally.
 * PLAYER A (Tapper): taps colours in the order spoken. Auto-submits when full.
 *
 * Server protocol:
 * - selectPattern { team }          → Player B picks phos/skotia
 * - tapColor { color }              → Player A taps a colour
 * - clearInput {}                   → Player A clears sequence
 * - submitSequence { sequence }     → Player A submits (auto on full)
 *
 * Server updates:
 * - patternLocked { pattern, team } → sent to B after selectPattern
 * - inputReady { sequenceLength }   → sent to A after selectPattern
 * - inputProgress { inputSequence } → sent to A after tapColor
 * - resolved { success, pointsAwarded, inputSequence, phosPattern, skotiaPattern }
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const COLOR_HEX = { red: '#FF4444', yellow: '#FFD700', green: '#44CC88', blue: '#44AAFF' }
const COLOR_LABEL = { red: 'RED', yellow: 'YLW', green: 'GRN', blue: 'BLU' }
const GRID_ROWS = [['red', 'yellow'], ['green', 'blue']]

function ColorGrid({ highlighted, onPress, disabled }) {
  return (
    <div style={styles.grid}>
      {GRID_ROWS.map((row, ri) => (
        <div key={ri} style={styles.gridRow}>
          {row.map(color => {
            const isLit = highlighted === color
            return (
              <button
                key={color}
                style={{
                  ...styles.gridCell,
                  background: isLit ? COLOR_HEX[color] : `${COLOR_HEX[color]}30`,
                  borderColor: isLit ? COLOR_HEX[color] : `${COLOR_HEX[color]}60`,
                  boxShadow: isLit ? `0 0 14px ${COLOR_HEX[color]}` : 'none',
                }}
                onClick={() => onPress && onPress(color)}
                disabled={disabled || !onPress}
              >
                <span style={{ ...styles.gridLabel, color: isLit ? '#0B0C10' : COLOR_HEX[color] }}>
                  {COLOR_LABEL[color]}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function PatternDots({ pattern, highlightIndex }) {
  return (
    <div style={styles.patternRow}>
      {(pattern || []).map((c, i) => {
        const active = highlightIndex == null || highlightIndex === i
        return (
          <div
            key={i}
            style={{
              ...styles.dot,
              background: COLOR_HEX[c] ?? '#333',
              opacity: active ? 1 : 0.25,
              transform: highlightIndex === i ? 'scale(1.35)' : 'scale(1)',
              boxShadow: active ? `0 0 6px ${COLOR_HEX[c]}` : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

function PatternCard({ team, pattern, onSelect, disabled }) {
  const teamColor = team === 'phos' ? '#00D4FF' : '#FF3366'
  const teamLabel = team === 'phos' ? 'ΦΩΣ' : 'ΣΚΟΤΊΑ'
  const teamDesc = team === 'phos' ? 'Scores PHOS points' : 'Scores SKOTIA points'

  return (
    <div style={{ ...styles.patternCard, borderColor: teamColor }}>
      <span style={{ ...styles.patternCardTeam, color: teamColor }}>{teamLabel}</span>
      <span style={styles.patternCardDesc}>{teamDesc}</span>
      <PatternDots pattern={pattern} />
      <div style={styles.colorWordRow}>
        {(pattern || []).map((c, i) => (
          <span key={i} style={{ ...styles.colorWord, color: COLOR_HEX[c] }}>
            {i + 1}.{COLOR_LABEL[c]}
          </span>
        ))}
      </div>
      <button
        style={{ ...styles.selectBtn, background: teamColor, opacity: disabled ? 0.5 : 1 }}
        onClick={() => !disabled && onSelect(team)}
        disabled={disabled}
      >
        TELL PARTNER THIS ONE
      </button>
    </div>
  )
}

export default function SimonSaysTask({ task, role, onAction, update, simonPatterns }) {
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [lockedPattern, setLockedPattern] = useState(null)
  const [animStep, setAnimStep] = useState(0)
  const animTimerRef = useRef(null)

  const [inputReady, setInputReady] = useState(false)
  const [inputSeq, setInputSeq] = useState([])
  const [submitted, setSubmitted] = useState(false)

  const seqLen = task?.config?.sequenceLength ?? 4

  // Handle server → client updates
  useEffect(() => {
    if (!update) return
    if (update.phase === 'patternLocked' && role === 'B') {
      setLockedPattern(update.pattern ?? [])
    }
    if (update.phase === 'inputReady' && role === 'A') {
      setInputReady(true)
      setInputSeq([])
    }
    if (update.phase === 'inputProgress' && role === 'A') {
      setInputReady(true)
      setInputSeq(update.inputSequence ?? [])
    }
  }, [update, role])

  // Flash animation for Player B
  useEffect(() => {
    if (role !== 'B' || !lockedPattern || lockedPattern.length === 0) return
    let step = 0
    setAnimStep(0)
    animTimerRef.current = setInterval(() => {
      step = (step + 1) % lockedPattern.length
      setAnimStep(step)
    }, 650)
    return () => clearInterval(animTimerRef.current)
  }, [lockedPattern, role])

  const handleSelectTeam = useCallback((team) => {
    if (selectedTeam) return
    setSelectedTeam(team)
    onAction('selectPattern', { team })
  }, [selectedTeam, onAction])

  const handleTapColor = useCallback((color) => {
    if (submitted || inputSeq.length >= seqLen) return
    const newSeq = [...inputSeq, color]
    setInputSeq(newSeq)
    onAction('tapColor', { color })
    if (newSeq.length === seqLen) {
      setSubmitted(true)
      onAction('submitSequence', { sequence: newSeq })
    }
  }, [inputSeq, submitted, seqLen, onAction])

  const handleClear = useCallback(() => {
    if (submitted) return
    setInputSeq([])
    onAction('clearInput', {})
  }, [submitted, onAction])

  // Fallback: retry submit after 5s
  useEffect(() => {
    if (!submitted || update?.phase === 'resolved') return
    const timeout = setTimeout(() => {
      onAction('submitSequence', { sequence: inputSeq })
    }, 5000)
    return () => clearTimeout(timeout)
  }, [submitted, update, inputSeq, onAction])

  // ── RESOLVED ───────────────────────────────────────────────────
  if (update?.phase === 'resolved') {
    const { success, pointsAwarded, inputSequence } = update
    return (
      <div style={styles.wrap}>
        <p style={{ ...styles.resolvedTitle, color: success ? '#00D4FF' : '#FF3366' }}>
          {success ? '✓ PATTERN MATCHED!' : '✕ NO MATCH'}
        </p>
        {success ? (
          <p style={{ ...styles.resolvedPoints, color: '#00D4FF' }}>+{pointsAwarded} pts</p>
        ) : (
          <p style={styles.resolvedZero}>0 points — no pattern matched</p>
        )}
        {role === 'A' && (
          <>
            <p style={styles.youTappedLabel}>You tapped:</p>
            <PatternDots pattern={inputSequence} />
          </>
        )}
      </div>
    )
  }

  // ── PLAYER B ───────────────────────────────────────────────────
  if (role === 'B') {
    if (selectedTeam && !lockedPattern) {
      return (
        <div style={styles.wrap}>
          <p style={styles.waitTitle}>Pattern locked in...</p>
          <p style={styles.waitSub}>Tell your partner the order verbally!</p>
        </div>
      )
    }

    if (lockedPattern) {
      const teamColor = selectedTeam === 'phos' ? '#00D4FF' : '#FF3366'
      const teamLabel = selectedTeam === 'phos' ? 'ΦΩΣ' : 'ΣΚΟΤΊΑ'
      const currentFlash = lockedPattern[animStep] ?? null

      return (
        <div style={styles.wrap}>
          <p style={{ ...styles.bPatternTitle, color: teamColor }}>{teamLabel} PATTERN</p>
          <p style={styles.instruction}>Tell your partner to tap in this order:</p>
          <PatternDots pattern={lockedPattern} highlightIndex={animStep} />
          <div style={styles.colorWordRow}>
            {lockedPattern.map((c, i) => (
              <span key={i} style={{ ...styles.colorWord, color: COLOR_HEX[c] }}>
                {i + 1}.{COLOR_LABEL[c]}
              </span>
            ))}
          </div>
          <ColorGrid highlighted={currentFlash} />
          <p style={styles.waitSub}>Waiting for Player A to input...</p>
        </div>
      )
    }

    if (!simonPatterns) {
      return (
        <div style={styles.wrap}>
          <p style={styles.waitTitle}>SIMON SAYS</p>
          <p style={styles.waitSub}>Preparing patterns…</p>
        </div>
      )
    }

    return (
      <div style={{ ...styles.wrap, gap: 14 }}>
        <p style={styles.bPickTitle}>SIMON SAYS</p>
        <p style={styles.bPickSub}>
          You are the Reader. Choose which pattern to give your partner.
          They will not know which team benefits — only you do.
        </p>
        <PatternCard team="phos" pattern={simonPatterns.phosPattern} onSelect={handleSelectTeam} disabled={!!selectedTeam} />
        <PatternCard team="skotia" pattern={simonPatterns.skotiaPattern} onSelect={handleSelectTeam} disabled={!!selectedTeam} />
      </div>
    )
  }

  // ── PLAYER A ───────────────────────────────────────────────────
  if (role === 'A') {
    if (submitted) {
      return (
        <div style={styles.wrap}>
          <p style={styles.waitTitle}>Checking…</p>
          <PatternDots pattern={inputSeq} />
        </div>
      )
    }

    if (!inputReady) {
      return (
        <div style={styles.wrap}>
          <p style={styles.aTitle}>SIMON SAYS</p>
          <p style={styles.aWaitSub}>Your partner is choosing a pattern to tell you.</p>
          <p style={styles.aWaitHint}>Listen carefully — they will read you the order!</p>
          <ColorGrid />
        </div>
      )
    }

    const isComplete = inputSeq.length === seqLen

    return (
      <div style={styles.wrap}>
        <p style={styles.aTitle}>SIMON SAYS</p>
        <p style={styles.aInstruction}>Tap the colours in the order your partner says</p>

        {/* Progress slots */}
        <div style={styles.progressRow}>
          {Array.from({ length: seqLen }).map((_, i) => {
            const color = inputSeq[i]
            return (
              <div
                key={i}
                style={{
                  ...styles.progressSlot,
                  background: color ? COLOR_HEX[color] : 'rgba(255,255,255,0.05)',
                  borderColor: color ? COLOR_HEX[color] : 'rgba(255,255,255,0.1)',
                }}
              >
                {color && <span style={styles.progressSlotLabel}>{COLOR_LABEL[color]}</span>}
              </div>
            )
          })}
        </div>

        <ColorGrid onPress={!isComplete ? handleTapColor : undefined} disabled={isComplete} />

        {inputSeq.length > 0 && !isComplete && (
          <button style={styles.clearBtn} onClick={handleClear}>CLEAR</button>
        )}
      </div>
    )
  }

  return null
}

const styles = {
  wrap: { padding: 20, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  grid: { display: 'flex', flexDirection: 'column', gap: 8 },
  gridRow: { display: 'flex', gap: 8 },
  gridCell: {
    width: 80, height: 80, borderRadius: 12, border: '2px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  gridLabel: { fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' },
  patternRow: { display: 'flex', gap: 8, justifyContent: 'center' },
  dot: { width: 18, height: 18, borderRadius: 9, transition: 'all 0.15s' },
  colorWordRow: { display: 'flex', gap: 10, justifyContent: 'center' },
  colorWord: { fontFamily: 'Rajdhani, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' },
  patternCard: {
    width: '100%', background: 'rgba(11,12,16,0.8)', borderRadius: 16, border: '2px solid',
    padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  patternCardTeam: { fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: '0.2em' },
  patternCardDesc: { fontFamily: 'Exo 2, sans-serif', fontSize: 11, color: '#6C757D' },
  selectBtn: {
    padding: '10px 20px', borderRadius: 8, border: 'none', color: '#0B0C10',
    fontFamily: 'Orbitron, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
  },
  progressRow: { display: 'flex', gap: 8, justifyContent: 'center' },
  progressSlot: {
    width: 48, height: 48, borderRadius: 8, border: '2px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
  },
  progressSlotLabel: { fontFamily: 'Rajdhani, sans-serif', fontSize: 10, fontWeight: 700, color: '#0B0C10' },
  clearBtn: {
    padding: '8px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 4, color: '#ADB5BD', fontFamily: 'Rajdhani, sans-serif', fontSize: 12, cursor: 'pointer',
  },
  instruction: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#ADB5BD', textAlign: 'center' },
  waitTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#F8F9FA' },
  waitSub: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#6C757D', textAlign: 'center' },
  bPatternTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '0.2em' },
  bPickTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#FFA63D' },
  bPickSub: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#ADB5BD', textAlign: 'center', lineHeight: 1.5 },
  aTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700, color: '#FFA63D' },
  aInstruction: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#ADB5BD', textAlign: 'center' },
  aWaitSub: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  aWaitHint: { fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: '#6C757D', textAlign: 'center' },
  youTappedLabel: { fontFamily: 'Rajdhani, sans-serif', fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.1em' },
  resolvedTitle: { fontFamily: 'Orbitron, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '0.15em' },
  resolvedPoints: { fontFamily: 'Rajdhani, sans-serif', fontSize: 28, fontWeight: 700 },
  resolvedZero: { fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#6C757D' },
}
