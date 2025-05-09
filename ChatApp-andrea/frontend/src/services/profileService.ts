import api from './api';

// Interfacce per i dati del profilo
interface ProfileData {
  id: number;
  username: string;
  email: string;
  profileImage: string | null;
  bio: string | null;
  createdAt?: string;
}

interface ProfileUpdateData {
  username?: string;
  bio?: string;
}

// Servizio per gestire le operazioni del profilo utente
const profileService = {
  // Ottiene i dati del profilo dell'utente corrente
  getProfile: async (): Promise<ProfileData> => {
    try {
      const response = await api.get<ProfileData>('/api/profile');
      return response.data;
    } catch (error) {
      console.error('Errore durante il recupero del profilo:', error);
      throw error;
    }
  },

  // Aggiorna i dati del profilo
  updateProfile: async (data: ProfileUpdateData): Promise<ProfileData> => {
    try {
      const response = await api.put<ProfileData>('/api/profile', data);
      return response.data;
    } catch (error) {
      console.error('Errore durante l\'aggiornamento del profilo:', error);
      throw error;
    }
  },

  // Carica un'immagine del profilo
  uploadProfileImage: async (file: File): Promise<ProfileData> => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post<ProfileData>('/api/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Errore durante il caricamento dell\'immagine del profilo:', error);
      throw error;
    }
  },

  // Elimina l'immagine del profilo
  deleteProfileImage: async (): Promise<ProfileData> => {
    try {
      const response = await api.delete<ProfileData>('/api/profile/image');
      return response.data;
    } catch (error) {
      console.error('Errore durante l\'eliminazione dell\'immagine del profilo:', error);
      throw error;
    }
  }
};

export default profileService;