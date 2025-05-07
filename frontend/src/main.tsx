import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ThemeProvider } from '@mui/material/styles'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme.ts'

// Crea una cache per le emozioni
const cache = createCache({
  key: 'css',
  prepend: true,
});

// Render principale dell'applicazione
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CacheProvider value={cache}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </CacheProvider>
  </React.StrictMode>,
)