import React, { createContext, useReducer, useEffect } from 'react';
import { AuthState, LoginData, RegisterData, User } from '../types/auth.types';
import authService from '../services/authService';
import websocketService from '../services/websocketService';

// Tipi di azioni per il reducer
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CHECK_COMPLETE' }
  | { type: 'UPDATE_USER_INFO'; payload: User }; // Nuova azione per aggiornare le info utente

// Stato iniziale
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true, // Iniziamo con loading a true
  error: null,
};

// Reducer per gestire lo stato di autenticazione
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    case 'AUTH_CHECK_COMPLETE':
      return {
        ...state,
        loading: false,
      };
    case 'UPDATE_USER_INFO':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

// Tipo per il contesto
interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUserInfo: (updatedUser: User) => void; // Nuova funzione per aggiornare le info utente
}

// Crea il contesto di autenticazione
export const AuthContext = createContext<AuthContextType>({
  ...initialState,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUserInfo: () => {}, // Implementazione vuota di default
});

// Provider per il contesto di autenticazione
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verifica lo stato di autenticazione all'avvio dell'app
  useEffect(() => {
    const checkAuth = () => {
      dispatch({ type: 'AUTH_START' });
      
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as User;
          
          // Verifica che il token sia valido (potremmo aggiungere una chiamata API qui)
          if (authService.isTokenValid(token)) {
            dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
            
            // Connetti WebSocket
            websocketService.connect(token);
          } else {
            // Token non valido, pulisci il localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userId'); // Rimuovi anche l'ID utente
            dispatch({ type: 'AUTH_CHECK_COMPLETE' });
          }
        } catch (error) {
          console.error('Errore nel parsing dell\'utente da localStorage:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userId'); // Rimuovi anche l'ID utente
          dispatch({ type: 'AUTH_CHECK_COMPLETE' });
        }
      } else {
        // Nessun token trovato
        dispatch({ type: 'AUTH_CHECK_COMPLETE' });
      }
    };

    checkAuth();
  }, []);

  // Funzione per effettuare il login
  const login = async (data: LoginData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.login(data);
      authService.saveAuth(response);
      
      // IMPORTANTE: Salva l'ID utente nel localStorage per le chiamate
      if (response.user && response.user.id) {
        localStorage.setItem('userId', response.user.id.toString());
        console.log('ID utente salvato nel localStorage:', response.user.id);
      }
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: response.user, token: response.token },
      });
      
      // Connetti WebSocket
      websocketService.connect(response.token);
    } catch (error) {
      let errorMessage = 'Login fallito. Controlla le tue credenziali.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // Funzione per effettuare la registrazione
  const register = async (data: RegisterData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.register(data);
      authService.saveAuth(response);
      
      // IMPORTANTE: Salva l'ID utente nel localStorage per le chiamate
      if (response.user && response.user.id) {
        localStorage.setItem('userId', response.user.id.toString());
        console.log('ID utente salvato nel localStorage:', response.user.id);
      }
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: response.user, token: response.token },
      });
      
      // Connetti WebSocket
      websocketService.connect(response.token);
    } catch (error) {
      let errorMessage = 'Registrazione fallita. Riprova.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // Funzione per effettuare il logout
  const logout = async (): Promise<void> => {
    try {
      // Disconnetti WebSocket
      websocketService.disconnect();
      
      // Rimuovi l'ID utente dal localStorage
      localStorage.removeItem('userId');
      
      await authService.logout();
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };
  
  // Funzione per aggiornare le informazioni utente
  const updateUserInfo = (updatedUser: User): void => {
    // Aggiorna le informazioni utente nel contesto
    dispatch({ type: 'UPDATE_USER_INFO', payload: updatedUser });
    
    // Aggiorna anche nel localStorage
    if (state.user) {
      const mergedUser = { ...state.user, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      authService.updateUserInfo(mergedUser);
    }
  };

  // Valore del contesto
  const authContextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUserInfo
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};