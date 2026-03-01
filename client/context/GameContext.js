import { createContext, useContext } from 'react';

export const GameContext = createContext(null);

/** Access the shared game state from any screen inside the provider. */
export const useGame = () => useContext(GameContext);
