import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Error, Refresh } from '@mui/icons-material';
import useChat from '../../hooks/useChat';

interface MessageErrorProps {
  message: string;
  onRetry?: () => void;
}

// Componente per mostrare errori relativi ai messaggi
const MessageError: React.FC<MessageErrorProps> = ({ message, onRetry }) => {
  const { reconnectWebSocket } = useChat();

  // Gestisce il tentativo di riconnessione
  const handleRetry = () => {
    reconnectWebSocket();
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <Paper 
      elevation={0}
      sx={{
        backgroundColor: '#fff8f8',
        border: '1px solid #ffcdd2',
        borderRadius: 2,
        p: 2,
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <Error color="error" sx={{ mr: 1.5 }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="error">
          {message}
        </Typography>
      </Box>
      <Button
        size="small"
        variant="outlined"
        color="error"
        startIcon={<Refresh />}
        onClick={handleRetry}
        sx={{ ml: 2 }}
      >
        Riprova
      </Button>
    </Paper>
  );
};

export default MessageError;