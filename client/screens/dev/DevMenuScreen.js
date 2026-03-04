/**
 * DevMenuScreen — lets developers preview every game screen with mock data
 * without needing a real server connection or active game session.
 *
 * Accessible by tapping the hidden DEV button on the Welcome screen.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

// ── Mock data ─────────────────────────────────────────────────────────────

const MOCK_GROUP_MEMBERS = [
  { id: '1', username: 'Alice',   isSus: false, isYou: true  },
  { id: '2', username: 'Bob',     isSus: true,  isYou: false },
  { id: '3', username: 'Charlie', isSus: false, isYou: false },
  { id: '4', username: 'Diana',   isSus: false, isYou: false },
  { id: '5', username: 'Evan',    isSus: false, isYou: false },
];

const MOCK_TEAM_POINTS = { phos: 350, skotia: 150 };

const MOCK_ROUND_SUMMARY = {
  marksApplied:      1,
  unmarksApplied:    0,
  phosPointsEarned:  200,
  skotiaPointsEarned: 0,
};

// Pre-encoded fake JWT so no runtime btoa is needed.
// Payload: { "sub": "1", "username": "Alice", "exp": 9999999999 }
const MOCK_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJBbGljZSIsImV4cCI6OTk5OTk5OTk5OX0' +
  '.FAKE_SIGNATURE';

// ── Screen entries ────────────────────────────────────────────────────────

function makeEntries(team, onNavigate) {
  const isSus = team === 'skotia';
  return [
    {
      label: 'Countdown',
      screen: 'countdown',
      props: {},
    },
    {
      label: 'Role Reveal — Phos',
      screen: 'roleReveal',
      props: { role: 'phos', skotiaTeammates: [] },
    },
    {
      label: 'Role Reveal — Skotia',
      screen: 'roleReveal',
      props: { role: 'skotia', skotiaTeammates: ['Bob'] },
    },
    {
      label: 'Round Hub',
      screen: 'roundHub',
      props: {
        token: MOCK_TOKEN,
        gameId: 'mock-game',
        lobbyId: 'mock-lobby',
        currentRound: 1,
        totalRounds: 3,
        currentTeam: team,
        isSus,
        currentGroupMembers: MOCK_GROUP_MEMBERS,
        groupNumber: 1,
        teamPoints: MOCK_TEAM_POINTS,
      },
    },
    {
      label: 'Movement A (word)',
      screen: 'movementA',
      props: {
        token: MOCK_TOKEN,
        gameId: 'mock-game',
        lobbyId: 'mock-lobby',
        groupId: 'mock-group',
        currentUserId: '1',
        currentTeam: team,
        roundNumber: 1,
        groupMembers: MOCK_GROUP_MEMBERS,
      },
    },
    {
      label: 'Movement B (stub)',
      screen: 'movementB',
      props: {
        token: MOCK_TOKEN,
        gameId: 'mock-game',
        lobbyId: 'mock-lobby',
        currentTeam: team,
        roundNumber: 1,
        movementBEndsAt: Date.now() + 3 * 60 * 1000,
        isSus,
      },
    },
    {
      label: 'Task Rush (Challenge)',
      screen: 'taskRush',
      props: {
        token: MOCK_TOKEN,
        gameId: 'mock-game',
        lobbyId: 'mock-lobby',
        currentTeam: team,
        roundNumber: 1,
        movementBEndsAt: Date.now() + 3 * 60 * 1000,
        isSus,
      },
    },
    {
      label: 'Coop Lobby',
      screen: 'coopLobby',
      props: {
        token: MOCK_TOKEN,
        gameId: 'mock-game',
        lobbyId: 'mock-lobby',
        currentTeam: team,
        groupMembers: MOCK_GROUP_MEMBERS,
        isSus,
        movementBEndsAt: Date.now() + 3 * 60 * 1000,
      },
    },
    {
      label: 'Voting (Movement C)',
      screen: 'movementC',
      props: {
        token: MOCK_TOKEN,
        gameId: 'mock-game',
        lobbyId: 'mock-lobby',
        groupId: 'mock-group',
        currentUserId: '1',
        currentTeam: team,
        roundNumber: 1,
        groupMembers: MOCK_GROUP_MEMBERS,
      },
    },
    {
      label: 'Round Summary',
      screen: 'roundSummary',
      props: {
        roundNumber: 1,
        totalRounds: 3,
        summary: MOCK_ROUND_SUMMARY,
        isLastRound: false,
        isSus,
        token: MOCK_TOKEN,
        lobbyId: 'mock-lobby',
        gameId: 'mock-game',
      },
    },
    {
      label: 'Game Over — Phos wins',
      screen: 'gameOver',
      props: {
        result: {
          winner: 'phos',
          condition: 'points',
          phosPoints: 800,
          skotiaPoints: 300,
          skotiaPlayers: [{ id: '2', username: 'Bob' }],
        },
        token: MOCK_TOKEN,
        gameId: 'mock-game',
      },
    },
    {
      label: 'Game Over — Skotia wins',
      screen: 'gameOver',
      props: {
        result: {
          winner: 'skotia',
          condition: 'points',
          phosPoints: 200,
          skotiaPoints: 600,
          skotiaPlayers: [{ id: '2', username: 'Bob' }],
        },
        token: MOCK_TOKEN,
        gameId: 'mock-game',
      },
    },
    {
      label: 'GM Waiting',
      screen: 'gmDashboard',
      props: {},
    },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────

export default function DevMenuScreen({ onNavigate, onBack }) {
  const [team, setTeam] = useState('phos');

  const entries = makeEntries(team, onNavigate);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>DEV MENU</Text>
          <View style={styles.teamToggle}>
            <Text style={[styles.teamLabel, team === 'phos' && styles.teamLabelActive]}>ΦΩΣ</Text>
            <Switch
              value={team === 'skotia'}
              onValueChange={(v) => setTeam(v ? 'skotia' : 'phos')}
              trackColor={{ false: colors.primary.electricBlue, true: colors.primary.neonRed }}
              thumbColor={colors.background.space}
            />
            <Text style={[styles.teamLabel, team === 'skotia' && styles.teamLabelSkotia]}>ΣΚΟΤΊΑ</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.sectionLabel}>GAME SCREENS (mock data — no server needed)</Text>
          {entries.map((entry) => (
            <TouchableOpacity
              key={`${entry.screen}-${entry.label}`}
              style={styles.item}
              onPress={() => onNavigate(entry.screen, entry.props)}
              activeOpacity={0.75}
            >
              <Text style={styles.itemText}>{entry.label}</Text>
              <Text style={styles.itemArrow}>›</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: 12,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backText: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.primary.electricBlue,
  },
  title: {
    flex: 1,
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.text.primary,
  },
  teamToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.text.disabled,
  },
  teamLabelActive: {
    color: colors.primary.electricBlue,
  },
  teamLabelSkotia: {
    color: colors.primary.neonRed,
  },
  list: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.text.disabled,
    marginBottom: 8,
    marginTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemText: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  itemArrow: {
    fontFamily: fonts.ui.regular,
    fontSize: 18,
    color: colors.text.tertiary,
  },
});
