import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import apiDebugger from '../../utils/apiDebugger';

// Componente per testare e diagnosticare la registrazione
const RegistrationDebugger: React.FC = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [username, setUsername] = useState('testuser');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<boolean | null>(null);
  const [serverStatusLoading, setServerStatusLoading] = useState(false);

  // Testa la connessione al server
  const testConnection = async () => {
    setServerStatusLoading(true);
    const connected = await apiDebugger.testServerConnection();
    setServerStatus(connected);
    setServerStatusLoading(false);
  };

  // Testa la registrazione
  const testRegistration = async () => {
    setLoading(true);
    try {
      const testResult = await apiDebugger.testRegistration({
        email,
        password,
        username,
      });
      setResult(testResult);
    } catch (error) {
      setResult({ success: false, error: { message: 'Errore durante il test' } });
    } finally {
      setLoading(false);
    }
  };

  // Genera dati casuali per la registrazione
  const generateRandomData = () => {
    const randomId = Math.random().toString(36).substring(2, 8);
    setEmail(`test${randomId}@example.com`);
    setUsername(`testuser${randomId}`);
    setPassword(`pass${randomId}`);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: '800px', margin: '0 auto' }}>
      <Typography variant="h5" gutterBottom>
        Strumento di Debug Registrazione
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Stato Connessione Server
        </Typography>
        <Button 
          variant="outlined" 
          onClick={testConnection} 
          disabled={serverStatusLoading}
          sx={{ mr: 2 }}
        >
          {serverStatusLoading ? 'Verifica in corso...' : 'Verifica connessione server'}
        </Button>
        
        {serverStatus !== null && (
          <Alert severity={serverStatus ? 'success' : 'error'} sx={{ mt: 1 }}>
            {serverStatus 
              ? 'Server raggiungibile' 
              : 'Impossibile raggiungere il server. Verifica che il backend sia in esecuzione e che il certificato SSL sia valido.'}
          </Alert>
        )}
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="subtitle1" gutterBottom>
        Test Registrazione
      </Typography>
      
      <Box component="form" sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
        />
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={testRegistration} 
            disabled={loading}
          >
            {loading ? 'Test in corso...' : 'Testa registrazione'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={generateRandomData}
          >
            Genera dati casuali
          </Button>
        </Box>
      </Box>
      
      {result && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Risultato del test
          </Typography>
          
          <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 2 }}>
            {result.success 
              ? 'Registrazione riuscita!' 
              : `Errore: ${result.error?.message || 'Errore sconosciuto'}`}
          </Alert>
          
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(result, null, 2)}
            </Typography>
          </Paper>
          
          {!result.success && result.error && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Possibili cause:</Typography>
              <List dense>
                {result.error.isNetworkError && (
                  <ListItem>
                    <ListItemText 
                      primary="Problema di connessione di rete" 
                      secondary="Verifica che il server backend sia in esecuzione e raggiungibile" 
                    />
                  </ListItem>
                )}
                {result.error.isTimeoutError && (
                  <ListItem>
                    <ListItemText 
                      primary="Timeout della richiesta" 
                      secondary="Il server ha impiegato troppo tempo per rispondere" 
                    />
                  </ListItem>
                )}
                {result.error.status === 409 && (
                  <ListItem>
                    <ListItemText 
                      primary="Email o username già esistenti" 
                      secondary="Prova con credenziali diverse" 
                    />
                  </ListItem>
                )}
                {result.error.status === 500 && (
                  <ListItem>
                    <ListItemText 
                      primary="Errore interno del server" 
                      secondary="Controlla i log del server backend per maggiori dettagli" 
                    />
                  </ListItem>
                )}
                {result.error.status === 400 && (
                  <ListItem>
                    <ListItemText 
                      primary="Dati non validi" 
                      secondary="Verifica che tutti i campi siano compilati correttamente" 
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </Box>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="subtitle2" color="text.secondary">
        API URL: {apiDebugger.getApiUrl()}
      </Typography>
    </Paper>
  );
};

export default RegistrationDebugger;