import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from './i18n';

// Interfaccia per il contesto della lingua
export interface LanguageContextType {
  language: string;
  changeLanguage: (lang: string) => void;
}

// Valore predefinito del contesto
const defaultContextValue: LanguageContextType = {
  language: 'it',
  changeLanguage: () => {},
};

// Creazione del contesto
export const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

// Hook personalizzato per accedere al contesto
export const useLanguageContext = () => useContext(LanguageContext);

// Provider component
interface LanguageContextProviderProps {
  children: React.ReactNode;
}

export const LanguageContextProvider: React.FC<LanguageContextProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language');
      return savedLanguage || 'it';
    }
    return 'it';
  });

  const changeLanguage = async (lang: string) => {
    try {
      await i18n.changeLanguage(lang);
      setLanguage(lang);
      localStorage.setItem('language', lang);
    } catch (error) {
      console.error('Errore nel cambio della lingua:', error);
    }
  };

  useEffect(() => {
    const initLanguage = async () => {
      try {
        await i18n.changeLanguage(language);
      } catch (error) {
        console.error('Errore nell\'inizializzazione della lingua:', error);
      }
    };
    initLanguage();
  }, []);

  const value = {
    language,
    changeLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContextProvider;