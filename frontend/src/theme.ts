import { createTheme, ThemeOptions } from '@mui/material/styles';

// Opzioni del tema
const themeOptions: ThemeOptions = {
  direction: 'ltr', // Imposta la direzione del testo da sinistra a destra
  palette: {
    mode: 'light',
    primary: {
      main: '#2a2a2a', // Colore principale ispirato a WhatsApp ffd700
      light: '#ffd700', //messaggi inviati
      dark: '#2a2a2a', //bordo riquadri login e register
      contrastText: '#ffd700',//icone barra superiore
    },
    secondary: {
      main: '#2a2a2a',//icone lista contatti
      light: '#2a2a2a',
      dark: '#fff',
      contrastText: '#fff',
    },
    background: {
      default: '#ffd700',//icona lista contatti (interno)
      paper: '#fff',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    fontSize: 14,
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {

      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
  },
};

// Crea il tema
const theme = createTheme(themeOptions);

export default theme;