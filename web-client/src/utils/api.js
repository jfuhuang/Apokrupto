const BASE = typeof window !== 'undefined' ? '' : 'http://localhost:3000'
const authH = (token) => ({ Authorization: `Bearer ${token}` })
const jsonH = { 'Content-Type': 'application/json' }

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  let data
  try { data = await res.json() } catch { data = {} }
  return { ok: res.ok, status: res.status, data }
}

export const login = (u, p) =>
  req('/api/users/login', { method: 'POST', headers: jsonH, body: JSON.stringify({ username: u, password: p }) })

export const register = (u, p) =>
  req('/api/users/register', { method: 'POST', headers: jsonH, body: JSON.stringify({ username: u, password: p }) })

export const fetchLobbies = (t) =>
  req('/api/lobbies', { headers: authH(t) })

export const fetchCurrentLobby = (t) =>
  req('/api/lobbies/current', { headers: authH(t) })

export const createLobby = (t, name, maxPlayers) =>
  req('/api/lobbies', { method: 'POST', headers: { ...jsonH, ...authH(t) }, body: JSON.stringify({ name, max_players: maxPlayers }) })

export const joinLobby = (t, lobbyId) =>
  req(`/api/lobbies/${lobbyId}/join`, { method: 'POST', headers: authH(t) })

export const leaveLobby = (t, lobbyId) =>
  req(`/api/lobbies/${lobbyId}/leave`, { method: 'POST', headers: authH(t) })

export const fetchLobbyPlayers = (t, lobbyId) =>
  req(`/api/lobbies/${lobbyId}/players`, { headers: authH(t) })

export const kickPlayer = (t, lobbyId, userId) =>
  req(`/api/lobbies/${lobbyId}/kick/${userId}`, { method: 'POST', headers: authH(t) })

export const fetchGameState = (t, gameId) =>
  req(`/api/games/${gameId}/state`, { headers: authH(t) })

export const fetchGmState = (t, gameId) =>
  req(`/api/games/${gameId}/gm-state`, { headers: authH(t) })

export const fetchMovementAPrompt = (t, gameId) =>
  req(`/api/games/${gameId}/movement-a/prompt`, { headers: authH(t) })

export const submitMovementAWord = (t, gameId, word) =>
  req(`/api/games/${gameId}/movement-a/submit`, { method: 'POST', headers: { ...jsonH, ...authH(t) }, body: JSON.stringify({ word }) })

export const submitVotes = (t, gameId, votes) =>
  req(`/api/games/${gameId}/movement-c/vote`, { method: 'POST', headers: { ...jsonH, ...authH(t) }, body: JSON.stringify({ votes }) })

export const broadcast = (t, gameId, lobbyId, message) =>
  req(`/api/games/${gameId}/broadcast`, { method: 'POST', headers: { ...jsonH, ...authH(t) }, body: JSON.stringify({ message, lobbyId }) })

export const advanceGame = (t, gameId) =>
  req(`/api/games/${gameId}/advance`, { method: 'POST', headers: authH(t) })
