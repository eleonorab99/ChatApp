import React, { useEffect } from 'react';
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
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Effetto per riprodurre un suono quando c'è una chiamata in arrivo
  useEffect(() => {
    if (isIncomingCall) {
      // Crea un elemento audio e riproduci il suono di chiamata
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(error => console.error('Errore nella riproduzione del suono:', error));
      
      // Pulisci quando la chiamata termina
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [isIncomingCall]);

  if (!isIncomingCall || !incomingCallData) {
    return null;
  }

  return (
    <Dialog
      open={isIncomingCall}
      aria-labelledby="incoming-call-dialog-title"
      fullScreen={fullScreen}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: fullScreen ? 0 : 2,
          width: fullScreen ? '100%' : '100%',
          maxWidth: fullScreen ? '100%' : 400,
          margin: fullScreen ? 0 : 2,
          overflow: 'hidden'
        },
      }}
    >
      <DialogTitle 
        id="incoming-call-dialog-title" 
        sx={{ 
          textAlign: 'center',
          bgcolor: 'primary.main',
          color: 'white',
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
            bgcolor: 'primary.light',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 3,
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%': {
                boxShadow: '0 0 0 0 rgba(255, 215, 0, 0.4)'
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
          onClick={rejectCall}
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
          onClick={answerCall}
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