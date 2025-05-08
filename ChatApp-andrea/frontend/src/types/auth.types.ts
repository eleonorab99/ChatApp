// Interfaccia per l'utente
export interface User {
    id: number;
    email: string;
    username: string;
  }
  
  // Interfaccia per lo stato di autenticazione
  export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    loading: boolean;
    error: string | null;
  }
  
  // Interfaccia per i dati di login
  export interface LoginData {
    email: string;
    password: string;
  }
  
  // Interfaccia per i dati di registrazione
  export interface RegisterData {
    email: string;
    password: string;
    username: string;
  }
  
  // Interfaccia per la risposta di autenticazione
  export interface AuthResponse {
    token: string;
    user: User;
  }