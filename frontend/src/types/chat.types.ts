import { User } from './auth.types';

// Interfaccia per un messaggio
export interface Message {
  id: number;
  content: string;
  senderId: number;
  receiverId: number | null;
  fileUrl: string | null;
  fileSize: number | null;
  fileType?: string | null; // Nuovo campo per il tipo di file
  fileName?: string | null; // Nuovo campo per il nome del file
  createdAt: string;
  updatedAt: string;
  sender: User;
  receiver?: User;
}

// Interfaccia per un utente online
export interface OnlineUser {
  userId: number;
  username: string;
}

// Tipi di messaggi WebSocket
export enum WebSocketMessageType {
  ONLINE_USERS = 'online_users',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  NEW_MESSAGE = 'new_message',
  CHAT_MESSAGE = 'chat_message',
  CALL_OFFER = 'call_offer',
  CALL_ANSWER = 'call_answer',
  ICE_CANDIDATE = 'ice_candidate',
  CALL_END = 'call_end',
  CALL_REJECT = 'call_reject',
  CALL_ERROR = 'call_error',
  CONNECTION_ERROR = 'connection_error'
}

// Interfaccia per un messaggio WebSocket
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: any;
  senderId?: number;
  recipientId?: number;
  senderUsername?: string;
  content?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;    // Aggiunto il tipo di file
  fileName?: string;    // Aggiunto il nome del file
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  isVideo?: boolean;
  error?: string;
}

// Interfaccia per lo stato della chat
export interface ChatState {
  messages: Message[];
  onlineUsers: OnlineUser[];
  loading: boolean;
  error: string | null;
  currentRecipient: OnlineUser | null;
  unreadCounts: Record<number, number>;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
}