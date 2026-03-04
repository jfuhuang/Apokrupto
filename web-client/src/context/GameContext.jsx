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
      team: d.team !== undefined ? d.team : prev.team,
      isMarked: d.isMarked !== undefined ? d.isMarked : prev.isMarked,
      groupId: d.groupId !== undefined ? d.groupId : prev.groupId,
      groupIndex: d.groupIndex !== undefined ? d.groupIndex : prev.groupIndex,
      groupMembers: d.groupMembers !== undefined ? d.groupMembers : prev.groupMembers,
      teamPoints: d.teamPoints !== undefined ? d.teamPoints : prev.teamPoints,
      currentRound: d.currentRound !== undefined ? d.currentRound : prev.currentRound,
      totalRounds: d.totalRounds !== undefined ? d.totalRounds : prev.totalRounds,
      currentMovement: d.currentMovement !== undefined ? d.currentMovement : prev.currentMovement,
      gameStatus: d.gameStatus !== undefined ? d.gameStatus : prev.gameStatus,
      winner: d.winner !== undefined ? d.winner : prev.winner,
      winCondition: d.winCondition !== undefined ? d.winCondition : prev.winCondition,
      movementBEndsAt: d.movementBEndsAt !== undefined ? d.movementBEndsAt : prev.movementBEndsAt,
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
