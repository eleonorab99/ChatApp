import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  InsertDriveFile,
  PictureAsPdf,
  Image,
  GetApp,
  Close
} from '@mui/icons-material';
import { formatFileSize } from '../../utils/formatters';

interface FilePreviewProps {
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  onClose?: () => void;
  isPreviewOnly?: boolean;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  fileUrl,
  fileName,
  fileType,
  fileSize,
  onClose,
  isPreviewOnly = false
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Estrai il nome del file dall'URL se non è fornito
  const displayFileName = fileName || fileUrl.split('/').pop() || 'File';
  
  // Determina l'icona e se possiamo visualizzare un'anteprima
  const isImage = fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(displayFileName);
  const isPdf = fileType === 'application/pdf' || displayFileName.toLowerCase().endsWith('.pdf');
  
  // Gestisce il caricamento dell'immagine
  const handleImageLoad = () => {
    setLoading(false);
  };
  
  // Gestisce l'errore di caricamento
  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };
  
  // Scarica il file
  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: 1,
        borderRadius: 2,
        width: isPreviewOnly ? '100%' : '250px',
        position: 'relative',
        overflow: 'hidden',
        mb: isPreviewOnly ? 0 : 2
      }}
    >
      {!isPreviewOnly && (
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 2,
            bgcolor: 'rgba(0,0,0,0.1)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.2)',
            }
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Anteprima del file */}
        <Box 
          sx={{ 
            width: '100%', 
            height: isPreviewOnly ? 180 : 120, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            position: 'relative',
            bgcolor: 'rgba(0, 0, 0, 0.03)',
            borderRadius: 1,
            overflow: 'hidden',
            mb: 1
          }}
        >
          {isImage ? (
            <>
              {loading && (
                <CircularProgress size={24} sx={{ position: 'absolute' }} />
              )}
              <Box
                component="img"
                src={fileUrl}
                alt={displayFileName}
                onLoad={handleImageLoad}
                onError={handleImageError}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: loading || error ? 'none' : 'block'
                }}
              />
              {error && <Image sx={{ fontSize: 48, opacity: 0.5 }} />}
            </>
          ) : isPdf ? (
            <PictureAsPdf sx={{ fontSize: 48, opacity: 0.7, color: '#e53935' }} />
          ) : (
            <InsertDriveFile sx={{ fontSize: 48, opacity: 0.7 }} />
          )}
        </Box>
        
        {/* Info sul file */}
        <Box sx={{ width: '100%', px: 1 }}>
          <Typography 
            variant="body2" 
            component="div" 
            sx={{ 
              fontWeight: 'medium',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {displayFileName}
          </Typography>
          
          {fileSize && (
            <Typography 
              variant="caption" 
              color="text.secondary"
              component="div"
            >
              {formatFileSize(fileSize)}
            </Typography>
          )}
          
          {!isPreviewOnly && (
            <IconButton
              size="small"
              color="primary"
              onClick={handleDownload}
              sx={{ mt: 1 }}
            >
              <GetApp fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

export default FilePreview;