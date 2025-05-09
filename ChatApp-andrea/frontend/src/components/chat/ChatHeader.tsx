import React from 'react';
import { Box, Typography, Avatar, Tooltip } from '@mui/material';
import useChat from '../../hooks/useChat';

// Componente per l'header della chat
const ChatHeader: React.FC = () => {
  const { currentRecipient } = useChat();

  if (!currentRecipient) {
    return null;
  }

  return (
    <Box sx={{ 
      height: 'auto',
      borderBottom: 1,
      borderColor: 'divider',
      backgroundColor: 'background.paper',
      p: 2,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }}>
      <Avatar 
        src={currentRecipient.profileImage || undefined}
        alt={currentRecipient.username}
        sx={{ 
          width: 48, 
          height: 48,
          bgcolor: '#ffd700'
        }}
      >
        {currentRecipient.username.charAt(0).toUpperCase()}
      </Avatar>
      
      <Box>
        <Typography variant="h6">
          {currentRecipient.username}
        </Typography>
        
        {currentRecipient.bio && (
          <Tooltip title={currentRecipient.bio} arrow>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 300
              }}
            >
              {currentRecipient.bio}
            </Typography>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default ChatHeader;