import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as ScreenOrientation from 'expo-screen-orientation';
import AnimatedBackground from '../components/AnimatedBackground';
import { API_URL } from '../config';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function LoginScreen({ onBack, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    };
  }, []);

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

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        if (response.status === 401) {
          Alert.alert('Error', 'Invalid username or password. Please try again.');
        } else {
          Alert.alert('Error', data.error || 'Login failed. Please try again.');
        }
        return;
      }

      // Store JWT token securely
      if (data.token) {
        try {
          await SecureStore.setItemAsync('jwtToken', data.token);
          setIsLoading(false);
          onSuccess(data.token);
        } catch (storageError) {
          console.error('Error storing token:', storageError);
          setIsLoading(false);
          Alert.alert('Error', 'Failed to save login credentials.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Animated.Text
                style={[styles.title, { transform: [{ translateY: floatAnim }] }]}
              >
                LOGIN
              </Animated.Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={[styles.input, errors.username && styles.inputError]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor="#666666"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#666666"
                  secureTextEntry
                  autoCapitalize="none"
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>LOGIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    ...typography.label,
    color: colors.primary.electricBlue,
    textShadowColor: colors.glow.blue.soft,
    textShadowRadius: 6,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text.glow,
    textShadowColor: colors.shadow.electricBlue,
    textShadowRadius: 10,
  },
  form: {},
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.input.background,
    borderWidth: 2,
    borderColor: colors.input.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.input.borderError,
    shadowColor: colors.glow.red.soft,
    shadowRadius: 8,
    shadowOpacity: 1,
  },
  errorText: {
    ...typography.small,
    color: colors.state.error,
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.primary.electricBlue,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.glow,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.button,
    color: colors.text.glow,
    textShadowColor: colors.shadow.white,
    textShadowRadius: 4,
  },
});
