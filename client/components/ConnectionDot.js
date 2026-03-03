import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Global WebSocket connection indicator.
 * Rendered as an absolute overlay in App.js so it appears on every screen.
 */
export default function ConnectionDot({ isConnected }) {
  return (
    <View style={[styles.dot, isConnected ? styles.dotOn : styles.dotOff]} />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: 52,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 999,
  },
  dotOn: {
    backgroundColor: colors.accent.neonGreen,
    shadowColor: colors.accent.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  dotOff: {
    backgroundColor: colors.text.disabled,
  },
});
