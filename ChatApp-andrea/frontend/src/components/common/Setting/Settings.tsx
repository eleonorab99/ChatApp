import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Lock, HelpCircle, User} from "lucide-react";
import PaginaLingua from "./components/PageLanguages";
import PaginaPrivacy from "./components/PagePrivacy";
import PaginaAssistenza from "./components/PageAssistance";
import PaginaProfilo from "./components/PageProfile";
import { Box,  Typography, List, ListItemButton, ListItemIcon, ListItemText, Button} from "@mui/material";
import { Home } from "@mui/icons-material";

function PaginaImpostazioni() {
    const { t } = useTranslation();
    const [paginaAttiva, setPaginaAttiva] = useState("profilo");
    const navigate = useNavigate();
  
    const menuItems = [
      { id: "profilo", nome: t('settings.profile'), icona: <User size={20} /> },
      { id: "lingua", nome: t('settings.language'), icona: <Globe size={20} /> },
      { id: "privacy", nome: t('settings.privacy'), icona: <Lock size={20} /> },
      { id: "assistenza", nome: t('settings.assistance'), icona: <HelpCircle size={20} /> },
    ];
  
    const renderPagina = () => {
      switch (paginaAttiva) {
        case "profilo":
          return <PaginaProfilo />;
        case "lingua":
          return <PaginaLingua />;
        case "privacy":
          return <PaginaPrivacy />;
        case "assistenza":
          return <PaginaAssistenza />;
        default:
          return <PaginaProfilo />;
      }
    };
  
    return (
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#1e1e1e', position: 'fixed', left: 0, top:0, width: '100%'}}>
          <Box sx={{ overflow: 'auto' }}>
            <Typography variant="h6" sx={{ mt: 5, mb: 5, mx: 10, p: 0, color: '#ffd700' }}>
              {t('app.settings')}
            </Typography>
            <List>
              {menuItems.map((item) => (
                <ListItemButton
                  key={item.id}
                  selected={paginaAttiva === item.id}
                  onClick={() => setPaginaAttiva(item.id)}
                  sx={{
                    color: '#ffffff',
                    '&.Mui-selected': {
                      backgroundColor: '#ffd700',
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: '#ffd700',
                      },
                    },
                    '&:hover': {
                      backgroundColor: '#ffffff',
                    },
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: paginaAttiva === item.id ? '#ffffff' : '#ffffff',
                    minWidth: '40px'
                  }}>
                    {item.icona}
                  </ListItemIcon>
                  <ListItemText primary={item.nome} />
                </ListItemButton>
              ))}
            </List>
            <Button
              startIcon={<Home />}
              onClick={() => navigate('/')}
              sx={{
                width: '100%',
                justifyContent: 'flex-start',
                pl: 2,
                color: '#ffffff',
                fontSize: '15px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 215, 0, 0.08)',
                },
              }}
            > 
              Home 
            </Button>
          </Box>
        <Box component="main" sx={{ flexGrow: 1, backgroundColor: '#1e1e1e', color: '#ffffff', display: 'flex',
          flexDirection: 'column',  
          position: 'relative',
          overflow: 'hidden'}}>
          {renderPagina()}
        </Box>
      </Box>
    );
}

export default PaginaImpostazioni;