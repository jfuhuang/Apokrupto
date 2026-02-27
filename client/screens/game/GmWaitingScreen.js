import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

export default function GmWaitingScreen() {
  const [dashboardUrl, setDashboardUrl] = useState('');

  useEffect(() => {
    getApiUrl().then((base) => setDashboardUrl(`${base}/gm.html`));
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.body}>
          <Text style={styles.label}>GAME MASTER</Text>
          <Text style={styles.title}>YOU ARE THE GM</Text>
          <View style={styles.divider} />
          <Text style={styles.hint}>
            Open the GM Dashboard in a browser to control the game.
          </Text>
          {dashboardUrl ? (
            <View style={styles.urlBox}>
              <Text style={styles.urlText}>{dashboardUrl}</Text>
            </View>
          ) : null}
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
    paddingHorizontal: 32,
    gap: 18,
  },
  label: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 4,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
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
  hint: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  urlBox: {
    backgroundColor: colors.background.void,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  urlText: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    color: colors.primary.electricBlue,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
