import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Container,
  Badge,
  Tooltip
} from '@mui/material';
import {
  AccountCircle,
  Notifications,
  ExitToApp,
  Settings
} from '@mui/icons-material';
import useAuth from '../../hooks/useAuth';
import useChat from '../../hooks/useChat';
import useApp from '../../hooks/useApp';
import IncomingCallDialog from '../calls/IncomingCallDialog';
import NetworkStatus from '../common/NetworkStatus';
import ConnectionStatus from '../common/ConnectionStatus'; // Importa il nuovo componente

interface MainLayoutProps {
  children: React.ReactNode;
}

// Layout principale dell'applicazione
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { getTotalUnreadCount } = useChat();
  const { addNotification } = useApp();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // Gestisce il click sul menu utente
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Chiude il menu
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Gestisce il logout
  const handleLogout = async () => {
    handleClose();
    try {
      await logout();
      addNotification({
        type: 'success',
        message: 'Logout effettuato con successo',
        autoHideDuration: 3000
      });
      navigate('/login');
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Errore durante il logout',
        autoHideDuration: 5000
      });
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh',  }}>
        {/* Componente per mostrare lo stato della connessione di rete */}
        <NetworkStatus />
        
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Chat App
              <ConnectionStatus /> {/* Aggiungi l'indicatore di stato della connessione */}
            </Typography>
            
            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title="Notifiche">
                  <IconButton color="inherit" sx={{ mr: 1 }}>
                    <Badge
                      badgeContent={getTotalUnreadCount()}
                      color="error"
                    >
                      <Notifications />
                    </Badge>
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Impostazioni">
                  <IconButton color="inherit" sx={{ mr: 1 }} onClick={() => navigate('/settings')}>
                    <Settings />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Profilo">
                  <IconButton
                    size="large"
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={handleMenu}
                    color="inherit"
                  >
                    <AccountCircle />
                  </IconButton>
                </Tooltip>
                
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem disabled>
                    <Typography variant="body2">
                      {user.username} ({user.email})
                    </Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ExitToApp fontSize="small" sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <Container component="main" sx={{ flexGrow: 1, p: 0, display: 'flex', overflow: 'hidden' }}>
          {children}
        </Container>
      </Box>
      
      {/* Dialog per le chiamate in arrivo */}
      <IncomingCallDialog />
    </>
  );
};

export default MainLayout;