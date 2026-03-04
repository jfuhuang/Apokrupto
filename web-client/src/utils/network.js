/**
 * Web equivalent of the React Native networkUtils.js.
 *
 * Priority order for server URL resolution:
 *   1. ?serverUrl=...       — URL query parameter (highest priority, runtime override)
 *   2. EXPO_PUBLIC_API_URL  — shared with the React Native client, set in .env
 *   3. VITE_API_URL         — Vite-only environment variable
 *   4. '' (relative paths)  — works with the Vite dev proxy and same-origin production
 *
 * For ngrok or remote servers:
 *   - Set EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.dev in web-client/.env
 *   - Or pass ?serverUrl=https://your-ngrok-url.ngrok-free.dev as a query parameter
 */
function getBaseUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3000'
  
  // Check query parameter first (?serverUrl=... — highest priority)
  const params = new URLSearchParams(window.location.search)
  const queryUrl = params.get('serverUrl')
  if (queryUrl) return queryUrl
  
  // Check environment variables
  const envUrl = import.meta.env.EXPO_PUBLIC_API_URL || import.meta.env.VITE_API_URL
  return envUrl || ''
}

export function getApiUrl() {
  return getBaseUrl()
}

export function getSocketUrl() {
  const baseUrl = getBaseUrl()
  // If baseUrl is empty (relative paths), use window.location.origin
  return baseUrl || window.location.origin
}
