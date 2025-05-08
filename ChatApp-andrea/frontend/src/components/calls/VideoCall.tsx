import React, { useRef, useEffect, useState } from 'react';
import { Box, Paper, Typography, Backdrop, CircularProgress } from '@mui/material';
import CallControls from './CallControls';
import useCall from '../../hooks/useCall';
import useChat from '../../hooks/useChat';
import callService from '../../services/callService';

// Componente per gestire la visualizzazione di una chiamata video
const VideoCall: React.FC = () => {
  const { 
    isCallActive, 
    isVideoCall, 
    localStream, 
    remoteStream, 
    isVideoEnabled, 
    isAudioEnabled,
    error,
    isInitiator
  } = useCall();
  const { currentRecipient } = useChat();
  
  // Riferimenti agli elementi video
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Stato per tracciare se i video sono già stati impostati
  const [localVideoSet, setLocalVideoSet] = useState(false);
  const [remoteVideoSet, setRemoteVideoSet] = useState(false);
  
  // Log dei componenti vitali per debugging
  useEffect(() => {
    console.log("VideoCall - Stato componente:", {
      isCallActive,
      isVideoCall,
      hasLocalStream: !!localStream,
      hasRemoteStream: !!remoteStream,
      localStreamTracks: localStream ? localStream.getTracks().map(t => t.kind) : [],
      remoteStreamTracks: remoteStream ? remoteStream.getTracks().map(t => t.kind) : [],
      isInitiator
    });
  }, [isCallActive, isVideoCall, localStream, remoteStream, isInitiator]);

  // Pulizia quando il componente viene smontato o la chiamata termina
  useEffect(() => {
    // Cleanup quando il componente viene smontato
    return () => {
      // Se la chiamata era attiva e il componente viene smontato, assicuriamoci di pulire
      if (isCallActive) {
        console.log("VideoCall - Pulizia durante smontaggio del componente");
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      }
    };
  }, []);
  
  // Effetto per rilevare la fine della chiamata e pulire
  useEffect(() => {
    // Se la chiamata era attiva ed ora non lo è più, esegui una pulizia aggiuntiva
    if (!isCallActive) {
      console.log("VideoCall - Chiamata terminata, pulizia streams");
      
      // Pulizia esplicita dei riferimenti video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        setLocalVideoSet(false);
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        setRemoteVideoSet(false);
      }
      
      // Extra: forza il rilascio delle risorse media quando la chiamata termina
      callService.forceReleaseMediaResources().catch(err => {
        console.warn("VideoCall - Errore nel rilascio forzato delle risorse:", err);
      });
    }
  }, [isCallActive]);

  // Funzione per impostare lo stream locale sull'elemento video
  useEffect(() => {
    if (localVideoRef.current && localStream && isCallActive) {
      console.log("VideoCall - Impostazione stream locale:", { 
        tracks: localStream.getTracks().map(t => `${t.kind}(${t.readyState}, ${t.enabled})`) 
      });
      
      try {
        localVideoRef.current.srcObject = localStream;
        
        // Verifica l'effettiva impostazione e avvia la riproduzione
        if (localVideoRef.current.srcObject) {
          console.log("VideoCall - Stream locale impostato con successo");
          setLocalVideoSet(true);
          
          localVideoRef.current.play().catch(err => {
            console.error("VideoCall - Errore nella riproduzione video locale:", err);
          });
        }
      } catch (err) {
        console.error("VideoCall - Errore nell'impostazione dello stream locale:", err);
      }
    }
  }, [localStream, isCallActive, localVideoRef]);

  // Effetto per impostare lo stream remoto sull'elemento video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && isCallActive) {
      console.log("VideoCall - Impostazione stream remoto:", { 
        tracks: remoteStream.getTracks().map(t => `${t.kind}(${t.readyState}, ${t.enabled})`) 
      });
      
      try {
        remoteVideoRef.current.srcObject = remoteStream;
        
        // Verifica l'effettiva impostazione e avvia la riproduzione
        if (remoteVideoRef.current.srcObject) {
          console.log("VideoCall - Stream remoto impostato con successo");
          setRemoteVideoSet(true);
          
          remoteVideoRef.current.play().catch(err => {
            console.error("VideoCall - Errore nella riproduzione video remoto:", err);
          });
        }
      } catch (err) {
        console.error("VideoCall - Errore nell'impostazione dello stream remoto:", err);
      }
    }
  }, [remoteStream, isCallActive, remoteVideoRef]);

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
              muted={false}
              controls={false}
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

        {/* Video locale (utente corrente) - sempre visibile se in videochiamata */}
        {isVideoCall && localStream && (
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
              zIndex: 1500, // Valore molto alto per assicurare che sia visibile
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted={true} // Importante per evitare l'eco
              controls={false}
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