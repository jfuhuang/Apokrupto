// Network utility for dynamic IP detection
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get the computer's IP address dynamically
const getNetworkIp = async () => {
  try {
    // SDK 46+: hostUri lives in expoConfig (manifest.extra.expoClient)
    if (Constants.expoConfig?.hostUri) {
      return Constants.expoConfig.hostUri.split(':')[0];
    }

    // Legacy SDK 45 and below
    if (Constants.manifest?.hostUri) {
      return Constants.manifest.hostUri.split(':')[0];
    }

    // Fallback: Metro bundler's host:port, available in development
    if (Constants.debuggerHost) {
      return Constants.debuggerHost.split(':')[0];
    }

    return 'localhost';
  } catch (error) {
    console.warn('Failed to detect network IP:', error);
    return 'localhost';
  }
};

// Get appropriate API base URL based on platform and device type
export const getApiUrl = async () => {
  const port = process.env.EXPO_PUBLIC_API_PORT || '3000';
  
  // If custom API URL is explicitly set, use it
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Check if running on emulator
      const isEmulator = !Constants.isDevice;
      
      if (isEmulator) {
        return `http://10.0.2.2:${port}`;
      } else {
        // Physical device - use dynamic IP detection
        const networkIp = await getNetworkIp();
        return `http://${networkIp}:${port}`;
      }
    } else if (Platform.OS === 'ios') {
      return `http://localhost:${port}`;
    }
  }
  
  // Production fallback
  return process.env.EXPO_PUBLIC_API_URL || `http://localhost:${port}`;
};