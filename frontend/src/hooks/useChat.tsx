import { useContext } from 'react';
import { ChatContext } from '../contexts/ChatContext';

// Hook personalizzato per utilizzare il contesto della chat
const useChat = () => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChat deve essere utilizzato all\'interno di un ChatProvider');
  }
  
  return context;
};

export default useChat;