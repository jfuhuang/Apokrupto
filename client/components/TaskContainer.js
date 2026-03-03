/**
 * TaskContainer — shared layout wrapper for all task components.
 *
 * Ensures consistent sizing, padding, centering and scroll behaviour
 * regardless of which rush screen (CoopRushScreen / TaskRushScreen) or
 * standalone host renders the task.
 *
 * Props:
 *   scrollable  (bool, default true)   — wrap children in a ScrollView so
 *                                          tall content scrolls instead of
 *                                          clipping into the nav bar.
 *   centered    (bool, default true)   — vertically + horizontally center
 *                                          content when it is shorter than
 *                                          the available space.
 *   padded      (bool, default true)   — apply 16 px padding all around.
 *   style       (object)               — merged into contentContainerStyle
 *                                          (ScrollView) or root View style.
 *   children    (node)                 — task UI.
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

export default function TaskContainer({
  scrollable = true,
  centered = true,
  padded = true,
  style,
  children,
  ...rest
}) {
  const contentStyle = [
    styles.base,
    centered && styles.centered,
    padded && styles.padded,
    style,
  ];

  if (scrollable) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, ...contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
        {...rest}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.view, ...contentStyle]} {...rest}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  view: {
    flex: 1,
  },
  base: {
    gap: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  padded: {
    padding: 16,
  },
});
