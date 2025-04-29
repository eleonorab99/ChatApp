import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { CallProvider } from './contexts/CallContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MainLayout from './components/layouts/MainLayout';
import ChatBox from './components/chat/ChatBox';
import useAuth from './hooks/useAuth';

// Componente per il routing protetto
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

// Wrapper con i provider di contesto
const AppWithProviders = () => {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Simuliamo un breve caricamento iniziale
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isInitializing) {
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
    <AuthProvider>
      <ChatProvider>
        <CallProvider>
          <AppRoutes />
        </CallProvider>
      </ChatProvider>
    </AuthProvider>
  );
};

// Componente per i percorsi dell'app
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Register />
      } />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <ChatBox />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Componente principale dell'applicazione
function App() {
  return <AppWithProviders />;
}

export default App;