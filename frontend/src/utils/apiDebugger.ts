import axios from 'axios';

/**
 * Utility per testare e diagnosticare le richieste API
 */
export const apiDebugger = {
  /**
   * Testa la connessione al server
   */
  testServerConnection: async (): Promise<boolean> => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000/api';
      
      // Impostiamo un timeout breve per accelerare il test
      const response = await axios.get(`${API_URL.replace(/\/api$/, '')}/`, {
        timeout: 5000,
        // Gestiamo il caso in cui il certificato HTTPS sia self-signed
        ...(API_URL.startsWith('https') ? { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) } : {})
      });
      
      console.log('Risposta server:', response.status);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('Errore nella connessione al server:', error);
      return false;
    }
  },
  
  /**
   * Testa la registrazione direttamente con axios
   */
  testRegistration: async (userData: { email: string; username: string; password: string }): Promise<any> => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000/api';
      console.log('Tentativo di registrazione con:', {
        email: userData.email,
        username: userData.username,
        password: '********' // Non loggiamo la password in chiaro
      });
      
      // Impostiamo un timeout più lungo per la registrazione
      const response = await axios.post(`${API_URL}/auth/register`, userData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        },
        // Gestiamo il caso in cui il certificato HTTPS sia self-signed
        ...(API_URL.startsWith('https') ? { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) } : {})
      });
      
      console.log('Risposta registrazione:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Errore nella registrazione:', error);
      
      let errorDetails = {
        message: 'Errore sconosciuto',
        status: null,
        data: null,
        isNetworkError: false,
        isTimeoutError: false,
        isServerError: false
      };
      
      if (error.response) {
        // Il server ha risposto con un codice di errore
        errorDetails = {
          ...errorDetails,
          message: error.response.data?.message || 'Errore dal server',
          status: error.response.status,
          data: error.response.data,
          isServerError: error.response.status >= 500
        };
      } else if (error.request) {
        // Nessuna risposta ricevuta
        errorDetails = {
          ...errorDetails,
          message: 'Nessuna risposta ricevuta dal server',
          isNetworkError: true,
          isTimeoutError: error.code === 'ECONNABORTED'
        };
      }
      
      return {
        success: false,
        error: errorDetails
      };
    }
  },
  
  /**
   * Ottiene l'URL API attualmente configurato
   */
  getApiUrl: (): string => {
    return import.meta.env.VITE_API_URL || 'https://localhost:3000/api';
  }
};

export default apiDebugger;