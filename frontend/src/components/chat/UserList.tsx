import React, { useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Badge,
  CircularProgress,
} from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import useChat from '../../hooks/useChat';
import useAuth from '../../hooks/useAuth';
import { Contact } from '../../types/user.types';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

// Componente per la lista degli utenti/contatti
const UserList: React.FC = () => {
  const { allContacts, currentRecipient, setCurrentRecipient, unreadCounts, fetchAllContacts, loading } = useChat();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Carica tutti i contatti all'avvio
  useEffect(() => {
    fetchAllContacts();
  }, [fetchAllContacts]);

  // Seleziona un utente come destinatario
  const handleSelectUser = (selectedUser: Contact) => {
    console.log("Utente selezionato:", selectedUser); // Debug
    setCurrentRecipient(selectedUser);
  };

  // Filtra l'utente corrente dalla lista
  const filteredContacts = allContacts.filter(
    (contact) => user && contact.userId !== user.id
  );

  // Funzione per formattare l'ultima connessione
  const formatLastSeen = (lastSeen?: string): string => {
    if (!lastSeen) return '';
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: it });
    } catch (error) {
      return '';
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'grey.100',
        }}
      >
        {t('messageInput.utenti')}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List
          sx={{
            width: '100%',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {filteredContacts.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('messageInput.nessunUtente')}
              </Typography>
            </Box>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = currentRecipient?.userId === contact.userId;
              const hasUnread = unreadCounts[contact.userId] > 0;
              
              return (
                <ListItem key={contact.userId} disablePadding>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleSelectUser(contact)}
                    sx={{
                      borderRadius: 0,
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: contact.isOnline ? 'success.main' : 'error.main',
                              border: '2px solid white',
                            }}
                          />
                        }
                      >
                        <Avatar>
                          <AccountCircle />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography 
                            component="span" 
                            sx={{ 
                              flexGrow: 1,
                              fontWeight: hasUnread ? 'bold' : 'normal'
                            }}
                          >
                            {contact.username}
                          </Typography>
                          {hasUnread && (
                            <Badge 
                              badgeContent={contact.unreadCount || unreadCounts[contact.userId] || 0} 
                              color="error"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.secondary',
                            fontStyle: !contact.isOnline ? 'italic' : 'normal',
                            fontSize: '0.75rem'
                          }}
                        >
                          {contact.isOnline 
                            ? 'Online' 
                            : (contact.lastSeen ? formatLastSeen(contact.lastSeen) : 'Offline')}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })
          )}
        </List>
      )}
    </Box>
  );
};

export default UserList;