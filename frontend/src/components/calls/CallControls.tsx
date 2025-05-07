import React from 'react';
import { Box, IconButton, Paper, Tooltip } from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
} from '@mui/icons-material';
import useCall from '../../hooks/useCall';

// Componente per i controlli della chiamata (audio/video)
const CallControls: React.FC = () => {
  const { isCallActive, isVideoCall, isAudioEnabled, isVideoEnabled, endCall, toggleAudio, toggleVideo } = useCall();

  if (!isCallActive) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        p: 1.5,
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        borderRadius: 4,
        backgroundColor: 'rgba(42, 42, 42, 0.8)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Pulsante per microfono */}
        <Tooltip title={isAudioEnabled ? 'Disattiva microfono' : 'Attiva microfono'}>
          <IconButton
            onClick={toggleAudio}
            sx={{
              backgroundColor: isAudioEnabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 0, 0, 0.2)',
              '&:hover': {
                backgroundColor: isAudioEnabled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 0, 0, 0.3)',
              },
              color: 'white',
              width: 48,
              height: 48,
            }}
          >
            {isAudioEnabled ? <Mic /> : <MicOff />}
          </IconButton>
        </Tooltip>

        {/* Pulsante per terminare chiamata */}
        <Tooltip title="Termina chiamata">
          <IconButton
            onClick={endCall}
            sx={{
              backgroundColor: 'rgb(244, 67, 54)',
              '&:hover': {
                backgroundColor: 'rgb(211, 47, 47)',
              },
              color: 'white',
              width: 56,
              height: 56,
              mx: 1,
            }}
          >
            <CallEnd />
          </IconButton>
        </Tooltip>

        {/* Pulsante per camera (solo per videochiamate) */}
        {isVideoCall && (
          <Tooltip title={isVideoEnabled ? 'Disattiva camera' : 'Attiva camera'}>
            <IconButton
              onClick={toggleVideo}
              sx={{
                backgroundColor: isVideoEnabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 0, 0, 0.2)',
                '&:hover': {
                  backgroundColor: isVideoEnabled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 0, 0, 0.3)',
                },
                color: 'white',
                width: 48,
                height: 48,
              }}
            >
              {isVideoEnabled ? <Videocam /> : <VideocamOff />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

export default CallControls;