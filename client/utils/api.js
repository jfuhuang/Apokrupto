import { getCurrentApiUrl } from './networkUtils';

// --- Helpers ---

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
const jsonHeaders = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const url = `${getCurrentApiUrl()}${path}`;
  const res = await fetch(url, options);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// --- Auth ---

export async function login(username, password) {
  return request('/api/users/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username, password) {
  return request('/api/users/register', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ username, password }),
  });
}

// --- Lobbies ---

export async function fetchLobbies(token) {
  return request('/api/lobbies', {
    headers: authHeader(token),
  });
}

export async function createLobby(token, name, maxPlayers) {
  return request('/api/lobbies', {
    method: 'POST',
    headers: { ...jsonHeaders, ...authHeader(token) },
    body: JSON.stringify({ name, max_players: maxPlayers }),
  });
}

export async function joinLobby(token, lobbyId) {
  return request(`/api/lobbies/${lobbyId}/join`, {
    method: 'POST',
    headers: authHeader(token),
  });
}

export async function leaveLobby(token, lobbyId) {
  return request(`/api/lobbies/${lobbyId}/leave`, {
    method: 'POST',
    headers: authHeader(token),
  });
}

export async function fetchLobbyPlayers(token, lobbyId) {
  return request(`/api/lobbies/${lobbyId}/players`, {
    headers: authHeader(token),
  });
}
