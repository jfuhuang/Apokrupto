import { useState, useEffect } from 'react';

/**
 * Returns the number of seconds remaining until `endsAt` (epoch ms),
 * updating every second. Returns null if endsAt is falsy.
 */
export function useCountdown(endsAt) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    endsAt ? Math.max(0, Math.round((endsAt - Date.now()) / 1000)) : null
  );

  useEffect(() => {
    if (!endsAt) { setSecondsLeft(null); return; }
    const tick = () => setSecondsLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return secondsLeft;
}
