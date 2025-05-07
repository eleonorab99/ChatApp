import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  onlineUsers: Array<{ userId: number; username: string }>;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userId: number; username: string }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;

    const connectWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.hostname}:3000?token=${token}`;
      console.log('Tentativo di connessione WebSocket a:', wsUrl);
      
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connesso');
        setIsConnected(true);
        setReconnectAttempt(0);
      };

      socket.onclose = () => {
        console.log('WebSocket disconnesso');
        setIsConnected(false);
        // Tentativo di riconnessione con backoff esponenziale
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
          connectWebSocket();
        }, timeout);
      };

      socket.onerror = (error) => {
        console.error('Errore WebSocket:', error);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'online_users') {
            setOnlineUsers(data.data);
          }
        } catch (error) {
          console.error('Errore nel parsing del messaggio:', error);
        }
      };

      setWs(socket);
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [token]);

  const sendMessage = (message: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket non connesso');
    }
  };

  return (
    <WebSocketContext.Provider value={{ sendMessage, onlineUsers, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}; 