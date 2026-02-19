import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography, fonts } from '../theme/typography';

export default function LobbyCard({ lobby, onPress }) {
  const playerRatio = `${lobby.current_players}/${lobby.max_players}`;
  const isFull = parseInt(lobby.current_players) >= parseInt(lobby.max_players);
  
  return (
    <TouchableOpacity 
      style={[styles.card, isFull && styles.cardFull]} 
      onPress={onPress}
      disabled={isFull}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{lobby.name}</Text>
        <View style={[styles.statusBadge, isFull && styles.statusBadgeFull]}>
          <Text style={styles.statusText}>{isFull ? 'FULL' : 'OPEN'}</Text>
        </View>
      </View>
      
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Host</Text>
          <Text style={styles.value} numberOfLines={1}>{lobby.host_username}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Players</Text>
          <Text style={[styles.value, isFull && styles.valueFull]}>{playerRatio}</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.lobbyId}>ID: {lobby.id}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.background.panel,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 4,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.focus,
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cardFull: {
    borderColor: colors.text.disabled,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
    marginRight: 6,
  },
  statusBadge: {
    backgroundColor: colors.accent.neonGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  statusBadgeFull: {
    backgroundColor: colors.state.error,
  },
  statusText: {
    fontFamily: fonts.accent.bold,
    fontSize: 9,
    color: colors.background.space,
  },
  info: {
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  label: {
    ...typography.tiny,
    color: colors.text.muted,
  },
  value: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 11,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  valueFull: {
    color: colors.state.error,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: 5,
  },
  lobbyId: {
    fontFamily: fonts.ui.regular,
    fontSize: 10,
    color: colors.text.disabled,
  },
});
