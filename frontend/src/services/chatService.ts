import api from './api';
import { Message } from '../types/chat.types';

// Servizio per gestire le operazioni di chat
const chatService = {
  // Ottiene i messaggi tra l'utente corrente e un destinatario specifico
  getMessages: async (recipientId?: number): Promise<Message[]> => {
    const url = recipientId ? `/messages?recipientId=${recipientId}` : '/messages';
    const response = await api.get<Message[]>(url);
    return response.data;
  },

  // Carica un file
  uploadFile: async (file: File): Promise<{
    fileSize: number; fileUrl: string 
}> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ fileUrl: string }>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

export default chatService;