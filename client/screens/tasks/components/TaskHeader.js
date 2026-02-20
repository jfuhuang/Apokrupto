import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export default function TaskHeader({ title, reference, timeLimit, onCancel, onTimeUp }) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimit > 0 ? timeLimit : null);
  const timerBarAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!timeLimit || timeLimit <= 0) return;

    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: timeLimit * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onTimeUp && onTimeUp();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timerColor = secondsLeft !== null && secondsLeft <= 10
    ? colors.state.error
    : colors.primary.electricBlue;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.reference}>{reference}</Text>
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>✕</Text>
        </TouchableOpacity>
      </View>

      {timeLimit > 0 && (
        <View style={styles.timerRow}>
          <View style={styles.timerBarTrack}>
            <Animated.View
              style={[
                styles.timerBarFill,
                {
                  width: timerBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: timerColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.timerText, { color: timerColor }]}>
            {secondsLeft}s
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.void,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleArea: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.text.primary,
  },
  reference: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 11,
    color: colors.accent.amber,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  cancelBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fonts.ui.bold,
    fontSize: 14,
    color: colors.text.tertiary,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  timerBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.background.frost,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerText: {
    fontFamily: fonts.accent.bold,
    fontSize: 12,
    minWidth: 28,
    textAlign: 'right',
  },
});
