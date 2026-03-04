/**
 * SimonSaysTask — Co-op "Keep Talking and Nobody Explodes" style colour-sequence task.
 *
 * PLAYER B  (the Reader)
 *   - Sees two colour sequences: one that scores for Phos, one for Skotia.
 *   - Picks which sequence to communicate verbally to Player A.
 *   - After locking in, sees the pattern animate on the 2×2 grid for reference.
 *
 * PLAYER A  (the Tapper)
 *   - Sees a 2×2 grid of Red / Yellow / Green / Blue squares.
 *   - Taps the colours in the order spoken by Player B.
 *   - Submits after filling all 4 slots.
 *   - Correct Phos pattern → Phos earns points.
 *   - Correct Skotia pattern → Skotia earns points.
 *   - Any other sequence → 0 points.
 *
 * Points and team assignment are handled server-side in coopSocket.js.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

// ── Colour constants ────────────────────────────────────────────────────────

const COLOR_HEX = {
  red:    '#FF4444',
  yellow: '#FFD700',
  green:  '#44CC88',
  blue:   '#44AAFF',
};

const COLOR_LABEL = {
  red:    'RED',
  yellow: 'YLW',
  green:  'GRN',
  blue:   'BLU',
};

// 2×2 layout — top-left, top-right, bottom-left, bottom-right
const GRID_ROWS = [
  ['red',   'yellow'],
  ['green', 'blue'],
];

// ── Sub-components ──────────────────────────────────────────────────────────

/**
 * 2×2 interactive or display grid.
 * `highlighted`  — colour name to glow (used for B's animation; null = all dim)
 * `onPress`      — if provided, cells are tappable (Player A input)
 * `disabled`     — disables all taps
 */
function ColorGrid({ highlighted, onPress, disabled }) {
  return (
    <View style={styles.grid}>
      {GRID_ROWS.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((color) => {
            const isLit = highlighted === color;
            return (
              <TouchableOpacity
                key={color}
                style={[
                  styles.gridCell,
                  {
                    backgroundColor: isLit
                      ? COLOR_HEX[color]
                      : `${COLOR_HEX[color]}30`,
                    borderColor: isLit ? COLOR_HEX[color] : `${COLOR_HEX[color]}60`,
                    shadowColor: isLit ? COLOR_HEX[color] : 'transparent',
                    shadowOpacity: isLit ? 0.9 : 0,
                    shadowRadius: isLit ? 14 : 0,
                    elevation: isLit ? 8 : 0,
                  },
                ]}
                onPress={() => onPress && onPress(color)}
                disabled={disabled || !onPress}
                activeOpacity={0.65}
              >
                <Text
                  style={[
                    styles.gridLabel,
                    { color: isLit ? '#0B0C10' : COLOR_HEX[color] },
                  ]}
                >
                  {COLOR_LABEL[color]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Row of coloured dots representing a sequence.
 * `highlightIndex` — index to pulse (B animation); omit for static display.
 */
function PatternDots({ pattern, highlightIndex }) {
  return (
    <View style={styles.patternRow}>
      {(pattern || []).map((c, i) => {
        const active = highlightIndex == null || highlightIndex === i;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: COLOR_HEX[c] ?? colors.background.frost,
                opacity: active ? 1 : 0.25,
                transform: [{ scale: highlightIndex === i ? 1.35 : 1 }],
                borderColor: COLOR_HEX[c] ?? colors.background.frost,
                shadowColor: active ? (COLOR_HEX[c] ?? 'transparent') : 'transparent',
                shadowOpacity: active ? 0.7 : 0,
                shadowRadius: 6,
                elevation: active ? 4 : 0,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/**
 * A card showing one team's pattern with Select button (Player B initial view).
 */
function PatternCard({ team, pattern, onSelect, disabled }) {
  const teamColor =
    team === 'phos' ? colors.primary.electricBlue : colors.primary.neonRed;
  const teamLabel  = team === 'phos' ? 'ΦΩΣ' : 'ΣΚΟΤΊΑ';
  const teamDesc   = team === 'phos' ? 'Scores PHOS points' : 'Scores SKOTIA points';

  return (
    <View style={[styles.patternCard, { borderColor: teamColor }]}>
      <Text style={[styles.patternCardTeam, { color: teamColor }]}>
        {teamLabel}
      </Text>
      <Text style={styles.patternCardDesc}>{teamDesc}</Text>

      <PatternDots pattern={pattern} />

      <View style={styles.colorWordRow}>
        {(pattern || []).map((c, i) => (
          <Text key={i} style={[styles.colorWord, { color: COLOR_HEX[c] }]}>
            {i + 1}.{COLOR_LABEL[c]}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.selectBtn, { backgroundColor: teamColor }, disabled && styles.selectBtnDisabled]}
        onPress={() => !disabled && onSelect(team)}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={styles.selectBtnText}>TELL PARTNER THIS ONE</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function SimonSaysTask({ task, role, onAction, update, simonPatterns }) {
  // Player B state
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [lockedPattern, setLockedPattern] = useState(null);
  const [animStep, setAnimStep] = useState(0);
  const animTimerRef = useRef(null);

  // Player A state
  const [inputReady, setInputReady] = useState(false);
  const [inputSeq, setInputSeq] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const seqLen = task?.config?.sequenceLength ?? 4;

  // ── Handle server → client updates ────────────────────────────────
  useEffect(() => {
    if (!update) return;

    // Player B receives their locked pattern confirmation
    if (update.phase === 'patternLocked' && role === 'B') {
      setLockedPattern(update.pattern ?? []);
    }

    // Player A: server signals it's time to input
    if (update.phase === 'inputReady' && role === 'A') {
      setInputReady(true);
      setInputSeq([]);
    }

    // Player A: tap progress sync (e.g., after rejoin)
    if (update.phase === 'inputProgress' && role === 'A') {
      setInputReady(true);
      setInputSeq(update.inputSequence ?? []);
    }
  }, [update, role]);

  // ── Flash animation for Player B ──────────────────────────────────
  useEffect(() => {
    if (role !== 'B' || !lockedPattern || lockedPattern.length === 0) return;

    let step = 0;
    setAnimStep(0);
    animTimerRef.current = setInterval(() => {
      step = (step + 1) % lockedPattern.length;
      setAnimStep(step);
    }, 650);

    return () => clearInterval(animTimerRef.current);
  }, [lockedPattern, role]);

  // ── Player B: select pattern ────────────────────────────────────
  const handleSelectTeam = useCallback((team) => {
    if (selectedTeam) return;
    setSelectedTeam(team);
    onAction('selectPattern', { team });
  }, [selectedTeam, onAction]);

  // ── Player A: tap a colour ──────────────────────────────────────
  const handleTapColor = useCallback((color) => {
    if (submitted || inputSeq.length >= seqLen) return;
    const newSeq = [...inputSeq, color];
    setInputSeq(newSeq);
    onAction('tapColor', { color });
    // Auto-submit when sequence is complete
    if (newSeq.length === seqLen) {
      setSubmitted(true);
      onAction('submitSequence', { sequence: newSeq });
    }  }, [inputSeq, submitted, seqLen, onAction]);

  // ── Player A: clear sequence ────────────────────────────────────
  const handleClear = useCallback(() => {
    if (submitted) return;
    setInputSeq([]);
    onAction('clearInput', {});
  }, [submitted, onAction]);

  // ── Player A: submit ────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (submitted || inputSeq.length !== seqLen) return;
    setSubmitted(true);
    onAction('submitSequence', { sequence: inputSeq });
  }, [submitted, inputSeq, seqLen, onAction]);

  // ── Fallback: recover from stuck "Checking..." after 5s ─────
  useEffect(() => {
    if (!submitted || update?.phase === 'resolved') return;
    const timeout = setTimeout(() => {
      // Re-send submitSequence in case the first one was lost
      onAction('submitSequence', { sequence: inputSeq });
    }, 5000);
    return () => clearTimeout(timeout);
  }, [submitted, update, inputSeq, onAction]);

  // ── RESOLVED STATE (both players) ──────────────────────────────
  if (update?.phase === 'resolved') {
    const {
      success,
      benefitTeam,
      pointsAwarded,
      phosPattern,
      skotiaPattern,
      inputSequence,
      chosenTeam,
    } = update;

    const winColor =
      benefitTeam === 'phos'   ? colors.primary.electricBlue :
      benefitTeam === 'skotia' ? colors.primary.neonRed :
                                  colors.text.muted;

    return (
      <TaskContainer style={{ padding: 20 }}>
        <Text style={[styles.resolvedTitle, { color: success ? winColor : colors.state.error }]}>
          {success ? '✓  CORRECT!' : '✕  NO MATCH'}
        </Text>

        {success ? (
          <Text style={[styles.resolvedPoints, { color: winColor }]}>+{pointsAwarded} pts</Text>
        ) : (
          <Text style={styles.resolvedZero}>0 points — no pattern matched</Text>
        )}

        {/* Pattern reveal — only shown to Player B */}
        {role === 'B' && (
          <View style={styles.revealBox}>
            <View style={styles.revealTeam}>
              <Text style={[styles.revealTeamLabel, { color: colors.primary.electricBlue }]}>ΦΩΣ</Text>
              <PatternDots pattern={phosPattern} />
            </View>
            <View style={styles.revealDivider} />
            <View style={styles.revealTeam}>
              <Text style={[styles.revealTeamLabel, { color: colors.primary.neonRed }]}>ΣΚΟΤΊΑ</Text>
              <PatternDots pattern={skotiaPattern} />
            </View>
          </View>
        )}

        {/* Input reveal — only shown to Player A */}
        {role === 'A' && (
          <>
            <Text style={styles.youTappedLabel}>You tapped:</Text>
            <PatternDots pattern={inputSequence} />
          </>
        )}
      </TaskContainer>
    );
  }

  // ── PLAYER B VIEWS ─────────────────────────────────────────────
  if (role === 'B') {
    // B selected a team, waiting for server to send patternLocked
    if (selectedTeam && !lockedPattern) {
      return (
        <TaskContainer>
          <Text style={styles.waitTitle}>Pattern locked in...</Text>
          <Text style={styles.waitSub}>Tell your partner the order verbally!</Text>
        </TaskContainer>
      );
    }

    // B has received the locked pattern → show flash animation
    if (lockedPattern) {
      const teamColor   = selectedTeam === 'phos' ? colors.primary.electricBlue : colors.primary.neonRed;
      const teamLabel   = selectedTeam === 'phos' ? 'ΦΩΣ' : 'ΣΚΟΤΊΑ';
      const currentFlash = lockedPattern[animStep] ?? null;

      return (
        <TaskContainer>
          <Text style={[styles.bPatternTitle, { color: teamColor }]}>{teamLabel} PATTERN</Text>
          <Text style={styles.instruction}>Tell your partner to tap in this order:</Text>

          <PatternDots pattern={lockedPattern} highlightIndex={animStep} />

          <View style={styles.colorWordRow}>
            {lockedPattern.map((c, i) => (
              <Text key={i} style={[styles.colorWord, { color: COLOR_HEX[c] }]}>
                {i + 1}.{COLOR_LABEL[c]}
              </Text>
            ))}
          </View>

          <ColorGrid highlighted={currentFlash} />

          <Text style={styles.waitSub}>Waiting for Player A to input...</Text>
        </TaskContainer>
      );
    }

    // B hasn't selected yet → show both pattern cards
    if (!simonPatterns) {
      return (
        <TaskContainer>
          <Text style={styles.waitTitle}>SIMON SAYS</Text>
          <Text style={styles.waitSub}>Preparing patterns…</Text>
        </TaskContainer>
      );
    }

    const { phosPattern, skotiaPattern } = simonPatterns;

    return (
      <TaskContainer style={{ paddingBottom: 32, gap: 14 }}>
        <Text style={styles.bPickTitle}>SIMON SAYS</Text>
        <Text style={styles.bPickSub}>
          You are the Reader. Choose which pattern to give your partner.{'\n'}
          They will not know which team benefits — only you do.
        </Text>

        <PatternCard
          team="phos"
          pattern={phosPattern}
          onSelect={handleSelectTeam}
          disabled={!!selectedTeam}
        />
        <PatternCard
          team="skotia"
          pattern={skotiaPattern}
          onSelect={handleSelectTeam}
          disabled={!!selectedTeam}
        />
      </TaskContainer>
    );
  }

  // ── PLAYER A VIEWS ─────────────────────────────────────────────
  if (role === 'A') {
    // Submitted, waiting for result
    if (submitted) {
      return (
        <TaskContainer>
          <Text style={styles.waitTitle}>Checking…</Text>
          <PatternDots pattern={inputSeq} />
        </TaskContainer>
      );
    }

    // Waiting for Player B to lock in a pattern
    if (!inputReady) {
      return (
        <TaskContainer>
          <Text style={styles.aTitle}>SIMON SAYS</Text>
          <Text style={styles.aWaitSub}>
            Your partner is choosing a pattern to tell you.
          </Text>
          <Text style={styles.aWaitHint}>
            Listen carefully — they will read you the order!
          </Text>
          <ColorGrid />
        </TaskContainer>
      );
    }

    // Active input
    const isComplete = inputSeq.length === seqLen;

    return (
      <TaskContainer>
        <Text style={styles.aTitle}>SIMON SAYS</Text>
        <Text style={styles.aInstruction}>
          Tap the colours in the order your partner says
        </Text>

        {/* Progress slots */}
        <View style={styles.progressRow}>
          {Array.from({ length: seqLen }).map((_, i) => {
            const color = inputSeq[i];
            return (
              <View
                key={i}
                style={[
                  styles.progressSlot,
                  color
                    ? { backgroundColor: COLOR_HEX[color], borderColor: COLOR_HEX[color] }
                    : styles.progressSlotEmpty,
                ]}
              >
                {color && (
                  <Text style={styles.progressSlotLabel}>{COLOR_LABEL[color]}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* 2×2 grid */}
        <ColorGrid
          onPress={!isComplete ? handleTapColor : undefined}
          disabled={isComplete}
        />

        {/* Clear button — only shown while inputting */}
        {inputSeq.length > 0 && !isComplete && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Text style={styles.clearBtnText}>CLEAR</Text>
          </TouchableOpacity>
        )}
      </TaskContainer>
    );
  }

  return null;
}

SimonSaysTask.propTypes = {
  task:          PropTypes.object.isRequired,
  role:          PropTypes.oneOf(['A', 'B']).isRequired,
  onAction:      PropTypes.func.isRequired,
  update:        PropTypes.object,
  simonPatterns: PropTypes.shape({
    phosPattern:   PropTypes.arrayOf(PropTypes.string),
    skotiaPattern: PropTypes.arrayOf(PropTypes.string),
  }),
};

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Player B pick view ──────────────────────────────────────────
  bPickTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 22,
    letterSpacing: 4,
    color: colors.text.primary,
    marginTop: 8,
  },
  bPickSub: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },

  // Pattern card (Player B initial)
  patternCard: {
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  patternCardTeam: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
  },
  patternCardDesc: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  colorWordRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorWord: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    letterSpacing: 1,
  },
  selectBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 4,
  },
  selectBtnDisabled: {
    opacity: 0.4,
  },
  selectBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: '#0B0C10',
  },

  // ── Player B animation view ─────────────────────────────────────
  bPatternTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    letterSpacing: 3,
  },
  instruction: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // ── Wait / loading ──────────────────────────────────────────────
  waitTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    letterSpacing: 3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  waitSub: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Player A views ──────────────────────────────────────────────
  aTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 22,
    letterSpacing: 4,
    color: colors.text.primary,
  },
  aInstruction: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  aWaitSub: {
    fontFamily: fonts.ui.medium,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  aWaitHint: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Progress slots
  progressRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  progressSlot: {
    width: 54,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSlotEmpty: {
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  progressSlotLabel: {
    fontFamily: fonts.accent.bold,
    fontSize: 11,
    color: '#0B0C10',
    letterSpacing: 1,
  },

  // Action buttons
  clearBtn: {
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.text.muted,
    alignSelf: 'center',
    marginTop: 8,
  },
  clearBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.muted,
  },

  // ── 2×2 Colour Grid ────────────────────────────────────────────
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCell: {
    width: 110,
    height: 80,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 2,
  },

  // ── Pattern dots ───────────────────────────────────────────────
  patternRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },

  // ── Resolved state ─────────────────────────────────────────────
  resolvedTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 28,
    letterSpacing: 3,
    textAlign: 'center',
  },
  resolvedPoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 36,
    letterSpacing: 2,
  },
  resolvedZero: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
  revealBox: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 14,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  revealTeam: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  revealTeamLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 2,
  },
  revealDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.border.subtle,
  },
  youTappedLabel: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  chosenTeamNote: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    color: colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
