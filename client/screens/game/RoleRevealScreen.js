import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const ROLE_CONFIG = {
  deceiver: {
    label: 'DECEIVER',
    description: 'Eliminate innocents before they complete their tasks.',
    accentColor: colors.game.impostor,
    glowColor: colors.shadow.neonRed,
    borderColor: colors.border.error,
  },
  innocent: {
    label: 'INNOCENT',
    description: 'Complete your tasks and expose the deceivers.',
    accentColor: colors.game.crewmate,
    glowColor: colors.shadow.electricBlue,
    borderColor: colors.border.focus,
  },
};

const AUTO_ADVANCE_MS = 3000;

export default function RoleRevealScreen({ role, fellowDeceivers = [], onRevealComplete }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.innocent;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(onRevealComplete, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.card, { opacity: fadeAnim, borderColor: config.borderColor }]}>
          <Text style={styles.youAre}>YOU ARE</Text>
          <Text
            style={[
              styles.roleName,
              {
                color: config.accentColor,
                textShadowColor: config.glowColor,
              },
            ]}
          >
            {config.label}
          </Text>
          <View style={[styles.divider, { backgroundColor: config.accentColor }]} />
          <Text style={styles.description}>{config.description}</Text>
          {role === 'deceiver' && fellowDeceivers.length > 0 && (
            <View style={styles.fellowSection}>
              <Text style={styles.fellowLabel}>YOUR TEAM</Text>
              {fellowDeceivers.map((name) => (
                <Text key={name} style={[styles.fellowName, { color: config.accentColor }]}>
                  {name}
                </Text>
              ))}
            </View>
          )}
        </Animated.View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  youAre: {
    ...typography.subtitle,
    color: colors.text.tertiary,
    letterSpacing: 6,
    marginBottom: 16,
  },
  roleName: {
    ...typography.appTitle,
    fontSize: 48,
    letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  divider: {
    width: 60,
    height: 2,
    borderRadius: 1,
    marginVertical: 24,
    opacity: 0.7,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  fellowSection: {
    marginTop: 24,
    alignItems: 'center',
    width: '100%',
  },
  fellowLabel: {
    ...typography.subtitle,
    color: colors.text.tertiary,
    letterSpacing: 4,
    marginBottom: 10,
  },
  fellowName: {
    ...typography.body,
    letterSpacing: 1,
    marginBottom: 4,
  },
});
