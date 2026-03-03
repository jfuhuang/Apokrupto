import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const RESULT_DELAY_MS = 350;

export default function TriviaTask({ config, onSuccess, onFail }) {
  const { question, options, answerIndex } = config;

  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const doneRef = useRef(false);

  function handleAnswer(idx) {
    if (doneRef.current || answered) return;
    doneRef.current = true;
    setSelected(idx);
    setAnswered(true);

    setTimeout(() => {
      if (idx === answerIndex) {
        onSuccess();
      } else {
        onFail();
      }
    }, RESULT_DELAY_MS);
  }

  function getOptionStyle(idx) {
    if (!answered) return styles.optionBtn;
    if (idx === answerIndex) {
      return [styles.optionBtn, styles.optionCorrect];
    }
    if (idx === selected) {
      return [styles.optionBtn, styles.optionWrong];
    }
    return [styles.optionBtn, styles.optionDimmed];
  }

  function getLabelStyle(idx) {
    if (!answered) return styles.optionLabel;
    if (idx === answerIndex) return [styles.optionLabel, styles.optionLabelCorrect];
    if (idx === selected) return [styles.optionLabel, styles.optionLabelWrong];
    return [styles.optionLabel, styles.optionLabelDimmed];
  }

  function getTextStyle(idx) {
    if (!answered) return styles.optionText;
    if (idx === answerIndex) return [styles.optionText, styles.optionTextCorrect];
    if (idx === selected) return [styles.optionText, styles.optionTextWrong];
    return [styles.optionText, styles.optionTextDimmed];
  }

  return (
    <View style={styles.container}>
      <View style={styles.questionBox}>
        <Text style={styles.question}>{question}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={getOptionStyle(idx)}
            onPress={() => handleAnswer(idx)}
            disabled={answered}
            activeOpacity={0.75}
          >
            <View style={styles.labelBadge}>
              <Text style={getLabelStyle(idx)}>{OPTION_LABELS[idx]}</Text>
            </View>
            <Text style={getTextStyle(idx)}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!answered && (
        <Text style={styles.hint}>Tap the correct answer</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 4,
  },

  questionBox: {
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  question: {
    fontFamily: fonts.display.bold,
    fontSize: 15,
    letterSpacing: 0.3,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 22,
  },

  optionsContainer: {
    gap: 7,
    width: '100%',
  },

  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background.void,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionCorrect: {
    borderColor: colors.accent.neonGreen,
    backgroundColor: 'rgba(0,255,159,0.12)',
  },
  optionWrong: {
    borderColor: colors.primary.neonRed,
    backgroundColor: 'rgba(255,51,102,0.12)',
  },
  optionDimmed: {
    opacity: 0.45,
  },

  labelBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: colors.background.frost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  optionLabelCorrect: {
    color: colors.accent.neonGreen,
  },
  optionLabelWrong: {
    color: colors.primary.neonRed,
  },
  optionLabelDimmed: {
    color: colors.text.disabled,
  },

  optionText: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 19,
  },
  optionTextCorrect: {
    color: colors.accent.neonGreen,
    fontFamily: fonts.ui.semiBold,
  },
  optionTextWrong: {
    color: colors.primary.neonRed,
  },
  optionTextDimmed: {
    color: colors.text.disabled,
  },

  hint: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 6,
  },
});
