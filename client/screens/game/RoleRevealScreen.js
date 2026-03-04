import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// All roles share the same visual style so onlookers can't identify a
// player's role from the colour of their screen.
const SHARED_STYLE = {
  accentColor: colors.accent.ultraviolet,
  glowColor: colors.shadow.ultraviolet,
  borderColor: 'rgba(139, 92, 246, 0.6)',
};

const ROLE_CONFIG = {
  phos: {
    label: 'ΦΩΣ',
    description: 'You are the light. Work with your group to find and sus the Skotia among you.',
    ...SHARED_STYLE,
  },
  skotia: {
    label: 'ΣΚΟΤΊΑ',
    description: 'You are the darkness. Blend in. The Phos must not discover you.',
    ...SHARED_STYLE,
  },
};

const AUTO_ADVANCE_MS = 6000;

export default function RoleRevealScreen({ role, skotiaTeammates = [], onRevealComplete }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.phos;

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
          <ScrollView
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
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
            {role === 'skotia' && skotiaTeammates.length > 0 && (
              <View style={styles.fellowSection}>
                <Text style={styles.fellowLabel}>YOUR TEAM</Text>
                {skotiaTeammates.map((name) => (
                  <Text key={name} style={[styles.fellowName, { color: config.accentColor }]}>
                    {name}
                  </Text>
                ))}
              </View>
            )}
          </ScrollView>
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
    maxHeight: '85%',
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
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
