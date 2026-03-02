import { useState } from 'react';

/**
 * Encapsulates all game-session state and the handlers that mutate it,
 * keeping App.js focused on auth, lobby, and navigation.
 *
 * @param {{ setCurrentScreen: (screen: string) => void }} options
 * @returns {{ state, handlers, resetGameState, setters }}
 */
export function useGameState({ setCurrentScreen }) {
  const [gameId,               setGameId]               = useState(null);
  const [totalRounds,          setTotalRounds]          = useState(4);
  const [currentRound,         setCurrentRound]         = useState(1);
  const [currentMovement,      setCurrentMovement]      = useState(null);
  const [currentTeam,          setCurrentTeam]          = useState(null);
  const [skotiaTeammates,      setSkotiaTeammates]      = useState([]);
  const [isMarked,             setIsMarked]             = useState(false);
  const [isGm,                 setIsGm]                 = useState(false);
  const [currentGroupId,       setCurrentGroupId]       = useState(null);
  const [currentGroupNumber,   setCurrentGroupNumber]   = useState(null);
  const [currentGroupMembers,  setCurrentGroupMembers]  = useState([]);
  const [teamPoints,           setTeamPoints]           = useState({ phos: 0, skotia: 0 });
  const [movementBEndsAt,      setMovementBEndsAt]      = useState(null);
  const [roundSummary,         setRoundSummary]         = useState(null);
  const [gameOverResult,       setGameOverResult]       = useState(null);

  const resetGameState = () => {
    setGameId(null);
    setTotalRounds(4);
    setCurrentRound(1);
    setCurrentMovement(null);
    setCurrentTeam(null);
    setSkotiaTeammates([]);
    setIsMarked(false);
    setIsGm(false);
    setCurrentGroupId(null);
    setCurrentGroupNumber(null);
    setCurrentGroupMembers([]);
    setTeamPoints({ phos: 0, skotia: 0 });
    setMovementBEndsAt(null);
    setRoundSummary(null);
    setGameOverResult(null);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTeamAssigned = (team, teammates = [], gmFlag = false, groupId = null, groupNumber = null, groupMembers = []) => {
    setCurrentTeam(team);
    setSkotiaTeammates(teammates);
    setIsGm(gmFlag);
    if (groupId) setCurrentGroupId(groupId);
    if (groupNumber != null) setCurrentGroupNumber(groupNumber);
    if (groupMembers.length > 0) setCurrentGroupMembers(groupMembers);
  };

  const handleGameStarted = (gId) => {
    if (gId) setGameId(gId);
    setCurrentScreen('countdown');
  };

  const handleMovementReady = (movement, groupId, groupMembers, groupNumber, extra = {}) => {
    setCurrentMovement(movement);
    if (groupId) setCurrentGroupId(groupId);
    if (groupMembers) setCurrentGroupMembers(groupMembers);
    if (groupNumber != null) setCurrentGroupNumber(groupNumber);
    if (movement === 'B' && extra.movementBEndsAt) setMovementBEndsAt(extra.movementBEndsAt);
    if (movement === 'A') setCurrentScreen('movementA');
    else if (movement === 'B') setCurrentScreen('movementB');
    else if (movement === 'C') setCurrentScreen('movementC');
  };

  const handleMovementAComplete = () => setCurrentScreen('roundHub');

  const handleMovementCComplete = () => setCurrentScreen('roundHub');

  const handleMarkStatusUpdate = (marked) => setIsMarked(marked);

  const handleRoundSummary = (summary) => {
    setRoundSummary(summary || null);
    setCurrentScreen('roundSummary');
  };

  const handleGameStateUpdate = ({
    gameId: gId, totalRounds: tr, currentRound: cr,
    teamPoints: tp, isMarked: im, isGm: gm,
  } = {}) => {
    if (gId !== undefined) setGameId(gId);
    if (tr  !== undefined) setTotalRounds(tr);
    if (cr  !== undefined) setCurrentRound(cr);
    if (tp  !== undefined) setTeamPoints(tp);
    if (im  !== undefined) setIsMarked(im);
    if (gm  !== undefined) setIsGm(gm);
  };

  const handleRoundSetup = ({ roundNumber, groupId, groupNumber, groupMembers, teamPoints: tp }) => {
    if (roundNumber) setCurrentRound(roundNumber);
    if (groupId) setCurrentGroupId(String(groupId));
    if (groupNumber != null) setCurrentGroupNumber(groupNumber);
    if (groupMembers) setCurrentGroupMembers(groupMembers);
    if (tp) setTeamPoints(tp);
    setRoundSummary(null);
    setCurrentScreen('roundHub');
  };

  const handleRoundSummaryContinue = () => {
    if (currentRound >= totalRounds) {
      setCurrentScreen('gameOver');
    } else {
      setRoundSummary(null);
      setCurrentScreen('roundHub');
    }
  };

  const handleGameOver = ({ winner, reason, phosPoints, skotiaPoints, skotiaPlayers, condition } = {}) => {
    setGameOverResult({ winner, reason, phosPoints, skotiaPoints, skotiaPlayers, condition });
    setCurrentScreen('gameOver');
  };

  const state = {
    gameId, currentTeam, skotiaTeammates, isMarked, isGm,
    currentGroupId, currentGroupNumber, currentGroupMembers,
    teamPoints, currentRound, totalRounds, currentMovement,
    movementBEndsAt, roundSummary, gameOverResult,
  };

  const handlers = {
    handleTeamAssigned, handleGameStarted, handleMovementReady,
    handleMovementAComplete, handleMovementCComplete, handleMarkStatusUpdate,
    handleRoundSummary, handleGameStateUpdate, handleRoundSetup,
    handleRoundSummaryContinue, handleGameOver,
  };

  // Expose individual setters for App.js sync polling and checkExistingToken
  const setters = {
    setGameId, setCurrentTeam, setIsGm, setIsMarked,
    setCurrentGroupId, setCurrentGroupNumber, setCurrentGroupMembers,
    setTeamPoints, setCurrentMovement, setMovementBEndsAt,
    setCurrentRound, setTotalRounds,
  };

  return { state, handlers, resetGameState, setters };
}
