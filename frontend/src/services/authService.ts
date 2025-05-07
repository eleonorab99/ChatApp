import api from './api';
import { AuthResponse, LoginData, RegisterData } from '../types/auth.types';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  userId: number;
  exp: number;
  iat: number;
}

// Servizio per gestire l'autenticazione
const authService = {
  // Effettua il login
  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', data);
      return response.data;
    } catch (error: any) {
      // Gestione più dettagliata degli errori
      if (error.response) {
        // Il server ha risposto con un codice di errore
        const status = error.response.status;
        const message = error.response.data?.message || 'Errore durante il login';
        
        if (status === 401) {
          throw new Error('Credenziali non valide. Verifica email e password.');
        } else if (status === 429) {
          throw new Error('Troppi tentativi di accesso. Riprova più tardi.');
        } else {
          throw new Error(message);
        }
      } else if (error.request) {
        // Nessuna risposta ricevuta
        throw new Error('Impossibile contattare il server. Verifica la tua connessione.');
      } else {
        throw error;
      }
    }
  },

  // Effettua la registrazione
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      console.log('Inviando richiesta di registrazione:', data);
      
      // Assicurati che i dati siano nel formato corretto
      const requestData = {
        email: data.email,
        password: data.password,
        username: data.username
      };
      
      // Invia la richiesta con timeouts più lunghi per permettere debug
      const response = await api.post<AuthResponse>('/auth/register', requestData, {
        timeout: 10000, // 10 secondi di timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Risposta registrazione ricevuta:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('Errore completo:', error);
      
      // Gestione più dettagliata degli errori
      if (error.response) {
        // Il server ha risposto con un codice di errore
        const status = error.response.status;
        const message = error.response.data?.message || 'Errore durante la registrazione';
        
        console.error('Risposta di errore dal server:', {
          status,
          data: error.response.data
        });
        
        if (status === 409) {
          throw new Error('Email o username già in uso. Prova con credenziali diverse.');
        } else if (status === 500) {
          throw new Error('Errore interno del server. Contatta l\'amministratore o riprova più tardi.');
        } else {
          throw new Error(message);
        }
      } else if (error.request) {
        // Nessuna risposta ricevuta
        console.error('Nessuna risposta ricevuta:', error.request);
        throw new Error('Impossibile contattare il server. Verifica la tua connessione.');
      } else {
        console.error('Errore sconosciuto:', error.message);
        throw error;
      }
    }
  },

  // Effettua il logout
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      // Pulisci sempre il localStorage
      authService.clearAuth();
    }
  },

  // Pulisci le informazioni di autenticazione dal localStorage
  clearAuth: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Rimuovi eventuali altri dati di sessione
    sessionStorage.clear();
  },

  // Controlla se l'utente è autenticato basandosi sulla presenza del token
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    return authService.isTokenValid(token);
  },

  // Verifica se un token è valido
  isTokenValid: (token: string): boolean => {
    if (!token) return false;
    
    try {
      // Verifica la struttura del token JWT (header.payload.signature)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return false;
      
      // Decodifica il payload e verifica la scadenza
      const decoded = jwtDecode<DecodedToken>(token);
      
      // Verifica la scadenza (exp è in secondi, Date.now() è in millisecondi)
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.log('Token scaduto');
        return false;
      }
      
      // Verifica che ci sia un userId
      if (!decoded.userId) {
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Errore nella verifica del token:', e);
      return false;
    }
  },

  // Ottiene il tempo rimanente alla scadenza del token (in secondi)
  getTokenExpiryTime: (): number | null => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const expiryTime = decoded.exp * 1000; // Converti in millisecondi
      const currentTime = Date.now();
      
      // Restituisci il tempo rimanente in secondi
      return Math.floor((expiryTime - currentTime) / 1000);
    } catch (e) {
      return null;
    }
  },

  // Ottiene l'utente corrente dal localStorage
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user);
      } catch (e) {
        console.error('Errore nel parsing dell\'utente:', e);
        return null;
      }
    }
    return null;
  },

  // Salva i dati di autenticazione nel localStorage
  saveAuth: (data: AuthResponse): void => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  },

  // Aggiorna le informazioni dell'utente nel localStorage
  updateUserInfo: (user: any): void => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  },

  // Verifica se il token è prossimo alla scadenza (entro 5 minuti)
  isTokenExpiringSoon: (): boolean => {
    const expiryTime = authService.getTokenExpiryTime();
    return expiryTime !== null && expiryTime < 300; // 5 minuti in secondi
  },

  // Ottieni gli header di autenticazione
  getAuthHeaders: () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

export default authService;