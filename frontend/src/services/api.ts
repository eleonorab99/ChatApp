import axios from 'axios';

// Base URL per le richieste API - assicurati che sia corretto per il tuo ambiente
// Nota: l'URL può avere bisogno del prefisso /api o no, a seconda di come è configurato il backend
const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000/api';

// Crea un'istanza di axios con la base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 secondi di timeout (aumentato per connessioni lente)
  withCredentials: true, // Abilita l'invio dei cookie
});

// Log per debug
console.log('API configurata con base URL:', API_URL);

// Gestione degli errori globale per evitare crash dell'app
const globalErrorHandler = (error: any): void => {
  console.error('Errore globale API:', error);
  // Qui puoi implementare la logica per mostrare un messaggio di errore globale
  // o inviare l'errore a un servizio di monitoraggio
};

// Setup per catturare gli errori non gestiti in axios
axios.interceptors.request.use(
  config => config,
  error => {
    globalErrorHandler(error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  response => response,
  error => {
    globalErrorHandler(error);
    return Promise.reject(error);
  }
);

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
    
    // In caso di richieste FormData, assicurati che il Content-Type sia gestito correttamente
    if (config.data instanceof FormData) {
      // Lascia che il browser imposti automaticamente il boundary per il multipart/form-data
      delete config.headers['Content-Type'];
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
        url: error.config?.url,
        method: error.config?.method,
      });

      // Gestisci errori di autenticazione
      if (error.response.status === 401) {
        console.log('Token non valido o scaduto, reindirizzamento al login');
        // Se il token è scaduto o non valido, reindirizza al login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Evita reindirizzamenti infiniti se siamo già sulla pagina di login
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          // Uso setTimeout per permettere ad altri handler di completarsi
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    } else if (error.request) {
      // La richiesta è stata effettuata ma non è stata ricevuta alcuna risposta
      console.error('Nessuna risposta ricevuta:', error.request, 'URL:', error.config?.url);
      
      // Se c'è un errore CORS o di rete, potrebbe essere un problema di configurazione del server
      if (error.message && (error.message.includes('Network Error') || error.message.includes('CORS'))) {
        console.error('Possibile errore CORS o di rete. Assicurati che il server sia in esecuzione e configurato correttamente.');
      }
    } else {
      // Si è verificato un errore durante l'impostazione della richiesta
      console.error('Errore nella configurazione della richiesta:', error.message);
    }
    
    // Aggiungi ulteriori dettagli all'errore per facilitare il debugging
    if (error.config) {
      error.apiUrl = error.config.url;
      error.apiMethod = error.config.method;
    }
    
    return Promise.reject(error);
  }
);

// Funzione di utilità per verificare lo stato della connessione API
const testConnection = async (): Promise<boolean> => {
  try {
    // Prova a fare una richiesta semplice
    const response = await axios.get(`${API_URL.replace(/\/api$/, '')}/`, { 
      timeout: 5000 
    });
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error('Errore nel test di connessione API:', error);
    return false;
  }
};

export default api;