import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Un componente di utilità per debuggare i problemi di navigazione
const RouteLogger = () => {
  const location = useLocation();

  useEffect(() => {
    console.log('Current location:', location);
  }, [location]);

  // Questo componente non renderizza nulla
  return null;
};

export default RouteLogger;