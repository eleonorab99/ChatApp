import React, { useEffect } from 'react';
import { Box } from '@mui/material';
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
    <Box sx={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
      {/* Box container per il layout principale */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        width: '100%',
        height: '100%'
      }}>
        {/* Sidebar con la lista degli utenti */}
        <Box sx={{ 
          height: { xs: 'auto', sm: '100%' },
          width: { xs: '100%', sm: '33.33%', md: '25%' }
        }}>
          <UserList />
        </Box>
        
        {/* Area principale con i messaggi e l'input */}
        <Box sx={{ 
          height: { xs: 'auto', sm: '100%' },
          width: { xs: '100%', sm: '66.67%', md: '75%' },
          display: 'flex', 
          flexDirection: 'column',
          flexGrow: 1
        }}>
          {/* Lista dei messaggi */}
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <MessageList />
          </Box>
          
          {/* Input per l'invio dei messaggi */}
          <MessageInput />
        </Box>
      </Box>
      
      {/* Componente per le videochiamate (viene mostrato solo quando c'è una chiamata attiva) */}
      <VideoCall />
    </Box>
  );
};

export default ChatBox;