import { createTheme } from '@mui/material/styles';

// Tema personalizzato per l'applicazione
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#075e54', // Colore principale ispirato a WhatsApp
      light: '#128c7e',
      dark: '#054c44',
      contrastText: '#fff',
    },
    secondary: {
      main: '#128c7e',
      light: '#25d366',
      dark: '#075e54',
      contrastText: '#fff',
    },
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
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
        rounded: {
          borderRadius: 8,
        },
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
});

export default theme;