import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

export default function RoundSummaryScreen({ roundNumber, totalRounds, summary, isLastRound, onContinue }) {
  const marksApplied = summary?.marksApplied ?? 0;
  const unmarksApplied = summary?.unmarksApplied ?? 0;
  const phosPoints = summary?.phosPoints ?? 0;
  const skotiaPoints = summary?.skotiaPoints ?? 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.body}>
          <Text style={styles.roundLabel}>ROUND {roundNumber} OF {totalRounds}</Text>
          <Text style={styles.title}>ROUND COMPLETE</Text>

          <View style={styles.divider} />

          {/* Mark summary */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>VOTING RESULTS</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{marksApplied}</Text>
              <Text style={styles.statDesc}>player{marksApplied !== 1 ? 's' : ''} marked</Text>
            </View>
            {unmarksApplied > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statValue}>{unmarksApplied}</Text>
                <Text style={styles.statDesc}>player{unmarksApplied !== 1 ? 's' : ''} unmarked</Text>
              </View>
            )}
          </View>

          {/* Points summary */}
          <View style={styles.pointsRow}>
            <View style={styles.teamBlock}>
              <Text style={[styles.teamName, { color: colors.primary.electricBlue }]}>PHOS</Text>
              <Text style={[styles.teamPoints, { color: colors.primary.electricBlue }]}>+{phosPoints}</Text>
            </View>
            <View style={styles.dividerV} />
            <View style={styles.teamBlock}>
              <Text style={[styles.teamName, { color: colors.primary.neonRed }]}>SKOTIA</Text>
              <Text style={[styles.teamPoints, { color: colors.primary.neonRed }]}>+{skotiaPoints}</Text>
            </View>
          </View>

          {isLastRound && (
            <View style={styles.finalRoundNotice}>
              <Text style={styles.finalRoundText}>FINAL ROUND COMPLETE</Text>
              <Text style={styles.finalRoundHint}>Winner will be revealed next.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.8}>
            <Text style={styles.continueBtnText}>
              {isLastRound ? 'SEE RESULTS' : 'NEXT ROUND'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.space,
  },
  safeArea: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 28,
    gap: 22,
  },
  roundLabel: {
    ...typography.subtitle,
    color: colors.text.tertiary,
    letterSpacing: 4,
  },
  title: {
    ...typography.screenTitle,
    color: colors.primary.electricBlue,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    textAlign: 'center',
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: colors.border.focus,
    borderRadius: 1,
    opacity: 0.5,
  },
  card: {
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  cardLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 32,
    color: colors.text.primary,
  },
  statDesc: {
    ...typography.body,
    color: colors.text.secondary,
  },
  pointsRow: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.background.void,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  teamName: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 3,
  },
  teamPoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 36,
    letterSpacing: 1,
  },
  dividerV: {
    width: 1,
    backgroundColor: colors.border.subtle,
  },
  finalRoundNotice: {
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  finalRoundText: {
    fontFamily: fonts.display.bold,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.accent.ultraviolet,
  },
  finalRoundHint: {
    ...typography.small,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  continueBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.background.space,
  },
});
