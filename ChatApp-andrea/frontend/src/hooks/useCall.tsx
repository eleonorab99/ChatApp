import { useContext } from 'react';
import { CallContext } from '../contexts/CallContext';

// Hook personalizzato per utilizzare il contesto delle chiamate
export const useCall = () => {
  const context = useContext(CallContext);
  
  if (context === undefined) {
    throw new Error('useCall deve essere utilizzato all\'interno di un CallProvider');
  }
  
  return context;
};

export default useCall;