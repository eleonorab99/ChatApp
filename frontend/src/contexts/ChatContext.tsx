import React, { createContext, useReducer, useEffect, useContext, useCallback, useState, useRef } from 'react';
import { AuthContext } from './AuthContext';
import { ChatState, Message, WebSocketMessage, WebSocketMessageType } from '../types/chat.types';
import { Contact } from '../types/user.types';
import chatService from '../services/chatService';
import websocketService from '../services/websocketService';

// Tipi di azioni per il reducer
type ChatAction =
  | { type: 'FETCH_MESSAGES_START' }
  | { type: 'FETCH_MESSAGES_SUCCESS'; payload: { userId: number; messages: Message[] } }
  | { type: 'FETCH_ALL_MESSAGES_SUCCESS'; payload: Record<number, Message[]> }
  | { type: 'FETCH_MESSAGES_FAILURE'; payload: string }
  | { type: 'SET_ONLINE_USERS'; payload: Contact[] }
  | { type: 'SET_ALL_CONTACTS'; payload: Contact[] }
  | { type: 'UPDATE_USER_STATUS'; payload: { userId: number; isOnline: boolean; lastSeen?: string } }
  | { type: 'ADD_USER_ONLINE'; payload: Contact }
  | { type: 'ADD_CONTACT'; payload: Contact }
  | { type: 'NEW_MESSAGE'; payload: { userId: number; message: Message } }
  | { type: 'SEND_MESSAGE'; payload: { userId: number; message: Message } }
  | { type: 'SET_CURRENT_RECIPIENT'; payload: Contact | null }
  | { type: 'INCREMENT_UNREAD'; payload: number }
  | { type: 'RESET_UNREAD'; payload: number }
  | { type: 'CLEAR_MESSAGES'; payload: number }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' | 'reconnecting' };

// Stato iniziale
const initialState: ChatState = {
  messages: {},
  onlineUsers: [],
  allContacts: [],
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
        messages: {
          ...state.messages,
          [action.payload.userId]: action.payload.messages,
        },
        loading: false,
        error: null,
      };
    case 'FETCH_ALL_MESSAGES_SUCCESS':
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
    case 'SET_ONLINE_USERS': {
      // Aggiorna la lista di utenti online
      const updatedContacts = [...state.allContacts];
      
      // Aggiorna lo stato online di tutti i contatti esistenti
      updatedContacts.forEach(contact => {
        const onlineUser = action.payload.find(user => user.userId === contact.userId);
        if (onlineUser) {
          contact.isOnline = true;
        } else {
          contact.isOnline = false;
          // Se abbiamo una data di ultima connessione, la manteniamo
          if (!contact.lastSeen) {
            contact.lastSeen = new Date().toISOString();
          }
        }
      });
      
      // Aggiungi eventuali nuovi contatti online che non esistono ancora
      action.payload.forEach(onlineUser => {
        if (!updatedContacts.some(contact => contact.userId === onlineUser.userId)) {
          updatedContacts.push({
            ...onlineUser,
            isOnline: true,
            unreadCount: state.unreadCounts[onlineUser.userId] || 0
          });
        }
      });
      
      return {
        ...state,
        onlineUsers: action.payload,
        allContacts: updatedContacts,
      };
    }
    case 'SET_ALL_CONTACTS':
      return {
        ...state,
        allContacts: action.payload,
      };
    case 'UPDATE_USER_STATUS': {
      // Aggiorna lo stato di un utente specifico
      const { userId, isOnline, lastSeen } = action.payload;
      
      // Aggiorna nella lista di tutti i contatti
      const updatedContacts = state.allContacts.map(contact => {
        if (contact.userId === userId) {
          return { 
            ...contact, 
            isOnline, 
            lastSeen: lastSeen || contact.lastSeen 
          };
        }
        return contact;
      });
      
      // Aggiorna nella lista di utenti online
      let updatedOnlineUsers = [...state.onlineUsers];
      if (isOnline) {
        // Se l'utente è online, aggiungerlo agli utenti online se non c'è già
        const existingOnlineUser = updatedOnlineUsers.find(user => user.userId === userId);
        if (!existingOnlineUser) {
          const contact = updatedContacts.find(c => c.userId === userId);
          if (contact) {
            updatedOnlineUsers.push(contact);
          }
        }
      } else {
        // Se l'utente è offline, rimuoverlo dagli utenti online
        updatedOnlineUsers = updatedOnlineUsers.filter(user => user.userId !== userId);
      }
      
      // Aggiorna anche il currentRecipient se è l'utente che ha cambiato stato
      let updatedCurrentRecipient = state.currentRecipient;
      if (state.currentRecipient?.userId === userId) {
        const updatedContact = updatedContacts.find(c => c.userId === userId);
        if (updatedContact) {
          updatedCurrentRecipient = updatedContact;
        }
      }
      
      return {
        ...state,
        onlineUsers: updatedOnlineUsers,
        allContacts: updatedContacts,
        currentRecipient: updatedCurrentRecipient
      };
    }
    case 'ADD_USER_ONLINE': {
      // Aggiungi un utente alla lista di online se non è già presente
      if (state.onlineUsers.some(user => user.userId === action.payload.userId)) {
        return state;
      }
      
      // Aggiungi il contatto alla lista di tutti i contatti se non esiste già
      let updatedContacts = [...state.allContacts];
      const existingContact = updatedContacts.find(c => c.userId === action.payload.userId);
      
      if (!existingContact) {
        updatedContacts.push({
          ...action.payload,
          isOnline: true,
          unreadCount: state.unreadCounts[action.payload.userId] || 0
        });
      } else {
        // Aggiorna lo stato del contatto esistente
        updatedContacts = updatedContacts.map(contact => {
          if (contact.userId === action.payload.userId) {
            return { ...contact, isOnline: true };
          }
          return contact;
        });
      }
      
      return {
        ...state,
        onlineUsers: [...state.onlineUsers, action.payload],
        allContacts: updatedContacts,
      };
    }
    case 'ADD_CONTACT': {
      // Aggiungi o aggiorna un contatto nella lista
      const existingContact = state.allContacts.find(c => c.userId === action.payload.userId);
      
      if (!existingContact) {
        // Nuovo contatto
        return {
          ...state,
          allContacts: [...state.allContacts, action.payload],
        };
      } else {
        // Aggiorna contatto esistente
        return {
          ...state,
          allContacts: state.allContacts.map(contact => {
            if (contact.userId === action.payload.userId) {
              return { 
                ...contact, 
                ...action.payload,
                // Manteniamo alcuni campi se non specificati nel payload
                isOnline: action.payload.isOnline !== undefined ? action.payload.isOnline : contact.isOnline,
                lastSeen: action.payload.lastSeen || contact.lastSeen,
                unreadCount: action.payload.unreadCount !== undefined 
                  ? action.payload.unreadCount 
                  : state.unreadCounts[contact.userId] || 0
              };
            }
            return contact;
          }),
        };
      }
    }
    case 'NEW_MESSAGE': {
      const { userId, message } = action.payload;
      
      // Aggiungi il messaggio alla conversazione
      const currentMessages = state.messages[userId] || [];
      
      // Verifica se il messaggio è già presente
      if (currentMessages.some(msg => msg.id === message.id)) {
        return state;
      }
      
      // Aggiorna il contatto con l'ultimo messaggio
      const updatedContacts = state.allContacts.map(contact => {
        if (contact.userId === userId) {
          return {
            ...contact,
            lastMessage: {
              content: message.content,
              timestamp: message.createdAt
            }
          };
        }
        return contact;
      });
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [userId]: [...currentMessages, message]
        },
        allContacts: updatedContacts
      };
    }
    case 'SEND_MESSAGE': {
      const { userId, message } = action.payload;
      
      // Aggiungi il messaggio alla conversazione
      const currentMessages = state.messages[userId] || [];
      
      // Aggiorna il contatto con l'ultimo messaggio
      const updatedContacts = state.allContacts.map(contact => {
        if (contact.userId === userId) {
          return {
            ...contact,
            lastMessage: {
              content: message.content,
              timestamp: message.createdAt
            }
          };
        }
        return contact;
      });
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [userId]: [...currentMessages, message]
        },
        allContacts: updatedContacts
      };
    }
    case 'SET_CURRENT_RECIPIENT':
      // Debug
      console.log("Setting current recipient:", action.payload);
      
      return {
        ...state,
        currentRecipient: action.payload,
        // Resetta il contatore dei messaggi non letti per questo recipient
        unreadCounts: action.payload
          ? { ...state.unreadCounts, [action.payload.userId]: 0 }
          : state.unreadCounts,
      };
    case 'INCREMENT_UNREAD': {
      const userId = action.payload;
      const newCount = (state.unreadCounts[userId] || 0) + 1;
      
      // Aggiorna anche il contatto
      const updatedContacts = state.allContacts.map(contact => {
        if (contact.userId === userId) {
          return {
            ...contact,
            unreadCount: newCount
          };
        }
        return contact;
      });
      
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [userId]: newCount,
        },
        allContacts: updatedContacts
      };
    }
    case 'RESET_UNREAD': {
      const userId = action.payload;
      
      // Aggiorna anche il contatto
      const updatedContacts = state.allContacts.map(contact => {
        if (contact.userId === userId) {
          return {
            ...contact,
            unreadCount: 0
          };
        }
        return contact;
      });
      
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [userId]: 0,
        },
        allContacts: updatedContacts
      };
    }
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload]: []
        }
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
  setCurrentRecipient: (recipient: Contact | null) => void;
  fetchMessages: () => Promise<void>;
  fetchAllContacts: () => Promise<void>;
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
  fetchAllContacts: async () => {},
  getTotalUnreadCount: () => 0,
  reconnectWebSocket: () => {}
});

// Chiave per il localStorage
const CONTACTS_STORAGE_KEY = 'chat_contacts';
const MESSAGES_STORAGE_KEY = 'chat_messages';
const UNREAD_COUNTS_KEY = 'chat_unread_counts';

// Provider per il contesto di chat
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { isAuthenticated, user } = useContext(AuthContext);
  const [isInitialized, setIsInitialized] = useState(false);
  const contactsInitialized = useRef(false);

  // Carica i contatti salvati dal localStorage all'avvio
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      try {
        // Carica i contatti
        const savedContactsJson = localStorage.getItem(CONTACTS_STORAGE_KEY);
        if (savedContactsJson) {
          try {
            const savedContacts = JSON.parse(savedContactsJson) as Contact[];
            dispatch({ type: 'SET_ALL_CONTACTS', payload: savedContacts });
          } catch (e) {
            console.error("Errore nel parsing dei contatti salvati:", e);
          }
        }

        // Carica i messaggi
        const savedMessagesJson = localStorage.getItem(MESSAGES_STORAGE_KEY);
        if (savedMessagesJson) {
          try {
            const savedMessages = JSON.parse(savedMessagesJson) as Record<number, Message[]>;
            dispatch({ type: 'FETCH_ALL_MESSAGES_SUCCESS', payload: savedMessages });
          } catch (e) {
            console.error("Errore nel parsing dei messaggi salvati:", e);
          }
        }

        // Carica i contatori di messaggi non letti
        const savedUnreadCountsJson = localStorage.getItem(UNREAD_COUNTS_KEY);
        if (savedUnreadCountsJson) {
          try {
            const savedUnreadCounts = JSON.parse(savedUnreadCountsJson) as Record<number, number>;
            
            // Aggiorna i contatori degli utenti (verrà fatto in SET_ALL_CONTACTS)
          } catch (e) {
            console.error("Errore nel parsing dei contatori di messaggi non letti salvati:", e);
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Errore nel caricamento dei dati salvati:', error);
        setIsInitialized(true); // Imposta comunque a true per evitare loop
      }
    }
  }, [isAuthenticated, isInitialized]);

  // Carica i contatti dal server una sola volta all'inizializzazione
  useEffect(() => {
    if (isAuthenticated && isInitialized && !contactsInitialized.current) {
      contactsInitialized.current = true;
      fetchAllContacts();
    }
  }, [isAuthenticated, isInitialized]);

  // Salva i contatti nel localStorage quando cambiano
  useEffect(() => {
    if (isAuthenticated && state.allContacts.length > 0) {
      try {
        localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(state.allContacts));
      } catch (e) {
        console.error("Errore nel salvataggio dei contatti:", e);
      }
    }
  }, [isAuthenticated, state.allContacts]);

  // Salva i messaggi nel localStorage quando cambiano
  useEffect(() => {
    if (isAuthenticated && Object.keys(state.messages).length > 0) {
      try {
        localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages));
      } catch (e) {
        console.error("Errore nel salvataggio dei messaggi:", e);
      }
    }
  }, [isAuthenticated, state.messages]);

  // Salva i contatori di messaggi non letti nel localStorage quando cambiano
  useEffect(() => {
    if (isAuthenticated && Object.keys(state.unreadCounts).length > 0) {
      try {
        localStorage.setItem(UNREAD_COUNTS_KEY, JSON.stringify(state.unreadCounts));
      } catch (e) {
        console.error("Errore nel salvataggio dei contatori di messaggi non letti:", e);
      }
    }
  }, [isAuthenticated, state.unreadCounts]);

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
          // Converti gli utenti online in contatti
          const onlineContacts = message.data.map(onlineUser => ({
            ...onlineUser,
            isOnline: true,
            unreadCount: state.unreadCounts[onlineUser.userId] || 0,
            lastSeen: new Date().toISOString()
          }));
          dispatch({ type: 'SET_ONLINE_USERS', payload: onlineContacts });
        }
        break;
      case WebSocketMessageType.USER_ONLINE:
        if (message.data) {
          // Converti l'utente online in contatto
          const onlineContact: Contact = {
            ...message.data,
            isOnline: true,
            unreadCount: state.unreadCounts[message.data.userId] || 0
          };
          dispatch({ type: 'ADD_USER_ONLINE', payload: onlineContact });
        }
        break;
      case WebSocketMessageType.USER_OFFLINE:
        if (message.data?.userId) {
          dispatch({ 
            type: 'UPDATE_USER_STATUS', 
            payload: { 
              userId: message.data.userId, 
              isOnline: false,
              lastSeen: new Date().toISOString()
            } 
          });
        }
        break;
      case WebSocketMessageType.USER_STATUS_CHANGE:
        if (message.data?.userId) {
          dispatch({ 
            type: 'UPDATE_USER_STATUS', 
            payload: { 
              userId: message.data.userId, 
              isOnline: message.isOnline || false,
              lastSeen: message.lastSeen || new Date().toISOString()
            } 
          });
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
          
          // Aggiungiamo il messaggio solo se è destinato a noi
          if (user && newMessage.receiverId === user.id) {
            // ID dell'utente che ci ha mandato il messaggio
            const senderId = newMessage.senderId;
            
            // Aggiungi automaticamente il mittente ai contatti se non esiste
            if (!state.allContacts.some(contact => contact.userId === senderId)) {
              const newContact: Contact = {
                userId: senderId,
                username: newMessage.sender.username,
                isOnline: true, // Lo consideriamo online se ci ha appena inviato un messaggio
                unreadCount: 0,
                lastMessage: {
                  content: newMessage.content,
                  timestamp: newMessage.createdAt
                }
              };
              dispatch({ type: 'ADD_CONTACT', payload: newContact });
            }
            
            dispatch({ 
              type: 'NEW_MESSAGE', 
              payload: { userId: senderId, message: newMessage } 
            });
            
            // Incrementa il contatore dei messaggi non letti se non siamo
            // nella conversazione con questo utente
            if (!state.currentRecipient || state.currentRecipient.userId !== senderId) {
              dispatch({ type: 'INCREMENT_UNREAD', payload: senderId });
            }
          }
        }
        break;
      default:
        break;
    }
  }, [state.currentRecipient, state.allContacts, state.unreadCounts, user]);

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
    if (!content.trim() || !user || !state.currentRecipient) return;
    
    // Crea un messaggio temporaneo da mostrare subito nell'UI
    const tempMessage: Message = {
      id: Date.now(), // ID temporaneo, verrà sostituito da quello del server
      content: content,
      senderId: user.id,
      receiverId: state.currentRecipient.userId,
      fileUrl: null,
      fileSize: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: user,
      isRead: false
    };
    
    // Dispatch per aggiungere subito il messaggio all'UI
    dispatch({ 
      type: 'SEND_MESSAGE', 
      payload: { userId: state.currentRecipient.userId, message: tempMessage } 
    });
    
    // Invia il messaggio tramite WebSocket
    websocketService.sendChatMessage(
      content,
      state.currentRecipient.userId
    );
  }, [state.currentRecipient, user]);

  // Funzione per inviare un messaggio con un file
  const sendFileMessage = useCallback(async (file: File): Promise<void> => {
    if (!user || !state.currentRecipient) return;
    
    try {
      const response = await chatService.uploadFile(file);
      
      // Crea un messaggio temporaneo da mostrare subito nell'UI
      const tempMessage: Message = {
        id: Date.now(), // ID temporaneo
        content: `Ha condiviso un file: ${file.name}`,
        senderId: user.id,
        receiverId: state.currentRecipient.userId,
        fileUrl: response.fileUrl,
        fileSize: file.size,
        fileType: file.type, // Aggiungiamo il tipo di file
        fileName: file.name, // Aggiungiamo il nome del file
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: user,
        isRead: false
      };
      
      // Dispatch per aggiungere subito il messaggio all'UI
      dispatch({ 
        type: 'SEND_MESSAGE', 
        payload: { userId: state.currentRecipient.userId, message: tempMessage } 
      });
      
      // Invia il messaggio tramite WebSocket
      websocketService.sendChatMessage(
        `Ha condiviso un file: ${file.name}`,
        state.currentRecipient.userId,
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

  // Funzione per recuperare tutti i contatti - questa funzione viene chiamata solo una volta all'inizializzazione
  const fetchAllContacts = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      // Ottieni i contatti dal servizio
      const contacts = await chatService.getContacts();
      
      if (contacts && contacts.length > 0) {
        // Aggiorna con i dati salvati localmente
        const contactsWithLocalData = contacts.map(contact => {
          const existingContact = state.allContacts.find(c => c.userId === contact.userId);
          if (existingContact) {
            return {
              ...contact,
              unreadCount: state.unreadCounts[contact.userId] || 0,
              lastMessage: existingContact.lastMessage,
              isOnline: existingContact.isOnline !== undefined ? existingContact.isOnline : false,
              lastSeen: existingContact.lastSeen || new Date().toISOString()
            };
          }
          return {
            ...contact,
            unreadCount: state.unreadCounts[contact.userId] || 0,
            isOnline: false,
            lastSeen: new Date().toISOString()
          };
        });
        
        dispatch({ type: 'SET_ALL_CONTACTS', payload: contactsWithLocalData });
      } else if (state.allContacts.length === 0) {
        // Se non ci sono contatti dal server e non abbiamo contatti locali,
        // creiamo un contatto di esempio
        const exampleContacts: Contact[] = [
          {
            userId: 1001,
            username: "Esempio Utente",
            isOnline: false,
            lastSeen: new Date().toISOString(),
            unreadCount: 0
          }
        ];
        
        dispatch({ type: 'SET_ALL_CONTACTS', payload: exampleContacts });
      }
    } catch (error) {
      console.error('Errore nel recupero dei contatti:', error);
      
      // Se c'è un errore e non abbiamo contatti, aggiungiamo un contatto di esempio
      if (state.allContacts.length === 0) {
        const exampleContacts: Contact[] = [
          {
            userId: 1001,
            username: "Esempio Utente",
            isOnline: false,
            lastSeen: new Date().toISOString(),
            unreadCount: 0
          }
        ];
        
        dispatch({ type: 'SET_ALL_CONTACTS', payload: exampleContacts });
      }
    }
  }, [isAuthenticated, state.allContacts, state.unreadCounts]);

  // Funzione per recuperare i messaggi
  const fetchMessages = useCallback(async () => {
    if (!isAuthenticated || !state.currentRecipient) {
      // Non carichiamo messaggi se non c'è un destinatario selezionato
      return;
    }
    
    dispatch({ type: 'FETCH_MESSAGES_START' });
    
    try {
      // Prima verifichiamo se abbiamo già i messaggi in cache
      const cachedMessages = state.messages[state.currentRecipient.userId];
      
      // Se non abbiamo messaggi in cache, li carichiamo dal server
      if (!cachedMessages || cachedMessages.length === 0) {
        try {
          // Carica messaggi solo con il destinatario selezionato
          const messages = await chatService.getMessages(state.currentRecipient.userId);
          
          // Se il server risponde con un array vuoto o errore, creiamo un messaggio di esempio
          if (messages.length === 0 && state.currentRecipient.userId === 1001) {
            // Questo è un contatto di esempio, quindi creiamo un messaggio di esempio
            const exampleMessage: Message = {
              id: Date.now(),
              content: "Questo è un messaggio di esempio. Puoi iniziare a chattare con utenti reali selezionandoli dalla lista contatti.",
              senderId: 1001,
              receiverId: user?.id || 0,
              fileUrl: null,
              fileSize: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              sender: {
                id: 1001,
                username: "Esempio Utente",
                email: "esempio@chatapp.com"
              },
              isRead: true
            };
            
            // Aggiorna i messaggi con il messaggio di esempio
            dispatch({ 
              type: 'FETCH_MESSAGES_SUCCESS', 
              payload: { 
                userId: state.currentRecipient.userId, 
                messages: [exampleMessage] 
              } 
            });
          } else {
            // Resetta il contatore dei messaggi non letti
            dispatch({ type: 'RESET_UNREAD', payload: state.currentRecipient.userId });
            
            // Aggiorna i messaggi
            dispatch({ 
              type: 'FETCH_MESSAGES_SUCCESS', 
              payload: { 
                userId: state.currentRecipient.userId, 
                messages 
              } 
            });
          }
        } catch (error) {
          console.error('Errore durante il recupero dei messaggi:', error);
          
          // Se c'è un errore con l'API, mostriamo un messaggio di esempio per il contatto di esempio
          if (state.currentRecipient.userId === 1001) {
            const exampleMessage: Message = {
              id: Date.now(),
              content: "Questo è un messaggio di esempio. Puoi iniziare a chattare con utenti reali selezionandoli dalla lista contatti.",
              senderId: 1001,
              receiverId: user?.id || 0,
              fileUrl: null,
              fileSize: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              sender: {
                id: 1001,
                username: "Esempio Utente",
                email: "esempio@chatapp.com"
              },
              isRead: true
            };
            
            dispatch({ 
              type: 'FETCH_MESSAGES_SUCCESS', 
              payload: { 
                userId: state.currentRecipient.userId, 
                messages: [exampleMessage] 
              } 
            });
          } else {
            throw error;
          }
        }
      } else {
        // Se abbiamo già i messaggi, resettiamo solo il contatore
        dispatch({ type: 'RESET_UNREAD', payload: state.currentRecipient.userId });
      }
    } catch (error) {
      console.error('Errore durante il recupero dei messaggi:', error);
      let errorMessage = 'Errore durante il recupero dei messaggi';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: 'FETCH_MESSAGES_FAILURE', payload: errorMessage });
    }
  }, [isAuthenticated, state.currentRecipient, state.messages, user]);

  // Effettua il fetch dei messaggi quando cambia il destinatario
  useEffect(() => {
    if (isAuthenticated && state.currentRecipient) {
      fetchMessages();
    }
  }, [isAuthenticated, state.currentRecipient, fetchMessages]);

  // Funzione per ottenere il numero totale di messaggi non letti
  const getTotalUnreadCount = useCallback((): number => {
    return Object.values(state.unreadCounts).reduce((acc, count) => acc + count, 0);
  }, [state.unreadCounts]);

  // Funzione per impostare il destinatario corrente
  const setCurrentRecipient = useCallback((recipient: Contact | null) => {
    console.log("Impostazione destinatario corrente:", recipient);
    dispatch({ type: 'SET_CURRENT_RECIPIENT', payload: recipient });
  }, []);

  // Valore del contesto
  const chatContextValue: ChatContextType = {
    ...state,
    sendMessage,
    sendFileMessage,
    setCurrentRecipient,
    fetchMessages,
    fetchAllContacts,
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