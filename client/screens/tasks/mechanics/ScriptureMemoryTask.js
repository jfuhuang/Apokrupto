import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { scoreVerse } from '../../../utils/scriptureUtils';

import TaskSprite from '../../../components/TaskSprite';

export default function ScriptureMemoryTask({ config, onSuccess, onFail, taskId }) {
  const [typed, setTyped] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [showVerse, setShowVerse] = useState(false);
  const threshold = config.accuracy ?? 0.80;

  const score = typed.trim().length > 0
    ? scoreVerse(typed, config.verseText, threshold)
    : null;

  const accuracyPct = score ? Math.round(score.accuracy * 100) : 0;
  const accuracyColor = score
    ? score.accuracy >= threshold
      ? colors.accent.neonGreen
      : colors.state.error
    : colors.text.disabled;

  const handleSubmit = () => {
    if (!typed.trim()) return;
    const finalScore = scoreVerse(typed, config.verseText, threshold);
    setResult(finalScore);
    setSubmitted(true);
    if (finalScore.passed) {
      onSuccess();
    } else {
      // Allow retry — don't call onFail immediately
    }
  };

  const handleRetry = () => {
    setTyped('');
    setSubmitted(false);
    setResult(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>Type the verse from memory:</Text>
        <Text style={styles.refLabel}>{config.reference}</Text>

        {!submitted && (
          <TouchableOpacity
            style={[styles.dontKnowBtn, showVerse && styles.dontKnowBtnRevealed]}
            onPress={() => setShowVerse(true)}
            activeOpacity={0.8}
            disabled={showVerse}
          >
            <Text style={styles.dontKnowBtnText}>
              {showVerse ? '📖  VERSE REVEALED' : "I DON'T KNOW"}
            </Text>
          </TouchableOpacity>
        )}

        {(showVerse || (submitted && result && !result.passed)) && (
          <>
            <Text style={styles.verseReveal}>The verse (ESV):</Text>
            <Text style={styles.verseText}>{config.verseText}</Text>
          </>
        )}

        <View style={styles.parchment}>
          <View style={styles.scrollCurl} />
          <View style={styles.waxSeal}>
            <TaskSprite taskId={taskId} size={40} color='#FFA63D' />
          </View>
          <TextInput
            style={styles.input}
            value={typed}
            onChangeText={setTyped}
            placeholder="Start typing the verse..."
            placeholderTextColor={colors.text.placeholder}
            multiline
            autoCorrect={false}
            spellCheck={false}
            editable={!submitted || (submitted && result && !result.passed)}
          />
          <View style={styles.scrollCurl} />
        </View>

        {score && !submitted && (
          <Text style={[styles.accuracy, { color: accuracyColor }]}>
            {accuracyPct}% accuracy ({score.matched}/{score.total} words)
          </Text>
        )}

        {submitted && result && (
          <Text style={[styles.accuracy, { color: result.passed ? colors.accent.neonGreen : colors.state.error }]}>
            {result.passed ? '✓ Passed!' : `✕ ${Math.round(result.accuracy * 100)}% — need ${Math.round(threshold * 100)}%`}
          </Text>
        )}

        {!submitted ? (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
            <Text style={styles.submitBtnText}>SUBMIT</Text>
          </TouchableOpacity>
        ) : result && !result.passed ? (
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>TRY AGAIN</Text>
          </TouchableOpacity>
        ) : null}

        {submitted && result && !result.passed && (
          <TouchableOpacity style={styles.failBtn} onPress={onFail} activeOpacity={0.8}>
            <Text style={styles.failBtnText}>GIVE UP</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: 20,
    gap: 12,
  },
  hint: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 15,
    color: colors.text.secondary,
  },
  refLabel: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    color: colors.accent.amber,
    letterSpacing: 0.5,
  },
  verseReveal: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 8,
  },
  verseText: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 22,
    backgroundColor: colors.background.panel,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.amber,
  },
  parchment: {
    backgroundColor: '#1A1500',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6B4A10',
    padding: 16,
    marginTop: 8,
  },
  scrollCurl: {
    height: 8,
    backgroundColor: '#6B4A10',
    borderRadius: 4,
    opacity: 0.6,
    marginVertical: 10,
  },
  waxSeal: {
    alignItems: 'center',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#6B4A10',
    borderRadius: 6,
    padding: 14,
    fontFamily: fonts.ui.regular,
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  accuracy: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 14,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.background.space,
  },
  retryBtn: {
    backgroundColor: colors.accent.amber,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  retryBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.background.space,
  },
  dontKnowBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    backgroundColor: 'transparent',
  },
  dontKnowBtnRevealed: {
    borderColor: colors.text.disabled,
    opacity: 0.5,
  },
  dontKnowBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 13,
    color: colors.accent.amber,
    letterSpacing: 1,
  },
  failBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  failBtnText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.text.disabled,
  },
});
