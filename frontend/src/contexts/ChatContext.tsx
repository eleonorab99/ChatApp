import React, {
  createContext,
  useReducer,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { AuthContext } from "./AuthContext";
import {
  ChatState,
  Message,
  OnlineUser,
  WebSocketMessage,
  WebSocketMessageType,
} from "../types/chat.types";
import chatService from "../services/chatService";
import websocketService from "../services/websocketService";

// Tipi di azioni per il reducer
type ChatAction =
  | { type: "FETCH_MESSAGES_START" }
  | { type: "FETCH_MESSAGES_SUCCESS"; payload: Message[] }
  | { type: "FETCH_MESSAGES_FAILURE"; payload: string }
  | { type: "SET_ONLINE_USERS"; payload: OnlineUser[] }
  | { type: "ADD_USER_ONLINE"; payload: OnlineUser }
  | { type: "REMOVE_USER_OFFLINE"; payload: number }
  | { type: "NEW_MESSAGE"; payload: Message }
  | { type: "SET_CURRENT_RECIPIENT"; payload: OnlineUser | null }
  | { type: "INCREMENT_UNREAD"; payload: number }
  | { type: "RESET_UNREAD"; payload: number }
  | { type: "CLEAR_MESSAGES" };

// Stato iniziale
const initialState: ChatState = {
  messages: [],
  onlineUsers: [],
  loading: false,
  error: null,
  currentRecipient: null,
  unreadCounts: {},
};

// Reducer per gestire lo stato della chat
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "FETCH_MESSAGES_START":
      return {
        ...state,
        loading: true,
        error: null,
      };
    case "FETCH_MESSAGES_SUCCESS":
      return {
        ...state,
        messages: action.payload,
        loading: false,
        error: null,
      };
    case "FETCH_MESSAGES_FAILURE":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case "SET_ONLINE_USERS":
      return {
        ...state,
        onlineUsers: action.payload,
      };
    case "ADD_USER_ONLINE":
      // Verifica se l'utente è già nella lista
      if (
        state.onlineUsers.some((user) => user.userId === action.payload.userId)
      ) {
        return state;
      }
      return {
        ...state,
        onlineUsers: [...state.onlineUsers, action.payload],
      };
    case "REMOVE_USER_OFFLINE":
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter(
          (user) => user.userId !== action.payload
        ),
        // Se l'utente corrente è quello che si è disconnesso, imposta currentRecipient a null
        currentRecipient:
          state.currentRecipient?.userId === action.payload
            ? null
            : state.currentRecipient,
      };
    case "NEW_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case "SET_CURRENT_RECIPIENT":
      return {
        ...state,
        currentRecipient: action.payload,
        // Resetta il contatore dei messaggi non letti per questo recipient
        unreadCounts: action.payload
          ? { ...state.unreadCounts, [action.payload.userId]: 0 }
          : state.unreadCounts,
      };
    case "INCREMENT_UNREAD":
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload]: (state.unreadCounts[action.payload] || 0) + 1,
        },
      };
    case "RESET_UNREAD":
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload]: 0,
        },
      };
    case "CLEAR_MESSAGES":
      return {
        ...state,
        messages: [],
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
}

// Crea il contesto di chat
export const ChatContext = createContext<ChatContextType>({
  ...initialState,
  sendMessage: () => {},
  sendFileMessage: async () => {},
  setCurrentRecipient: () => {},
  fetchMessages: async () => {},
  getTotalUnreadCount: () => 0,
});

// Provider per il contesto di chat
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { isAuthenticated, user } = useContext(AuthContext);

  // Gestisce i messaggi WebSocket
  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case WebSocketMessageType.ONLINE_USERS:
          if (Array.isArray(message.data)) {
            dispatch({ type: "SET_ONLINE_USERS", payload: message.data });
          }
          break;
        case WebSocketMessageType.USER_ONLINE:
          if (message.data) {
            dispatch({ type: "ADD_USER_ONLINE", payload: message.data });
          }
          break;
        case WebSocketMessageType.USER_OFFLINE:
          if (message.data?.userId) {
            dispatch({
              type: "REMOVE_USER_OFFLINE",
              payload: message.data.userId,
            });
          }
          break;
        case WebSocketMessageType.NEW_MESSAGE:
          if (message.data) {
            const newMessage = message.data as Message;
            dispatch({ type: "NEW_MESSAGE", payload: newMessage });

            // Incrementa il contatore dei messaggi non letti se il messaggio
            // non è del destinatario corrente e non è dal nostro utente
            if (
              user &&
              newMessage.senderId !== user.id &&
              (!state.currentRecipient ||
                newMessage.senderId !== state.currentRecipient.userId)
            ) {
              dispatch({
                type: "INCREMENT_UNREAD",
                payload: newMessage.senderId,
              });
            }
          }
          break;
        default:
          break;
      }
    },
    [state.currentRecipient, user]
  );

  // Configura il listener WebSocket quando l'autenticazione cambia
  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribe = websocketService.addMessageListener(
        handleWebSocketMessage
      );
      return unsubscribe;
    }
  }, [isAuthenticated, handleWebSocketMessage]);

  // Funzione per inviare un messaggio
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      websocketService.sendChatMessage(content, state.currentRecipient?.userId);
    },
    [state.currentRecipient]
  );

  // Funzione per inviare un messaggio con un file
  const sendFileMessage = useCallback(
    async (file: File): Promise<void> => {
      try {
        const response = await chatService.uploadFile(file);
        websocketService.sendChatMessage(
          `Ha condiviso un file: ${file.name}`,
          state.currentRecipient?.userId,
          response.fileUrl,
          file.size
        );
      } catch (error) {
        console.error("Errore durante l'upload del file:", error);
        let errorMessage = "Errore durante il caricamento del file";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        dispatch({ type: "FETCH_MESSAGES_FAILURE", payload: errorMessage });
        throw error;
      }
    },
    [state.currentRecipient]
  );

  // Funzione per recuperare i messaggi
  const fetchMessages = useCallback(async () => {
    if (!isAuthenticated) return;

    dispatch({ type: "CLEAR_MESSAGES" });
    dispatch({ type: "FETCH_MESSAGES_START" });

    try {
      let messages: Message[] = [];

      if (state.currentRecipient) {
        messages = await chatService.getMessages(state.currentRecipient.userId);
        // Resetta il contatore dei messaggi non letti
        dispatch({
          type: "RESET_UNREAD",
          payload: state.currentRecipient.userId,
        });
      }

      dispatch({ type: "FETCH_MESSAGES_SUCCESS", payload: messages });
    } catch (error) {
      console.error("Errore durante il recupero dei messaggi:", error);
      let errorMessage = "Errore durante il recupero dei messaggi";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: "FETCH_MESSAGES_FAILURE", payload: errorMessage });
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
    return Object.values(state.unreadCounts).reduce(
      (acc, count) => acc + count,
      0
    );
  }, [state.unreadCounts]);

  // Funzione per impostare il destinatario corrente
  const setCurrentRecipient = useCallback((recipient: OnlineUser | null) => {
    dispatch({ type: "SET_CURRENT_RECIPIENT", payload: recipient });
  }, []);

  // Valore del contesto
  const chatContextValue: ChatContextType = {
    ...state,
    sendMessage,
    sendFileMessage,
    setCurrentRecipient,
    fetchMessages,
    getTotalUnreadCount,
  };

  return (
    <ChatContext.Provider value={chatContextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;
