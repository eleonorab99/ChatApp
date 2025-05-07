import React, { createContext, useReducer, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { ChatState, Message, OnlineUser, WebSocketMessage, WebSocketMessageType } from '../types/chat.types';
import chatService from '../services/chatService';
import websocketService from '../services/websocketService';

// Tipi di azioni per il reducer
type ChatAction =
  | { type: 'FETCH_MESSAGES_START' }
  | { type: 'FETCH_MESSAGES_SUCCESS'; payload: Message[] }
  | { type: 'FETCH_MESSAGES_FAILURE'; payload: string }
  | { type: 'SET_ONLINE_USERS'; payload: OnlineUser[] }
  | { type: 'ADD_USER_ONLINE'; payload: OnlineUser }
  | { type: 'REMOVE_USER_OFFLINE'; payload: number }
  | { type: 'NEW_MESSAGE'; payload: Message }
  | { type: 'SEND_MESSAGE'; payload: Message }
  | { type: 'SET_CURRENT_RECIPIENT'; payload: OnlineUser | null }
  | { type: 'INCREMENT_UNREAD'; payload: number }
  | { type: 'RESET_UNREAD'; payload: number }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' | 'reconnecting' };

// Stato iniziale
const initialState: ChatState = {
  messages: [],
  onlineUsers: [],
  loading: false,
  error: null,
  currentRecipient: null,
  unreadCounts: {},
  connectionStatus: 'disconnected',
};

// Reducer per gestire lo stato della chat
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'FETCH_MESSAGES_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_MESSAGES_SUCCESS':
      return {
        ...state,
        messages: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_MESSAGES_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'SET_ONLINE_USERS':
      return {
        ...state,
        onlineUsers: action.payload,
      };
    case 'ADD_USER_ONLINE':
      // Verifica se l'utente è già nella lista
      if (state.onlineUsers.some(user => user.userId === action.payload.userId)) {
        return state;
      }
      return {
        ...state,
        onlineUsers: [...state.onlineUsers, action.payload],
      };
    case 'REMOVE_USER_OFFLINE':
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter(user => user.userId !== action.payload),
        // Se l'utente corrente è quello che si è disconnesso, imposta currentRecipient a null
        currentRecipient: state.currentRecipient?.userId === action.payload ? null : state.currentRecipient,
      };
    case 'NEW_MESSAGE':
      // Verifica se il messaggio è già presente nella lista
      if (state.messages.some(msg => msg.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'SEND_MESSAGE':
      // Per i messaggi inviati dall'utente, li aggiungiamo subito all'interfaccia
      // anche prima della conferma dal server, per un feedback immediato
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'SET_CURRENT_RECIPIENT':
      return {
        ...state,
        currentRecipient: action.payload,
        // Resetta il contatore dei messaggi non letti per questo recipient
        unreadCounts: action.payload
          ? { ...state.unreadCounts, [action.payload.userId]: 0 }
          : state.unreadCounts,
      };
    case 'INCREMENT_UNREAD':
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload]: (state.unreadCounts[action.payload] || 0) + 1,
        },
      };
    case 'RESET_UNREAD':
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload]: 0,
        },
      };
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: []
      };
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload
      };
    default:
      return state;
  }
};

// Tipo per il contesto
interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  sendFileMessage: (file: File) => Promise<void>;
  setCurrentRecipient: (recipient: OnlineUser | null) => void;
  fetchMessages: () => Promise<void>;
  getTotalUnreadCount: () => number;
  reconnectWebSocket: () => void;
}

// Crea il contesto di chat
export const ChatContext = createContext<ChatContextType>({
  ...initialState,
  sendMessage: () => {},
  sendFileMessage: async () => {},
  setCurrentRecipient: () => {},
  fetchMessages: async () => {},
  getTotalUnreadCount: () => 0,
  reconnectWebSocket: () => {}
});

// Provider per il contesto di chat
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { isAuthenticated, user } = useContext(AuthContext);

  // Aggiorna lo stato di connessione quando cambia
  useEffect(() => {
    const handleConnectionChange = (status: 'connected' | 'disconnected' | 'reconnecting') => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
    };

    websocketService.onConnectionStatusChange(handleConnectionChange);
    
    // Imposta lo stato iniziale
    const currentStatus = websocketService.isConnected() 
      ? 'connected' 
      : 'disconnected';
    
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: currentStatus });

    return () => {
      websocketService.offConnectionStatusChange(handleConnectionChange);
    };
  }, []);

  // Gestisce i messaggi WebSocket
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case WebSocketMessageType.ONLINE_USERS:
        if (Array.isArray(message.data)) {
          dispatch({ type: 'SET_ONLINE_USERS', payload: message.data });
        }
        break;
      case WebSocketMessageType.USER_ONLINE:
        if (message.data) {
          dispatch({ type: 'ADD_USER_ONLINE', payload: message.data });
        }
        break;
      case WebSocketMessageType.USER_OFFLINE:
        if (message.data?.userId) {
          dispatch({ type: 'REMOVE_USER_OFFLINE', payload: message.data.userId });
        }
        break;
      case WebSocketMessageType.NEW_MESSAGE:
        if (message.data) {
          const newMessage = message.data as Message;
          
          // Verifichiamo se il messaggio è stato inviato da noi
          // Se sì, lo ignoriamo perché lo abbiamo già aggiunto con SEND_MESSAGE
          if (user && newMessage.senderId === user.id) {
            return;
          }
          
          dispatch({ type: 'NEW_MESSAGE', payload: newMessage });
          
          // Incrementa il contatore dei messaggi non letti se il messaggio
          // non è del destinatario corrente e non è dal nostro utente
          if (
            user && 
            newMessage.senderId !== user.id && 
            (!state.currentRecipient || newMessage.senderId !== state.currentRecipient.userId)
          ) {
            dispatch({ type: 'INCREMENT_UNREAD', payload: newMessage.senderId });
          }
        }
        break;
      default:
        break;
    }
  }, [state.currentRecipient, user]);

  // Configura il listener WebSocket quando l'autenticazione cambia
  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribe = websocketService.addMessageListener(handleWebSocketMessage);
      return unsubscribe;
    }
  }, [isAuthenticated, handleWebSocketMessage]);

  // Funzione per riconnettersi a WebSocket
  const reconnectWebSocket = useCallback(() => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'reconnecting' });
    
    const token = localStorage.getItem('token');
    if (token) {
      websocketService.reconnect(token);
    }
  }, []);

  // Funzione per inviare un messaggio
  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !user) return;
    
    // Crea un messaggio temporaneo da mostrare subito nell'UI
    const tempMessage: Message = {
      id: Date.now(), // ID temporaneo, verrà sostituito da quello del server
      content: content,
      senderId: user.id,
      receiverId: state.currentRecipient?.userId || null,
      fileUrl: null,
      fileSize: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: user
    };
    
    // Dispatch per aggiungere subito il messaggio all'UI
    dispatch({ type: 'SEND_MESSAGE', payload: tempMessage });
    
    // Invia il messaggio tramite WebSocket
    websocketService.sendChatMessage(
      content,
      state.currentRecipient?.userId
    );
  }, [state.currentRecipient, user]);

  // Funzione per inviare un messaggio con un file
  const sendFileMessage = useCallback(async (file: File): Promise<void> => {
    if (!user) return;
    
    try {
      const response = await chatService.uploadFile(file);
      
      // Crea un messaggio temporaneo da mostrare subito nell'UI
      const tempMessage: Message = {
        id: Date.now(), // ID temporaneo
        content: `Ha condiviso un file: ${file.name}`,
        senderId: user.id,
        receiverId: state.currentRecipient?.userId || null,
        fileUrl: response.fileUrl,
        fileSize: file.size,
        fileType: file.type, // Aggiungiamo il tipo di file
        fileName: file.name, // Aggiungiamo il nome del file
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: user
      };
      
      // Dispatch per aggiungere subito il messaggio all'UI
      dispatch({ type: 'SEND_MESSAGE', payload: tempMessage });
      
      // Invia il messaggio tramite WebSocket
      websocketService.sendChatMessage(
        `Ha condiviso un file: ${file.name}`,
        state.currentRecipient?.userId,
        response.fileUrl,
        file.size,
        file.type,
        file.name
      );
    } catch (error) {
      console.error('Errore durante l\'upload del file:', error);
      let errorMessage = 'Errore durante il caricamento del file';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: 'FETCH_MESSAGES_FAILURE', payload: errorMessage });
      throw error;
    }
  }, [state.currentRecipient, user]);

  // Funzione per recuperare i messaggi
  const fetchMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    
    dispatch({ type: 'CLEAR_MESSAGES' });
    dispatch({ type: 'FETCH_MESSAGES_START' });
    
    try {
      let messages: Message[] = [];
      
      if (state.currentRecipient) {
        messages = await chatService.getMessages(state.currentRecipient.userId);
        // Resetta il contatore dei messaggi non letti
        dispatch({ type: 'RESET_UNREAD', payload: state.currentRecipient.userId });
      } else {
        // Messaggi per la chat globale
        messages = await chatService.getMessages();
      }
      
      dispatch({ type: 'FETCH_MESSAGES_SUCCESS', payload: messages });
    } catch (error) {
      console.error('Errore durante il recupero dei messaggi:', error);
      let errorMessage = 'Errore durante il recupero dei messaggi';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: 'FETCH_MESSAGES_FAILURE', payload: errorMessage });
    }
  }, [isAuthenticated, state.currentRecipient]);

  // Effettua il fetch dei messaggi quando cambia il destinatario
  useEffect(() => {
    if (isAuthenticated) {
      fetchMessages();
    }
  }, [isAuthenticated, state.currentRecipient, fetchMessages]);

  // Funzione per ottenere il numero totale di messaggi non letti
  const getTotalUnreadCount = useCallback((): number => {
    return Object.values(state.unreadCounts).reduce((acc, count) => acc + count, 0);
  }, [state.unreadCounts]);

  // Funzione per impostare il destinatario corrente
  const setCurrentRecipient = useCallback((recipient: OnlineUser | null) => {
    dispatch({ type: 'SET_CURRENT_RECIPIENT', payload: recipient });
  }, []);

  // Valore del contesto
  const chatContextValue: ChatContextType = {
    ...state,
    sendMessage,
    sendFileMessage,
    setCurrentRecipient,
    fetchMessages,
    getTotalUnreadCount,
    reconnectWebSocket
  };

  return (
    <ChatContext.Provider value={chatContextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;