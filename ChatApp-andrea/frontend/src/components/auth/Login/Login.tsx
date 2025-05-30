import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Typography,
  Container,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  Button,
} from '@mui/material';
import {
  LockOutlined as LockOutlinedIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon
} from '@mui/icons-material';
import useAuth from '../../../hooks/useAuth';
import useApp from '../../../hooks/useApp';
import LoadingButton from '../../common/LoadingButton';
import './LoginStyle.css';

// Componente per il login
const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, loading } = useAuth();
  const { addNotification } = useApp();
  const navigate = useNavigate();

  // Gestisce il submit del form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }
    
    try {
      setError(null);
      await login({ email, password });
      
      addNotification({
        type: 'success',
        message: 'Login effettuato con successo',
        autoHideDuration: 3000
      });
      
      navigate('/');
    } catch (err) {
      let errorMessage = 'Errore durante il login';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  // Gestisce la pressione del tasto Invio
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // Cambia la visibilità della password
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Naviga alla pagina di registrazione
  const navigateToRegister = () => {
    navigate('/register');
  };

  return (
    <Container component="main" maxWidth="xs" className='container'>
      <Box className= "boxWrapper">
        <Paper
          elevation={3} className='paper'>
          <Box className='title'>
           Connectly
          </Box>
          <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
            Accedi
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className='textField'
              error={!!error && !email}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              error={!!error && !password}
              className='textField'
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={togglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <LoadingButton
              type="submit"
              fullWidth
              variant="contained"
              loading={loading}
              loadingPosition="start"
              startIcon={<LoginIcon />}
              className='submitButton'
            >
              Accedi
            </LoadingButton>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                onClick={navigateToRegister}
                color="primary"
                
              >
                Non hai un account? Registrati
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;