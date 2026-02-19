// API Configuration
// Dynamic IP detection - no hardcoded addresses!
import { getApiUrl } from './utils/networkUtils';

// Initialize API URL dynamically
let API_URL = 'http://localhost:3000'; // Safe fallback

// Set up dynamic URL detection
const initializeApiUrl = async () => {
  try {
    API_URL = await getApiUrl();
    console.log('API URL detected:', API_URL);
  } catch (error) {
    console.warn('Failed to detect API URL, using fallback:', error);
  }
};

// Initialize on app start
initializeApiUrl();

// Export both the current URL and a function to get the latest URL
export { API_URL };
export const getCurrentApiUrl = () => API_URL;
export { initializeApiUrl };