import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
          <Text style={styles.label}>Host:</Text>
          <Text style={styles.value}>{lobby.host_username}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Players:</Text>
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
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: '#00aaff',
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 280,
  },
  cardFull: {
    borderColor: '#666666',
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: '#00ff00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeFull: {
    backgroundColor: '#ff0000',
  },
  statusText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  info: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: '#999999',
    fontSize: 14,
  },
  value: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  valueFull: {
    color: '#ff0000',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 8,
  },
  lobbyId: {
    color: '#666666',
    fontSize: 12,
  },
});
