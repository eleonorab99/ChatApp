import { Contact } from './user.types';

// Interfaccia per lo stato della chiamata
export interface CallState {
  isCallActive: boolean;
  isVideoCall: boolean;
  isIncomingCall: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  callPartner: Contact | null;
  error: string | null;
  isInitiator?: boolean; // NUOVO: indica se l'utente è l'iniziatore della chiamata
}

// Configurazione per la connessione WebRTC
export const RTCConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Enumerazione per lo stato della chiamata
export enum CallStatus {
  IDLE = 'idle',
  CALLING = 'calling',
  RINGING = 'ringing',
  IN_CALL = 'in_call',
  ENDED = 'ended'
}