import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { Call, CallEnd, Videocam } from '@mui/icons-material';
import useCall from '../../hooks/useCall';

// Componente per mostrare una finestra di dialogo per chiamate in arrivo
const IncomingCallDialog: React.FC = () => {
  const { isIncomingCall, isVideoCall, incomingCallData, answerCall, rejectCall } = useCall();

  if (!isIncomingCall || !incomingCallData) {
    return null;
  }

  return (
    <Dialog
      open={isIncomingCall}
      aria-labelledby="incoming-call-dialog-title"
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
          width: '100%',
          maxWidth: 400,
        },
      }}
    >
      <DialogTitle id="incoming-call-dialog-title" sx={{ textAlign: 'center' }}>
        Chiamata in arrivo
      </DialogTitle>
      
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 2,
          }}
        >
          {isVideoCall ? (
            <Videocam sx={{ fontSize: 40, color: 'white' }} />
          ) : (
            <Call sx={{ fontSize: 40, color: 'white' }} />
          )}
        </Box>
        
        <Typography variant="h6" component="div" gutterBottom>
          {incomingCallData.callerName}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          {isVideoCall ? 'sta avviando una videochiamata' : 'sta chiamando'}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<CallEnd />}
          onClick={rejectCall}
          sx={{ borderRadius: 28, px: 3, py: 1 }}
        >
          Rifiuta
        </Button>
        
        <Button
          variant="contained"
          color="success"
          startIcon={isVideoCall ? <Videocam /> : <Call />}
          onClick={answerCall}
          sx={{ borderRadius: 28, px: 3, py: 1 }}
        >
          Rispondi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IncomingCallDialog;