import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Tooltip
} from '@mui/material';
import {
  InsertDriveFile,
  PictureAsPdf,
  Image,
  GetApp,
  Close,
  Description,
  Movie,
  MusicNote,
  Code,
  Download
} from '@mui/icons-material';
import { formatFileSize } from '../../utils/formatters';
import { Message } from '../../types/chat.types';

interface FilePreviewProps {
  message?: Message;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  onClose?: () => void;
  isPreviewOnly?: boolean;
}

const FilePreview: React.FC<FilePreviewProps> = ({ 
  message,
  fileUrl: propFileUrl,
  fileName: propFileName,
  fileType: propFileType,
  fileSize: propFileSize,
  onClose, 
  isPreviewOnly = false 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Usa le props dirette se fornite, altrimenti usa i valori dal message
  const fileUrlToUse = propFileUrl || message?.fileUrl;
  const fileNameToUse = propFileName || message?.fileName;
  const fileTypeToUse = propFileType || message?.fileType;
  const fileSizeToUse = propFileSize || message?.fileSize;
  
  // Estrai il nome del file dall'URL se non è fornito
  const displayFileName = fileNameToUse || fileUrlToUse?.split('/').pop() || 'File';
  
  useEffect(() => {
    const loadFile = async () => {
      if (!fileUrlToUse) {
        setError('URL del file non disponibile');
        setLoading(false);
        return;
      }

      try {
        // Verifica se il file è già stato caricato
        const response = await fetch(fileUrlToUse);
        if (!response.ok) {
          throw new Error('Impossibile caricare il file');
        }
        
        // Crea un URL per il file
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Errore nel caricamento del file:', err);
        setError('Errore nel caricamento del file');
        setLoading(false);
      }
    };

    loadFile();

    // Cleanup
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrlToUse]);
  
  // Gestisce il caricamento di PDF e iframe
  const handleIframeLoad = () => {
    setLoading(false);
  };

  // Gestisce il caricamento di video e audio
  const handleMediaLoad = () => {
    setLoading(false);
  };

  const handleMediaError = () => {
    setLoading(false);
    setError('Errore nel caricamento del video o audio');
  };
  
  // Scarica il file
  const handleDownload = async () => {
    if (!fileUrlToUse) return;

    try {
      const response = await fetch(fileUrlToUse);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNameToUse || 'file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Errore nel download del file:', err);
      setError('Errore nel download del file');
    }
  };
  
  // Apre l'anteprima
  const handlePreview = () => {
    setPreviewOpen(true);
  };
  
  // Determina il tipo di file e l'icona appropriata
  const getFileTypeInfo = () => {
    if (!fileTypeToUse && !displayFileName) return { isPreviewable: false, icon: <InsertDriveFile /> };
    
    const type = fileTypeToUse?.toLowerCase() || '';
    const name = displayFileName.toLowerCase();
    
    // Immagini
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) {
      return { 
        isPreviewable: true, 
        icon: <Image sx={{ fontSize: 48, opacity: 0.7, color: '#2196f3' }} />,
        previewComponent: (
          <Box
            component="img"
            src={fileUrl}
            alt={displayFileName}
            onLoad={() => setLoading(false)}
            onError={handleMediaError}
            sx={{
              maxWidth: '100%',
              maxHeight: '200px',
              objectFit: 'contain'
            }}
          />
        )
      };
    }
    
    // PDF
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return { 
        isPreviewable: true, 
        icon: <PictureAsPdf sx={{ fontSize: 48, opacity: 0.7, color: '#e53935' }} />,
        previewComponent: (
          <iframe
            src={fileUrl}
            style={{ width: '100%', height: '200px', border: 'none' }}
            title={displayFileName}
            onLoad={handleIframeLoad}
          />
        )
      };
    }
    
    // Video
    if (type.startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(name)) {
      return { 
        isPreviewable: true, 
        icon: <Movie sx={{ fontSize: 48, opacity: 0.7, color: '#4caf50' }} />,
        previewComponent: (
          <video
            controls
            style={{ maxWidth: '100%', maxHeight: '200px' }}
            src={fileUrl}
            onLoadedData={handleMediaLoad}
            onError={handleMediaError}
          />
        )
      };
    }
    
    // Audio
    if (type.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(name)) {
      return { 
        isPreviewable: true, 
        icon: <MusicNote sx={{ fontSize: 48, opacity: 0.7, color: '#9c27b0' }} />,
        previewComponent: (
          <audio
            controls
            style={{ width: '100%' }}
            src={fileUrl}
            onLoadedData={handleMediaLoad}
            onError={handleMediaError}
          />
        )
      };
    }
    
    // Testo
    if (type.startsWith('text/') || /\.(txt|md|json|js|ts|html|css)$/i.test(name)) {
      return { 
        isPreviewable: true, 
        icon: <Code sx={{ fontSize: 48, opacity: 0.7, color: '#ff9800' }} />,
        previewComponent: (
          <iframe
            src={fileUrl}
            style={{ width: '100%', height: '200px', border: 'none' }}
            title={displayFileName}
            onLoad={handleIframeLoad}
          />
        )
      };
    }
    
    // Documenti
    if (type.includes('document') || /\.(doc|docx|odt)$/i.test(name)) {
      return { 
        isPreviewable: false, 
        icon: <Description sx={{ fontSize: 48, opacity: 0.7, color: '#795548' }} />
      };
    }
    
    // Default
    return { 
      isPreviewable: false, 
      icon: <InsertDriveFile sx={{ fontSize: 48, opacity: 0.7 }} />
    };
  };
  
  const { isPreviewable, icon, previewComponent } = getFileTypeInfo();
  
  const renderPreview = () => {
    if (error) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (!fileUrl) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography>File non disponibile</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Anteprima del file */}
        <Box 
          sx={{ 
            width: '100%', 
            height: '200px', 
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
          {previewComponent}
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
          
          {fileSizeToUse && (
            <Typography 
              variant="caption" 
              color="text.secondary"
              component="div"
            >
              {formatFileSize(fileSizeToUse)}
            </Typography>
          )}
          
          {/* Pulsanti di azione */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
            <Tooltip title="Scarica file">
              <IconButton
                size="small"
                color="primary"
                onClick={handleDownload}
              >
                <Download />
              </IconButton>
            </Tooltip>
            {isPreviewable && (
              <Tooltip title="Apri anteprima">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={handlePreview}
                >
                  <Image fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <>
      <Paper
        elevation={2}
        sx={{
          p: 1,
          borderRadius: 2,
          width: '250px',
          position: 'relative',
          overflow: 'hidden',
          mb: 2,
          cursor: isPreviewable ? 'pointer' : 'default',
          '&:hover': {
            bgcolor: isPreviewable ? 'action.hover' : 'inherit'
          }
        }}
        onClick={isPreviewable ? handlePreview : undefined}
      >
        {onClose && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
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
        {renderPreview()}
      </Paper>

      {/* Dialog per l'anteprima */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogContent sx={{ p: 0, bgcolor: 'background.paper', height: '100%' }}>
          <Box sx={{ 
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ 
              p: 1, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider'
            }}>
              <Typography variant="subtitle1" noWrap>
                {displayFileName}
              </Typography>
              <Box>
                <IconButton onClick={handleDownload} color="primary" size="small">
                  <Download />
                </IconButton>
                <IconButton onClick={() => setPreviewOpen(false)} color="primary" size="small">
                  <Close />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              overflow: 'auto',
              p: 2,
              bgcolor: 'rgba(0, 0, 0, 0.03)'
            }}>
              {fileTypeToUse?.startsWith('image/') ? (
                <Box
                  component="img"
                  src={fileUrl}
                  alt={displayFileName}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : fileTypeToUse === 'application/pdf' ? (
                <iframe
                  src={fileUrl}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: 'none',
                    backgroundColor: 'white'
                  }}
                  title={displayFileName}
                />
              ) : fileTypeToUse?.startsWith('video/') ? (
                <video
                  controls
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%',
                    backgroundColor: 'black'
                  }}
                  src={fileUrl}
                />
              ) : fileTypeToUse?.startsWith('audio/') ? (
                <audio
                  controls
                  style={{ 
                    width: '100%',
                    maxWidth: '600px'
                  }}
                  src={fileUrl}
                />
              ) : fileTypeToUse?.startsWith('text/') ? (
                <iframe
                  src={fileUrl}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: 'none',
                    backgroundColor: 'white'
                  }}
                  title={displayFileName}
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: 2
                }}>
                  {icon}
                  <Typography variant="h6">{displayFileName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(fileSizeToUse || 0)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FilePreview;