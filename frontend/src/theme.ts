import { createTheme, ThemeOptions } from "@mui/material/styles";

export const getTheme = (mode: "light" | "dark") => {
  const themeOptions: ThemeOptions = {
    direction: "ltr",
    palette: {
      mode,
      primary: {
        main: "#2a2a2a",
        light: "#ffd700",
        dark: "#2a2a2a",
        contrastText: "#ffd700",
      },
      secondary: {
        main: "#2a2a2a",
        light: "#2a2a2a",
        dark: "#fff",
        contrastText: "#fff",
      },
      background: {
        default: mode === "light" ? "#ffd700" : "#2a2a2a",
        paper: mode === "light" ? "#fff" : "#333",
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
  return createTheme(themeOptions);
};
