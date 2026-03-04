import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import logger from '../../utils/logger';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { MOVEMENT_NAMES } from '../../constants/movementNames';
import { MOVEMENT_B_DURATION_MS } from '../../constants/timings';
import SusIcon from '../../components/SusIcon';
import { useGame } from '../../context/GameContext';
import { fonts } from '../../theme/typography';

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
  onEnterCoop,
  onDirectSessionStart,
}) {
  const { setSocketConnected } = useGame();

  const [activeTab, setActiveTab] = useState('rush'); // 'rush' | 'coop'
  const [sessionPoints, setSessionPoints] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null); // { inviteId, fromUserId, fromUsername }

  const endsAtRef = useRef(null);
  const socketRef = useRef(null);
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const totalDurationRef = useRef(MOVEMENT_B_DURATION_MS);
  const safetyExitedRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const startCountdown = useCallback((endsAt) => {
    if (!endsAt) return;
    endsAtRef.current = endsAt;
    // Store total duration so the bar can be drawn proportionally
    const remaining = endsAt - Date.now();
    totalDurationRef.current = Math.max(remaining, MOVEMENT_B_DURATION_MS);
    setSecondsLeft(Math.max(0, Math.ceil(remaining / 1000)));
  }, []);

  // Single tick that drives both the text counter and the progress bar
  useEffect(() => {
    if (secondsLeft === null) return;
    const id = setInterval(() => {
      const remaining = endsAtRef.current
        ? Math.max(0, endsAtRef.current - Date.now())
        : 0;
      const secs = Math.ceil(remaining / 1000);
      setSecondsLeft(secs);
      timerBarAnim.setValue(remaining / totalDurationRef.current);
    }, 250);
    return () => clearInterval(id);
  }, [secondsLeft !== null, timerBarAnim]);

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
        setSocketConnected(true);
        socket.emit('joinRoom', { lobbyId });
      });

      socket.on('movementStart', ({ movement, movementBEndsAt }) => {
        logger.game('MovementB', `movementStart → ${movement}`);
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

      socket.on('coopInviteReceived', ({ inviteId, fromUserId, fromUsername }) => {
        setIncomingInvite({ inviteId, fromUserId, fromUsername });
        bannerAnim.setValue(0);
        Animated.timing(bannerAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });

      socket.on('coopInviteCancelled', ({ inviteId }) => {
        setIncomingInvite((cur) => (cur?.inviteId === inviteId ? null : cur));
      });

      socket.on('coopSessionStart', (data) => {
        if (onDirectSessionStart) onDirectSessionStart(data);
      });

      socket.on('connect_error', (err) =>
        logger.error('MovementB', `socket error: ${err.message}`)
      );
    };

    connect().catch((err) => logger.error('MovementB', 'socket connect failed', err));
    return () => {
      setSocketConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, lobbyId]);

  // ── 3s safety-net poll: exit if movement advanced or sync timer ────────────
  useEffect(() => {
    if (!token || !gameId) return;
    safetyExitedRef.current = false;
    const poll = async () => {
      if (safetyExitedRef.current) return;
      try {
        const baseUrl = await getApiUrl();
        const res = await fetch(`${baseUrl}/api/games/${gameId}/state`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        // Sync timer if it wasn't set (movementBInfo socket missed)
        if (data.movementBEndsAt && !endsAtRef.current) {
          startCountdown(data.movementBEndsAt);
        }
        if (data.currentMovement && data.currentMovement !== 'B') {
          if (safetyExitedRef.current) return;
          safetyExitedRef.current = true;
          if (onMovementComplete) onMovementComplete();
        }
      } catch { /* non-fatal */ }
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [token, gameId]);

  // ── Pull-to-refresh ────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const baseUrl = await getApiUrl();
      const res = await fetch(`${baseUrl}/api/games/${gameId}/state`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.movementBEndsAt && !endsAtRef.current) {
        startCountdown(data.movementBEndsAt);
      }
    } catch (err) {
      logger.error('MovementB', 'pull-to-refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Co-op invite handlers ────────────────────────────────────────────────
  const handleInviteAccept = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !incomingInvite) return;
    socket.emit('coopAccept', { inviteId: incomingInvite.inviteId }, (res) => {
      if (res?.error) {
        logger.error('MovementB', 'coopAccept failed:', res.error);
        setIncomingInvite(null);
      }
    });
  }, [incomingInvite]);

  const handleInviteDecline = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !incomingInvite) return;
    socket.emit('coopDecline', { inviteId: incomingInvite.inviteId }, () => {
      setIncomingInvite(null);
    });
  }, [incomingInvite]);

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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.electricBlue}
              colors={[colors.primary.electricBlue]}
            />
          }
        >

        {/* ── Sus penalty banner ── */}
        {isSus && (
          <View style={styles.susBanner}>
            <SusIcon size={14} />
            <Text style={styles.susBannerText}>
              SUS PENALTY ACTIVE — Tasks earn 50% points
            </Text>
          </View>
        )}

        {/* ── Tab bar ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rush' && styles.tabActive]}
            onPress={() => setActiveTab('rush')}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>⚡</Text>
            <Text style={[styles.tabLabel, activeTab === 'rush' && styles.tabLabelActive]}>
              CHALLENGE RUSH
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'coop' && styles.tabActive]}
            onPress={() => setActiveTab('coop')}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>🤝</Text>
            <Text style={[styles.tabLabel, activeTab === 'coop' && styles.tabLabelActive]}>
              CO-OP
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab content ── */}
        <View style={styles.tabContent}>
          {activeTab === 'rush' ? (
            <View style={styles.tabPane}>
              <Text style={styles.paneTitle}>CHALLENGE RUSH</Text>
              <Text style={styles.paneDesc}>
                Rapid-fire skill challenges — build streaks for up to 2× bonus points
              </Text>
              <TouchableOpacity style={styles.paneBtn} onPress={onEnterRush} activeOpacity={0.8}>
                <Text style={styles.paneBtnText}>ENTER RUSH</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tabPane}>
              <Text style={styles.paneTitle}>CO-OP RUSH</Text>
              <Text style={styles.paneDesc}>
                Pair up with a group member for cooperative challenges worth 3× points
              </Text>
              <TouchableOpacity style={styles.paneBtn} onPress={onEnterCoop} activeOpacity={0.8}>
                <Text style={styles.paneBtnText}>FIND PARTNER</Text>
              </TouchableOpacity>
            </View>
          )}

          {sessionPoints > 0 && (
            <Text style={styles.sessionPtsNote}>This round: +{sessionPoints} pts</Text>
          )}
        </View>

        </ScrollView>

        {/* ── Floating co-op invite banner ── */}
        {incomingInvite && (
          <Animated.View style={[styles.inviteOverlay, { opacity: bannerAnim }]}>
            <View style={[styles.inviteBanner, { borderColor: teamColor }]}>
              <Text style={styles.bannerText}>
                <Text style={{ color: teamColor, fontFamily: fonts.display.bold }}>
                  {incomingInvite.fromUsername}
                </Text>{' '}wants to co-op!
              </Text>
              <View style={styles.bannerActions}>
                <TouchableOpacity
                  style={[styles.bannerBtn, { backgroundColor: colors.state.success }]}
                  onPress={handleInviteAccept}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bannerBtnText}>ACCEPT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bannerBtn, { backgroundColor: colors.primary.neonRed }]}
                  onPress={handleInviteDecline}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bannerBtnText}>DECLINE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

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

  // ── Tab bar ─────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: colors.background.void,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary.electricBlue + '20',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.electricBlue,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
  tabLabelActive: {
    color: colors.primary.electricBlue,
  },

  // ── Tab content ────────────────────────────────────────────────────
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPane: {
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary.electricBlue,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  paneTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 20,
    letterSpacing: 3,
    color: colors.primary.electricBlue,
    textShadowColor: colors.primary.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  paneDesc: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  paneBtn: {
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  paneBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.background.space,
  },
  sessionPtsNote: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 12,
    color: colors.accent.neonGreen,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // ── Floating invite banner ─────────────────────────────────────────────
  inviteOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  inviteBanner: {
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  bannerText: {
    fontFamily: fonts.ui.regular,
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'center',
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bannerBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  bannerBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.background.space,
  },
});
