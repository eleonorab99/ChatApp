import axios from 'axios';

// Base URL per le richieste API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Crea un'istanza di axios con la base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 secondi di timeout
  withCredentials: true, // Abilita l'invio dei cookie
});

// Log per debug
console.log('API configurata con base URL:', API_URL);

// Interceptor per aggiungere il token di autenticazione alle richieste
api.interceptors.request.use(
  (config) => {
    // Log della richiesta (solo in ambiente di sviluppo)
    if (import.meta.env.DEV) {
      console.log(`Richiesta API: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
      });
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Errore nella richiesta API:', error);
    return Promise.reject(error);
  }
);

// Interceptor per gestire gli errori di risposta
api.interceptors.response.use(
  (response) => {
    // Log della risposta (solo in ambiente di sviluppo)
    if (import.meta.env.DEV) {
      console.log(`Risposta API: ${response.status} ${response.config.url}`, {
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    // Log dettagliato dell'errore
    if (error.response) {
      // Il server ha risposto con un codice di stato fuori dal range 2xx
      console.error('Errore risposta API:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        url: error.config.url,
        method: error.config.method,
      });

      // Gestisci errori di autenticazione
      if (error.response.status === 401) {
        // Se il token è scaduto o non valido, reindirizza al login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Evita reindirizzamenti infiniti se siamo già sulla pagina di login
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
    } else if (error.request) {
      // La richiesta è stata effettuata ma non è stata ricevuta alcuna risposta
      console.error('Nessuna risposta ricevuta:', error.request);
    } else {
      // Si è verificato un errore durante l'impostazione della richiesta
      console.error('Errore nella configurazione della richiesta:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;