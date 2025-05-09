import React, { useRef, useEffect } from 'react';
import { Box, Typography, Divider, CircularProgress } from '@mui/material';
import useChat from '../../hooks/useChat';
import { Message } from '../../types/chat.types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import MessageItem from './MessageItem';

// Componente per visualizzare la lista dei messaggi
const MessageList: React.FC = () => {
  const { messages, loading, currentRecipient } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automatico verso l'ultimo messaggio
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Effettua lo scroll quando arrivano nuovi messaggi
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentRecipient]);

  // Ottieni i messaggi per il destinatario corrente
  const currentMessages = currentRecipient 
    ? (messages[currentRecipient.userId] || [])
    : [];

  // Visualizza una data di separazione tra i messaggi
  const DateDivider: React.FC<{ date: Date }> = ({ date }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        my: 2,
      }}
    >
      <Divider sx={{ flexGrow: 1 }} />
      <Typography 
        variant="caption" 
        sx={{ 
          mx: 2, 
          px: 1.5, 
          py: 0.5, 
          bgcolor: 'grey.200', 
          borderRadius: 1,
          color: 'text.secondary'
        }}
      >
        {formatDate(date)}
      </Typography>
      <Divider sx={{ flexGrow: 1 }} />
    </Box>
  );

  // Formatta la data in formato esteso
  const formatDate = (date: Date): string => {
    return format(date, 'EEEE d MMMM yyyy', { locale: it });
  };

  // Raggruppa i messaggi per data
  const messagesByDate = currentMessages.reduce<{ [date: string]: Message[] }>((acc, message) => {
    const date = new Date(message.createdAt).toDateString();
    
    if (!acc[date]) {
      acc[date] = [];
    }
    
    acc[date].push(message);
    return acc;
  }, {});

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        p: 2,
        backgroundColor: 'background.paper', // Sfondo bianco per l'area messaggi
        overflowY: 'auto'
      }}
    >
      {!currentRecipient ? (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            opacity: 0.6
          }}
        >
          <Typography variant="body1" component="div" color="text.secondary" sx={{ textAlign: 'center' }}>
            Seleziona un utente dalla lista per iniziare una conversazione
          </Typography>
        </Box>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      ) : currentMessages.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography variant="body1" component="div" color="text.secondary">
            Nessun messaggio ancora. Inizia la conversazione!
          </Typography>
        </Box>
      ) : (
        Object.entries(messagesByDate).map(([date, dateMessages]) => (
          <React.Fragment key={date}>
            <DateDivider date={new Date(date)} />
            {dateMessages.map((message, index) => (
              <MessageItem 
                key={`${message.id}-${message.createdAt}-${index}`} 
                message={message} 
              />
            ))}
          </React.Fragment>
        ))
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;