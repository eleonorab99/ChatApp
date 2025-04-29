import api from './api';
import { AuthResponse, LoginData, RegisterData } from '../types/auth.types';

// Servizio per gestire l'autenticazione
const authService = {
  // Effettua il login
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  // Effettua la registrazione
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  // Effettua il logout
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Controlla se l'utente è autenticato basandosi sulla presenza del token
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  // Verifica se un token è valido
  isTokenValid: (token: string): boolean => {
    // Possiamo implementare una logica più complessa qui
    // Ad esempio, decodificare il JWT e verificare la data di scadenza
    
    // Semplice implementazione - verifico che il token non sia vuoto
    if (!token) return false;
    
    // Opzionale: verificare la struttura del token JWT (header.payload.signature)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return false;
    
    try {
      // Verifichiamo che il payload sia un JSON valido
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Verifichiamo la scadenza
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Errore nella verifica del token:', e);
      return false;
    }
  },

  // Ottiene l'utente corrente dal localStorage
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    if (user) {
      return JSON.parse(user);
    }
    return null;
  },

  // Salva i dati di autenticazione nel localStorage
  saveAuth: (data: AuthResponse): void => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  },
};

export default authService;