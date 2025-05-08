import { Box, Typography, List, ListItemButton, ListItemText } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useLanguageContext } from '../../../language/LanguageContext';

interface LanguageOption {
  display: string;
  code: string;
}

const PaginaLingua = () => {
    const { t, i18n } = useTranslation();
    const { language, changeLanguage } = useLanguageContext();
    
    const lingue: LanguageOption[] = [
      { display: "Italiano", code: "it" },
      { display: "English", code: "en" },
      { display: "Français", code: "fr" },
      { display: "Español", code: "es" }
    ];

    const handleLanguageChange = async (code: string) => {
      console.log('Lingua corrente:', i18n.language);
      console.log('Stato del contesto:', language);
      await i18n.changeLanguage(code);
      changeLanguage(code);
      console.log('Nuova lingua:', i18n.language);
    };
  
    return (
      <Box p={10}>
        <Typography variant="h5" gutterBottom>
          {t('language.title')}
        </Typography>
        <List>
          {lingue.map((lingua) => (
            <ListItemButton
              key={lingua.code}
              selected={language === lingua.code}
              onClick={() => handleLanguageChange(lingua.code)}
            >
              <ListItemText primary={lingua.display} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    );
};

export default PaginaLingua;