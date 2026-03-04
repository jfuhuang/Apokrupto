import { useState, createContext, useContext } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { GameContext } from '../context/GameContext.jsx'
import RoundHubScreen from './RoundHubScreen.jsx'
import RoundSummaryScreen from './RoundSummaryScreen.jsx'
import GameOverScreen from './GameOverScreen.jsx'
import MovementBScreen from './MovementBScreen.jsx'
import TaskRushScreen from './TaskRushScreen.jsx'
import CoopLobbyScreen from './CoopLobbyScreen.jsx'
import VotingScreen from './VotingScreen.jsx'
import MovementAScreen from './MovementAScreen.jsx'

// ── Mock constants ────────────────────────────────────────────────────────────

const MOCK_USER_ID = 'dev-user-1'
const MOCK_GAME_ID = 'dev-game-1'
const MOCK_LOBBY_ID = 'dev-lobby-1'
const MOCK_GROUP_ID = 'dev-group-1'

const MOCK_GROUP_MEMBERS = [
  { id: 'dev-user-1', username: 'DevPlayer', isMarked: false, isYou: true },
  { id: 'dev-user-2', username: 'Alice', isMarked: false, isYou: false },
  { id: 'dev-user-3', username: 'Bob', isMarked: true, isYou: false },
  { id: 'dev-user-4', username: 'Carol', isMarked: false, isYou: false },
  { id: 'dev-user-5', username: 'Dave', isMarked: false, isYou: false },
]

const MOCK_TEAM_POINTS = { phos: 1200, skotia: 800 }

const MOCK_GAME_CONTEXT = {
  team: 'phos',
  isMarked: false,
  groupId: MOCK_GROUP_ID,
  groupIndex: 0,
  groupMembers: MOCK_GROUP_MEMBERS,
  teamPoints: MOCK_TEAM_POINTS,
  currentRound: 2,
  totalRounds: 3,
  currentMovement: null,
  gameStatus: null,
  winner: null,
  winCondition: null,
  movementBEndsAt: null,
  refresh: () => {},
}

const MOCK_ROUND_SUMMARY = {
  marksApplied: 2,
  unmarksApplied: 1,
  phosPointsEarned: 400,
  skotiaPointsEarned: 150,
  markResults: [
    { username: 'Bob', action: 'mark' },
    { username: 'Alice', action: 'unmark' },
  ],
}

// ── MockGameWrapper: overrides GameContext with mock data ─────────────────────

function MockGameWrapper({ children, overrides = {} }) {
  return (
    <GameContext.Provider value={{ ...MOCK_GAME_CONTEXT, ...overrides }}>
      {children}
    </GameContext.Provider>
  )
}

// ── Screen catalogue ──────────────────────────────────────────────────────────

const SCREENS = [
  { id: 'movementA_word', label: 'Movement A — Word mode (waiting)' },
  { id: 'movementA_my_turn', label: 'Movement A — My turn (word)' },
  { id: 'movementA_deliberation', label: 'Movement A — Deliberation' },
  { id: 'votingC', label: 'Movement C — Voting' },
  { id: 'roundHub', label: 'Round Hub' },
  { id: 'roundSummary', label: 'Round Summary' },
  { id: 'gameOver_phos', label: 'Game Over — Phos wins' },
  { id: 'gameOver_skotia', label: 'Game Over — Skotia wins' },
  { id: 'movementB', label: 'Movement B — Hub' },
  { id: 'taskRush', label: 'Challenge Rush' },
  { id: 'coopLobby', label: 'Co-op Lobby' },
]

// ── Main DevMenuScreen ────────────────────────────────────────────────────────

export default function DevMenuScreen({ onBack }) {
  const [active, setActive] = useState(null)

  if (active) {
    return <ActiveMockScreen screenId={active} onBack={() => setActive(null)} />
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.inner}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>← BACK</button>
          <h2 style={styles.title}>🛠 DEV MENU</h2>
        </div>
        <p style={styles.sub}>Preview screens with mock data — no server required.</p>
        <div style={styles.list}>
          {SCREENS.map((s) => (
            <button key={s.id} style={styles.item} onClick={() => setActive(s.id)}>
              <span style={styles.itemLabel}>{s.label}</span>
              <span style={styles.arrow}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Renders the selected mock screen ─────────────────────────────────────────

function DevBackButton({ onBack }) {
  return <button style={floatBackBtn} onClick={onBack}>← DEV BACK</button>
}

function ActiveMockScreen({ screenId, onBack }) {
  const noop = () => {}

  switch (screenId) {
    case 'movementA_word':
      return (
        <MockGameWrapper>
          <DevBackButton onBack={onBack} />
          <MockMovementA phase="waiting" promptMode="word" />
        </MockGameWrapper>
      )
    case 'movementA_my_turn':
      return (
        <MockGameWrapper>
          <DevBackButton onBack={onBack} />
          <MockMovementA phase="my_turn" promptMode="word" />
        </MockGameWrapper>
      )
    case 'movementA_deliberation':
      return (
        <MockGameWrapper>
          <DevBackButton onBack={onBack} />
          <MockMovementA phase="deliberation" promptMode="word" />
        </MockGameWrapper>
      )
    case 'votingC':
      return (
        <MockGameWrapper>
          <DevBackButton onBack={onBack} />
          <VotingScreen
            token="mock"
            gameId={MOCK_GAME_ID}
            currentUserId={MOCK_USER_ID}
            socket={null}
            onMovementEnd={noop}
          />
        </MockGameWrapper>
      )
    case 'roundHub':
      return (
        <MockGameWrapper>
          <DevBackButton onBack={onBack} />
          <RoundHubScreen
            token={null}
            gameId={MOCK_GAME_ID}
            lobbyId={MOCK_LOBBY_ID}
            currentRound={2}
            totalRounds={3}
            currentTeam="phos"
            currentGroupMembers={MOCK_GROUP_MEMBERS}
            teamPoints={MOCK_TEAM_POINTS}
            isMarked={false}
            socket={null}
            onNavigateMovement={noop}
            onGameOver={noop}
          />
        </MockGameWrapper>
      )
    case 'roundSummary':
      return (
        <>
          <DevBackButton onBack={onBack} />
          <RoundSummaryScreen
            roundSummary={MOCK_ROUND_SUMMARY}
            currentRound={2}
            totalRounds={3}
            isMarked={false}
            socket={null}
            onNextRound={noop}
            onGameOver={noop}
          />
        </>
      )
    case 'gameOver_phos':
      return (
        <>
          <DevBackButton onBack={onBack} />
          <GameOverScreen
            result={{ winner: 'phos', condition: 'points', phosPoints: 2400, skotiaPoints: 900, skotiaPlayers: [{ id: 'u3', username: 'Bob' }] }}
            onReturnToLobbyList={onBack}
          />
        </>
      )
    case 'gameOver_skotia':
      return (
        <>
          <DevBackButton onBack={onBack} />
          <GameOverScreen
            result={{ winner: 'skotia', condition: 'points', phosPoints: 700, skotiaPoints: 2100, skotiaPlayers: [{ id: 'u3', username: 'Bob' }] }}
            onReturnToLobbyList={onBack}
          />
        </>
      )
    case 'movementB':
      return (
        <MockGameWrapper>
          <DevBackButton onBack={onBack} />
          <MovementBScreen
            token={null}
            gameId={MOCK_GAME_ID}
            currentUserId={MOCK_USER_ID}
            currentTeam="phos"
            currentGroupMembers={MOCK_GROUP_MEMBERS}
            movementBEndsAt={Date.now() + 180000}
            socket={null}
            onMovementEnd={noop}
          />
        </MockGameWrapper>
      )
    case 'taskRush':
      return (
        <>
          <TaskRushScreen movementTimeLeft={180} onBack={onBack} />
        </>
      )
    case 'coopLobby':
      return (
        <MockGameWrapper>
          <CoopLobbyScreen
            token={null}
            gameId={MOCK_GAME_ID}
            currentUserId={MOCK_USER_ID}
            groupMembers={MOCK_GROUP_MEMBERS}
            movementTimeLeft={180}
            socket={null}
            onBack={onBack}
            onSessionStart={noop}
          />
        </MockGameWrapper>
      )
    default:
      return null
  }
}

// ── Mock MovementA with pre-set phase ─────────────────────────────────────────

function MockMovementA({ phase: forcedPhase, promptMode: forcedPromptMode }) {
  // MovementAScreen relies on socket events and API calls for phase/prompt.
  // We render it directly; in dev mode the API calls will fail gracefully
  // but we inject a mock turn via a fake socket that immediately fires events.
  const [socket] = useState(() => {
    // Create a minimal fake socket that fires the right events on connect
    const listeners = {}
    const fakeSocket = {
      on(event, fn) {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(fn)
      },
      off(event, fn) {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((f) => f !== fn)
        }
      },
      emit() {},
      _fire(event, data) {
        ;(listeners[event] || []).forEach((fn) => fn(data))
      },
    }
    // After a short delay, fire events to put the screen in the desired phase
    setTimeout(() => {
      if (forcedPhase === 'my_turn') {
        fakeSocket._fire('turnStart', {
          currentPlayerId: MOCK_USER_ID,
          completedCount: 1,
          timeLimit: 30,
          turnOrder: MOCK_GROUP_MEMBERS.map((m) => String(m.id)),
        })
      } else if (forcedPhase === 'waiting') {
        fakeSocket._fire('turnStart', {
          currentPlayerId: 'dev-user-2',
          completedCount: 0,
          timeLimit: 30,
          turnOrder: MOCK_GROUP_MEMBERS.map((m) => String(m.id)),
        })
      } else if (forcedPhase === 'deliberation') {
        fakeSocket._fire('deliberationStart', {
          words: ['Shepherd', 'Light', 'Water', 'Bread', 'Peace'],
        })
      }
    }, 200)
    return fakeSocket
  })

  // Provide a fake prompt via a mock fetch override isn't easy here, so we
  // just render the real screen. The prompt will show "loading" without a
  // server but the phase will be correct via the fake socket events above.
  return (
    <MovementAScreen
      token="mock"
      gameId={MOCK_GAME_ID}
      currentUserId={MOCK_USER_ID}
      currentGroupId={MOCK_GROUP_ID}
      lobbyId={MOCK_LOBBY_ID}
      socket={socket}
      onMovementEnd={() => {}}
    />
  )
}

// ── Floating back button ──────────────────────────────────────────────────────

const floatBackBtn = {
  position: 'fixed',
  top: 12,
  left: 12,
  zIndex: 999,
  background: 'rgba(11,12,16,0.9)',
  border: '1px solid rgba(255,166,61,0.5)',
  borderRadius: 4,
  color: '#FFA63D',
  fontFamily: 'Rajdhani, sans-serif',
  fontSize: 13,
  fontWeight: 600,
  padding: '6px 12px',
  cursor: 'pointer',
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: { minHeight: '100vh', position: 'relative', padding: '24px 16px' },
  inner: {
    position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  header: { display: 'flex', alignItems: 'center', gap: 16 },
  backBtn: {
    background: 'none', border: 'none', color: '#ADB5BD',
    fontFamily: 'Rajdhani, sans-serif', fontSize: 13, cursor: 'pointer', padding: 0,
  },
  title: {
    fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 700,
    color: '#FFA63D', flex: 1,
  },
  sub: { fontFamily: 'Exo 2, sans-serif', fontSize: 13, color: '#6C757D' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  item: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px',
    background: 'rgba(31,40,51,0.85)',
    border: '1px solid rgba(255,166,61,0.15)',
    borderRadius: 6, cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  itemLabel: {
    fontFamily: 'Exo 2, sans-serif', fontSize: 14, color: '#F8F9FA',
  },
  arrow: {
    fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: '#FFA63D',
  },
}
