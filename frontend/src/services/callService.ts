//import { RTCConfiguration } from '../types/call.types';
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

  // Configurazione WebRTC migliorata con più server STUN/TURN
  private config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
      // In un'app di produzione, dovresti considerare l'aggiunta di server TURN
      // { urls: 'turn:turn.example.com', username: 'username', credential: 'credential' }
    ],
    iceCandidatePoolSize: 10
  };

  // Inizia una chiamata
  async startCall(recipientId: number, withVideo: boolean = false): Promise<void> {
    try {
      console.log(`CallService: Avvio chiamata a ${recipientId} (video: ${withVideo})`);
      
      if (this.peerConnection) {
        console.log('CallService: Chiamata già attiva, chiudendo la precedente');
        this.endCall();
      }

      this.currentRecipientId = recipientId;
      this.isVideoCall = withVideo;

      // Richiedi i permessi media con gestione errori migliorata
      try {
        console.log('CallService: Richiesta permessi media');
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: withVideo
        });
        console.log('CallService: Permessi media ottenuti');
      } catch (error) {
        console.error('CallService: Errore nell\'accesso ai dispositivi media:', error);
        // Se l'accesso video fallisce ma stiamo tentando una videochiamata, proviamo solo con l'audio
        if (withVideo) {
          console.log('CallService: Tentativo fallback: solo audio');
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          this.isVideoCall = false; // Downgrade a chiamata audio
        } else {
          throw error; // Se anche l'audio fallisce, propaga l'errore
        }
      }

      console.log('CallService: Creazione peer connection');
      this.createPeerConnection();

      if (this.peerConnection && this.localStream) {
        console.log('CallService: Aggiunta tracce al peer connection');
        // Aggiungi le tracce al peer connection
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });

        // Crea un'offerta con timeout
        try {
          console.log('CallService: Creazione offerta');
          // Imposta un timeout per la creazione dell'offerta
          const offerPromise = this.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: this.isVideoCall
          });
          
          const timeoutPromise = new Promise<RTCSessionDescriptionInit>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout nella creazione dell\'offerta')), 10000);
          });
          
          const offer = await Promise.race([offerPromise, timeoutPromise]);
          await this.peerConnection.setLocalDescription(offer);
          console.log('CallService: Offerta creata e set local description ok');

          // Invia l'offerta
          console.log('CallService: Invio offerta via WebSocket');
          websocketService.send({
            type: WebSocketMessageType.CALL_OFFER,
            recipientId: recipientId,
            offer: offer,
            isVideo: this.isVideoCall
          });

          // Notifica che la chiamata è iniziata
          console.log('CallService: Notifica inizio chiamata');
          if (this.onCallStartedCallback) {
            this.onCallStartedCallback();
          }
        } catch (error) {
          console.error('CallService: Errore nella creazione dell\'offerta:', error);
          this.cleanupCall();
          throw new Error('Impossibile stabilire la chiamata. Riprova più tardi.');
        }
      }
    } catch (error) {
      console.error('CallService: Errore durante l\'avvio della chiamata:', error);
      this.cleanupCall();
      throw error;
    }
  }

  // Rispondi a una chiamata
  async answerCall(callerId: number, offer: RTCSessionDescriptionInit, isVideo: boolean): Promise<void> {
    try {
      console.log(`CallService: Risposta a chiamata da ${callerId} (video: ${isVideo})`);
      
      this.currentRecipientId = callerId;
      this.isVideoCall = isVideo;

      // Richiedi i permessi media con gestione errori migliorata
      try {
        console.log('CallService: Richiesta permessi media per risposta');
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo
        });
        console.log('CallService: Permessi media ottenuti per risposta');
      } catch (error) {
        console.error('CallService: Errore nell\'accesso ai dispositivi media durante la risposta:', error);
        // Se l'accesso video fallisce ma stiamo tentando una videochiamata, proviamo solo con l'audio
        if (isVideo) {
          console.log('CallService: Risposta: fallback a solo audio');
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          this.isVideoCall = false; // Downgrade a chiamata audio
        } else {
          throw error;
        }
      }

      console.log('CallService: Creazione peer connection per risposta');
      this.createPeerConnection();

      if (this.peerConnection && this.localStream) {
        console.log('CallService: Aggiunta tracce al peer connection per risposta');
        // Aggiungi le tracce al peer connection
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });

        // Imposta la descrizione remota
        try {
          console.log('CallService: Impostazione della remote description');
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('CallService: Remote description impostata');
          
          // Crea una risposta
          console.log('CallService: Creazione risposta');
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          console.log('CallService: Risposta creata e local description impostata');

          // Invia la risposta
          console.log('CallService: Invio risposta via WebSocket');
          websocketService.send({
            type: WebSocketMessageType.CALL_ANSWER,
            recipientId: callerId,
            answer: answer,
            isVideo: this.isVideoCall // Informiamo anche se abbiamo fatto downgrade a chiamata audio
          });

          // Notifica che la chiamata è iniziata
          console.log('CallService: Notifica inizio chiamata (risposta)');
          if (this.onCallStartedCallback) {
            this.onCallStartedCallback();
          }
        } catch (error) {
          console.error('CallService: Errore durante la risposta alla chiamata:', error);
          this.cleanupCall();
          throw new Error('Impossibile rispondere alla chiamata. Riprova più tardi.');
        }
      }
    } catch (error) {
      console.error('CallService: Errore durante la risposta alla chiamata:', error);
      this.cleanupCall();
      throw error;
    }
  }

  // Rifiuta una chiamata in arrivo
  rejectCall(callerId: number): void {
    console.log(`CallService: Rifiuto chiamata da ${callerId}`);
    websocketService.send({
      type: WebSocketMessageType.CALL_REJECT,
      recipientId: callerId
    });
  }

  // Termina una chiamata attiva
  endCall(): void {
    console.log('CallService: Termine chiamata');
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
        console.log(`CallService: Audio ${audioTrack.enabled ? 'attivato' : 'disattivato'}`);
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
        console.log(`CallService: Video ${videoTrack.enabled ? 'attivato' : 'disattivato'}`);
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Gestisce i messaggi WebSocket relativi alle chiamate
  handleWebSocketMessage(message: any): void {
    console.log('CallService: Gestione messaggio WebSocket', message.type);
    
    switch (message.type) {
      case WebSocketMessageType.CALL_OFFER:
        // Gestito esternamente in CallContext
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
      console.log('CallService: Gestione risposta alla chiamata');
      if (this.peerConnection && message.answer) {
        console.log('CallService: Impostazione remote description dalla risposta');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        console.log('CallService: Risposta remota impostata con successo');
        
        // Se il destinatario ha fatto downgrade a chiamata audio, aggiorniamo il nostro stato
        if (this.isVideoCall && message.isVideo === false) {
          console.log('CallService: Il destinatario ha risposto con una chiamata audio (downgrade)');
          this.isVideoCall = false;
        }
      }
    } catch (error) {
      console.error('CallService: Errore nella gestione della risposta:', error);
      this.cleanupCall();
    }
  }

  // Gestisce i candidati ICE
  private async handleIceCandidate(message: any): Promise<void> {
    try {
      console.log('CallService: Gestione candidato ICE');
      if (this.peerConnection && message.candidate) {
        console.log('CallService: Aggiunta candidato ICE');
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        console.log('CallService: Candidato ICE aggiunto con successo');
      }
    } catch (error) {
      console.error('CallService: Errore nell\'aggiunta del candidato ICE:', error);
      // Non terminiamo la chiamata per un singolo candidato fallito
    }
  }

  // Gestisce la chiusura della chiamata
  private handleCallEnd(): void {
    console.log('CallService: Chiamata terminata dall\'altro utente');
    this.cleanupCall();
  }

  // Gestisce il rifiuto della chiamata
  private handleCallReject(): void {
    console.log('CallService: Chiamata rifiutata');
    this.cleanupCall();
  }

  // Crea una connessione peer-to-peer WebRTC
  private createPeerConnection(): void {
    try {
      console.log('CallService: Creazione della peer connection');
      this.peerConnection = new RTCPeerConnection(this.config);
      
      // Handler per i candidati ICE
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentRecipientId) {
          console.log('CallService: Nuovo candidato ICE generato');
          websocketService.send({
            type: WebSocketMessageType.ICE_CANDIDATE,
            recipientId: this.currentRecipientId,
            candidate: event.candidate
          });
        }
      };

      // Handler per le tracce in ingresso
      this.peerConnection.ontrack = (event) => {
        console.log('CallService: Ricevuta traccia remota:', event.track.kind);
        
        if (!this.remoteStream) {
          console.log('CallService: Creazione del remote stream');
          this.remoteStream = new MediaStream();
          
          if (this.onRemoteStreamCallback) {
            this.onRemoteStreamCallback(this.remoteStream);
          }
        }
        
        // Aggiungiamo tutte le tracce
        event.streams[0].getTracks().forEach(track => {
          if (this.remoteStream) {
            console.log(`CallService: Aggiunta traccia ${track.kind} allo stream remoto`);
            this.remoteStream.addTrack(track);
          }
        });
      };

      // Handler per i cambiamenti di stato della connessione ICE
      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log('CallService: Stato connessione ICE:', state);
        
        if (this.onIceConnectionStateChangeCallback && this.peerConnection) {
          this.onIceConnectionStateChangeCallback(this.peerConnection.iceConnectionState);
        }
        
        // Gestione stati della connessione ICE
        switch (state) {
          case 'connected':
          case 'completed':
            console.log('CallService: Connessione WebRTC stabilita con successo');
            break;
          case 'failed':
            console.log('CallService: Connessione WebRTC fallita - tentativo di riconnessione');
            // Potremmo tentare di ricreare l'offerta/risposta
            this.restartIce();
            break;
          case 'disconnected':
            console.log('CallService: Connessione WebRTC disconnessa - attesa riconnessione');
            // Potremmo impostare un timer e terminare la chiamata se non si riconnette
            break;
          case 'closed':
            this.endCall();
            break;
        }
      };

      // Gestione degli stati di connessione
      this.peerConnection.onconnectionstatechange = () => {
        console.log('CallService: Stato connessione:', this.peerConnection?.connectionState);
        
        if (this.peerConnection?.connectionState === 'failed') {
          console.log('CallService: Connessione fallita, terminazione della chiamata');
          this.endCall();
        }
      };

    } catch (error) {
      console.error('CallService: Errore nella creazione della connessione peer:', error);
      throw error;
    }
  }

  // Tenta di riavviare la connessione ICE
  private async restartIce(): Promise<void> {
    if (!this.peerConnection || !this.currentRecipientId) return;
    
    try {
      console.log('CallService: Tentativo di riavvio ICE');
      const options: RTCOfferOptions = {
        iceRestart: true,
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.isVideoCall
      };
      
      const offer = await this.peerConnection.createOffer(options);
      await this.peerConnection.setLocalDescription(offer);
      
      websocketService.send({
        type: WebSocketMessageType.CALL_OFFER,
        recipientId: this.currentRecipientId,
        offer: offer,
        isVideo: this.isVideoCall
      });
      
      console.log('CallService: Riavvio ICE iniziato');
    } catch (error) {
      console.error('CallService: Errore durante il riavvio ICE:', error);
      this.endCall();
    }
  }

  // Pulisce lo stato della chiamata
  private cleanupCall(): void {
    console.log('CallService: Pulizia risorse chiamata');
    
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