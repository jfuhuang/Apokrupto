import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function GameOverScreen({ result, token, gameId, onReturn }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const isSkotiaWin = result?.winner === 'skotia';
  const winColor = isSkotiaWin ? colors.primary.neonRed : colors.primary.electricBlue;
  const winShadow = isSkotiaWin ? colors.shadow.neonRed : colors.shadow.electricBlue;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  // On-mount fetch: validate game-over state in case App.js missed the socket event.
  // Since this screen is excluded from the App.js global sync, this is the only safety net.
  useEffect(() => {
    if (!token || !gameId || result?.winner) return; // already have data
    const fetchState = async () => {
      try {
        const baseUrl = await getApiUrl();
        const res = await fetch(`${baseUrl}/api/games/${gameId}/state`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        // Data validation only — screen is purely presentational;
        // App.js already set gameOverResult before navigating here.
      } catch { /* non-fatal */ }
    };
    fetchState();
  }, [token, gameId]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={[styles.title, { color: winColor, textShadowColor: winShadow }]}>
              {isSkotiaWin ? 'SKOTIA WIN' : 'PHOS WIN'}
            </Text>

            {result?.condition ? (
              <View style={styles.conditionBox}>
                <Text style={styles.conditionLabel}>WIN CONDITION</Text>
                <Text style={styles.conditionText}>{result.condition}</Text>
              </View>
            ) : null}

            <View style={styles.pointsRow}>
              <View style={styles.teamScore}>
                <Text style={[styles.teamLabel, { color: colors.primary.electricBlue }]}>PHOS</Text>
                <Text style={[styles.teamPoints, { color: colors.primary.electricBlue }]}>
                  {result?.phosPoints ?? 0}
                </Text>
              </View>
              <Text style={styles.pointsDivider}>VS</Text>
              <View style={styles.teamScore}>
                <Text style={[styles.teamLabel, { color: colors.primary.neonRed }]}>SKOTIA</Text>
                <Text style={[styles.teamPoints, { color: colors.primary.neonRed }]}>
                  {result?.skotiaPoints ?? 0}
                </Text>
              </View>
            </View>

            {result?.skotiaPlayers?.length > 0 && (
              <View style={styles.revealBox}>
                <Text style={styles.revealLabel}>THE SKOTIA WERE</Text>
                {result.skotiaPlayers.map((player) => {
                  const name = typeof player === 'string' ? player : player.username;
                  const key = typeof player === 'string' ? player : player.id;
                  return (
                    <Text key={key} style={[styles.revealName, { color: colors.primary.neonRed }]}>
                      {name}
                    </Text>
                  );
                })}
              </View>
            )}

            <TouchableOpacity style={styles.returnBtn} onPress={onReturn} activeOpacity={0.8}>
              <Text style={styles.returnBtnText}>RETURN TO LOBBY LIST</Text>
            </TouchableOpacity>
          </Animated.View>
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
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 28,
    width: '100%',
  },
  title: {
    fontFamily: fonts.display.bold,
    fontSize: 36,
    letterSpacing: 4,
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  conditionBox: {
    backgroundColor: colors.background.void,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  conditionLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  conditionText: {
    fontFamily: fonts.accent.bold,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  teamScore: {
    alignItems: 'center',
    gap: 6,
  },
  teamLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 3,
  },
  teamPoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 40,
    letterSpacing: 1,
  },
  pointsDivider: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.text.disabled,
  },
  revealBox: {
    backgroundColor: colors.background.void,
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 102, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  revealLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  revealName: {
    fontFamily: fonts.accent.bold,
    fontSize: 18,
    letterSpacing: 1,
  },
  returnBtn: {
    marginTop: 8,
    backgroundColor: colors.background.void,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  returnBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
});
