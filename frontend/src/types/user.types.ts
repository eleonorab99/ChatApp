// Interfaccia per un utente completo
export interface User {
    id: number;
    email: string;
    username: string;
    isOnline?: boolean;
    lastSeen?: string; // Data ISO dell'ultima connessione
    avatar?: string;
  }
  
  // Interfaccia per un contatto (utente con cui si è chattato)
  export interface Contact {
    userId: number;
    username: string;
    isOnline: boolean;
    lastSeen?: string;
    avatar?: string;
    unreadCount: number;
    lastMessage?: {
      content: string;
      timestamp: string;
    };
  }
  
  // Interfaccia per un utente online
  export interface OnlineUser {
    userId: number;
    username: string;
    avatar?: string;
  }
  
  // Enumerazione per lo stato dell'utente
  export enum UserStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
    AWAY = 'away'
  }