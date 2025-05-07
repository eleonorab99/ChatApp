import React from 'react';
import { Box, Container, Typography, Tabs, Tab, Paper } from '@mui/material';
import RegistrationDebugger from './RegistrationDebugger';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Componente per mostrare il contenuto di un tab
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`debug-tabpanel-${index}`}
      aria-labelledby={`debug-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Helper per generare props di accessibilità per i tab
function a11yProps(index: number) {
  return {
    id: `debug-tab-${index}`,
    'aria-controls': `debug-tabpanel-${index}`,
  };
}

// Pagina principale di debug con vari strumenti di diagnostica
const DebugPage: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Strumenti di Debug
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Questa pagina contiene strumenti per testare e diagnosticare vari aspetti dell'applicazione.
          Utilizzala per identificare problemi e verificare il funzionamento corretto dei componenti.
        </Typography>
      </Paper>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="debug tools tabs">
            <Tab label="Registrazione" {...a11yProps(0)} />
            <Tab label="Connessione WebSocket" {...a11yProps(1)} disabled />
            <Tab label="Informazioni Sistema" {...a11yProps(2)} disabled />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0}>
          <RegistrationDebugger />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Typography>Strumenti di debug WebSocket (non ancora implementati)</Typography>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Typography>Informazioni di sistema (non ancora implementate)</Typography>
        </TabPanel>
      </Box>
    </Container>
  );
};

export default DebugPage;