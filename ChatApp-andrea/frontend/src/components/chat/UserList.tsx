import React, { useEffect, useState } from 'react';
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
  Button,
} from '@mui/material';
import { AccountCircle, Refresh } from '@mui/icons-material';
import useChat from '../../hooks/useChat';
import useAuth from '../../hooks/useAuth';
import { Contact } from '../../types/user.types';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

// Componente per la lista degli utenti/contatti
const UserList: React.FC = () => {
  const { allContacts, currentRecipient, setCurrentRecipient, unreadCounts, fetchAllContacts, loading, connectionStatus } = useChat();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loadError, setLoadError] = useState<string | null>(null);

  // Carica tutti i contatti all'avvio - ma solo una volta!
  useEffect(() => {
    console.log('UserList - Verifica necessità caricamento contatti');
    const loadContacts = async () => {
      try {
        setLoadError(null);
        console.log('Avvio caricamento contatti...');
        await fetchAllContacts();
      } catch (error) {
        console.error('Errore nel caricamento contatti:', error);
        setLoadError('Impossibile caricare i contatti. Riprova.');
      }
    };
    
    // Controlliamo se abbiamo già dei contatti per evitare richieste inutili
    if (allContacts.length === 0 && !loading) {
      console.log('Nessun contatto presente, caricamento...');
      loadContacts();
    } else {
      console.log(`${allContacts.length} contatti già caricati`);
    }
  }, []); // Mantenere array vuoto per evitare loop

  // Seleziona un utente come destinatario
  const handleSelectUser = (selectedUser: Contact) => {
    console.log("Utente selezionato:", selectedUser);
    setCurrentRecipient(selectedUser);
  };

  // Funzione per ricaricare manualmente i contatti
  const handleReloadContacts = async () => {
    try {
      setLoadError(null);
      console.log('Ricaricamento contatti manuale');
      await fetchAllContacts();
    } catch (error) {
      console.error('Errore nel ricaricamento contatti:', error);
      setLoadError('Impossibile caricare i contatti. Riprova.');
    }
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
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // Usa tutta l'altezza disponibile
        width: '100%',
        overflow: 'hidden', // Impedisce lo scroll sul contenitore esterno
      }}
    >
      {/* Header della lista utenti - fisso */}
      <Box sx={{
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'grey.100',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10 // Assicura che rimanga sopra il contenuto scrollabile
      }}>
        <Typography variant="h6">
          {t('messageInput.utenti')}
        </Typography>
        
        {/* Indicatore di stato di connessione */}
        <Badge
          variant="dot"
          color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'reconnecting' ? 'warning' : 'error'}
          sx={{ ml: 1 }}
          title={`Stato connessione: ${connectionStatus}`}
        >
          <Button 
            size="small" 
            onClick={handleReloadContacts} 
            disabled={loading}
            startIcon={<Refresh />}
            sx={{ p: 0.5, minWidth: 'auto' }}
          />
        </Badge>
      </Box>

      {/* Contenitore principale - scrollabile */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto' // Solo questa parte è scrollabile
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, height: '100%' }}>
            <CircularProgress size={40} />
            <Typography variant="body2" component="div" sx={{ ml: 2 }}>
              Caricamento contatti...
            </Typography>
          </Box>
        ) : loadError ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3, height: '100%' }}>
            <Typography variant="body1" component="div" color="error" sx={{ mb: 2 }}>
              {loadError}
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<Refresh />} 
              onClick={handleReloadContacts}
            >
              Riprova
            </Button>
          </Box>
        ) : (
          <List
            sx={{
              width: '100%',
              padding: 0
            }}
          >
            {filteredContacts.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" component="div" color="text.secondary">
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
                            component="span"
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
    </Box>
  );
};

export default UserList;