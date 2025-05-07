import React from 'react';
import { Alert, Collapse, Box } from '@mui/material';
import { WifiOff } from '@mui/icons-material';
import useApp from '../../hooks/useApp';

// Componente per mostrare lo stato della connessione di rete
const NetworkStatus: React.FC = () => {
  const { isOffline } = useApp();

  return (
    <Collapse in={isOffline}>
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
        <Alert 
          severity="warning" 
          icon={<WifiOff />}
          sx={{ 
            borderRadius: 0,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          Connessione internet persa. Alcune funzionalità potrebbero non essere disponibili.
        </Alert>
      </Box>
    </Collapse>
  );
};

export default NetworkStatus;