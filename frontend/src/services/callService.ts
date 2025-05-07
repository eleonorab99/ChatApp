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

  // Configurazione WebRTC con server STUN/TURN
  private config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
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

      // Richiedi i permessi media
      try {
        console.log('CallService: Richiesta permessi media');
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: withVideo
        });
        console.log('CallService: Permessi media ottenuti');
      } catch (error) {
        console.error('CallService: Errore nell\'accesso ai dispositivi media:', error);
        
        // Se l'accesso video fallisce, proviamo solo con l'audio
        if (withVideo) {
          console.log('CallService: Tentativo fallback: solo audio');
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false
            });
            this.isVideoCall = false; // Downgrade a chiamata audio
          } catch (audioError) {
            console.error('CallService: Errore anche nell\'accesso all\'audio:', audioError);
            throw new Error('Impossibile accedere ai dispositivi audio. Verifica le autorizzazioni del browser.');
          }
        } else {
          throw new Error('Impossibile accedere ai dispositivi audio. Verifica le autorizzazioni del browser.');
        }
      }

      // Crea peer connection
      this.createPeerConnection();

      if (!this.peerConnection || !this.localStream) {
        throw new Error('Impossibile inizializzare la connessione chiamata.');
      }

      // Aggiungi le tracce al peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Crea un'offerta
      try {
        console.log('CallService: Creazione offerta');
        
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: this.isVideoCall
        });
        
        await this.peerConnection.setLocalDescription(offer);
        console.log('CallService: Local description impostata con successo');

        // Invia l'offerta tramite WebSocket
        console.log('CallService: Invio offerta via WebSocket', { recipientId, isVideo: this.isVideoCall });
        
        // Serializza l'offerta per l'invio WebSocket
        const serializableOffer = {
          type: offer.type,
          sdp: offer.sdp
        };
        
        // MODIFICHE CRITICHE: Gestione dell'ID utente
        const userId = Number(localStorage.getItem('userId'));
        if (!userId || isNaN(userId)) {
          console.error('CallService: ID utente mancante o non valido nel localStorage');
        }
        
        websocketService.send({
          type: WebSocketMessageType.CALL_OFFER,
          recipientId: recipientId,
          offer: serializableOffer,
          isVideo: this.isVideoCall,
          // Assicurati che l'ID mittente sia sempre definito
          senderId: userId || 1 // Usa un ID di fallback se manca
        });

        // Notifica che la chiamata è iniziata
        if (this.onCallStartedCallback) {
          this.onCallStartedCallback();
        }
        
      } catch (error) {
        console.error('CallService: Errore nella creazione dell\'offerta:', error);
        this.cleanupCall();
        throw new Error('Impossibile stabilire la chiamata. Riprova più tardi.');
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

      // Richiedi i permessi media
      try {
        console.log('CallService: Richiesta permessi media per risposta');
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo
        });
        console.log('CallService: Permessi media ottenuti per risposta');
      } catch (error) {
        console.error('CallService: Errore nell\'accesso ai dispositivi media durante la risposta:', error);
        
        // Se l'accesso video fallisce, proviamo solo con l'audio
        if (isVideo) {
          console.log('CallService: Risposta: fallback a solo audio');
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false
            });
            this.isVideoCall = false; // Downgrade a chiamata audio
          } catch (audioError) {
            console.error('CallService: Errore anche nell\'accesso all\'audio:', audioError);
            throw new Error('Impossibile accedere ai dispositivi audio. Verifica le autorizzazioni del browser.');
          }
        } else {
          throw new Error('Impossibile accedere ai dispositivi audio. Verifica le autorizzazioni del browser.');
        }
      }

      // Crea peer connection
      this.createPeerConnection();

      if (!this.peerConnection || !this.localStream) {
        throw new Error('Impossibile inizializzare la connessione per rispondere alla chiamata.');
      }

      // Aggiungi le tracce al peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Imposta l'offerta remota e crea una risposta
      try {
        console.log('CallService: Impostazione della remote description', offer);
        
        // Verifica che l'offerta sia nel formato corretto
        let offerObject;
        if (typeof offer === 'string') {
          offerObject = JSON.parse(offer);
        } else {
          offerObject = offer;
        }
        
        // Crea un oggetto RTCSessionDescription valido
        const sessionDesc = new RTCSessionDescription({
          type: offerObject.type,
          sdp: offerObject.sdp
        });
        
        await this.peerConnection.setRemoteDescription(sessionDesc);
        console.log('CallService: Remote description impostata');
        
        // Crea una risposta
        console.log('CallService: Creazione risposta');
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        console.log('CallService: Local description (risposta) impostata');

        // Invia la risposta tramite WebSocket
        console.log('CallService: Invio risposta via WebSocket', { callerId, isVideo: this.isVideoCall });
        
        // Serializza la risposta per l'invio WebSocket
        const serializableAnswer = {
          type: answer.type,
          sdp: answer.sdp
        };
        
        // MODIFICHE CRITICHE: Gestione dell'ID utente
        const userId = Number(localStorage.getItem('userId'));
        if (!userId || isNaN(userId)) {
          console.error('CallService: ID utente mancante o non valido nel localStorage');
        }
        
        websocketService.send({
          type: WebSocketMessageType.CALL_ANSWER,
          recipientId: callerId,
          answer: serializableAnswer,
          isVideo: this.isVideoCall,
          // Assicurati che l'ID mittente sia sempre definito
          senderId: userId || 1 // Usa un ID di fallback se manca
        });

        // Notifica che la chiamata è iniziata
        if (this.onCallStartedCallback) {
          this.onCallStartedCallback();
        }
      } catch (error) {
        console.error('CallService: Errore durante la risposta alla chiamata:', error);
        this.cleanupCall();
        throw new Error('Impossibile rispondere alla chiamata. Riprova più tardi.');
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
    
    // MODIFICHE CRITICHE: Gestione dell'ID utente
    const userId = Number(localStorage.getItem('userId'));
    if (!userId || isNaN(userId)) {
      console.error('CallService: ID utente mancante o non valido nel localStorage');
    }
    
    // Invia un messaggio di rifiuto
    websocketService.send({
      type: WebSocketMessageType.CALL_REJECT,
      recipientId: callerId,
      // Assicurati che l'ID mittente sia sempre definito
      senderId: userId || 1 // Usa un ID di fallback se manca
    });
    
    // Pulisce eventuali risorse già allocate
    this.cleanupCall();
  }

  // Termina una chiamata attiva
  endCall(): void {
    console.log('CallService: Termine chiamata');
    
    // Invia un messaggio di fine chiamata al destinatario attuale
    if (this.currentRecipientId) {
      // MODIFICHE CRITICHE: Gestione dell'ID utente
      const userId = Number(localStorage.getItem('userId'));
      if (!userId || isNaN(userId)) {
        console.error('CallService: ID utente mancante o non valido nel localStorage');
      }
      
      websocketService.send({
        type: WebSocketMessageType.CALL_END,
        recipientId: this.currentRecipientId,
        // Assicurati che l'ID mittente sia sempre definito
        senderId: userId || 1 // Usa un ID di fallback se manca
      });
    }
    
    // Pulisce le risorse
    this.cleanupCall();
  }

  // Toglie/aggiunge l'audio
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
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
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
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
      case WebSocketMessageType.CALL_ANSWER:
        this.handleCallAnswer(message);
        break;
      case WebSocketMessageType.ICE_CANDIDATE:
        this.handleIceCandidate(message);
        break;
      // CALL_END e CALL_REJECT sono gestiti in CallContext
    }
  }

  // Gestisce una risposta a una chiamata
  private async handleCallAnswer(message: any): Promise<void> {
    try {
      console.log('CallService: Gestione risposta alla chiamata', {
        hasAnswer: !!message.answer,
        answerType: message.answer?.type
      });
      
      if (this.peerConnection && message.answer) {
        // Verifica che la risposta sia nel formato corretto
        let answerObject;
        if (typeof message.answer === 'string') {
          answerObject = JSON.parse(message.answer);
        } else {
          answerObject = message.answer;
        }
        
        // Crea un oggetto RTCSessionDescription valido
        const sessionDesc = new RTCSessionDescription({
          type: answerObject.type,
          sdp: answerObject.sdp
        });
        
        await this.peerConnection.setRemoteDescription(sessionDesc);
        console.log('CallService: Risposta remota impostata con successo');
        
        // Aggiorna il flag video se necessario
        if (this.isVideoCall && message.isVideo === false) {
          console.log('CallService: Il destinatario ha risposto con una chiamata audio (downgrade)');
          this.isVideoCall = false;
        }
      } else {
        console.error('CallService: Impossibile gestire la risposta: peerConnection o answer mancanti');
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
        // Verifica che il candidato sia nel formato corretto
        let candidateObject;
        if (typeof message.candidate === 'string') {
          candidateObject = JSON.parse(message.candidate);
        } else {
          candidateObject = message.candidate;
        }
        
        // Crea un oggetto RTCIceCandidate valido
        const candidate = new RTCIceCandidate({
          candidate: candidateObject.candidate,
          sdpMid: candidateObject.sdpMid,
          sdpMLineIndex: candidateObject.sdpMLineIndex,
          usernameFragment: candidateObject.usernameFragment
        });
        
        await this.peerConnection.addIceCandidate(candidate);
        console.log('CallService: Candidato ICE aggiunto con successo');
      } else {
        console.warn('CallService: Impossibile aggiungere candidato ICE: peerConnection o candidate mancanti');
      }
    } catch (error) {
      console.error('CallService: Errore nell\'aggiunta del candidato ICE:', error);
      // Non terminiamo la chiamata per un singolo candidato fallito
    }
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
          
          // Serializza il candidato per l'invio WebSocket
          const serializableCandidate = {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          };
          
          // MODIFICHE CRITICHE: Gestione dell'ID utente
          const userId = Number(localStorage.getItem('userId'));
          if (!userId || isNaN(userId)) {
            console.error('CallService: ID utente mancante o non valido nel localStorage');
          }
          
          websocketService.send({
            type: WebSocketMessageType.ICE_CANDIDATE,
            recipientId: this.currentRecipientId,
            candidate: serializableCandidate,
            // Assicurati che l'ID mittente sia sempre definito
            senderId: userId || 1 // Usa un ID di fallback se manca
          });
        } else if (!event.candidate) {
          console.log('CallService: Raccolta candidati ICE completata');
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
        if (event.streams && event.streams.length > 0) {
          event.streams[0].getTracks().forEach(track => {
            if (this.remoteStream) {
              console.log(`CallService: Aggiunta traccia ${track.kind} allo stream remoto`);
              this.remoteStream.addTrack(track);
            }
          });
        } else if (event.track) {
          // Fallback se non ci sono stream
          console.log(`CallService: Aggiunta traccia singola ${event.track.kind} allo stream remoto`);
          this.remoteStream.addTrack(event.track);
        }
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
            this.restartIce();
            break;
            
          case 'disconnected':
            console.log('CallService: Connessione WebRTC disconnessa - attesa riconnessione');
            // Impostiamo un timeout per chiudere la chiamata se la disconnessione persiste
            setTimeout(() => {
              if (this.peerConnection?.iceConnectionState === 'disconnected') {
                console.log('CallService: Connessione ancora disconnessa dopo timeout, chiusura chiamata');
                this.endCall();
              }
            }, 10000); // 10 secondi
            break;
            
          case 'closed':
            console.log('CallService: Connessione WebRTC chiusa');
            this.endCall();
            break;
        }
      };

      // Gestione degli stati di connessione generale
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

  // Tenta di riavviare la connessione ICE in caso di problemi
  private async restartIce(): Promise<void> {
    if (!this.peerConnection || !this.currentRecipientId) return;
    
    try {
      console.log('CallService: Tentativo di riavvio ICE');
      
      // Crea una nuova offerta con iceRestart: true
      const options: RTCOfferOptions = {
        iceRestart: true,
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.isVideoCall
      };
      
      const offer = await this.peerConnection.createOffer(options);
      await this.peerConnection.setLocalDescription(offer);
      
      // Serializza l'offerta per l'invio WebSocket
      const serializableOffer = {
        type: offer.type,
        sdp: offer.sdp
      };
      
      // MODIFICHE CRITICHE: Gestione dell'ID utente
      const userId = Number(localStorage.getItem('userId'));
      if (!userId || isNaN(userId)) {
        console.error('CallService: ID utente mancante o non valido nel localStorage');
      }
      
      websocketService.send({
        type: WebSocketMessageType.CALL_OFFER,
        recipientId: this.currentRecipientId,
        offer: serializableOffer,
        isVideo: this.isVideoCall,
        // Assicurati che l'ID mittente sia sempre definito
        senderId: userId || 1 // Usa un ID di fallback se manca
      });
      
      console.log('CallService: Riavvio ICE iniziato');
    } catch (error) {
      console.error('CallService: Errore durante il riavvio ICE:', error);
      this.endCall();
    }
  }

  // Pulisce lo stato della chiamata e rilascia le risorse
  private cleanupCall(): void {
    console.log('CallService: Pulizia risorse chiamata');
    
    // Ferma tutte le tracce locali
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
    
    // Chiudi la connessione peer
    if (this.peerConnection) {
      // Rimuovi tutti gli event listener
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onconnectionstatechange = null;
      
      // Chiudi la connessione
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Reimposta le variabili di stato
    this.remoteStream = null;
    this.currentRecipientId = null;
    
    // Notifica che la chiamata è terminata
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