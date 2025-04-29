import axios from 'axios';

// Base URL per le richieste API
const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000/api';

// Crea un'istanza di axios con la base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere il token di autenticazione alle richieste
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor per gestire gli errori di risposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Gestisci errori di autenticazione
    if (error.response && error.response.status === 401) {
      // Se il token è scaduto o non valido, reindirizza al login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;