import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, useWindowDimensions } from 'react-native';
import AnimatedBackground from '../components/AnimatedBackground';

export default function WelcomeScreen({ onCreateAccount, onLogin }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      <SafeAreaView style={[styles.content, isLandscape && styles.contentLandscape]}>
        <View style={[styles.titleContainer, isLandscape && styles.titleContainerLandscape]}>
          <Text style={[styles.title, isLandscape && styles.titleLandscape]}>APOKRUPTO</Text>
          <Text style={[styles.subtitle, isLandscape && styles.subtitleLandscape]}>Real World Deception</Text>
        </View>

        <View style={[styles.buttonContainer, isLandscape && styles.buttonContainerLandscape]}>
          <TouchableOpacity style={styles.button} onPress={onCreateAccount}>
            <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onLogin}>
            <Text style={styles.buttonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: '#ff0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    marginTop: 10,
    letterSpacing: 1,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    gap: 20,
  },
  buttonContainerLandscape: {
    width: '40%',
    alignItems: 'center',
    gap: 20,
  },
  button: {
    backgroundColor: '#ff0000',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  secondaryButton: {
    backgroundColor: '#00aaff',
    shadowColor: '#00aaff',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
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
    width: '55%',
    alignItems: 'flex-start',
    marginTop: 0,
  },
  titleLandscape: {
    fontSize: 48,
  },
  subtitleLandscape: {
    fontSize: 18,
  },
});
