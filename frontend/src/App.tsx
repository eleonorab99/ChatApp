import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppProvider';
import Login from './components/auth/Login/Login';
import Register from './components/auth/Register/Register';
import MainLayout from './components/layouts/MainLayout';
import ChatBox from './components/chat/ChatBox';
import DebugPage from './components/debug/DebugPage';
import useAuth from './hooks/useAuth';
import RouteLogger from './components/debug/RouteLogger';
import { CircularProgress, Box } from '@mui/material';
import PaginaImpostazioni from './components/common/Setting/Settings';

// Componente di caricamento
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

// Componente per il routing protetto
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback />;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Componente per i percorsi pubblici (login/register)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback />;
  }
  
  return isAuthenticated ? <Navigate to="/" /> : <>{children}</>;
};

// Componente per i percorsi dell'app
const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouteLogger /> {/* Per debug della navigazione */}
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
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
        {/* Nuova rotta per la pagina di debug */}
        <Route 
          path="/debug" 
          element={
            <DebugPage />
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <PaginaImpostazioni />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

// Componente principale dell'applicazione
function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;