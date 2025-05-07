import { useContext } from 'react';
import { AppContext } from '../contexts/AppProvider';

// Hook personalizzato per utilizzare il contesto dell'app
const useApp = () => {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useApp deve essere utilizzato all\'interno di un AppProvider');
  }
  
  return context;
};

export default useApp;