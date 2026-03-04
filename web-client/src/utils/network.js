/**
 * Web equivalent of the React Native networkUtils.js.
 *
 * Priority order (matches how the mobile client resolves the server URL):
 *   1. EXPO_PUBLIC_API_URL  — set in .env (shared with the React Native client)
 *   2. VITE_API_URL         — Vite-only override
 *   3. '' (relative paths)  — works with the Vite dev proxy and same-origin production
 *
 * In development, set EXPO_PUBLIC_API_URL to your ngrok tunnel URL in server/.env
 * (or a .env file in web-client/) and the Vite dev proxy will forward /api and
 * /socket.io requests there automatically.
 */
export function getApiUrl() {
  const url = import.meta.env.EXPO_PUBLIC_API_URL || import.meta.env.VITE_API_URL
  return url || ''
}

export function getSocketUrl() {
  const url = import.meta.env.EXPO_PUBLIC_API_URL || import.meta.env.VITE_API_URL
  return url || window.location.origin
}
