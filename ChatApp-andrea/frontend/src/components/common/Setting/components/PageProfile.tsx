import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Avatar,  
  Paper, 
  Divider, 
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import useAuth from '../../../../hooks/useAuth';
import profileService from '../../../../services/profileService';
import useApp from '../../../../hooks/useApp';

// Componente per la pagina del profilo utente
const PaginaProfilo: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUserInfo } = useAuth();
  const { addNotification } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Stati per gestire il profilo
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    bio: '',
    profileImage: ''
  });
  
  // Stati per l'editing
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Valori temporanei durante l'editing
  const [tempUsername, setTempUsername] = useState('');
  const [tempBio, setTempBio] = useState('');
  
  // Carica i dati del profilo
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const profile = await profileService.getProfile();
        
        setProfileData({
          username: profile.username,
          bio: profile.bio || '',
          profileImage: profile.profileImage || ''
        });
        
        setTempUsername(profile.username);
        setTempBio(profile.bio || '');
      } catch (error) {
        console.error('Errore nel caricamento del profilo:', error);
        setError('Impossibile caricare i dati del profilo');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);
  
  // Gestisce il click sul pulsante per caricare una nuova immagine
  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Gestisce il caricamento dell'immagine
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Verifica che sia un'immagine
    if (!file.type.startsWith('image/')) {
      addNotification({
        type: 'error',
        message: t('profile.imageTypeError'),
        autoHideDuration: 3000
      });
      return;
    }
    
    // Verifica la dimensione massima (2MB)
    if (file.size > 2 * 1024 * 1024) {
      addNotification({
        type: 'error',
        message: t('profile.imageSizeError'),
        autoHideDuration: 3000
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      const updatedProfile = await profileService.uploadProfileImage(file);
      
      setProfileData(prev => ({
        ...prev,
        profileImage: updatedProfile.profileImage || ''
      }));
      
      // Aggiorna le informazioni utente nel contesto Auth
      if (updateUserInfo) {
        updateUserInfo({
          ...user!,
          profileImage: updatedProfile.profileImage
        });
      }
      
      addNotification({
        type: 'success',
        message: t('profile.imageUploadSuccess'),
        autoHideDuration: 3000
      });
    } catch (error) {
      console.error('Errore nel caricamento dell\'immagine:', error);
      addNotification({
        type: 'error',
        message: t('profile.imageUploadError'),
        autoHideDuration: 3000
      });
    } finally {
      setIsUploading(false);
      // Resetta il campo di input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Gestisce l'eliminazione dell'immagine
  const handleDeleteImage = async () => {
    if (!profileData.profileImage) return;
    
    try {
      setIsUploading(true);
      
      await profileService.deleteProfileImage();
      
      setProfileData(prev => ({
        ...prev,
        profileImage: ''
      }));
      
      // Aggiorna le informazioni utente nel contesto Auth
      if (updateUserInfo) {
        updateUserInfo({
          ...user!,
          profileImage: null
        });
      }
      
      addNotification({
        type: 'success',
        message: t('profile.imageDeleteSuccess'),
        autoHideDuration: 3000
      });
    } catch (error) {
      console.error('Errore nell\'eliminazione dell\'immagine:', error);
      addNotification({
        type: 'error',
        message: t('profile.imageDeleteError'),
        autoHideDuration: 3000
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Inizia la modifica del profilo
  const handleStartEditing = () => {
    setTempUsername(profileData.username);
    setTempBio(profileData.bio);
    setIsEditing(true);
  };
  
  // Annulla la modifica del profilo
  const handleCancelEditing = () => {
    setIsEditing(false);
    setTempUsername(profileData.username);
    setTempBio(profileData.bio);
  };
  
  // Salva le modifiche al profilo
  const handleSaveProfile = async () => {
    try {
      setIsUploading(true);
      
      // Verifica che lo username non sia vuoto
      if (!tempUsername.trim()) {
        addNotification({
          type: 'error',
          message: t('profile.usernameRequired'),
          autoHideDuration: 3000
        });
        return;
      }
      
      const updatedProfile = await profileService.updateProfile({
        username: tempUsername,
        bio: tempBio
      });
      
      setProfileData({
        ...profileData,
        username: updatedProfile.username,
        bio: updatedProfile.bio || ''
      });
      
      // Aggiorna le informazioni utente nel contesto Auth
      if (updateUserInfo) {
        updateUserInfo({
          ...user!,
          username: updatedProfile.username,
          bio: updatedProfile.bio
        });
      }
      
      setIsEditing(false);
      
      addNotification({
        type: 'success',
        message: t('profile.updateSuccess'),
        autoHideDuration: 3000
      });
    } catch (error) {
      console.error('Errore nell\'aggiornamento del profilo:', error);
      addNotification({
        type: 'error',
        message: t('profile.updateError'),
        autoHideDuration: 3000
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom>
        {t('profile.title')}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3, mb: 4, maxWidth: 600 }}>
        {/* Sezione immagine profilo */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative', mb: 2 }}>
            <Avatar
              src={profileData.profileImage}
              alt={profileData.username}
              sx={{ width: 120, height: 120, mb: 1, bgcolor: '#ffd700' }}
            >
              {!profileData.profileImage && profileData.username.charAt(0).toUpperCase()}
            </Avatar>
            
            {isUploading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '50%'
                }}
              >
                <CircularProgress size={40} sx={{ color: 'white' }} />
              </Box>
            )}
          </Box>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
            disabled={isUploading}
          />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<PhotoCameraIcon />}
              onClick={handleImageUploadClick}
              disabled={isUploading}
              sx={{ bgcolor: '#ffd700', color: 'black', '&:hover': { bgcolor: '#e6c200' } }}
            >
              {t('profile.uploadImage')}
            </Button>
            
            {profileData.profileImage && (
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteImage}
                disabled={isUploading}
                color="error"
              >
                {t('profile.deleteImage')}
              </Button>
            )}
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Sezione informazioni profilo */}
        {!isEditing ? (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {t('profile.username')}
              </Typography>
              <Typography variant="h6">
                {profileData.username}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {t('profile.bio')}
              </Typography>
              <Typography variant="body1">
                {profileData.bio || t('profile.noBio')}
              </Typography>
            </Box>
            
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleStartEditing}
              sx={{ bgcolor: '#ffd700', color: 'black', '&:hover': { bgcolor: '#e6c200' } }}
            >
              {t('profile.edit')}
            </Button>
          </Box>
        ) : (
          <Box>
            <TextField
              fullWidth
              label={t('profile.username')}
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              margin="normal"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              disabled={isUploading}
            />
            
            <TextField
              fullWidth
              label={t('profile.bio')}
              value={tempBio}
              onChange={(e) => setTempBio(e.target.value)}
              margin="normal"
              variant="outlined"
              multiline
              rows={4}
              InputLabelProps={{ shrink: true }}
              disabled={isUploading}
              inputProps={{ maxLength: 500 }}
              helperText={`${tempBio.length}/500`}
            />
            
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveProfile}
                disabled={isUploading}
                sx={{ bgcolor: '#ffd700', color: 'black', '&:hover': { bgcolor: '#e6c200' } }}
              >
                {t('profile.save')}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancelEditing}
                disabled={isUploading}
              >
                {t('profile.cancel')}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PaginaProfilo;