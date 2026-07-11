import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../api/axios';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);

  useEffect(() => {
    if (!user) return undefined;

    const socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
      auth: { token: getAccessToken() }
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification', (payload) => {
      setLiveNotifications((prev) => [payload, ...prev].slice(0, 20));
    });

    return () => socket.disconnect();
  }, [user]);

  return (
    <SocketContext.Provider value={{ connected, liveNotifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
