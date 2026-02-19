import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedBackground from '../components/AnimatedBackground';
import { API_URL } from '../config';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function RegistrationScreen({ onBack, onSuccess }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
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

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (username.length > 50) {
      newErrors.username = 'Username must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
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
        if (response.status === 409) {
          Alert.alert('Error', 'Username already exists. Please choose a different username.');
        } else {
          Alert.alert('Error', data.error || 'Failed to create account. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      Alert.alert('Success', 'Account created successfully! Please log in.', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.content, isLandscape && styles.contentLandscape]}
        >
          <View style={[styles.header, isLandscape && styles.headerLandscape]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Animated.Text
              style={[
                styles.title,
                isLandscape && styles.titleLandscape,
                { transform: [{ translateY: floatAnim }] }
              ]}
            >
              CREATE ACCOUNT
            </Animated.Text>
          </View>

          <View style={[styles.form, isLandscape && styles.formLandscape]}>
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor="#666666"
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
              )}
            </TouchableOpacity>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 30,
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
    textShadowColor: colors.shadow.neonRed,
    textShadowRadius: 10,
  },
  form: {
    flex: 1,
  },
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
    backgroundColor: colors.primary.neonRed,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.neon,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.shadow.neonRed,
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
  /* Landscape-specific styles */
  contentLandscape: {
    flexDirection: 'row',
    paddingHorizontal: 60,
  },
  headerLandscape: {
    width: '35%',
    marginRight: 40,
    marginBottom: 0,
  },
  titleLandscape: {
    fontSize: 32,
  },
  formLandscape: {
    width: '65%',
    maxWidth: 500,
  },
});
