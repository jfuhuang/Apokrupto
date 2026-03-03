import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { fetchPlayerGameState } from '../../utils/api';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import SusIcon from '../../components/SusIcon';
import { useGame } from '../../context/GameContext';
import logger from '../../utils/logger';

export default function RoundSummaryScreen({
  roundNumber,
  totalRounds,
  summary,
  isLastRound,
  isSus,
  token,
  lobbyId,
  gameId,
  onRoundSetup,
  onGameOver,
}) {
  const { setSocketConnected } = useGame();

  const socketRef = useRef(null);
  const gameOverFiredRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  // Helper: fire onGameOver exactly once
  const fireGameOver = (result) => {
    if (gameOverFiredRef.current) return;
    gameOverFiredRef.current = true;
    if (onGameOver) onGameOver(result);
  };

  // ── Socket listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !lobbyId) return;
    let socket;
    const connect = async () => {
      const baseUrl = await getApiUrl();
      socket = io(baseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('joinRoom', { lobbyId });
      });

      // GM started next round — update App.js state and navigate to RoundHub
      socket.on('roundSetup', (data) => {
        if (onRoundSetup) onRoundSetup(data);
      });

      // Game ended (final round or supermajority hit after this summary)
      socket.on('gameOver', (result) => {
        logger.game('RoundSummary', `gameOver — winner: ${result?.winner}`, result);
        fireGameOver(result);
      });
    };
    connect().catch((err) => logger.error('RoundSummary', 'socket connect failed', err));
    return () => {
      setSocketConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, lobbyId]);

  // ── REST polling fallback — catches gameOver if socket missed the event ──
  useEffect(() => {
    if (!token || !gameId) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled || gameOverFiredRef.current) return;
      try {
        const { ok, data } = await fetchPlayerGameState(token, gameId);
        if (cancelled || gameOverFiredRef.current) return;
        if (ok && data?.gameStatus === 'completed') {
          fireGameOver({
            winner:       data.winner ?? null,
            condition:    data.winCondition ?? null,
            phosPoints:   data.teamPoints?.phos ?? 0,
            skotiaPoints: data.teamPoints?.skotia ?? 0,
          });
        }
      } catch {
        // non-fatal
      }
    };
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, gameId]);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { ok, data } = await fetchPlayerGameState(token, gameId);
      if (ok && data?.gameStatus === 'completed') {
        fireGameOver({
          winner:      data.winner ?? null,
          condition:   data.winCondition ?? null,
          phosPoints:  data.teamPoints?.phos ?? 0,
          skotiaPoints: data.teamPoints?.skotia ?? 0,
        });
      } else if (ok && data?.currentMovement) {
        // A new round started — the roundSetup socket event will handle navigation
      }
    } catch (err) {
      logger.error('RoundSummary', 'pull-to-refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  const susApplied = summary?.susApplied ?? 0;
  const clearedApplied = summary?.clearedApplied ?? 0;
  const phosPoints = summary?.phosPoints ?? 0;
  const skotiaPoints = summary?.skotiaPoints ?? 0;
  const survivalBonus = summary?.survivalBonus ?? 0;
  const survivingSkotia = summary?.survivingSkotia ?? 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.electricBlue}
              colors={[colors.primary.electricBlue]}
            />
          }
        >
          <Text style={styles.roundLabel}>ROUND {roundNumber} OF {totalRounds}</Text>
          <Text style={styles.title}>ROUND COMPLETE</Text>

          <View style={styles.divider} />

          {/* Personal mark status */}
          {isSus !== undefined && isSus !== null && (
            <View style={[styles.statusCard, isSus && styles.statusCardSus]}>
              <Text style={styles.statusLabel}>YOUR STATUS</Text>
              <View style={styles.statusRow}>
                {isSus && <SusIcon size={16} />}
                <Text style={[styles.statusValue, { color: isSus ? colors.primary.neonRed : colors.accent.neonGreen }]}>
                  {isSus ? 'SUS' : 'CLEAR'}
                </Text>
              </View>
            </View>
          )}

          {/* Mark summary */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>VOTING RESULTS</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{susApplied}</Text>
              <Text style={styles.statDesc}>player{susApplied !== 1 ? 's' : ''} sus'd</Text>
            </View>
            {clearedApplied > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statValue}>{clearedApplied}</Text>
                <Text style={styles.statDesc}>player{clearedApplied !== 1 ? 's' : ''} cleared</Text>
              </View>
            )}
          </View>

          {/* Skotia survival bonus */}
          {survivalBonus > 0 && (
            <View style={[styles.card, styles.survivalCard]}>
              <Text style={styles.cardLabel}>SKOTIA SURVIVAL BONUS</Text>
              <View style={styles.statRow}>
                <Text style={[styles.statValue, { color: colors.primary.neonRed }]}>+{survivalBonus}</Text>
                <Text style={styles.statDesc}>pts</Text>
              </View>
              <Text style={styles.survivalDetail}>
                {survivingSkotia} Skotia member{survivingSkotia !== 1 ? 's' : ''} undetected
              </Text>
            </View>
          )}

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

          <Text style={styles.waitingLabel}>WAITING FOR GM...</Text>
        </ScrollView>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 28,
    gap: 18,
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
  survivalCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.neonRed,
  },
  survivalDetail: {
    ...typography.small,
    color: colors.text.tertiary,
    textAlign: 'center',
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
  statusCard: {
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.border.default,
    borderLeftColor: colors.accent.neonGreen,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusCardSus: {
    borderLeftColor: colors.primary.neonRed,
  },
  statusLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 18,
    letterSpacing: 1,
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
  waitingLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.text.disabled,
  },
});
