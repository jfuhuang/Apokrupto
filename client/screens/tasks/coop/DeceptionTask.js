import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export default function DeceptionTask({ task, role, currentTeam, onAction, update }) {
  const [chosen, setChosen] = useState(null);
  const glowAnim = useState(() => new Animated.Value(0))[0];

  const teamColor =
    currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

  const handleSelect = useCallback((index) => {
    if (chosen !== null) return;
    setChosen(index);
    onAction('selectOption', { choice: index });
  }, [chosen, onAction]);

  // Resolved state
  if (update?.phase === 'resolved') {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    ).start();

    const glowOpacity = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    });

    return (
      <View style={styles.container}>
        <Text style={styles.resolvedTitle}>OPTION CHOSEN</Text>
        <View style={styles.resolvedCard}>
          <Text style={styles.resolvedOption}>
            {update.chosenIndex === 0
              ? task.config.optionA.label
              : task.config.optionB.label}
          </Text>
        </View>
        <Animated.Text style={[styles.pointsText, { opacity: glowOpacity }]}>
          +{update.pointsAwarded}
        </Animated.Text>
      </View>
    );
  }

  // Player A view
  if (role === 'A') {
    if (chosen !== null) {
      return (
        <View style={styles.container}>
          <Text style={styles.waitingText}>Waiting for result...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Text style={styles.instruction}>Tap the word your partner says — but listen carefully.</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[styles.optionCard, { borderColor: teamColor }]}
            onPress={() => handleSelect(0)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionDisplay}>{task.config.optionA.display}</Text>
            <Text style={[styles.optionLabel, { color: teamColor }]}>
              {task.config.optionA.label}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, { borderColor: teamColor }]}
            onPress={() => handleSelect(1)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionDisplay}>{task.config.optionB.display}</Text>
            <Text style={[styles.optionLabel, { color: teamColor }]}>
              {task.config.optionB.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Player B view
  return (
    <View style={styles.container}>
      <Text style={[styles.themeTitle, { color: teamColor }]}>{task.config.theme}</Text>
      <Text style={styles.instruction}>Say the word out loud. Your partner has to figure out which one you mean.</Text>

      <View style={[styles.infoBlock, { borderColor: colors.primary.electricBlue }]}>
        <Text style={[styles.infoLabel, { color: colors.primary.electricBlue }]}>ΦΩΣ</Text>
        <Text style={styles.infoMessage}>{task.config.phosMessage}</Text>
      </View>

      <View style={[styles.infoBlock, { borderColor: colors.primary.neonRed }]}>
        <Text style={[styles.infoLabel, { color: colors.primary.neonRed }]}>ΣΚΟΤΊΑ</Text>
        <Text style={styles.infoMessage}>{task.config.skotiaMessage}</Text>
      </View>

      <Text style={styles.waitingSubtle}>Waiting for Player A to choose...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  instruction: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  optionCard: {
    flex: 1,
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  optionDisplay: {
    fontSize: 36,
    textAlign: 'center',
  },
  optionLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 2,
    textAlign: 'center',
  },
  themeTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 4,
  },
  infoBlock: {
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 6,
  },
  infoLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
  },
  infoMessage: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  waitingSubtle: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 8,
  },
  waitingText: {
    fontFamily: fonts.ui.medium,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  resolvedTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  resolvedCard: {
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.background.frost,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  resolvedOption: {
    fontFamily: fonts.ui.bold,
    fontSize: 18,
    color: colors.text.primary,
  },
  pointsText: {
    fontFamily: fonts.accent.bold,
    fontSize: 36,
    letterSpacing: 2,
    color: colors.text.primary,
  },
});
