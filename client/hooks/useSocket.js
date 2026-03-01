import { useRef, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { getApiUrl } from '../utils/networkUtils';

/**
 * Manages the socket.io connection lifecycle.
 * Connects on mount, joins the specified rooms on connect, disconnects on unmount.
 *
 * @param {object} options
 * @param {string} options.token  - JWT auth token
 * @param {string[]} options.rooms - Room IDs to join via joinRoom event on connect
 * @returns {{ socketRef: React.MutableRefObject, socket: object|null }}
 */
export function useSocket({ token, rooms = [] }) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let s;
    (async () => {
      const baseUrl = await getApiUrl();
      s = io(baseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      socketRef.current = s;
      s.on('connect', () => {
        rooms.forEach((r) => s.emit('joinRoom', { lobbyId: r }));
      });
      setSocket(s);
    })().catch(console.error);

    return () => {
      s?.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return { socketRef, socket };
}
