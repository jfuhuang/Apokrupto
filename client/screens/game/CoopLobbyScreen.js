import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useGame } from '../../context/GameContext';

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

export default function CoopLobbyScreen({
  token,
  gameId,
  lobbyId,
  currentTeam,
  groupMembers,
  isSus,
  movementBEndsAt,
  onSessionStart,
  onBack,
}) {
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [sentInvite, setSentInvite] = useState(null); // { inviteId, targetUserId }
  const [incomingInvite, setIncomingInvite] = useState(null); // { inviteId, fromUserId, fromUsername }
  const [secondsLeft, setSecondsLeft] = useState(null);
  const endsAtRef = useRef(null);
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;

  const userId = parseJwt(token).sub ? String(parseJwt(token).sub) : null;
  const teamColor =
    currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

  // Filter self from group members
  const otherMembers = (groupMembers || []).filter(
    (m) => String(m.id) !== userId
  );

  // Timer setup
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
    if (movementBEndsAt) startCountdown(movementBEndsAt);
  }, [movementBEndsAt, startCountdown]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      const remaining = endsAtRef.current
        ? Math.ceil((endsAtRef.current - Date.now()) / 1000)
        : 0;
      setSecondsLeft(Math.max(0, remaining));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft !== null]);

  // Socket connection
  useEffect(() => {
    let socket;
    const connect = async () => {
      const baseUrl = await getApiUrl();
      socket = io(baseUrl, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        forceNew: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('joinRoom', { lobbyId });
      });

      socket.on('coopInviteReceived', ({ inviteId, fromUserId, fromUsername }) => {
        setIncomingInvite({ inviteId, fromUserId, fromUsername });
        Animated.timing(bannerAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });

      socket.on('coopInviteDeclined', ({ inviteId }) => {
        setSentInvite((cur) => (cur?.inviteId === inviteId ? null : cur));
      });

      socket.on('coopInviteCancelled', ({ inviteId }) => {
        setIncomingInvite((cur) =>
          cur?.inviteId === inviteId ? null : cur
        );
      });

      socket.on('coopSessionStart', (data) => {
        onSessionStart(data);
      });

      socket.on('movementComplete', ({ movement }) => {
        if (movement === 'B') {
          onBack();
        }
      });

      socket.on('connect_error', (err) =>
        console.warn('[CoopLobby] Socket error:', err.message)
      );
    };

    connect().catch(console.error);
    return () => {
      setSocketConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, lobbyId]);

  // Actions
  const handleInvite = useCallback((targetUserId) => {
    const socket = socketRef.current;
    console.log('[CoopLobby] handleInvite called', {
      socketExists: !!socket,
      socketConnected: socket?.connected,
      socketId: socket?.id,
      gameId,
      targetUserId,
    });
    if (!socket) {
      console.warn('[CoopLobby] handleInvite: socket is null, aborting');
      return;
    }
    socket.emit('coopInvite', { gameId, targetUserId }, (res) => {
      console.log('[CoopLobby] coopInvite callback:', JSON.stringify(res));
      if (res?.ok) {
        setSentInvite({ inviteId: res.inviteId, targetUserId });
      } else {
        console.warn('[CoopLobby] coopInvite failed:', res?.error);
      }
    });
  }, [gameId]);

  const handleCancelInvite = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !sentInvite) return;
    socket.emit('coopCancel', { inviteId: sentInvite.inviteId }, () => {
      setSentInvite(null);
    });
  }, [sentInvite]);

  const handleAccept = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !incomingInvite) return;
    socket.emit('coopAccept', { inviteId: incomingInvite.inviteId }, (res) => {
      if (res?.error) {
        setIncomingInvite(null);
      }
    });
  }, [incomingInvite]);

  const handleDecline = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !incomingInvite) return;
    socket.emit('coopDecline', { inviteId: incomingInvite.inviteId }, () => {
      setIncomingInvite(null);
    });
  }, [incomingInvite]);

  const formatTime = (s) => {
    if (s === null || s === undefined) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timerUrgent = secondsLeft !== null && secondsLeft <= 30;

  const renderMember = ({ item }) => {
    const isSentTarget = sentInvite?.targetUserId === String(item.id);
    return (
      <View style={[styles.memberRow, { borderColor: teamColor + '40' }]}>
        <Text style={styles.memberName}>{item.username}</Text>
        {isSentTarget ? (
          <View style={styles.sentRow}>
            <Text style={styles.waitingLabel}>Waiting...</Text>
            <TouchableOpacity onPress={handleCancelInvite} activeOpacity={0.7}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.inviteBtn, { backgroundColor: teamColor }]}
            onPress={() => handleInvite(String(item.id))}
            activeOpacity={0.7}
            disabled={!!sentInvite || !socketConnected}
          >
            <Text style={styles.inviteBtnText}>INVITE</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
            <Text style={[styles.backText, { color: teamColor }]}>← BACK</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: teamColor }]}>CO-OP RUSH</Text>
          <View style={styles.headerTimer}>
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
        </View>

        {/* Incoming invite banner */}
        {incomingInvite && (
          <Animated.View
            style={[
              styles.inviteBanner,
              { borderColor: teamColor, opacity: bannerAnim },
            ]}
          >
            <Text style={styles.bannerText}>
              <Text style={{ color: teamColor, fontFamily: fonts.ui.bold }}>
                {incomingInvite.fromUsername}
              </Text>{' '}
              wants to co-op!
            </Text>
            <View style={styles.bannerActions}>
              <TouchableOpacity
                style={[styles.bannerBtn, { backgroundColor: colors.state.success }]}
                onPress={handleAccept}
                activeOpacity={0.7}
              >
                <Text style={styles.bannerBtnText}>ACCEPT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bannerBtn, { backgroundColor: colors.primary.neonRed }]}
                onPress={handleDecline}
                activeOpacity={0.7}
              >
                <Text style={styles.bannerBtnText}>DECLINE</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Member list */}
        <Text style={styles.sectionTitle}>GROUP MEMBERS</Text>
        <FlatList
          data={otherMembers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No other group members available</Text>
          }
        />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: 12,
  },
  backText: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
  },
  headerTimer: {
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

  // Invite banner
  inviteBanner: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
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
    paddingHorizontal: 24,
  },
  bannerBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.background.space,
  },

  // Section
  sectionTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.text.tertiary,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 24,
  },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.void,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  memberName: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 15,
    color: colors.text.primary,
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waitingLabel: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.tertiary,
  },
  cancelText: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primary.neonRed,
  },
  inviteBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  inviteBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.background.space,
  },
  emptyText: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 40,
  },
});
