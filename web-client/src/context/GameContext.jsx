import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchGameState } from '../utils/api.js'

const defaultState = {
  team: null,
  isMarked: false,
  groupId: null,
  groupIndex: null,
  groupMembers: [],
  teamPoints: { phos: 0, skotia: 0 },
  currentRound: 1,
  totalRounds: 3,
  currentMovement: null,
  gameStatus: null,
  winner: null,
  winCondition: null,
  movementBEndsAt: null,
  refresh: () => {},
}

export const GameContext = createContext(defaultState)

export function GameProvider({ token, gameId, children }) {
  const [data, setData] = useState(defaultState)

  const refresh = useCallback(async () => {
    if (!token || !gameId) return null
    const res = await fetchGameState(token, gameId)
    if (!res.ok) return null
    const d = res.data
    setData((prev) => ({
      team: d.team ?? prev.team,
      isMarked: d.isMarked ?? prev.isMarked,
      groupId: d.groupId ?? prev.groupId,
      groupIndex: d.groupIndex ?? prev.groupIndex,
      groupMembers: d.groupMembers ?? prev.groupMembers,
      teamPoints: d.teamPoints ?? prev.teamPoints,
      currentRound: d.currentRound ?? prev.currentRound,
      totalRounds: d.totalRounds ?? prev.totalRounds,
      currentMovement: d.currentMovement ?? prev.currentMovement,
      gameStatus: d.gameStatus ?? prev.gameStatus,
      winner: d.winner ?? prev.winner,
      winCondition: d.winCondition ?? prev.winCondition,
      movementBEndsAt: d.movementBEndsAt ?? prev.movementBEndsAt,
    }))
    return d
  }, [token, gameId])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <GameContext.Provider value={{ ...data, refresh }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGameContext = () => useContext(GameContext)
