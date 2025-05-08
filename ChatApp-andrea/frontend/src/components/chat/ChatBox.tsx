import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import VideoCall from '../calls/VideoCall';
import useChat from '../../hooks/useChat';

// Componente principale della chat che unisce tutti i sottocomponenti
const ChatBox: React.FC = () => {
  const { fetchMessages, currentRecipient } = useChat();

  // Carica i messaggi quando cambia il destinatario
  useEffect(() => {
    if (currentRecipient) {
      fetchMessages();
    }
  }, [currentRecipient, fetchMessages]);

  return (
    <Box sx={{ 
      display: 'flex', 
      width: '100%', 
      height: 'calc(100vh - 64px)', // Altezza totale meno l'altezza della navbar
      position: 'relative',
      overflow: 'hidden', // Impedisce lo scroll dell'intero contenitore
      bgcolor: 'background.default' // Sfondo generale
    }}>
      {/* Box container per il layout principale */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        width: '100%',
        height: '100%'
      }}>
        {/* Sidebar con la lista degli utenti - fissa */}
        <Box sx={{ 
          height: '100%',
          width: { xs: '100%', sm: '33.33%', md: '25%' },
          overflow: 'hidden',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper' // Sfondo bianco per la sidebar
        }}>
          <UserList />
        </Box>
        
        {/* Area principale con i messaggi e l'input - layout a colonna fissa */}
        <Box sx={{ 
          height: '100%',
          width: { xs: '100%', sm: '66.67%', md: '75%' },
          display: 'flex', 
          flexDirection: 'column',
          flexGrow: 1,
          overflow: 'hidden', // Importante: impedisce lo scroll dell'intero container
          bgcolor: 'background.paper' // Sfondo bianco per l'area chat
        }}>
          {/* Header della chat - fisso */}
          <Box sx={{ 
            height: 'auto',
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            p: 2,
            zIndex: 10 // Assicura che rimanga sopra il contenuto scrollabile
          }}>
            {currentRecipient && (
              <Typography variant="h6">
                Chat con {currentRecipient.username}
              </Typography>
            )}
          </Box>
          
          {/* Area dei messaggi - scrollabile */}
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto', // Questo contenitore sarà scrollabile
            height: 'calc(100% - 140px)', // Altura totale meno header e input (approssimativa)
            bgcolor: 'background.paper' // Sfondo bianco per l'area messaggi
          }}>
            <MessageList />
          </Box>
          
          {/* Input per l'invio dei messaggi - fisso in basso */}
          <Box sx={{
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            zIndex: 10 // Assicura che rimanga sopra il contenuto scrollabile
          }}>
            <MessageInput />
          </Box>
        </Box>
      </Box>
      
      {/* Componente per le videochiamate (viene mostrato solo quando c'è una chiamata attiva) */}
      <VideoCall />
    </Box>
  );
};

export default ChatBox;