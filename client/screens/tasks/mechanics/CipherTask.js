import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { typography, fonts } from '../../../theme/typography';

// Caesar cipher decode helper (used for validation)
function caesarDecode(text, shift) {
  return text
    .split('')
    .map((char) => {
      if (/[A-Z]/.test(char)) {
        return String.fromCharCode(((char.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
      }
      if (/[a-z]/.test(char)) {
        return String.fromCharCode(((char.charCodeAt(0) - 97 - shift + 26) % 26) + 97);
      }
      return char;
    })
    .join('');
}

// config shape:
//   { cipherRole: 'operator'|'manual', encodedText: string, shiftKey: number, partnerName: string }
// onSuccess / onFail called by parent (TaskScreen) to handle points + navigation

export default function CipherTask({ config = {}, onSuccess, onFail, timeLeft }) {
  const { cipherRole = 'operator', encodedText = '', shiftKey = 3, partnerName = 'your partner' } = config;

  const [phase, setPhase] = useState('active'); // 'active' | 'submitted' | 'result'
  const [answerInput, setAnswerInput] = useState('');
  const [resultCorrect, setResultCorrect] = useState(null);

  const isOperator = cipherRole === 'operator';

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const handleSubmit = () => {
    if (!answerInput.trim()) return;

    const expected = caesarDecode(encodedText.toUpperCase(), shiftKey);
    const isCorrect =
      answerInput.trim().toUpperCase().replace(/\s+/g, ' ') ===
      expected.trim().toUpperCase().replace(/\s+/g, ' ');

    setResultCorrect(isCorrect);
    setPhase('result');

    if (isCorrect) {
      setTimeout(() => onSuccess && onSuccess(), 1200);
    } else {
      setTimeout(() => onFail && onFail(), 1200);
    }
  };

  // ── Operator view ─────────────────────────────────────────────────────────
  const renderOperator = () => (
    <TaskContainer centered={false} style={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
      <View style={styles.roleChip}>
        <Text style={styles.roleChipText}>OPERATOR</Text>
      </View>

      <Text style={styles.partnerHint}>Working with: {partnerName}</Text>
      <Text style={styles.instructionText}>
        The message below is encoded. Ask your partner for the shift key, then decode it.
      </Text>

      <View style={styles.encodedBox}>
        <Text style={styles.encodedLabel}>ENCODED MESSAGE</Text>
        <Text style={styles.encodedText} selectable>{encodedText}</Text>
      </View>

      <TextInput
        style={styles.answerInput}
        placeholder="Type decoded message..."
        placeholderTextColor={colors.text.placeholder}
        value={answerInput}
        onChangeText={setAnswerInput}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <TouchableOpacity
        style={[styles.submitBtn, !answerInput.trim() && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!answerInput.trim()}
        activeOpacity={0.8}
      >
        <Text style={styles.submitBtnText}>SUBMIT ANSWER</Text>
      </TouchableOpacity>

      {timeLeft !== undefined && (
        <Text style={styles.timeLeft}>Time remaining: {timeLeft}s</Text>
      )}
    </TaskContainer>
  );

  // ── Manual-holder view ────────────────────────────────────────────────────
  const renderManual = () => (
    <TaskContainer centered={false} style={{ padding: 20, gap: 12 }}>
      <View style={[styles.roleChip, styles.roleChipManual]}>
        <Text style={styles.roleChipText}>MANUAL HOLDER</Text>
      </View>

      <Text style={styles.partnerHint}>Working with: {partnerName}</Text>
      <Text style={styles.instructionText}>
        Read the shift value and alphabet table to your partner. Help them decode the message.
      </Text>

      <View style={styles.keyBox}>
        <Text style={styles.keyLabel}>SHIFT VALUE</Text>
        <Text style={styles.keyValue}>{shiftKey}</Text>
        <Text style={styles.keyHint}>Each encoded letter shifts {shiftKey} position{shiftKey !== 1 ? 's' : ''} forward in the alphabet.</Text>
      </View>

      <View style={styles.tableBox}>
        <Text style={styles.tableLabel}>DECODING REFERENCE</Text>
        <View style={styles.tableGrid}>
          {ALPHABET.split('').map((letter) => {
            const decoded = String.fromCharCode(((letter.charCodeAt(0) - 65 - shiftKey + 26) % 26) + 65);
            return (
              <View key={letter} style={styles.tableCell}>
                <Text style={styles.tableCellEncoded}>{letter}</Text>
                <Text style={styles.tableCellArrow}>↓</Text>
                <Text style={styles.tableCellDecoded}>{decoded}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.manualNote}>
        You cannot submit the answer — only the Operator can. Guide them verbally.
      </Text>
    </TaskContainer>
  );

  // ── Result view ───────────────────────────────────────────────────────────
  const renderResult = () => (
    <View style={styles.resultContainer}>
      <Text style={[
        styles.resultText,
        { color: resultCorrect ? colors.accent.neonGreen : colors.primary.neonRed },
      ]}>
        {resultCorrect ? 'CORRECT' : 'INCORRECT'}
      </Text>
      {!resultCorrect && (
        <Text style={styles.resultHint}>
          Expected: {caesarDecode(encodedText.toUpperCase(), shiftKey)}
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CIPHER TASK</Text>
      </View>
      {phase === 'result'
        ? renderResult()
        : isOperator
        ? renderOperator()
        : renderManual()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 3,
    color: colors.accent.ultraviolet,
    textAlign: 'center',
  },
  roleChip: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  roleChipManual: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  roleChipText: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  partnerHint: {
    ...typography.small,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  instructionText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  encodedBox: {
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  encodedLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  encodedText: {
    fontFamily: fonts.accent.bold,
    fontSize: 18,
    color: colors.primary.electricBlue,
    letterSpacing: 3,
    textAlign: 'center',
  },
  answerInput: {
    width: '100%',
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.body,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  submitBtn: {
    paddingVertical: 16,
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: colors.background.panel,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.background.space,
  },
  timeLeft: {
    ...typography.small,
    color: colors.text.disabled,
    textAlign: 'center',
  },

  // Manual
  keyBox: {
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  keyLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  keyValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 52,
    color: colors.accent.ultraviolet,
    letterSpacing: 2,
    textShadowColor: colors.shadow.ultraviolet,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  keyHint: {
    ...typography.small,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  tableBox: {
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 14,
    gap: 10,
  },
  tableLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 3,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  tableCell: {
    alignItems: 'center',
    width: 28,
    gap: 1,
  },
  tableCellEncoded: {
    fontFamily: fonts.accent.bold,
    fontSize: 12,
    color: colors.primary.neonRed,
    letterSpacing: 0,
  },
  tableCellArrow: {
    fontSize: 8,
    color: colors.text.disabled,
  },
  tableCellDecoded: {
    fontFamily: fonts.accent.bold,
    fontSize: 12,
    color: colors.accent.neonGreen,
    letterSpacing: 0,
  },
  manualNote: {
    ...typography.small,
    color: colors.text.disabled,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Result
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  resultText: {
    fontFamily: fonts.display.bold,
    fontSize: 32,
    letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  resultHint: {
    ...typography.small,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
