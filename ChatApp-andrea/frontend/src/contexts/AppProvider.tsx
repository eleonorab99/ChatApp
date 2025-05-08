import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider } from './AuthContext';
import { ChatProvider } from './ChatContext';
import { CallProvider } from './CallContext';
import { useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { Box, CircularProgress, Snackbar, Alert } from '@mui/material';

// Tipo per le notifiche dell'app
interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  autoHideDuration?: number;
}

// Interfaccia per il contesto dell'app
interface AppContextType {
  isLoading: boolean;
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  isOffline: boolean;
}

// Crea il contesto
export const AppContext = createContext<AppContextType>({
  isLoading: true,
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
  clearNotifications: () => {},
  isOffline: false
});

// Provider principale dell'applicazione
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const navigate = useNavigate();
  const location = useLocation();

  // Verifica se la pagina corrente è tra quelle pubbliche
  const isPublicPage = location.pathname === '/login' || location.pathname === '/register';

  // Controlla lo stato di autenticazione all'avvio
  useEffect(() => {
    const initialize = async () => {
      try {
        // Verifica se c'è un token valido
        const isAuthenticated = authService.isAuthenticated();
        
        if (!isAuthenticated && !isPublicPage) {
          // Reindirizza al login solo se non siamo già in una pagina pubblica
          // e l'utente non è autenticato
          authService.clearAuth();
          navigate('/login');
        } else if (isAuthenticated && isPublicPage) {
          // Se l'utente è autenticato e sta cercando di accedere a una pagina pubblica,
          // reindirizzalo alla home
          navigate('/');
        }
      } catch (error) {
        console.error('Errore durante l\'inizializzazione dell\'app:', error);
      } finally {
        // Simula un breve caricamento iniziale
        setTimeout(() => setIsLoading(false), 500);
      }
    };

    initialize();
  }, [navigate, isPublicPage]);

  // Monitora lo stato della connessione
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      addNotification({
        type: 'success',
        message: 'Connessione ristabilita',
        autoHideDuration: 3000
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      addNotification({
        type: 'warning',
        message: 'Connessione internet persa',
        autoHideDuration: undefined // Non nascondere automaticamente
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Funzione per aggiungere una notifica
  const addNotification = (notification: Omit<AppNotification, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);

    // Rimuovi automaticamente la notifica se ha un autoHideDuration
    if (notification.autoHideDuration) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.autoHideDuration);
    }
  };

  // Funzione per rimuovere una notifica
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Funzione per rimuovere tutte le notifiche
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Valore del contesto
  const contextValue: AppContextType = {
    isLoading,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    isOffline
  };

  // Se l'app è in fase di caricamento, mostra un loader
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <AuthProvider>
        <ChatProvider>
          <CallProvider>
            {children}
            
            {/* Notifiche */}
            {notifications.map(notification => (
              <Snackbar
                key={notification.id}
                open={true}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                autoHideDuration={notification.autoHideDuration}
                onClose={() => removeNotification(notification.id)}
              >
                <Alert
                  onClose={() => removeNotification(notification.id)}
                  severity={notification.type}
                  sx={{ width: '100%' }}
                >
                  {notification.message}
                </Alert>
              </Snackbar>
            ))}
          </CallProvider>
        </ChatProvider>
      </AuthProvider>
    </AppContext.Provider>
  );
};

// Hook per utilizzare il contesto dell'app
export const useApp = () => useContext(AppContext);