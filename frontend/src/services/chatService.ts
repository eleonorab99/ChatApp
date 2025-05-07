import api from './api';
import { Message } from '../types/chat.types';
import { Contact } from '../types/user.types';

// Flag per tracciare tentativi di chiamata
let contactsRequestFailed = false;

// Servizio per gestire le operazioni di chat
const chatService = {
  // Ottiene i messaggi tra l'utente corrente e un destinatario specifico
  getMessages: async (recipientId: number): Promise<Message[]> => {
    try {
      const response = await api.get<Message[]>(`/messages?recipientId=${recipientId}`);
      return response.data;
    } catch (error) {
      console.error('Errore nel recupero dei messaggi:', error);
      // In caso di errore, restituisci un array vuoto
      return [];
    }
  },

  // Ottiene tutti i contatti dell'utente
  getContacts: async (): Promise<Contact[]> => {
    // Se abbiamo già provato e fallito, non riprovare
    if (contactsRequestFailed) {
      const localContacts = localStorage.getItem('chat_contacts');
      if (localContacts) {
        try {
          return JSON.parse(localContacts) as Contact[];
        } catch (e) {
          console.error('Errore nel parsing dei contatti locali:', e);
          return [];
        }
      }
      return [];
    }

    try {
      const response = await api.get<Contact[]>('/contacts');
      // Reset flag in caso di successo
      contactsRequestFailed = false;
      return response.data;
    } catch (error) {
      // Imposta il flag a true così non riproveremo
      contactsRequestFailed = true;
      console.warn('API dei contatti non disponibile, uso dati locali', error);
      
      // Recupera i contatti dal localStorage
      const localContacts = localStorage.getItem('chat_contacts');
      if (localContacts) {
        try {
          return JSON.parse(localContacts) as Contact[];
        } catch (e) {
          console.error('Errore nel parsing dei contatti locali:', e);
          return [];
        }
      }
      
      // Se non ci sono contatti locali, crea un contatto di esempio
      return [{
        userId: 1001,
        username: "Esempio Utente",
        isOnline: false,
        lastSeen: new Date().toISOString(),
        unreadCount: 0
      }];
    }
  },

  // Carica un file
  uploadFile: async (file: File): Promise<{
    fileSize: number; fileUrl: string 
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post<{ fileUrl: string }>('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        fileUrl: response.data.fileUrl,
        fileSize: file.size
      };
    } catch (error) {
      console.error('Errore nel caricamento del file:', error);
      throw error;
    }
  },

  // Segna i messaggi come letti
  markMessagesAsRead: async (senderId: number): Promise<void> => {
    try {
      await api.post('/messages/read', { senderId });
    } catch (error) {
      console.error('Errore nel marcare i messaggi come letti:', error);
    }
  },
};

export default chatService;