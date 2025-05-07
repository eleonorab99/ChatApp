import { createTheme, ThemeOptions } from "@mui/material/styles";

// Opzioni del tema
const themeOptions: ThemeOptions = {
  direction: "ltr", // Imposta la direzione del testo da sinistra a destra
  palette: {
    mode: "light",
    primary: {
      main: "#001d3d", // Colore principale ispirato a WhatsApp
      light: "#19eeff", //messaggi inviati
      dark: "#001d3d", //bordo riquadri login e register
      contrastText: "#19eeff", //icone barra superiore
    },
    secondary: {
      main: "#001d3d", //icone lista contatti
      light: "#19eeff",
      dark: "#fff",
      contrastText: "#fff",
    },
    background: {
      default: "#19eeff", //icona lista contatti (interno)
      paper: "#fff",
    },
  },
  typography: {
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    fontSize: 14,
    button: {
      textTransform: "none",
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
      styleOverrides: {},
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
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
