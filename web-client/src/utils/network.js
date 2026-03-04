/**
 * Web equivalent of the React Native networkUtils.js.
 * Returns the API base URL. In development, Vite proxy handles /api and /socket.io
 * so we use relative paths. VITE_API_URL env var overrides for a remote server.
 */
export function getApiUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return ''; // relative — works with Vite proxy (dev) or same-origin (prod)
}

export function getSocketUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return window.location.origin;
}
