import React from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import useAuth from '../../hooks/useAuth';
import { Message } from '../../types/chat.types';
import { formatTime } from '../../utils/formatters';
import FilePreview from './FilePreview';

interface MessageItemProps {
  message: Message;
}

// Componente per un singolo messaggio
const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { user } = useAuth();
  const isSender = user?.id === message.senderId;
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isSender ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      {/* Avatar per i messaggi ricevuti */}
      {!isSender && (
        <Avatar
          src={message.sender.profileImage || undefined}
          alt={message.sender.username}
          sx={{
            width: 40,
            height: 40,
            mr: 1,
            bgcolor: '#ffd700',
            alignSelf: 'flex-end',
            mb: 1
          }}
        >
          {message.sender.username.charAt(0).toUpperCase()}
        </Avatar>
      )}
      
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '70%',
          borderRadius: 2,
          backgroundColor: isSender ? 'primary.light' : 'background.paper',
          color: isSender ? 'black' : 'text.primary',
        }}
      >
        {!isSender && (
          <Typography variant="subtitle2" fontWeight="bold" component="div">
            {message.sender.username}
          </Typography>
        )}
        
        {message.content && (
          <Typography variant="body1" component="div">
            {message.content}
          </Typography>
        )}
        
        {message.fileUrl && (
          <Box sx={{ mt: message.content ? 1 : 0 }}>
            <FilePreview 
              message={message}
              isPreviewOnly={true}
            />
          </Box>
        )}
        
        <Typography 
          variant="caption" 
          component="div"
          sx={{ 
            mt: 0.5, 
            textAlign: 'right',
            opacity: 0.8
          }}
        >
          {formatTime(new Date(message.createdAt))}
        </Typography>
      </Paper>
      
      {/* Avatar per i messaggi inviati (opzionale, puoi rimuoverlo se non vuoi mostrarlo) */}
      {isSender && (
        <Avatar
          src={user?.profileImage || undefined}
          alt={user?.username || ''}
          sx={{
            width: 40,
            height: 40,
            ml: 1,
            bgcolor: '#ffd700',
            alignSelf: 'flex-end',
            mb: 1
          }}
        >
          {user?.username.charAt(0).toUpperCase()}
        </Avatar>
      )}
    </Box>
  );
};

export default MessageItem;