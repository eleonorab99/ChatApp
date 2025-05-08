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
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import useAuth from '../../../hooks/useAuth';
import useApp from '../../../hooks/useApp';
import './RegisterStyle.css';

// Componente per la registrazione
const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, loading } = useAuth();
  const { addNotification } = useApp();
  const navigate = useNavigate();

  // Validazione dei campi del form
  const validateForm = (): boolean => {
    if (!email || !password || !username || !confirmPassword) {
      setError('Tutti i campi sono obbligatori');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email non valida');
      return false;
    }

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Le password non corrispondono');
      return false;
    }

    return true;
  };

  // Gestisce il submit del form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setError(null);
      await register({ email, password, username });
      
      addNotification({
        type: 'success',
        message: 'Registrazione completata con successo',
        autoHideDuration: 3000
      });
      
      navigate('/');
    } catch (err) {
      let errorMessage = 'Errore durante la registrazione';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Gestione degli errori API specifici
        const apiError = err as any;
        if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message;
        }
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

  // Cambia la visibilità della conferma password
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Naviga alla pagina di login
  const navigateToLogin = () => {
    navigate('/login');
  };

  return (
    <Container component="main" maxWidth="xs" className="container">
      <Box className= "boxWrapper">
        <Paper elevation={3} className= "paper">
          <Typography 
            component="h1" 
            variant="h4" 
            className="title"
          >
            Connectly
          </Typography>
          <Typography 
            component="h2" 
            variant="h6" 
            className="subtitle"
          >
            Registration
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate className="form">
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              className="textField"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="E-mail"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="textField"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="textField"
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
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Conferma password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="textField"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={toggleConfirmPasswordVisibility}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              className="submitButton"
            >
              Registrati
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;