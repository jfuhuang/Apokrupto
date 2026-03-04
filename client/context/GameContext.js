import { createContext, useContext } from 'react';

export const GameContext = createContext(null);

const NOOP = () => {};

/**
 * Access shared game state and handlers from any screen inside the provider.
 *
 * Fields available (all from App.js contextValue):
 *   token, lobbyId, currentUserId,
 *   gameId, currentTeam, skotiaTeammates, isSus, isGm,
 *   currentGroupId, currentGroupNumber, currentGroupMembers,
 *   teamPoints, currentRound, totalRounds, currentMovement, movementBEndsAt,
 *   roundSummary, gameOverResult,
 *   setSocketConnected, resetGameState,
 *   handleTeamAssigned, handleGameStarted, handleMovementReady, etc.
 */
export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) return { setSocketConnected: NOOP };
  return { setSocketConnected: NOOP, ...ctx };
};
