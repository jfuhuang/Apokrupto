import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W, height: H } = Dimensions.get('window');
const ENEMY_SIZE = 56;
const SPAWN_INTERVAL = 2200;
const ENEMY_DURATION = 5000;
const CENTER_X = W / 2 - ENEMY_SIZE / 2;
const CENTER_Y = H * 0.45;

let _id = 0;

function makeEnemy() {
  const side = Math.floor(Math.random() * 4); // 0=top,1=right,2=bottom,3=left
  let sx, sy;
  if (side === 0) { sx = Math.random() * W; sy = -ENEMY_SIZE; }
  else if (side === 1) { sx = W + ENEMY_SIZE; sy = Math.random() * CENTER_Y; }
  else if (side === 2) { sx = Math.random() * W; sy = H; }
  else { sx = -ENEMY_SIZE; sy = Math.random() * CENTER_Y; }

  return { id: ++_id, sx, sy, pan: new Animated.ValueXY({ x: sx, y: sy }), anim: null };
}

export default function GuardTask({ config, onSuccess, onFail }) {
  const { waveDuration, maxMisses } = config;
  const [enemies, setEnemies] = useState([]);
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const missRef = useRef(0);
  const doneRef = useRef(false);
  const timersRef = useRef([]);

  useEffect(() => {
    // Spawn enemies
    const spawnInterval = setInterval(() => {
      if (doneRef.current) return;
      const e = makeEnemy();
      setEnemies((prev) => [...prev, e]);

      // Animate towards center
      e.anim = Animated.timing(e.pan, {
        toValue: { x: CENTER_X, y: CENTER_Y },
        duration: ENEMY_DURATION,
        useNativeDriver: false,
      });
      e.anim.start(({ finished }) => {
        if (finished && !doneRef.current) {
          // Enemy reached center — miss
          missRef.current += 1;
          setMisses(missRef.current);
          setEnemies((prev) => prev.filter((en) => en.id !== e.id));
          if (missRef.current >= maxMisses) {
            doneRef.current = true;
            setDone(true);
            onFail();
          }
        }
      });
    }, SPAWN_INTERVAL);

    // End wave
    const waveTimer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        setDone(true);
        clearInterval(spawnInterval);
        onSuccess();
      }
    }, waveDuration);

    timersRef.current = [spawnInterval, waveTimer];

    return () => {
      clearInterval(spawnInterval);
      clearTimeout(waveTimer);
      doneRef.current = true;
    };
  }, []);

  const killEnemy = (id) => {
    if (doneRef.current) return;
    setEnemies((prev) => {
      const e = prev.find((en) => en.id === id);
      if (e && e.anim) e.anim.stop();
      return prev.filter((en) => en.id !== id);
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Tap enemies before they reach the flock!</Text>
      <View style={styles.missRow}>
        {Array.from({ length: maxMisses }).map((_, i) => (
          <Text key={i} style={[styles.missHeart, { opacity: i < misses ? 0.25 : 1 }]}>
            ♥
          </Text>
        ))}
      </View>

      {/* Center target indicator */}
      <View style={[styles.center, { left: CENTER_X, top: CENTER_Y }]}>
        <Text style={styles.centerIcon}>🐑</Text>
      </View>

      {enemies.map((e) => (
        <Animated.View
          key={e.id}
          style={[styles.enemy, e.pan.getLayout()]}
        >
          <TouchableOpacity
            style={styles.enemyTouch}
            onPress={() => killEnemy(e.id)}
            activeOpacity={0.6}
          >
            <Text style={styles.enemyIcon}>🐺</Text>
          </TouchableOpacity>
        </Animated.View>
      ))}
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
  missRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  missHeart: {
    fontSize: 22,
    color: colors.state.error,
  },
  center: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerIcon: {
    fontSize: 36,
  },
  enemy: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
  },
  enemyTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enemyIcon: {
    fontSize: 36,
  },
});
