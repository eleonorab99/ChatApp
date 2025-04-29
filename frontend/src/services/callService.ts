import { RTCConfiguration } from '../types/call.types';
import websocketService from './websocketService';
import { WebSocketMessageType } from '../types/chat.types';

// Servizio per gestire le funzionalità di chiamata WebRTC
class CallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentRecipientId: number | null = null;
  private isVideoCall: boolean = false;
  
  // Callback per eventi
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onCallEndedCallback: (() => void) | null = null;
  private onCallStartedCallback: (() => void) | null = null;
  private onIceConnectionStateChangeCallback: ((state: RTCIceConnectionState) => void) | null = null;

  // Configurazione WebRTC
  private config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Inizia una chiamata
  async startCall(recipientId: number, withVideo: boolean = false): Promise<void> {
    try {
      if (this.peerConnection) {
        console.log('Chiamata già attiva, chiudendo la precedente');
        this.endCall();
      }

      this.currentRecipientId = recipientId;
      this.isVideoCall = withVideo;

      // Richiedi i permessi media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo
      });

      this.createPeerConnection();

      if (this.peerConnection && this.localStream) {
        // Aggiungi le tracce al peer connection
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });

        // Crea un'offerta
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        // Invia l'offerta
        websocketService.send({
          type: WebSocketMessageType.CALL_OFFER,
          recipientId: recipientId,
          offer: offer,
          isVideo: withVideo
        });

        // Notifica che la chiamata è iniziata
        if (this.onCallStartedCallback) {
          this.onCallStartedCallback();
        }
      }
    } catch (error) {
      console.error('Errore durante l\'avvio della chiamata:', error);
      this.cleanupCall();
      throw error;
    }
  }

  // Rispondi a una chiamata
  async answerCall(callerId: number, offer: RTCSessionDescriptionInit, isVideo: boolean): Promise<void> {
    try {
      this.currentRecipientId = callerId;
      this.isVideoCall = isVideo;

      // Richiedi i permessi media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });

      this.createPeerConnection();

      if (this.peerConnection && this.localStream) {
        // Aggiungi le tracce al peer connection
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });

        // Imposta la descrizione remota
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Crea una risposta
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Invia la risposta
        websocketService.send({
          type: WebSocketMessageType.CALL_ANSWER,
          recipientId: callerId,
          answer: answer
        });

        // Notifica che la chiamata è iniziata
        if (this.onCallStartedCallback) {
          this.onCallStartedCallback();
        }
      }
    } catch (error) {
      console.error('Errore durante la risposta alla chiamata:', error);
      this.cleanupCall();
      throw error;
    }
  }

  // Rifiuta una chiamata in arrivo
  rejectCall(callerId: number): void {
    websocketService.send({
      type: WebSocketMessageType.CALL_REJECT,
      recipientId: callerId
    });
  }

  // Termina una chiamata attiva
  endCall(): void {
    if (this.currentRecipientId) {
      websocketService.send({
        type: WebSocketMessageType.CALL_END,
        recipientId: this.currentRecipientId
      });
    }
    
    this.cleanupCall();
  }

  // Toglie/aggiunge l'audio
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Toglie/aggiunge il video
  toggleVideo(): boolean {
    if (this.localStream && this.isVideoCall) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Gestisce i messaggi WebSocket relativi alle chiamate
  handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case WebSocketMessageType.CALL_OFFER:
        // Gestito esternamente
        break;
      case WebSocketMessageType.CALL_ANSWER:
        this.handleCallAnswer(message);
        break;
      case WebSocketMessageType.ICE_CANDIDATE:
        this.handleIceCandidate(message);
        break;
      case WebSocketMessageType.CALL_END:
        this.handleCallEnd();
        break;
      case WebSocketMessageType.CALL_REJECT:
        this.handleCallReject();
        break;
    }
  }

  // Gestisce una risposta a una chiamata
  private async handleCallAnswer(message: any): Promise<void> {
    try {
      if (this.peerConnection && message.answer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        console.log('Risposta remota impostata con successo');
      }
    } catch (error) {
      console.error('Errore nella gestione della risposta:', error);
      this.cleanupCall();
    }
  }

  // Gestisce i candidati ICE
  private async handleIceCandidate(message: any): Promise<void> {
    try {
      if (this.peerConnection && message.candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        console.log('Candidato ICE aggiunto con successo');
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta del candidato ICE:', error);
    }
  }

  // Gestisce la chiusura della chiamata
  private handleCallEnd(): void {
    console.log('Chiamata terminata dall\'altro utente');
    this.cleanupCall();
  }

  // Gestisce il rifiuto della chiamata
  private handleCallReject(): void {
    console.log('Chiamata rifiutata');
    this.cleanupCall();
  }

  // Crea una connessione peer-to-peer WebRTC
  private createPeerConnection(): void {
    try {
      this.peerConnection = new RTCPeerConnection(this.config);
      
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentRecipientId) {
          websocketService.send({
            type: WebSocketMessageType.ICE_CANDIDATE,
            recipientId: this.currentRecipientId,
            candidate: event.candidate
          });
        }
      };

      this.peerConnection.ontrack = (event) => {
        console.log('Ricevuta traccia remota:', event.track.kind);
        
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
          
          if (this.onRemoteStreamCallback) {
            this.onRemoteStreamCallback(this.remoteStream);
          }
        }
        
        event.streams[0].getTracks().forEach(track => {
          if (this.remoteStream) {
            this.remoteStream.addTrack(track);
          }
        });
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('Stato connessione ICE:', this.peerConnection?.iceConnectionState);
        
        if (this.onIceConnectionStateChangeCallback && this.peerConnection) {
          this.onIceConnectionStateChangeCallback(this.peerConnection.iceConnectionState);
        }
        
        if (this.peerConnection?.iceConnectionState === 'failed' || 
            this.peerConnection?.iceConnectionState === 'closed') {
          this.endCall();
        }
      };

    } catch (error) {
      console.error('Errore nella creazione della connessione peer:', error);
      throw error;
    }
  }

  // Pulisce lo stato della chiamata
  private cleanupCall(): void {
    console.log('Pulizia risorse chiamata');
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
    this.currentRecipientId = null;
    
    if (this.onCallEndedCallback) {
      this.onCallEndedCallback();
    }
  }

  // Imposta il callback per lo stream remoto
  setOnRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  // Imposta il callback per la fine della chiamata
  setOnCallEnded(callback: () => void): void {
    this.onCallEndedCallback = callback;
  }

  // Imposta il callback per l'inizio della chiamata
  setOnCallStarted(callback: () => void): void {
    this.onCallStartedCallback = callback;
  }

  // Imposta il callback per il cambio di stato della connessione ICE
  setOnIceConnectionStateChange(callback: (state: RTCIceConnectionState) => void): void {
    this.onIceConnectionStateChangeCallback = callback;
  }

  // Getter per lo stream locale
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Getter per lo stream remoto
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Verifica se c'è una chiamata attiva
  isCallActive(): boolean {
    return this.peerConnection !== null && this.localStream !== null;
  }

  // Verifica se è una videochiamata
  isVideoCallActive(): boolean {
    return this.isVideoCall;
  }
}

// Esporta un'istanza del servizio di chiamata
const callService = new CallService();
export default callService;