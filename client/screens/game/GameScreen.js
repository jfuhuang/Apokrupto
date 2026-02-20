import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { getTasksForRole } from '../../data/tasks';
import { SABOTAGES, getSabotageById, scrambleText } from '../../data/sabotages';
import { getApiUrl } from '../../utils/networkUtils';
import SabotageOverlay from './SabotageOverlay';

const POINTS_TARGET = 1000;

const DIFFICULTY_COLOR = {
  easy: colors.accent.neonGreen,
  medium: colors.accent.amber,
  hard: colors.state.error,
};

export default function GameScreen({ role, isAlive = true, points = 0, lobbyId, token, onStartTask, onLogout, onDevExit, onGameOver }) {
  const [sabotageVisible, setSabotageVisible] = useState(false);
  const [tasksVisible, setTasksVisible] = useState(false);
  const [livePoints, setLivePoints] = useState(points);
  const [activeSabotage, setActiveSabotage] = useState(null); // null | { type, isCritical, expiresAt }
  const [secondsLeft, setSecondsLeft] = useState(null);
  const socketRef = useRef(null);

  // TODO: replace with real proximity check
  const canKill = true;

  const progress = Math.min(livePoints / POINTS_TARGET, 1);

  const isDeceiver = role === 'deceiver';
  const availableTasks = getTasksForRole(role, isAlive);

  // Keep livePoints in sync with prop (when TaskScreen calls onComplete → App updates points → re-render)
  useEffect(() => {
    setLivePoints(points);
  }, [points]);

  // Countdown timer for critical sabotages
  useEffect(() => {
    if (!activeSabotage?.isCritical || !activeSabotage?.expiresAt) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((activeSabotage.expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [activeSabotage]);

  // Socket: subscribe to game events while in-game
  useEffect(() => {
    if (!token || !lobbyId) return;

    let socket = null;

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const baseUrl = await getApiUrl();
        socket = io(baseUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('joinRoom', { lobbyId });
        });

        socket.on('pointsUpdate', (payload) => {
          if (String(payload.userId) === String(socket.userId)) {
            setLivePoints(payload.totalPoints);
          }
        });

        socket.on('sabotageActive', (payload) => {
          setActiveSabotage(payload);
        });

        socket.on('sabotageFixed', () => {
          setActiveSabotage(null);
          setSecondsLeft(null);
        });

        socket.on('gameOver', (payload) => {
          if (onGameOver) onGameOver(payload);
        });
      } catch (_) {
        // Socket.IO not available or connection failed — silent
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, lobbyId]);

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('jwtToken');
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleActivateSabotage = (s) => {
    if (!socketRef.current) {
      Alert.alert('Not connected', 'No socket connection — try again.');
      return;
    }
    socketRef.current.emit('activateSabotage', { lobbyId, sabotageType: s.id }, ({ ok, error } = {}) => {
      if (error) Alert.alert('Cannot sabotage', error);
      setSabotageVisible(false);
    });
  };

  const handlePressFix = () => {
    const sabotage = getSabotageById(activeSabotage?.type);
    if (!sabotage) return;
    onStartTask && onStartTask(sabotage.fixTask, { isFix: true });
  };

  const canFix = isAlive;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        {/* ── Map placeholder — fills all available space ── */}
        <View style={styles.mapArea}>
          <Text style={styles.mapPlaceholder}>MAP</Text>
        </View>

        {/* ── Dev exit button — top-right overlay ── */}
        {__DEV__ && (
          <TouchableOpacity style={styles.devExitBtn} onPress={onDevExit} activeOpacity={0.7}>
            <Text style={styles.devExitText}>DEV ✕</Text>
          </TouchableOpacity>
        )}

        {/* ── Points panel — top-left HUD overlay ── */}
        <View style={styles.pointsPanel}>
          <Text style={styles.pointsLabel}>POINTS</Text>
          <Text style={styles.pointsValue}>{livePoints.toLocaleString()}</Text>
          <View style={styles.pointsBarTrack}>
            <View style={[styles.pointsBarFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.pointsTarget}>/ {POINTS_TARGET.toLocaleString()} to win</Text>
        </View>

        {/* ── Active sabotage overlay ── */}
        {activeSabotage && (
          <SabotageOverlay
            sabotage={getSabotageById(activeSabotage.type)}
            secondsLeft={secondsLeft}
            canFix={canFix}
            onPressFix={handlePressFix}
          />
        )}

        {/* ── Bottom action bar ── */}
        <View style={styles.actionBar}>

          {/* Sabotage — bottom left (deceiver only) */}
          {isDeceiver && (
            <TouchableOpacity
              style={styles.sabotageBtn}
              onPress={() => setSabotageVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.sabotageBtnSymbol}>⚠</Text>
              <Text style={styles.sabotageBtnLabel}>SABOTAGE</Text>
            </TouchableOpacity>
          )}

          {/* Tasks button — innocent/dead only */}
          {!isDeceiver && (
            <TouchableOpacity
              style={styles.tasksBtn}
              onPress={() => setTasksVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.tasksBtnSymbol}>📋</Text>
              <Text style={styles.tasksBtnLabel}>TASKS</Text>
              {availableTasks.length > 0 && (
                <View style={styles.tasksBadge}>
                  <Text style={styles.tasksBadgeText}>{availableTasks.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.spacer} />

          {/* Right column: Report above Kill (Kill is deceiver-only) */}
          <View style={styles.rightBtnCol}>
            <TouchableOpacity style={styles.reportBtn} activeOpacity={0.75}>
              <Text style={styles.reportBtnSymbol}>!</Text>
              <Text style={styles.reportBtnLabel}>REPORT</Text>
            </TouchableOpacity>

            {isDeceiver && (
              <TouchableOpacity
                style={[styles.killBtn, !canKill && styles.killBtnDisabled]}
                activeOpacity={canKill ? 0.75 : 1}
                disabled={!canKill}
              >
                <Text style={[styles.killBtnSymbol, !canKill && styles.killDimText]}>✕</Text>
                <Text style={[styles.killBtnLabel, !canKill && styles.killDimText]}>KILL</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Sabotage modal ── */}
        <Modal
          visible={sabotageVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setSabotageVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSabotageVisible(false)}>
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>SABOTAGE</Text>
              <View style={styles.modalDivider} />
              <View style={styles.sabotageGrid}>
                {SABOTAGES.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.sabotageOption}
                    onPress={() => handleActivateSabotage(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sabotageSymbol}>{s.symbol}</Text>
                    <Text style={styles.sabotageOptionLabel}>{s.label.toUpperCase()}</Text>
                    <Text style={styles.sabotageOptionRef}>{s.reference}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSabotageVisible(false)}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Tasks modal ── */}
        <Modal
          visible={tasksVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setTasksVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setTasksVisible(false)}>
            <Pressable style={styles.tasksModalCard}>
              <Text style={styles.tasksModalTitle}>TASKS</Text>
              {!isAlive && (
                <Text style={styles.deadNote}>
                  Dead — only free-roam tasks available (60% points)
                </Text>
              )}
              {activeSabotage?.type === 'confuse_language' && (
                <Text style={styles.babelNote}>⚠ Language Confounded</Text>
              )}
              <View style={styles.modalDivider} />
              <ScrollView
                style={styles.taskList}
                contentContainerStyle={styles.taskListContent}
                showsVerticalScrollIndicator={false}
              >
                {availableTasks.length === 0 ? (
                  <Text style={styles.noTasksText}>No tasks available.</Text>
                ) : (
                  availableTasks.map((task) => {
                    const scrambled = activeSabotage?.type === 'confuse_language';
                    const displayTitle = scrambled ? scrambleText(task.title, task.id) : task.title;
                    const displayRef = scrambled ? scrambleText(task.reference, task.id + '_ref') : task.reference;
                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={styles.taskRow}
                        onPress={() => {
                          setTasksVisible(false);
                          onStartTask && onStartTask(task);
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={styles.taskRowLeft}>
                          <Text style={styles.taskRowTitle}>{displayTitle}</Text>
                          <Text style={styles.taskRowRef}>{displayRef}</Text>
                        </View>
                        <View style={styles.taskRowRight}>
                          <Text style={styles.taskRowPoints}>
                            {isAlive ? task.points.alive : task.points.dead} pts
                          </Text>
                          <Text style={[styles.taskRowDiff, { color: DIFFICULTY_COLOR[task.difficulty] }]}>
                            {task.difficulty}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setTasksVisible(false)}
              >
                <Text style={styles.modalCancelText}>CLOSE</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

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

  // ── Map ──────────────────────────────────────────────────────────────────
  mapArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    ...typography.h1,
    color: colors.text.muted,
    letterSpacing: 8,
    opacity: 0.2,
  },

  // ── Dev exit (absolute, top-right) ──────────────────────────────────────
  devExitBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 166, 61, 0.08)',
  },
  devExitText: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.accent.amber,
  },

  // ── Points panel (absolute, top-left) ────────────────────────────────────
  pointsPanel: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 152,
    backgroundColor: colors.overlay.dark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pointsLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  pointsValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 36,
    color: colors.accent.neonGreen,
    textShadowColor: colors.accent.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    lineHeight: 42,
  },
  pointsBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.background.frost,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  pointsBarFill: {
    height: '100%',
    backgroundColor: colors.accent.neonGreen,
    borderRadius: 2,
  },
  pointsTarget: {
    fontFamily: fonts.accent.bold,
    fontSize: 11,
    color: colors.text.disabled,
    marginTop: 5,
    letterSpacing: 0.5,
  },

  // ── Action bar ───────────────────────────────────────────────────────────
  actionBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
  },
  spacer: {
    flex: 1,
  },

  // Sabotage button
  sabotageBtn: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 20, 60, 0.12)',
    borderWidth: 2,
    borderColor: colors.primary.crimson,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  sabotageBtnSymbol: {
    fontSize: 30,
    color: colors.primary.neonRed,
    marginBottom: 4,
  },
  sabotageBtnLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.primary.neonRed,
  },

  // Tasks button
  tasksBtn: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 255, 0.10)',
    borderWidth: 2,
    borderColor: colors.primary.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  tasksBtnSymbol: {
    fontSize: 28,
    marginBottom: 4,
  },
  tasksBtnLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.primary.electricBlue,
  },
  tasksBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  tasksBadgeText: {
    fontFamily: fonts.accent.bold,
    fontSize: 10,
    color: colors.background.space,
  },

  // Right button column
  rightBtnCol: {
    gap: 8,
    alignItems: 'stretch',
  },

  // Report button
  reportBtn: {
    width: 112,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 166, 61, 0.12)',
    borderWidth: 1,
    borderColor: colors.accent.amber,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  reportBtnSymbol: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    color: colors.accent.amber,
    lineHeight: 22,
  },
  reportBtnLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.accent.amber,
  },

  // Kill button
  killBtn: {
    width: 112,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 51, 102, 0.18)',
    borderWidth: 2,
    borderColor: colors.primary.neonRed,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
  },
  killBtnDisabled: {
    backgroundColor: 'rgba(108, 117, 125, 0.08)',
    borderColor: colors.border.subtle,
    shadowOpacity: 0,
    elevation: 0,
  },
  killBtnSymbol: {
    fontFamily: fonts.display.bold,
    fontSize: 28,
    color: colors.primary.neonRed,
    marginBottom: 2,
  },
  killBtnLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.primary.neonRed,
  },
  killDimText: {
    color: colors.text.disabled,
  },

  // ── Shared modal styles ──────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginTop: 8,
  },
  modalCancelText: {
    ...typography.tiny,
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
  modalDivider: {
    width: '75%',
    height: 1,
    backgroundColor: colors.border.default,
    opacity: 0.5,
    marginBottom: 20,
  },

  // ── Sabotage modal ───────────────────────────────────────────────────────
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.error,
    padding: 28,
    alignItems: 'center',
    shadowColor: colors.shadow.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.primary.neonRed,
    letterSpacing: 5,
    textShadowColor: colors.shadow.neonRed,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 14,
  },
  sabotageGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  sabotageOption: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: 'rgba(220, 20, 60, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.error,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  sabotageSymbol: {
    fontSize: 28,
    color: colors.primary.neonRed,
    textAlign: 'center',
    marginBottom: 6,
  },
  sabotageOptionLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 1,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  sabotageOptionRef: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 9,
    color: colors.accent.amber,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Tasks modal ──────────────────────────────────────────────────────────
  tasksModalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.focus,
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  tasksModalTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 20,
    letterSpacing: 5,
    color: colors.primary.electricBlue,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 6,
  },
  deadNote: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    color: colors.text.disabled,
    textAlign: 'center',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  babelNote: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primary.neonRed,
    textAlign: 'center',
    marginBottom: 6,
  },
  taskList: {
    width: '100%',
  },
  taskListContent: {
    gap: 8,
    paddingBottom: 4,
  },
  noTasksText: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.disabled,
    textAlign: 'center',
    paddingVertical: 20,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  taskRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  taskRowTitle: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  taskRowRef: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 11,
    color: colors.accent.amber,
    marginTop: 2,
  },
  taskRowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  taskRowPoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 15,
    color: colors.accent.neonGreen,
  },
  taskRowDiff: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});
