import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedBackground from '../../components/AnimatedBackground';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function WelcomeScreen({ onCreateAccount, onLogin }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
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

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      <SafeAreaView style={[styles.content, isLandscape && styles.contentLandscape]}>
        <Animated.View 
          style={[
            styles.titleContainer, 
            isLandscape && styles.titleContainerLandscape,
            { transform: [{ translateY: floatAnim }] }
          ]}
        >
          <Text style={[styles.title, isLandscape && styles.titleLandscape]} numberOfLines={1} adjustsFontSizeToFit>APOKRUPTO</Text>
          <Text style={[styles.subtitle, isLandscape && styles.subtitleLandscape]}>Real World Deception</Text>
        </Animated.View>

        <View style={[styles.buttonContainer, isLandscape && styles.buttonContainerLandscape]}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onLogin}>
            <Text style={styles.buttonText}>LOGIN</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={onCreateAccount}>
            <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>


        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.space,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    ...typography.appTitle,
    color: colors.text.glow,
    textShadowColor: colors.shadow.neonRed,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.text.secondary,
    marginTop: 10,
    textShadowColor: colors.shadow.electricBlue,
    textShadowRadius: 8,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  buttonContainerLandscape: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    paddingLeft: 40,
  },
  button: {
    backgroundColor: colors.primary.neonRed,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.neon,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: colors.primary.electricBlue,
    borderColor: colors.border.glow,
    shadowColor: colors.shadow.electricBlue,
    textAlign: 'center',
  },
  buttonText: {
    ...typography.button,
    color: colors.text.glow,
    textShadowColor: colors.shadow.white,
    textShadowRadius: 4,
    textAlign: 'center',
  },
  /* Landscape-specific styles */
  contentLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 60,
  },
  titleContainerLandscape: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 0,
  },
  titleLandscape: {
    fontSize: 52,
  },
  subtitleLandscape: {
    fontSize: 24,
  },
});
