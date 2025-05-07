import React, { useRef, useEffect } from 'react';
import { Box, Paper, Typography, Backdrop, CircularProgress } from '@mui/material';
import CallControls from './CallControls';
import useCall from '../../hooks/useCall';
import useChat from '../../hooks/useChat';

// Componente per gestire la visualizzazione di una chiamata video
const VideoCall: React.FC = () => {
  const { 
    isCallActive, 
    isVideoCall, 
    localStream, 
    remoteStream, 
    isVideoEnabled, 
    isAudioEnabled,
    error
  } = useCall();
  const { currentRecipient } = useChat();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Collegamento degli stream video ai riferimenti HTML
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Se non c'è una chiamata attiva, non mostriamo nulla
  if (!isCallActive) {
    return null;
  }

  // Nome del partner di chiamata
  const partnerName = currentRecipient?.username || 'Utente';

  // Stato di caricamento - quando abbiamo una chiamata attiva ma nessuno stream remoto
  const isLoading = isCallActive && !remoteStream;

  // Messaggio di errore se presente
  const hasError = !!error;

  return (
    <Backdrop
      open={isCallActive}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
        }}
      >
        {/* Video remoto (partner) */}
        <Paper
          elevation={4}
          sx={{
            width: '100%',
            maxWidth: 1000,
            height: 'auto',
            maxHeight: '80vh',
            aspectRatio: '16/9',
            overflow: 'hidden',
            bgcolor: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            borderRadius: 2,
          }}
        >
          {isLoading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress color="primary" size={60} sx={{ mb: 2 }} />
              <Typography variant="body1" color="white">
                Connessione in corso...
              </Typography>
            </Box>
          )}

          {hasError && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              <Typography variant="h6" color="error" gutterBottom>
                Errore nella chiamata
              </Typography>
              <Typography variant="body1" color="white">
                {error}
              </Typography>
            </Box>
          )}

          {isVideoCall && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                width: '100%',
                bgcolor: '#222',
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h3" color="white">
                  {partnerName.charAt(0).toUpperCase()}
                </Typography>
              </Box>
              <Typography variant="h5" color="white">
                {partnerName}
              </Typography>
              <Typography variant="body1" color="white" sx={{ mt: 1, opacity: 0.7 }}>
                {remoteStream ? 'Chiamata in corso...' : 'Connessione in corso...'}
              </Typography>
              {!isAudioEnabled && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Microfono disattivato
                </Typography>
              )}
            </Box>
          )}

          {/* Nome dell'utente remoto (per video chiamate) */}
          {isVideoCall && remoteStream && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                p: 1,
                borderRadius: 1,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
              }}
            >
              <Typography variant="body2" color="white">
                {partnerName}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Video locale (utente corrente) */}
        {isVideoCall && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: 200,
              aspectRatio: '4/3',
              overflow: 'hidden',
              borderRadius: 2,
              bgcolor: '#000',
              opacity: isVideoEnabled ? 1 : 0.7,
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Specchia orizzontalmente
                display: isVideoEnabled ? 'block' : 'none',
              }}
            />
            {!isVideoEnabled && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  width: '100%',
                  bgcolor: '#333',
                }}
              >
                <Typography variant="body2" color="white">
                  Camera disattivata
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Controlli chiamata */}
        <CallControls />
      </Box>
    </Backdrop>
  );
};

export default VideoCall;