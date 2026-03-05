import { getApiUrl } from './network.js'

// Determine server URL from environment, query param, or default to same-origin
function getServerUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3000'
  
  // Check query parameter first (?serverUrl=...)
  const params = new URLSearchParams(window.location.search)
  const queryUrl = params.get('serverUrl')
  if (queryUrl) return queryUrl
  
  // Use network utility (checks EXPO_PUBLIC_API_URL, VITE_API_URL)
  return getApiUrl()
}

export const getApiBase = () => getServerUrl()

const BASE = getServerUrl()
console.log('[Network] API base URL:', BASE)

const authH = (token) => ({ Authorization: `Bearer ${token}` })
// Only add the ngrok interstitial-skip header when actually talking to an ngrok tunnel
const ngrokH = BASE.includes('ngrok') ? { 'ngrok-skip-browser-warning': '69420' } : {}
const jsonH = { 'Content-Type': 'application/json' }

async function req(path, options = {}) {
  const url = `${BASE}${path}`
  let res
  try {
    res = await fetch(url, options)
  } catch (err) {
    console.error('[API] Network error:', err)
    return { ok: false, status: 0, data: { error: 'Network error' } }
  }
  let data
  const text = await res.text()
  try { 
    data = text ? JSON.parse(text) : {} 
  } catch (e) { 
    console.error('[API] JSON parse error:', e)
    data = {} 
  }
  return { ok: res.ok, status: res.status, data }
}

export const login = (u, p) =>
  req('/api/users/login', { method: 'POST', headers: { ...jsonH, ...ngrokH }, body: JSON.stringify({ username: u, password: p }) })

export const register = (u, p) =>
  req('/api/users/register', { method: 'POST', headers: { ...jsonH, ...ngrokH }, body: JSON.stringify({ username: u, password: p }) })

export const fetchLobbies = (t) =>
  req('/api/lobbies', { headers: { ...authH(t), ...ngrokH } })

export const fetchCurrentLobby = (t) =>
  req('/api/lobbies/current', { headers: { ...authH(t), ...ngrokH } })

export const createLobby = (t, name, maxPlayers) =>
  req('/api/lobbies', { method: 'POST', headers: { ...jsonH, ...authH(t), ...ngrokH }, body: JSON.stringify({ name, max_players: maxPlayers }) })

export const joinLobby = (t, lobbyId) =>
  req(`/api/lobbies/${lobbyId}/join`, { method: 'POST', headers: { ...authH(t), ...ngrokH } })

export const leaveLobby = (t, lobbyId) =>
  req(`/api/lobbies/${lobbyId}/leave`, { method: 'POST', headers: { ...authH(t), ...ngrokH } })

export const fetchLobbyPlayers = (t, lobbyId) =>
  req(`/api/lobbies/${lobbyId}/players`, { headers: { ...authH(t), ...ngrokH } })

export const kickPlayer = (t, lobbyId, userId) =>
  req(`/api/lobbies/${lobbyId}/kick/${userId}`, { method: 'POST', headers: { ...authH(t), ...ngrokH } })

export const fetchGameState = (t, gameId) =>
  req(`/api/games/${gameId}/state`, { headers: { ...authH(t), ...ngrokH } })

export const fetchGmState = (t, gameId) =>
  req(`/api/games/${gameId}/gm-state`, { headers: { ...authH(t), ...ngrokH } })

export const fetchMovementAPrompt = (t, gameId) =>
  req(`/api/games/${gameId}/movement-a/prompt`, { headers: { ...authH(t), ...ngrokH } })

export const submitMovementAWord = (t, gameId, word) =>
  req(`/api/games/${gameId}/movement-a/submit/word`, { method: 'POST', headers: { ...jsonH, ...authH(t), ...ngrokH }, body: JSON.stringify({ word }) })

export const submitMovementASketch = (t, gameId, sketchData) =>
  req(`/api/games/${gameId}/movement-a/submit/sketch`, { method: 'POST', headers: { ...jsonH, ...authH(t), ...ngrokH }, body: JSON.stringify({ sketchData }) })

export const submitVotes = (t, gameId, votes) =>
  req(`/api/games/${gameId}/movement-c/vote`, { method: 'POST', headers: { ...jsonH, ...authH(t), ...ngrokH }, body: JSON.stringify({ votes }) })

export const broadcast = (t, gameId, lobbyId, message) =>
  req(`/api/games/${gameId}/broadcast`, { method: 'POST', headers: { ...jsonH, ...authH(t), ...ngrokH }, body: JSON.stringify({ message, lobbyId }) })

export const advanceGame = (t, gameId) =>
  req(`/api/games/${gameId}/advance`, { method: 'POST', headers: { ...authH(t), ...ngrokH } })

export const completeTask = (t, lobbyId, taskId) =>
  req(`/api/lobbies/${lobbyId}/tasks/complete`, { method: 'POST', headers: { ...jsonH, ...authH(t), ...ngrokH }, body: JSON.stringify({ taskId }) })

export const submitMovementBTask = (t, gameId, taskId, bonusPoints = 0) =>
  req(`/api/games/${gameId}/movement-b/complete`, { method: 'POST', headers: { ...jsonH, ...authH(t), ...ngrokH }, body: JSON.stringify({ taskId, bonusPoints }) })

export const submitMovementBFail = (t, gameId, taskId) =>
  req(`/api/games/${gameId}/movement-b/fail`, { method: 'POST', headers: { ...jsonH, ...authH(t), ...ngrokH }, body: JSON.stringify({ taskId }) })
