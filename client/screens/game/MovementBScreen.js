import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { MOVEMENT_NAMES } from '../../constants/movementNames';
import SusIcon from '../../components/SusIcon';

export default function MovementBScreen({
  token,
  gameId,
  lobbyId,
  currentTeam,
  roundNumber,
  movementBEndsAt: initialEndsAt,
  isSus,
  onMovementComplete,
  onEnterRush,
}) {
  const [sessionPoints, setSessionPoints] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const endsAtRef = useRef(null);
  const socketRef = useRef(null);
  const timerBarAnim = useRef(new Animated.Value(1)).current;

  const startCountdown = useCallback((endsAt) => {
    if (!endsAt) return;
    endsAtRef.current = endsAt;
    const totalMs = endsAt - Date.now();
    if (totalMs <= 0) return;
    setSecondsLeft(Math.ceil(totalMs / 1000));
    timerBarAnim.setValue(totalMs / (5 * 60 * 1000));
    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: totalMs,
      useNativeDriver: false,
    }).start();
  }, [timerBarAnim]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      const remaining = endsAtRef.current ? Math.ceil((endsAtRef.current - Date.now()) / 1000) : 0;
      setSecondsLeft(Math.max(0, remaining));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft !== null]);

  useEffect(() => {
    if (initialEndsAt && !endsAtRef.current) {
      startCountdown(initialEndsAt);
    }
  }, [initialEndsAt]);

  useEffect(() => {
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
        socket.emit('joinRoom', { lobbyId });
      });

      socket.on('movementStart', ({ movement, movementBEndsAt }) => {
        if (movement === 'B' && movementBEndsAt) {
          startCountdown(movementBEndsAt);
        }
      });

      socket.on('movementBInfo', ({ movementBEndsAt }) => {
        if (movementBEndsAt) startCountdown(movementBEndsAt);
      });

      socket.on('movementComplete', ({ movement }) => {
        if (movement === 'B') {
          if (onMovementComplete) onMovementComplete();
        }
      });

      socket.on('connect_error', (err) =>
        console.warn('[MovementB] Socket error:', err.message)
      );
    };

    connect().catch(console.error);
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, lobbyId]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const teamColor =
    currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

  const formatTime = (s) => {
    if (s === null || s === undefined) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timerUrgent = secondsLeft !== null && secondsLeft <= 30;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>{MOVEMENT_NAMES.B.toUpperCase()}</Text>
          </View>
          <View style={styles.headerCenter}>
            <View style={styles.timerBarTrack}>
              <Animated.View
                style={[
                  styles.timerBarFill,
                  {
                    width: timerBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: timerUrgent
                      ? colors.primary.neonRed
                      : colors.primary.electricBlue,
                  },
                ]}
              />
            </View>
            <Text style={[styles.timerText, timerUrgent && { color: colors.primary.neonRed }]}>
              {formatTime(secondsLeft)}
            </Text>
          </View>
          <Text style={styles.headerRound}>ROUND {roundNumber}</Text>
        </View>

        {/* ── Points banner ── */}
        <View style={[styles.pointsBanner, { borderBottomColor: teamColor + '40' }]}>
          <Text style={[styles.pointsLabel, { color: teamColor }]}>
            {currentTeam === 'skotia' ? 'ΣΚΟΤΊΑ' : 'ΦΩΣ'} POINTS EARNED
          </Text>
          <Text style={[styles.pointsValue, { color: teamColor }]}>
            +{sessionPoints}
          </Text>
        </View>

        {/* ── Sus penalty banner ── */}
        {isSus && (
          <View style={styles.susBanner}>
            <SusIcon size={14} />
            <Text style={styles.susBannerText}>
              SUS PENALTY ACTIVE — Tasks earn 50% points
            </Text>
          </View>
        )}

        {/* ── Mode cards ── */}
        <View style={styles.modeContainer}>

          <TouchableOpacity style={styles.modeCard} onPress={onEnterRush} activeOpacity={0.8}>
            <Text style={styles.modeCardIcon}>⚡</Text>
            <Text style={styles.modeCardTitle}>CHALLENGE RUSH</Text>
            <Text style={styles.modeCardDesc}>
              Rapid-fire skill challenges — build streaks for up to 2× bonus points
            </Text>
            <View style={styles.modeCardBtn}>
              <Text style={styles.modeCardBtnText}>ENTER RUSH</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.modeCard, styles.modeCardDisabled]}>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>COMING SOON</Text>
            </View>
            <Text style={styles.modeCardIcon}>🤝</Text>
            <Text style={[styles.modeCardTitle, { color: colors.text.tertiary }]}>CO-OP</Text>
            <Text style={styles.modeCardDesc}>Complete group challenges with your team</Text>
            <View style={[styles.modeCardBtn, styles.modeCardBtnDisabled]}>
              <Text style={[styles.modeCardBtnText, { color: colors.text.disabled }]}>LOCKED</Text>
            </View>
          </View>

          {sessionPoints > 0 && (
            <Text style={styles.sessionPtsNote}>This round: +{sessionPoints} pts</Text>
          )}

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

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.primary.electricBlue,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.background.frost,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerText: {
    fontFamily: fonts.accent.bold,
    fontSize: 14,
    color: colors.text.primary,
    minWidth: 42,
    textAlign: 'right',
  },
  headerRound: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },

  // ── Points banner ─────────────────────────────────────────────────────
  pointsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pointsLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 2,
  },
  pointsValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    letterSpacing: 1,
  },

  // ── Sus penalty banner ───────────────────────────────────────────────
  susBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.primary.neonRed + '20',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.neonRed + '40',
  },
  susBannerText: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.primary.neonRed,
  },

  // ── Mode cards ────────────────────────────────────────────────────────
  modeContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 14,
  },
  modeCard: {
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary.electricBlue,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  modeCardDisabled: {
    borderColor: colors.border.default,
    shadowOpacity: 0,
    opacity: 0.6,
  },
  modeCardIcon: {
    fontSize: 34,
    marginBottom: 2,
  },
  modeCardTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    letterSpacing: 3,
    color: colors.primary.electricBlue,
    textShadowColor: colors.primary.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  modeCardDesc: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modeCardBtn: {
    marginTop: 10,
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 36,
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  modeCardBtnDisabled: {
    backgroundColor: colors.background.frost,
    shadowOpacity: 0,
    elevation: 0,
  },
  modeCardBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.background.space,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.accent.amber + '30',
    borderWidth: 1,
    borderColor: colors.accent.amber,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontFamily: fonts.display.bold,
    fontSize: 7,
    letterSpacing: 1.5,
    color: colors.accent.amber,
  },
  sessionPtsNote: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 12,
    color: colors.accent.neonGreen,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
