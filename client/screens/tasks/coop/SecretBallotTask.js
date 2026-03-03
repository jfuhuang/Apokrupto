import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

function DecreeCard({ decree, onPress, disabled }) {
  const borderColor =
    decree.team === 'phos' ? colors.primary.electricBlue : colors.primary.neonRed;
  const teamLabel = decree.team === 'phos' ? 'ΦΩΣ' : 'ΣΚΟΤΊΑ';

  return (
    <TouchableOpacity
      style={[styles.decreeCard, { borderColor }, disabled && styles.decreeCardDisabled]}
      onPress={() => onPress(decree.index)}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={[styles.decreeTeam, { color: borderColor }]}>{teamLabel}</Text>
      <Text style={styles.decreeLabel}>{decree.label}</Text>
      <Text style={[styles.decreePoints, { color: borderColor }]}>+{decree.points}</Text>
    </TouchableOpacity>
  );
}

function AnimatedDots() {
  return <Text style={styles.dotsText}>...</Text>;
}

export default function SecretBallotTask({ task, role, currentTeam, onAction, update }) {
  const [discarded, setDiscarded] = useState(false);
  const [enacted, setEnacted] = useState(false);
  const fadeAnims = useRef(
    (task.config?.decrees || []).map(() => new Animated.Value(1))
  ).current;

  const handleDiscard = useCallback((decreeIndex) => {
    if (discarded) return;
    setDiscarded(true);

    const idx = (task.config?.decrees || []).findIndex((d) => d.index === decreeIndex);
    if (idx >= 0 && fadeAnims[idx]) {
      Animated.timing(fadeAnims[idx], {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    onAction('discardDecree', { decreeIndex });
  }, [discarded, onAction, task.config?.decrees, fadeAnims]);

  const handleEnact = useCallback((decreeIndex) => {
    if (enacted) return;
    setEnacted(true);
    onAction('enactDecree', { decreeIndex });
  }, [enacted, onAction]);

  // Resolved state
  if (update?.phase === 'resolved') {
    return (
      <TaskContainer>
        <Text style={styles.resolvedTitle}>DECREE ENACTED</Text>
        <View style={styles.mysteryCard}>
          <Text style={styles.mysteryPoints}>+??</Text>
          <Text style={styles.mysterySubtext}>Points awarded in secret</Text>
        </View>
      </TaskContainer>
    );
  }

  // Player A — initial phase: show 3 decrees to discard one
  if (role === 'A' && !update && !discarded) {
    const decrees = task.config?.decrees || [];
    return (
      <TaskContainer>
        <Text style={styles.instruction}>
          Discard one decree. The remaining two will be passed to your partner.
        </Text>
        <View style={styles.decreeList}>
          {decrees.map((decree, i) => (
            <Animated.View key={decree.index} style={{ opacity: fadeAnims[i] }}>
              <DecreeCard
                decree={decree}
                onPress={handleDiscard}
                disabled={discarded}
              />
            </Animated.View>
          ))}
        </View>
      </TaskContainer>
    );
  }

  // Player A — waitingForB
  if (role === 'A' && update?.phase === 'waitingForB') {
    return (
      <TaskContainer>
        <Text style={styles.waitingText}>Your partner is deliberating</Text>
        <AnimatedDots />
      </TaskContainer>
    );
  }

  // Player A — already discarded but no update yet
  if (role === 'A' && discarded) {
    return (
      <TaskContainer>
        <Text style={styles.waitingText}>Passed to partner. Waiting</Text>
        <AnimatedDots />
      </TaskContainer>
    );
  }

  // Player B — waiting for A to discard
  if (role === 'B' && !update) {
    return (
      <TaskContainer>
        <Text style={styles.waitingText}>Your partner is reviewing decrees</Text>
        <AnimatedDots />
      </TaskContainer>
    );
  }

  // Player B — playerB phase: show 2 remaining decrees
  if (role === 'B' && update?.phase === 'playerB') {
    const remaining = update.remainingDecrees || [];
    return (
      <TaskContainer>
        <Text style={styles.instruction}>
          Enact one decree. The other will be discarded. Your partner won't know which you chose.
        </Text>
        <View style={styles.decreeList}>
          {remaining.map((decree) => (
            <DecreeCard
              key={decree.index}
              decree={decree}
              onPress={handleEnact}
              disabled={enacted}
            />
          ))}
        </View>
        {enacted && (
          <Text style={styles.waitingSubtle}>Waiting for result...</Text>
        )}
      </TaskContainer>
    );
  }

  // Fallback
  return (
    <TaskContainer>
      <Text style={styles.waitingText}>Loading ballot...</Text>
    </TaskContainer>
  );
}

const styles = StyleSheet.create({
  instruction: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  decreeList: {
    width: '100%',
    gap: 12,
  },
  decreeCard: {
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  decreeCardDisabled: {
    opacity: 0.5,
  },
  decreeTeam: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
    width: 60,
  },
  decreeLabel: {
    fontFamily: fonts.ui.medium,
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  decreePoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 18,
    letterSpacing: 1,
  },
  waitingText: {
    fontFamily: fonts.ui.medium,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  waitingSubtle: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  dotsText: {
    fontFamily: fonts.ui.regular,
    fontSize: 24,
    color: colors.text.tertiary,
    letterSpacing: 4,
  },
  resolvedTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  mysteryCard: {
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent.ultraviolet,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.accent.ultraviolet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  mysteryPoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 36,
    color: colors.accent.ultraviolet,
    letterSpacing: 2,
  },
  mysterySubtext: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    color: colors.text.tertiary,
  },
});
