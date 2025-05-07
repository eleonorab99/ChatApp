import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Tooltip,
  InputAdornment,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Mic as MicIcon,
  Videocam as VideocamIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import useChat from '../../hooks/useChat';
import useCall from '../../hooks/useCall';
import { useTranslation } from 'react-i18next';
import FilePreview from './FilePreview';

// Componente per l'input di messaggi
const MessageInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const { sendMessage, sendFileMessage, currentRecipient } = useChat();
  const { startCall } = useCall();
  const { t } = useTranslation();

  // Gestisce l'invio del messaggio
  const handleSendMessage = () => {
    if (selectedFile) {
      handleSendFile();
      return;
    }

    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  // Gestisce la pressione del tasto Invio
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Gestisce il caricamento di un file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    
    if (file) {
      setSelectedFile(file);
      
      // Crea un'anteprima per il file selezionato
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // Per altri tipi di file, non creiamo anteprime con data URL
        setPreviewUrl(null);
      }
    }
  };

  // Gestisce l'invio del file
  const handleSendFile = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    try {
      await sendFileMessage(selectedFile);
      // Resetta lo stato dopo l'invio
      setSelectedFile(null);
      setPreviewUrl(null);
      // Resetta il campo di input file
      setFileInputKey(Date.now());
    } catch (error) {
      console.error('Errore durante l\'invio del file:', error);
      alert('Errore durante l\'invio del file. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  // Gestisce la cancellazione del file selezionato
  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileInputKey(Date.now());
  };

  // Gestisce l'avvio di una chiamata audio
  const handleAudioCall = () => {
    startCall(false);
  };

  // Gestisce l'avvio di una videochiamata
  const handleVideoCall = () => {
    startCall(true);
  };

  // Determina se i controlli per le chiamate devono essere attivi
  const isCallAvailable = !!currentRecipient;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Anteprima del file selezionato */}
      {selectedFile && (
        <Box sx={{ mb: 2 }}>
          <FilePreview
            fileUrl={previewUrl || ''}
            fileName={selectedFile.name}
            fileType={selectedFile.type}
            fileSize={selectedFile.size}
            onClose={handleClearFile}
          />
        </Box>
      )}
      
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Input per i file */}
        <input
          accept="image/*,application/pdf,text/plain,video/*,audio/*"
          style={{ display: 'none' }}
          id="file-upload"
          key={fileInputKey}
          type="file"
          onChange={handleFileUpload}
          disabled={loading}
        />
        <label htmlFor="file-upload">
          <Tooltip title={loading ? t('messageInput.caricamento') : t('messageInput.allega')}>
            <span>
              <IconButton 
                color="primary" 
                component="span"
                aria-label="allega file"
                disabled={loading || !!selectedFile}
              >
                {loading ? <CircularProgress size={24} /> : <AttachFileIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </label>

        {/* Input per il messaggio */}
        <TextField
          fullWidth
          placeholder={selectedFile ? 'Aggiungi un commento (opzionale)' : t('messageInput.scrivi')}
          variant="outlined"
          size="small"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          InputProps={{
            sx: { borderRadius: 6 },
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Invia messaggio">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={((!message.trim() && !selectedFile) || loading)}
                      edge="end"
                      aria-label="invia messaggio"
                    >
                      <SendIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />

        {/* Pulsanti per le chiamate */}
        <Tooltip title={isCallAvailable ? "Chiamata audio" : "Seleziona un utente per chiamare"}>
          <span>
            <IconButton
              color="primary"
              onClick={handleAudioCall}
              disabled={!isCallAvailable || loading}
              aria-label="chiamata audio"
            >
              <MicIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={isCallAvailable ? "Videochiamata" : "Seleziona un utente per chiamare"}>
          <span>
            <IconButton
              color="primary"
              onClick={handleVideoCall}
              disabled={!isCallAvailable || loading}
              aria-label="videochiamata"
            >
              <VideocamIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default MessageInput;