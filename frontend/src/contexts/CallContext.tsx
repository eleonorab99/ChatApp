import React, { createContext, useReducer, useEffect, useContext, useCallback, useState, useRef } from 'react';
import { AuthContext } from './AuthContext';
import { ChatContext } from './ChatContext';
import { CallState } from '../types/call.types';
import { WebSocketMessage, WebSocketMessageType } from '../types/chat.types';
import callService from '../services/callService';
import websocketService from '../services/websocketService';
import { Contact } from '../types/user.types';
import useApp from '../hooks/useApp';

// Tipi di azioni per il reducer
type CallAction =
  | { type: 'CALL_START'; payload: { isVideo: boolean; callPartner: Contact } }
  | { type: 'CALL_CONNECTED' }
  | { type: 'CALL_INCOMING'; payload: { callerId: number; callerName: string; isVideo: boolean; offer: RTCSessionDescriptionInit } }
  | { type: 'CALL_ACCEPTED' }
  | { type: 'CALL_REJECTED' }
  | { type: 'CALL_ENDED' }
  | { type: 'CALL_ERROR'; payload: string }
  | { type: 'SET_REMOTE_STREAM'; payload: MediaStream }
  | { type: 'SET_LOCAL_STREAM'; payload: MediaStream }
  | { type: 'TOGGLE_AUDIO'; payload: boolean }
  | { type: 'TOGGLE_VIDEO'; payload: boolean };

// Stato iniziale
const initialState: CallState = {
  isCallActive: false,
  isVideoCall: false,
  isIncomingCall: false,
  isAudioEnabled: true,
  isVideoEnabled: true,
  remoteStream: null,
  localStream: null,
  callPartner: null,
  error: null,
};

// Reducer per gestire lo stato delle chiamate
const callReducer = (state: CallState, action: CallAction): CallState => {
  switch (action.type) {
    case 'CALL_START':
      return {
        ...state,
        isCallActive: true,
        isVideoCall: action.payload.isVideo,
        isIncomingCall: false,
        isAudioEnabled: true,
        isVideoEnabled: true,
        error: null,
        callPartner: action.payload.callPartner,
      };
    case 'CALL_CONNECTED':
      return {
        ...state,
        isCallActive: true,
        error: null,
      };
    case 'CALL_INCOMING':
      return {
        ...state,
        isIncomingCall: true,
        isVideoCall: action.payload.isVideo,
        error: null,
      };
    case 'CALL_ACCEPTED':
      return {
        ...state,
        isIncomingCall: false,
        isCallActive: true,
        error: null,
      };
    case 'CALL_REJECTED':
      return {
        ...initialState,
      };
    case 'CALL_ENDED':
      return {
        ...initialState,
      };
    case 'CALL_ERROR':
      return {
        ...initialState,
        error: action.payload,
      };
    case 'SET_REMOTE_STREAM':
      return {
        ...state,
        remoteStream: action.payload,
      };
    case 'SET_LOCAL_STREAM':
      return {
        ...state,
        localStream: action.payload,
      };
    case 'TOGGLE_AUDIO':
      return {
        ...state,
        isAudioEnabled: action.payload,
      };
    case 'TOGGLE_VIDEO':
      return {
        ...state,
        isVideoEnabled: action.payload,
      };
    default:
      return state;
  }
};

// Interfaccia per i dati di chiamata in arrivo
interface IncomingCallData {
  callerId: number;
  callerName: string;
  offer: RTCSessionDescriptionInit;
  isVideo: boolean;
}

// Tipo per il contesto
interface CallContextType extends CallState {
  startCall: (withVideo?: boolean) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  incomingCallData: IncomingCallData | null;
}

// Crea il contesto delle chiamate
export const CallContext = createContext<CallContextType>({
  ...initialState,
  startCall: async () => {},
  answerCall: async () => {},
  rejectCall: () => {},
  endCall: () => {},
  toggleAudio: () => {},
  toggleVideo: () => {},
  incomingCallData: null,
});

// Provider per il contesto delle chiamate
export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(callReducer, initialState);
  const { isAuthenticated, user } = useContext(AuthContext);
  const { currentRecipient, onlineUsers } = useContext(ChatContext);
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);
  const { addNotification } = useApp();
  
  // Riferimento per memorizzare il listener WebSocket
  const listenerRef = useRef<((message: WebSocketMessage) => void) | null>(null);

  // Configura i callback per il servizio di chiamata
  useEffect(() => {
    if (isAuthenticated) {
      // Callback per stream remoto
      callService.setOnRemoteStream((stream) => {
        console.log('CallContext: Stream remoto ricevuto');
        dispatch({ type: 'SET_REMOTE_STREAM', payload: stream });
      });

      // Callback per fine chiamata
      callService.setOnCallEnded(() => {
        console.log('CallContext: Chiamata terminata dal callback');
        dispatch({ type: 'CALL_ENDED' });
        setIncomingCallData(null);
      });

      // Callback per inizio chiamata
      callService.setOnCallStarted(() => {
        console.log('CallContext: Chiamata avviata dal callback');
        dispatch({ type: 'CALL_CONNECTED' });
        
        // Aggiorna local stream
        const localStream = callService.getLocalStream();
        if (localStream) {
          dispatch({ type: 'SET_LOCAL_STREAM', payload: localStream });
        }
      });

      // Callback per cambio stato connessione ICE
      callService.setOnIceConnectionStateChange((state) => {
        console.log('ICE connection state:', state);
        if (state === 'connected') {
          dispatch({ type: 'CALL_CONNECTED' });
        } else if (state === 'failed' || state === 'closed') {
          dispatch({ type: 'CALL_ENDED' });
          setIncomingCallData(null);
        }
      });
    }
  }, [isAuthenticated]);

  // Gestisce i messaggi WebSocket relativi alle chiamate
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('CallContext: Messaggio WebSocket ricevuto', message.type);
    
    if (!user) return;

    switch (message.type) {
      case WebSocketMessageType.CALL_OFFER:
        // Verifica che il messaggio sia diretto a noi
        if (message.recipientId === user.id && message.senderId) {
          console.log('CallContext: Offerta di chiamata ricevuta da', message.senderId);
          
          // Trova il nome del chiamante
          const caller = onlineUsers.find(u => u.userId === message.senderId);
          const callerName = caller?.username || message.senderUsername || 'Utente sconosciuto';
          
          // Verifica che ci sia un'offerta valida
          if (!message.offer) {
            console.error('CallContext: Offerta di chiamata mancante');
            return;
          }
          
          console.log('CallContext: Offerta di chiamata ricevuta con successo', {
            callerId: message.senderId,
            callerName,
            isVideo: !!message.isVideo
          });
          
          // Salva i dati della chiamata in arrivo
          const incomingData = {
            callerId: message.senderId,
            callerName,
            offer: message.offer,
            isVideo: !!message.isVideo,
          };
          setIncomingCallData(incomingData);

          // Dispatch dell'azione per la chiamata in arrivo
          dispatch({ 
            type: 'CALL_INCOMING', 
            payload: incomingData
          });
          
          // Notifica l'utente
          addNotification({
            type: 'info',
            message: `Chiamata in arrivo da ${callerName}`,
            autoHideDuration: 5000
          });
        }
        break;
      case WebSocketMessageType.CALL_END:
        if (state.isCallActive || state.isIncomingCall) {
          console.log('CallContext: Fine chiamata ricevuta');
          dispatch({ type: 'CALL_ENDED' });
          setIncomingCallData(null);
          
          addNotification({
            type: 'info',
            message: 'Chiamata terminata',
            autoHideDuration: 3000
          });
        }
        break;
      case WebSocketMessageType.CALL_REJECT:
        if (state.isCallActive) {
          console.log('CallContext: Rifiuto chiamata ricevuto');
          dispatch({ type: 'CALL_REJECTED' });
          setIncomingCallData(null);
          
          addNotification({
            type: 'info',
            message: 'Chiamata rifiutata',
            autoHideDuration: 3000
          });
        }
        break;
      default:
        // Passa gli altri messaggi relativi alle chiamate al servizio di chiamata
        callService.handleWebSocketMessage(message);
        break;
    }
  }, [user, onlineUsers, state.isCallActive, state.isIncomingCall, addNotification]);

  // Registriamo il listener WebSocket solo una volta
  useEffect(() => {
    if (isAuthenticated && !listenerRef.current) {
      console.log('CallContext: Configurazione listener WebSocket (registrazione unica)');
      
      // Creiamo il listener
      listenerRef.current = handleWebSocketMessage;
      
      // Registriamo il listener
      const unsubscribe = websocketService.addMessageListener(listenerRef.current);
      
      // Cleanup
      return () => {
        if (listenerRef.current) {
          console.log('CallContext: Pulizia listener WebSocket finale');
          unsubscribe();
          listenerRef.current = null;
        }
      };
    }
  }, [isAuthenticated, handleWebSocketMessage]);

  // Funzione per iniziare una chiamata
  const startCall = async (withVideo = false): Promise<void> => {
    if (!currentRecipient) {
      dispatch({ type: 'CALL_ERROR', payload: 'Nessun destinatario selezionato' });
      return;
    }

    console.log(`CallContext: Avvio chiamata a ${currentRecipient.username} (video: ${withVideo})`);
    
    try {
      dispatch({ 
        type: 'CALL_START', 
        payload: { 
          isVideo: withVideo,
          callPartner: currentRecipient
        } 
      });
      
      // Verifica che il destinatario sia online
      if (!currentRecipient.isOnline) {
        addNotification({
          type: 'warning',
          message: `${currentRecipient.username} è offline. La chiamata potrebbe non essere ricevuta.`,
          autoHideDuration: 5000
        });
      }
      
      // IMPORTANTE: Assicurati che l'ID utente sia nel localStorage
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.log('CallContext: ID utente mancante nel localStorage, usando ID da contesto:', user?.id);
        if (user?.id) {
          localStorage.setItem('userId', user.id.toString());
        }
      }
      
      await callService.startCall(currentRecipient.userId, withVideo);
      
      addNotification({
        type: 'info',
        message: `Chiamata a ${currentRecipient.username} avviata`,
        autoHideDuration: 3000
      });
    } catch (error) {
      console.error('CallContext: Errore durante l\'avvio della chiamata', error);
      let errorMessage = 'Errore durante l\'avvio della chiamata';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: 'CALL_ERROR', payload: errorMessage });
      
      addNotification({
        type: 'error',
        message: errorMessage,
        autoHideDuration: 5000
      });
    }
  };

  // Funzione per rispondere a una chiamata in arrivo
  const answerCall = async (): Promise<void> => {
    if (!incomingCallData) {
      dispatch({ type: 'CALL_ERROR', payload: 'Nessuna chiamata in arrivo' });
      return;
    }

    console.log('CallContext: Risposta a chiamata da', incomingCallData.callerName);
    
    try {
      dispatch({ type: 'CALL_ACCEPTED' });
      
      // IMPORTANTE: Assicurati che l'ID utente sia nel localStorage
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.log('CallContext: ID utente mancante nel localStorage, usando ID da contesto:', user?.id);
        if (user?.id) {
          localStorage.setItem('userId', user.id.toString());
        }
      }
      
      await callService.answerCall(
        incomingCallData.callerId,
        incomingCallData.offer,
        incomingCallData.isVideo
      );
      
      addNotification({
        type: 'info',
        message: `Chiamata con ${incomingCallData.callerName} connessa`,
        autoHideDuration: 3000
      });
    } catch (error) {
      console.error('CallContext: Errore durante la risposta alla chiamata', error);
      let errorMessage = 'Errore durante la risposta alla chiamata';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: 'CALL_ERROR', payload: errorMessage });
      
      addNotification({
        type: 'error',
        message: errorMessage,
        autoHideDuration: 5000
      });
    }
  };

  // Funzione per rifiutare una chiamata in arrivo
  const rejectCall = (): void => {
    if (incomingCallData) {
      console.log('CallContext: Rifiuto chiamata da', incomingCallData.callerName);
      callService.rejectCall(incomingCallData.callerId);
      dispatch({ type: 'CALL_REJECTED' });
      setIncomingCallData(null);
      
      addNotification({
        type: 'info',
        message: 'Chiamata rifiutata',
        autoHideDuration: 3000
      });
    }
  };

  // Funzione per terminare una chiamata attiva
  const endCall = (): void => {
    console.log('CallContext: Termine chiamata');
    callService.endCall();
    dispatch({ type: 'CALL_ENDED' });
    setIncomingCallData(null);
    
    addNotification({
      type: 'info',
      message: 'Chiamata terminata',
      autoHideDuration: 3000
    });
  };

  // Funzione per attivare/disattivare l'audio
  const toggleAudio = (): void => {
    const isEnabled = callService.toggleAudio();
    dispatch({ type: 'TOGGLE_AUDIO', payload: isEnabled });
  };

  // Funzione per attivare/disattivare il video
  const toggleVideo = (): void => {
    const isEnabled = callService.toggleVideo();
    dispatch({ type: 'TOGGLE_VIDEO', payload: isEnabled });
  };

  // Valore del contesto
  const callContextValue: CallContextType = {
    ...state,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    incomingCallData,
  };

  return (
    <CallContext.Provider value={callContextValue}>
      {children}
    </CallContext.Provider>
  );
};

export default CallProvider;