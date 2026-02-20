import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

// Placeholder points — will be replaced with server-driven data
const PLACEHOLDER_POINTS = 0;
const POINTS_TARGET = 1000;

const SABOTAGES = [
  { id: 'lights',   symbol: '⚡', label: 'LIGHTS' },
  { id: 'reactor',  symbol: '⚛',  label: 'REACTOR' },
  { id: 'comms',    symbol: '◈',  label: 'COMMS' },
];

export default function GameScreen({ role, onLogout, onDevExit }) {
  const [sabotageVisible, setSabotageVisible] = useState(false);

  // TODO: replace with real proximity check
  const canKill = true;

  const points = PLACEHOLDER_POINTS;
  const progress = Math.min(points / POINTS_TARGET, 1);

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('jwtToken');
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isDeceiver = role === 'deceiver';

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
          <Text style={styles.pointsValue}>{points.toLocaleString()}</Text>
          <View style={styles.pointsBarTrack}>
            <View style={[styles.pointsBarFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.pointsTarget}>/ {POINTS_TARGET.toLocaleString()} to win</Text>
        </View>

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
            {/* Inner Pressable stops backdrop tap from closing when tapping card */}
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>SABOTAGE</Text>
              <View style={styles.modalDivider} />
              <View style={styles.sabotageGrid}>
                {SABOTAGES.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.sabotageOption}
                    onPress={() => setSabotageVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sabotageSymbol}>{s.symbol}</Text>
                    <Text style={styles.sabotageOptionLabel}>{s.label}</Text>
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

  // ── Sabotage modal ───────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
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
  modalDivider: {
    width: '75%',
    height: 1,
    backgroundColor: colors.border.error,
    opacity: 0.4,
    marginBottom: 24,
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
    fontSize: 34,
    color: colors.primary.neonRed,
    textAlign: 'center',
    marginBottom: 6,
  },
  sabotageOptionLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modalCancelText: {
    ...typography.tiny,
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
});
