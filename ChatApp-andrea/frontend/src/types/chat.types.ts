import { User, Contact } from './user.types';

// Interfaccia per un messaggio
export interface Message {
  id: number;
  content: string;
  senderId: number;
  receiverId: number | null;
  fileUrl: string | null;
  fileSize: number | null;
  fileType?: string | null; // Tipo di file
  fileName?: string | null; // Nome del file
  createdAt: string;
  updatedAt: string;
  sender: User;
  receiver?: User;
  isRead?: boolean;
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
  CONNECTION_ERROR = 'connection_error',
  USER_STATUS_CHANGE = 'user_status_change',
  READ_RECEIPT = 'read_receipt',
  PING = 'ping'
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
  fileType?: string;
  fileName?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  isVideo?: boolean;
  error?: string;
  isOnline?: boolean;
  lastSeen?: string;
  messageIds?: number[]; // Per le ricevute di lettura
}

// Interfaccia per lo stato della chat
export interface ChatState {
  messages: Record<number, Message[]>; // Messaggi indicizzati per userId
  onlineUsers: Contact[];  // Modificato da OnlineUser a Contact
  allContacts: Contact[];  // Lista di tutti i contatti (online e offline)
  loading: boolean;
  error: string | null;
  currentRecipient: Contact | null;
  unreadCounts: Record<number, number>;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
}