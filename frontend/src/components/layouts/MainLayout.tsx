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
} from '@mui/material';
import {
  AccountCircle,
  Notifications,
  ExitToApp,
} from '@mui/icons-material';
import useAuth from '../../hooks/useAuth';
import useChat from '../../hooks/useChat';
import IncomingCallDialog from '../calls/IncomingCallDialog';

interface MainLayoutProps {
  children: React.ReactNode;
}

// Layout principale dell'applicazione
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { getTotalUnreadCount } = useChat();
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
    await logout();
    navigate('/login');
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Chat App
            </Typography>
            {user && (
              <Box>
                <Badge
                  badgeContent={getTotalUnreadCount()}
                  color="error"
                  sx={{ marginRight: 2 }}
                >
                  <Notifications />
                </Badge>
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