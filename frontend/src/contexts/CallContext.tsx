import React, { createContext, useReducer, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { ChatContext } from "./ChatContext";
import { CallState } from "../types/call.types";
import { WebSocketMessage, WebSocketMessageType } from "../types/chat.types";
import callService from "../services/callService";
import websocketService from "../services/websocketService";
import { OnlineUser } from "../types/chat.types";
import { useChat } from "../hooks/useChat"; // Assicurati che il percorso sia corretto

// Tipi di azioni per il reducer
type CallAction =
  | {
      type: "CALL_START";
      payload: { isVideo: boolean; callPartner: OnlineUser };
    }
  | { type: "CALL_CONNECTED" }
  | {
      type: "CALL_INCOMING";
      payload: {
        callerId: number;
        callerName: string;
        isVideo: boolean;
        offer: RTCSessionDescriptionInit;
      };
    }
  | { type: "CALL_ACCEPTED" }
  | { type: "CALL_REJECTED" }
  | { type: "CALL_ENDED" }
  | { type: "CALL_ERROR"; payload: string }
  | { type: "SET_REMOTE_STREAM"; payload: MediaStream }
  | { type: "SET_LOCAL_STREAM"; payload: MediaStream }
  | { type: "TOGGLE_AUDIO"; payload: boolean }
  | { type: "TOGGLE_VIDEO"; payload: boolean };

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
    case "CALL_START":
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
    case "CALL_CONNECTED":
      return {
        ...state,
        isCallActive: true,
        error: null,
      };
    case "CALL_INCOMING":
      return {
        ...state,
        isIncomingCall: true,
        isVideoCall: action.payload.isVideo,
        error: null,
        callPartner:
          onlineUsers.find((u) => u.userId === action.payload.callerId) || null,
      };
    case "CALL_ACCEPTED":
      return {
        ...state,
        isIncomingCall: false,
        isCallActive: true,
        error: null,
      };
    case "CALL_REJECTED":
      return {
        ...initialState,
      };
    case "CALL_ENDED":
      return {
        ...initialState,
      };
    case "CALL_ERROR":
      return {
        ...initialState,
        error: action.payload,
      };
    case "SET_REMOTE_STREAM":
      return {
        ...state,
        remoteStream: action.payload,
      };
    case "SET_LOCAL_STREAM":
      return {
        ...state,
        localStream: action.payload,
      };
    case "TOGGLE_AUDIO":
      return {
        ...state,
        isAudioEnabled: action.payload,
      };
    case "TOGGLE_VIDEO":
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
export const CallProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { onlineUsers } = useChat(); // Chiamato correttamente all'interno del componente
  const [state, dispatch] = useReducer(callReducer, initialState);
  const { isAuthenticated, user } = useContext(AuthContext);
  const { currentRecipient } = useContext(ChatContext);
  const [incomingCallData, setIncomingCallData] =
    React.useState<IncomingCallData | null>(null);

  // Configura i callback per il servizio di chiamata
  useEffect(() => {
    if (isAuthenticated) {
      // Callback per stream remoto
      callService.setOnRemoteStream((stream) => {
        dispatch({ type: "SET_REMOTE_STREAM", payload: stream });
      });

      // Callback per fine chiamata
      callService.setOnCallEnded(() => {
        dispatch({ type: "CALL_ENDED" });
        setIncomingCallData(null);
      });

      // Callback per inizio chiamata
      callService.setOnCallStarted(() => {
        dispatch({ type: "CALL_CONNECTED" });

        // Aggiorna local stream
        const localStream = callService.getLocalStream();
        if (localStream) {
          dispatch({ type: "SET_LOCAL_STREAM", payload: localStream });
        }
      });

      // Callback per cambio stato connessione ICE
      callService.setOnIceConnectionStateChange((state) => {
        console.log("ICE connection state:", state);
        if (state === "connected") {
          dispatch({ type: "CALL_CONNECTED" });
        } else if (state === "failed" || state === "closed") {
          dispatch({ type: "CALL_ENDED" });
          setIncomingCallData(null);
        }
      });
    }
  }, [isAuthenticated]);

  // Gestisce i messaggi WebSocket relativi alle chiamate
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    if (!user) return;

    switch (message.type) {
      case WebSocketMessageType.CALL_OFFER:
        if (
          message.recipientId === user.id &&
          message.senderId &&
          message.offer
        ) {
          // Trova il nome del chiamante
          const caller = onlineUsers.find((u) => u.userId === message.senderId);
          const callerName =
            caller?.username || message.senderUsername || "Utente sconosciuto";

          // Salva i dati della chiamata in arrivo
          setIncomingCallData({
            callerId: message.senderId,
            callerName,
            offer: message.offer,
            isVideo: !!message.isVideo,
          });

          // Dispatch dell'azione per la chiamata in arrivo
          dispatch({
            type: "CALL_INCOMING",
            payload: {
              callerId: message.senderId,
              callerName,
              offer: message.offer,
              isVideo: !!message.isVideo,
            },
          });
        }
        break;
      case WebSocketMessageType.CALL_END:
        if (message.recipientId === user.id) {
          dispatch({ type: "CALL_ENDED" });
          setIncomingCallData(null);
        }
        break;
      case WebSocketMessageType.CALL_REJECT:
        if (message.recipientId === user.id) {
          dispatch({ type: "CALL_REJECTED" });
          setIncomingCallData(null);
        }
        break;
      default:
        // Passa gli altri messaggi relativi alle chiamate al servizio di chiamata
        callService.handleWebSocketMessage(message);
        break;
    }
  };

  // Configura il listener WebSocket
  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribe = websocketService.addMessageListener(
        handleWebSocketMessage
      );
      return unsubscribe;
    }
  }, [isAuthenticated, user, onlineUsers]);

  // Funzione per iniziare una chiamata
  const startCall = async (withVideo = false): Promise<void> => {
    if (!currentRecipient) {
      dispatch({
        type: "CALL_ERROR",
        payload: "Nessun destinatario selezionato",
      });
      return;
    }

    try {
      dispatch({
        type: "CALL_START",
        payload: {
          isVideo: withVideo,
          callPartner: currentRecipient,
        },
      });
      await callService.startCall(currentRecipient.userId, withVideo);
    } catch (error) {
      let errorMessage = "Errore durante l'avvio della chiamata";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: "CALL_ERROR", payload: errorMessage });
    }
  };

  // Funzione per rispondere a una chiamata in arrivo
  const answerCall = async (): Promise<void> => {
    if (!incomingCallData) {
      dispatch({ type: "CALL_ERROR", payload: "Nessuna chiamata in arrivo" });
      return;
    }

    try {
      dispatch({ type: "CALL_ACCEPTED" });
      await callService.answerCall(
        incomingCallData.callerId,
        incomingCallData.offer,
        incomingCallData.isVideo
      );
    } catch (error) {
      let errorMessage = "Errore durante la risposta alla chiamata";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: "CALL_ERROR", payload: errorMessage });
    }
  };

  // Funzione per rifiutare una chiamata in arrivo
  const rejectCall = (): void => {
    if (incomingCallData) {
      callService.rejectCall(incomingCallData.callerId);
      dispatch({ type: "CALL_REJECTED" });
      setIncomingCallData(null);
    }
  };

  // Funzione per terminare una chiamata attiva
  const endCall = (): void => {
    callService.endCall();
    dispatch({ type: "CALL_ENDED" });
    setIncomingCallData(null);
  };

  // Funzione per attivare/disattivare l'audio
  const toggleAudio = (): void => {
    const isEnabled = callService.toggleAudio();
    dispatch({ type: "TOGGLE_AUDIO", payload: isEnabled });
  };

  // Funzione per attivare/disattivare il video
  const toggleVideo = (): void => {
    const isEnabled = callService.toggleVideo();
    dispatch({ type: "TOGGLE_VIDEO", payload: isEnabled });
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
