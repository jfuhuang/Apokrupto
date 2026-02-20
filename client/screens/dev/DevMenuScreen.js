import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

const SCREEN_GROUPS = [
  {
    category: 'AUTH',
    items: [
      { label: 'Welcome',  screen: 'welcome' },
      { label: 'Login',    screen: 'login' },
      { label: 'Register', screen: 'register' },
    ],
  },
  {
    category: 'LOBBY',
    items: [
      { label: 'Lobby List', screen: 'lobbyList' },
    ],
  },
  {
    category: 'GAME FLOW',
    items: [
      { label: 'Countdown', screen: 'countdown' },
      {
        label: 'Role Reveal — Deceiver',
        screen: 'roleReveal',
        params: { role: 'deceiver', fellowDeceivers: ['Alpha', 'Bravo'] },
      },
      {
        label: 'Role Reveal — Innocent',
        screen: 'roleReveal',
        params: { role: 'innocent' },
      },
    ],
  },
  {
    category: 'GAME',
    items: [
      { label: 'Game — Deceiver', screen: 'game', params: { role: 'deceiver', isAlive: true } },
      { label: 'Game — Innocent (alive)', screen: 'game', params: { role: 'innocent', isAlive: true } },
      { label: 'Game — Innocent (dead)', screen: 'game', params: { role: 'innocent', isAlive: false } },
    ],
  },
];

export default function DevMenuScreen({ onNavigate, onClose }) {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.devBadge}>
              <Text style={styles.devBadgeText}>DEV</Text>
            </View>
            <Text style={styles.title}>SCREEN NAVIGATOR</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Tap any screen to navigate directly to it. Mock data is used where required.
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {SCREEN_GROUPS.map(({ category, items }) => (
            <View key={category} style={styles.section}>
              <Text style={styles.categoryLabel}>{category}</Text>
              {items.map(({ label, screen, params }) => (
                <TouchableOpacity
                  key={label}
                  style={styles.screenBtn}
                  onPress={() => onNavigate(screen, params)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.screenBtnText}>{label}</Text>
                  <Text style={styles.screenBtnArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent.amber + '40',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  devBadge: {
    backgroundColor: colors.accent.amber,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  devBadgeText: {
    fontFamily: fonts.display.black,
    fontSize: 10,
    color: colors.background.space,
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.display.bold,
    fontSize: 15,
    letterSpacing: 3,
    color: colors.accent.amber,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: fonts.ui.bold,
    fontSize: 14,
    color: colors.text.tertiary,
  },

  // Hint
  hint: {
    ...typography.small,
    color: colors.text.disabled,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  // List
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },

  section: {
    gap: 6,
  },
  categoryLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.accent.amber,
    marginBottom: 4,
    opacity: 0.7,
  },
  screenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  screenBtnText: {
    ...typography.label,
    color: colors.text.primary,
  },
  screenBtnArrow: {
    fontFamily: fonts.ui.bold,
    fontSize: 20,
    color: colors.text.disabled,
    lineHeight: 22,
  },
});
