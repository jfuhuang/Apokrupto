import { createContext, useContext } from 'react';

export const GameContext = createContext(null);

const NOOP = () => {};

/** Access the shared game state from any screen inside the provider. */
export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) return { setSocketConnected: NOOP };
  return { setSocketConnected: NOOP, ...ctx };
};
