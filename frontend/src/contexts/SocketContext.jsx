import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../api/axios';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return undefined;

    const socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
      auth: { token: getAccessToken() }
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification', () => {
      // The notification is already persisted server-side by the time this event fires —
      // just refetch so the unread count (and the panel, if open) picks it up immediately.
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => socket.disconnect();
  }, [user, queryClient]);

  return (
    <SocketContext.Provider value={{ connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
