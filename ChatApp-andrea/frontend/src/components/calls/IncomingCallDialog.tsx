import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Call, CallEnd, Videocam } from '@mui/icons-material';
import useCall from '../../hooks/useCall';

// Componente per mostrare una finestra di dialogo per chiamate in arrivo
const IncomingCallDialog: React.FC = () => {
  const { isIncomingCall, isVideoCall, incomingCallData, answerCall, rejectCall } = useCall();
  const [audioPlaying, setAudioPlaying] = useState<HTMLAudioElement | null>(null);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Effetto per riprodurre un suono quando c'è una chiamata in arrivo
  useEffect(() => {
    if (isIncomingCall && !audioPlaying) {
      // Crea un elemento audio e riproduci il suono di chiamata
      console.log('Riproducendo suono di chiamata in arrivo');
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      
      try {
        audio.play()
          .then(() => {
            console.log('Riproduzione suono iniziata con successo');
            setAudioPlaying(audio);
          })
          .catch(error => {
            console.error('Errore nella riproduzione del suono:', error);
            // Fallback: possiamo usare una notifica del browser se consentito
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('Chiamata in arrivo', {
                  body: `Chiamata in arrivo da ${incomingCallData?.callerName || 'Utente'}`,
                  icon: '/icons/call-icon.png'
                });
              } catch (notifError) {
                console.error('Errore nella notifica:', notifError);
              }
            }
          });
      } catch (e) {
        console.error('Errore generale nella riproduzione audio:', e);
      }
    }
    
    // Pulisci quando la chiamata termina
    return () => {
      if (audioPlaying) {
        console.log('Interrompendo suono chiamata');
        audioPlaying.pause();
        audioPlaying.currentTime = 0;
        setAudioPlaying(null);
      }
    };
  }, [isIncomingCall, incomingCallData, audioPlaying]);

  // Gestisci la risposta alla chiamata
  const handleAnswerCall = () => {
    // Ferma il suono prima di rispondere
    if (audioPlaying) {
      audioPlaying.pause();
      audioPlaying.currentTime = 0;
      setAudioPlaying(null);
    }
    
    console.log('Risposta chiamata da IncomingCallDialog');
    answerCall();
  };

  // Gestisci il rifiuto della chiamata
  const handleRejectCall = () => {
    // Ferma il suono prima di rifiutare
    if (audioPlaying) {
      audioPlaying.pause();
      audioPlaying.currentTime = 0;
      setAudioPlaying(null);
    }
    
    console.log('Rifiuto chiamata da IncomingCallDialog');
    rejectCall();
  };

  if (!isIncomingCall || !incomingCallData) {
    return null;
  }

  return (
    <Dialog
      open={isIncomingCall}
      aria-labelledby="incoming-call-dialog-title"
      fullScreen={fullScreen}
      transitionDuration={300}
      sx={{ 
        '& .MuiDialog-paper': {
          borderRadius: fullScreen ? 0 : 2,
          width: fullScreen ? '100%' : '100%',
          maxWidth: fullScreen ? '100%' : 400,
          margin: fullScreen ? 0 : 2,
          overflow: 'hidden',
          zIndex: 2000 // Assicuriamoci che sia sopra tutti gli altri elementi
        },
      }}
      onClose={handleRejectCall} // Chiude il dialogo se l'utente clicca fuori
    >
      <DialogTitle 
        id="incoming-call-dialog-title" 
        sx={{ 
          textAlign: 'center',
          bgcolor: '#ffd700',
          color: 'black',
          py: 2
        }}
      >
        {isVideoCall ? 'Videochiamata in arrivo' : 'Chiamata in arrivo'}
      </DialogTitle>
      
      <DialogContent sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        py: 4,
        px: 3
      }}>
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            bgcolor: '#ffd700',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 3,
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%': {
                boxShadow: '0 0 0 0 rgba(255, 215, 0, 0.7)'
              },
              '70%': {
                boxShadow: '0 0 0 20px rgba(255, 215, 0, 0)'
              },
              '100%': {
                boxShadow: '0 0 0 0 rgba(255, 215, 0, 0)'
              }
            }
          }}
        >
          {isVideoCall ? (
            <Videocam sx={{ fontSize: 50, color: 'white' }} />
          ) : (
            <Call sx={{ fontSize: 50, color: 'white' }} />
          )}
        </Box>
        
        <Typography variant="h5" component="div" gutterBottom>
          {incomingCallData.callerName}
        </Typography>
        
        <Typography variant="body1" color="text.secondary">
          {isVideoCall ? 'sta avviando una videochiamata' : 'sta chiamando'}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ 
        justifyContent: 'space-between', 
        px: 3, 
        pb: 3,
        borderTop: '1px solid',
        borderColor: 'divider',
        pt: 2
      }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<CallEnd />}
          onClick={handleRejectCall}
          sx={{ 
            borderRadius: 28, 
            px: 3, 
            py: 1.2,
            boxShadow: 3,
            '&:hover': {
              bgcolor: 'error.dark',
              boxShadow: 4
            }
          }}
        >
          Rifiuta
        </Button>
        
        <Button
          variant="contained"
          color="success"
          startIcon={isVideoCall ? <Videocam /> : <Call />}
          onClick={handleAnswerCall}
          sx={{ 
            borderRadius: 28, 
            px: 3, 
            py: 1.2,
            boxShadow: 3,
            '&:hover': {
              bgcolor: 'success.dark',
              boxShadow: 4
            }
          }}
        >
          Rispondi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IncomingCallDialog;