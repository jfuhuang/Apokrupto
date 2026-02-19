// Network utility for dynamic IP detection
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get the computer's IP address dynamically
const getNetworkIp = async () => {
  try {
    // For physical devices, we'll use the Expo development server's IP
    // which is available in the manifest
    if (Constants.manifest?.hostUri) {
      const host = Constants.manifest.hostUri.split(':')[0];
      return host;
    }
    
    // Fallback: try to detect from debugging info
    if (Constants.debuggerHost) {
      const host = Constants.debuggerHost.split(':')[0];
      return host;
    }
    
    // Last resort fallback
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