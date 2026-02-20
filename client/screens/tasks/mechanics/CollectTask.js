import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W, height: H } = Dimensions.get('window');
const ITEM_SIZE = 70;
const MARGIN = 20;

function randomPos() {
  return {
    x: MARGIN + Math.random() * (W - ITEM_SIZE - MARGIN * 2),
    y: MARGIN + Math.random() * (H * 0.55 - ITEM_SIZE - MARGIN * 2),
  };
}

export default function CollectTask({ config, onSuccess, onFail }) {
  const { items } = config;

  const [positions] = useState(() =>
    items.map(() => randomPos())
  );
  const [collected, setCollected] = useState(new Set());

  const handleCollect = (idx) => {
    if (collected.has(idx)) return;
    const next = new Set([...collected, idx]);
    setCollected(next);
    if (next.size === items.length) {
      onSuccess();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Tap all items before time runs out!</Text>
      <Text style={styles.progress}>{collected.size} / {items.length} collected</Text>

      {items.map((item, idx) => {
        const pos = positions[idx];
        const done = collected.has(idx);
        return (
          <TouchableOpacity
            key={idx}
            style={[
              styles.item,
              done && styles.itemDone,
              { left: pos.x, top: pos.y },
            ]}
            onPress={() => handleCollect(idx)}
            activeOpacity={0.7}
            disabled={done}
          >
            <Text style={styles.itemIcon}>{done ? '✓' : '✦'}</Text>
            <Text style={styles.itemLabel} numberOfLines={2}>{item}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.space,
  },
  hint: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  progress: {
    fontFamily: fonts.accent.bold,
    fontSize: 18,
    color: colors.primary.electricBlue,
    textAlign: 'center',
    marginTop: 4,
  },
  item: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderWidth: 2,
    borderColor: colors.primary.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  itemDone: {
    backgroundColor: 'rgba(0,255,159,0.12)',
    borderColor: colors.accent.neonGreen,
    shadowColor: colors.accent.neonGreen,
  },
  itemIcon: {
    fontSize: 18,
    color: colors.primary.electricBlue,
  },
  itemLabel: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 9,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
});
