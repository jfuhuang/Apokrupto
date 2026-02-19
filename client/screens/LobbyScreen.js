import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function LobbyScreen({ token, onLogout }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('jwtToken');
      onLogout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, isLandscape && styles.headerLandscape]}>
          <Animated.Text 
            style={[
              styles.title,
              { transform: [{ translateY: floatAnim }] }
            ]}
          >
            LOBBY
          </Animated.Text>
          <Text style={styles.subtitle}>Welcome to Apokrupto!</Text>
        </View>

        <View style={[styles.content, isLandscape && styles.contentLandscape]}>
          <Text style={styles.message}>You've successfully logged in.</Text>
          <Text style={styles.info}>Game lobby features coming soon...</Text>
        </View>

        <TouchableOpacity style={[styles.logoutButton, isLandscape && styles.logoutButtonLandscape]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
    padding: 30,
    backgroundColor: colors.background.void,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.electricBlue,
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text.glow,
    textShadowColor: colors.shadow.cyan,
    textShadowRadius: 12,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.text.secondary,
    marginTop: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  message: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    ...typography.small,
    color: colors.text.muted,
    textAlign: 'center',
  },
  logoutButton: {
    margin: 30,
    backgroundColor: colors.primary.neonRed,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.neon,
    alignItems: 'center',
    shadowColor: colors.shadow.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  logoutButtonText: {
    ...typography.buttonSecondary,
    color: colors.text.glow,
    textShadowColor: colors.shadow.white,
    textShadowRadius: 4,
  },
  /* Landscape-specific styles */
  headerLandscape: {
    padding: 20,
  },
  contentLandscape: {
    padding: 20,
  },
  logoutButtonLandscape: {
    marginHorizontal: 60,
    maxWidth: 300,
    alignSelf: 'center',
  },
});
