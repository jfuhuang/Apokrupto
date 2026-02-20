import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchPairTask({ config, onSuccess, onFail }) {
  const { pairs } = config;

  // Build flat tile list: each pair generates two tiles (term + definition)
  const [tiles] = useState(() => {
    const items = pairs.flatMap((p, i) => [
      { id: `t${i}`, pairId: i, label: p.term,       side: 'term' },
      { id: `d${i}`, pairId: i, label: p.definition,  side: 'def' },
    ]);
    return shuffle(items);
  });

  const [revealed, setRevealed]   = useState(new Set()); // tile ids shown face-up
  const [matched, setMatched]     = useState(new Set()); // tile ids permanently matched
  const [selected, setSelected]   = useState(null);       // currently flipped tile id
  const [checking, setChecking]   = useState(false);

  const handleTap = (tile) => {
    if (checking) return;
    if (matched.has(tile.id)) return;
    if (tile.id === selected) return;

    if (!selected) {
      setSelected(tile.id);
      setRevealed((r) => new Set([...r, tile.id]));
      return;
    }

    // Second tap — compare
    setChecking(true);
    const firstTile = tiles.find((t) => t.id === selected);
    setRevealed((r) => new Set([...r, tile.id]));

    setTimeout(() => {
      if (firstTile.pairId === tile.pairId) {
        // Match!
        const newMatched = new Set([...matched, selected, tile.id]);
        setMatched(newMatched);
        if (newMatched.size === tiles.length) {
          onSuccess();
        }
      } else {
        // No match — hide both after a pause
        setRevealed((r) => {
          const next = new Set(r);
          next.delete(selected);
          next.delete(tile.id);
          return next;
        });
      }
      setSelected(null);
      setChecking(false);
    }, 900);
  };

  const tileStyle = (tile) => {
    const isRevealed = revealed.has(tile.id);
    const isMatched  = matched.has(tile.id);
    return [
      styles.tile,
      isMatched  && styles.tileMatched,
      isRevealed && !isMatched && styles.tileRevealed,
      tile.id === selected && styles.tileSelected,
    ];
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.hint}>Tap two tiles to match a term with its meaning</Text>
      <Text style={styles.progress}>
        {matched.size / 2} / {pairs.length} matched
      </Text>
      <View style={styles.grid}>
        {tiles.map((tile) => {
          const isRevealed = revealed.has(tile.id) || matched.has(tile.id);
          return (
            <TouchableOpacity
              key={tile.id}
              style={tileStyle(tile)}
              onPress={() => handleTap(tile)}
              activeOpacity={0.8}
              disabled={matched.has(tile.id)}
            >
              {isRevealed ? (
                <Text style={styles.tileLabel} numberOfLines={3}>{tile.label}</Text>
              ) : (
                <Text style={styles.tileBack}>?</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  hint: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  progress: {
    fontFamily: fonts.accent.bold,
    fontSize: 16,
    color: colors.primary.electricBlue,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  tile: {
    width: '44%',
    minHeight: 80,
    backgroundColor: colors.background.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  tileRevealed: {
    backgroundColor: colors.background.void,
    borderColor: colors.primary.electricBlue,
  },
  tileSelected: {
    borderColor: colors.accent.amber,
    backgroundColor: 'rgba(255,166,61,0.08)',
  },
  tileMatched: {
    borderColor: colors.accent.neonGreen,
    backgroundColor: 'rgba(0,255,159,0.08)',
  },
  tileBack: {
    fontFamily: fonts.display.bold,
    fontSize: 28,
    color: colors.text.disabled,
  },
  tileLabel: {
    fontFamily: fonts.ui.medium,
    fontSize: 12,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
