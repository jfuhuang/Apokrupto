import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import TaskSprite from '../../../components/TaskSprite';

const QUIZ_BANNERS = {
  ten_commandments: { color: '#FFA63D', label: 'EXODUS 20'   },
  rebuilding_wall:  { color: '#8B6914', label: 'NEHEMIAH'    },
  jesus_miracles:   { color: '#00D4FF', label: 'JOHN 20:30'  },
  prophets_quiz:    { color: '#FF6600', label: 'HEBREWS 1:1' },
  parables_quiz:    { color: '#A0C040', label: 'MATTHEW 13'  },
  acts_quiz:        { color: '#00D4FF', label: 'ACTS 1:8'    },
};

export default function QuizTask({ config, onSuccess, onFail, taskId }) {
  const { questions } = config;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [wrong, setWrong] = useState(false);

  const question = questions[currentIdx];

  const handleSelect = (optionIdx) => {
    if (answered) return;
    setSelected(optionIdx);
    setAnswered(true);

    if (optionIdx !== question.answerIndex) {
      setWrong(true);
      setTimeout(() => onFail(), 1200);
    } else if (currentIdx === questions.length - 1) {
      setTimeout(() => onSuccess(), 800);
    } else {
      setTimeout(() => {
        setCurrentIdx((i) => i + 1);
        setSelected(null);
        setAnswered(false);
      }, 800);
    }
  };

  const optionStyle = (idx) => {
    if (!answered) return styles.option;
    if (idx === question.answerIndex) return [styles.option, styles.optionCorrect];
    if (idx === selected && idx !== question.answerIndex) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDim];
  };

  const optionTextStyle = (idx) => {
    if (!answered) return styles.optionText;
    if (idx === question.answerIndex) return [styles.optionText, { color: colors.accent.neonGreen }];
    if (idx === selected && idx !== question.answerIndex) return [styles.optionText, { color: colors.state.error }];
    return [styles.optionText, { color: colors.text.disabled }];
  };

  const banner = QUIZ_BANNERS[taskId];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.progressRow}>
        {questions.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i < currentIdx && styles.progressDotDone,
              i === currentIdx && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {banner && (
        <View style={[styles.banner, { borderColor: banner.color + '60', backgroundColor: banner.color + '15' }]}>
          <TaskSprite taskId={taskId} size={28} color={banner.color} />
          <Text style={[styles.bannerLabel, { color: banner.color }]}>{banner.label}</Text>
        </View>
      )}

      <Text style={styles.qNum}>Question {currentIdx + 1} of {questions.length}</Text>
      <Text style={styles.prompt}>{question.prompt}</Text>

      <View style={styles.options}>
        {question.options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={optionStyle(idx)}
            onPress={() => handleSelect(idx)}
            activeOpacity={0.75}
            disabled={answered}
          >
            <Text style={styles.optionLetter}>
              {String.fromCharCode(65 + idx)}.
            </Text>
            <Text style={optionTextStyle(idx)}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    flexGrow: 1,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.background.frost,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  bannerLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
  },
  progressDotDone: {
    backgroundColor: colors.accent.neonGreen,
  },
  progressDotActive: {
    backgroundColor: colors.primary.electricBlue,
  },
  qNum: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  prompt: {
    fontFamily: fonts.ui.bold,
    fontSize: 17,
    color: colors.text.primary,
    lineHeight: 26,
  },
  options: {
    gap: 10,
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionCorrect: {
    borderColor: colors.accent.neonGreen,
    backgroundColor: 'rgba(0,255,159,0.08)',
  },
  optionWrong: {
    borderColor: colors.state.error,
    backgroundColor: 'rgba(255,51,102,0.08)',
  },
  optionDim: {
    opacity: 0.4,
  },
  optionLetter: {
    fontFamily: fonts.display.bold,
    fontSize: 13,
    color: colors.text.tertiary,
    width: 20,
  },
  optionText: {
    fontFamily: fonts.ui.medium,
    fontSize: 15,
    color: colors.text.secondary,
    flex: 1,
  },
});
