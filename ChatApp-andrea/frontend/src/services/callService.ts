import websocketService from './websocketService';
import { WebSocketMessageType } from '../types/chat.types';

// Servizio per gestire le funzionalità di chiamata WebRTC
class CallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentRecipientId: number | null = null;
  private isVideoCall: boolean = false;
  private isCallInitiator: boolean = false;
  
  // Callback per eventi
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onLocalStreamCallback: ((stream: MediaStream) => void) | null = null;
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

  // METODO OTTIMIZZATO per acquisire stream locale video/audio
  private async getLocalMediaStream(withVideo: boolean): Promise<MediaStream> {
    console.log(`CallService: Richiesta stream locale (video: ${withVideo})`);
    
    try {
      // Prima tenta di ottenere audio + video se richiesto
      if (withVideo) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user"
            }
          });
          console.log("CallService: Acquisiti stream audio e video di alta qualità");
          
          // Controlla che ci siano tracce video
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length === 0) {
            throw new Error("Nessuna traccia video acquisita");
          }
          
          return stream;
        } catch (error) {
          console.warn("CallService: Impossibile acquisire video di alta qualità, tentativo con impostazioni base", error);
          
          // Fallback a risoluzione più bassa
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: true
            });
            console.log("CallService: Acquisiti stream audio e video base");
            return stream;
          } catch (videoError) {
            console.error("CallService: Impossibile acquisire video, fallback a solo audio", videoError);
            throw videoError; // Passa al fallback solo audio
          }
        }
      }
      
      // Se qui, è richiesto solo audio o il video è fallito
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      console.log("CallService: Acquisito solo stream audio");
      return audioStream;
    } catch (error) {
      console.error("CallService: Errore fatale nell'acquisizione di media:", error);
      throw new Error("Impossibile acquisire i dispositivi media. Verifica le autorizzazioni del browser.");
    }
  }

  // Inizia una chiamata
  async startCall(recipientId: number, withVideo: boolean = false): Promise<void> {
    try {
      console.log('CallService: Inizio chiamata', { recipientId, withVideo });
      this.currentRecipientId = recipientId;
      this.isVideoCall = withVideo;
      this.isCallInitiator = true;

      // Crea la connessione peer
      this.createPeerConnection();

      // Richiedi i permessi per il microfono (e la videocamera se necessario)
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Forza mono per migliore compatibilità
          sampleRate: 48000 // Frequenza di campionamento ottimale
        },
        video: withVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } : false
      };

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('CallService: Stream locale ottenuto con successo');
        
        // Notifica lo stream locale
        if (this.onLocalStreamCallback) {
          this.onLocalStreamCallback(this.localStream);
        }

        // Verifica che ci sia almeno una traccia audio
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length === 0) {
          throw new Error('Nessuna traccia audio disponibile');
        }

        // Configura le tracce audio
        audioTracks.forEach(track => {
          track.enabled = true;
          // Imposta il volume al massimo
          if ('volume' in track) {
            (track as any).volume = 1.0;
          }
        });

        // Aggiungi le tracce al peer connection
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            console.log(`CallService: Aggiunta traccia ${track.kind} alla connessione`);
            try {
              this.peerConnection.addTrack(track, this.localStream);
            } catch (err) {
              console.error(`CallService: Errore nell'aggiunta della traccia ${track.kind}:`, err);
            }
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
          
          const serializableOffer = {
            type: offer.type,
            sdp: offer.sdp
          };
          
          // Gestione dell'ID utente
          const userId = Number(localStorage.getItem('userId'));
          if (!userId || isNaN(userId)) {
            throw new Error('ID utente mancante o non valido nel localStorage');
          }
          
          websocketService.send({
            type: WebSocketMessageType.CALL_OFFER,
            recipientId: recipientId,
            offer: serializableOffer,
            isVideo: this.isVideoCall,
            senderId: userId
          });

          // Notifica che la chiamata è iniziata
          if (this.onCallStartedCallback) {
            this.onCallStartedCallback();
          }
          
        } catch (error) {
          console.error('CallService: Errore nella creazione dell\'offerta:', error);
          this.cleanupCall(true);
          throw new Error('Impossibile stabilire la chiamata. Riprova più tardi.');
        }
      } catch (error) {
        console.error('CallService: Errore nell\'accesso ai dispositivi multimediali:', error);
        this.cleanupCall(true);
        throw new Error('Impossibile accedere al microfono. Verifica i permessi del browser.');
      }
    } catch (error) {
      console.error('CallService: Errore durante l\'avvio della chiamata:', error);
      this.cleanupCall(true);
      throw error;
    }
  }

  // Rispondi a una chiamata
  async answerCall(callerId: number, offer: RTCSessionDescriptionInit, isVideo: boolean): Promise<void> {
    try {
      console.log(`CallService: Risposta a chiamata da ${callerId} (video: ${isVideo})`);
      
      // IMPORTANTE: Se c'è già una chiamata attiva, assicurati di terminarla correttamente
      if (this.peerConnection || this.localStream) {
        console.log('CallService: Risorse esistenti trovate, pulizia completa prima di rispondere');
        this.cleanupCall(true);
      }
      
      this.currentRecipientId = callerId;
      this.isVideoCall = isVideo;
      this.isCallInitiator = false;

      // Ottieni media locale
      try {
        this.localStream = await this.getLocalMediaStream(isVideo);
        
        // Aggiorna il flag video in base al risultato effettivo
        this.isVideoCall = isVideo && this.localStream.getVideoTracks().length > 0;
        
        // Notifica lo stream locale
        if (this.onLocalStreamCallback) {
          console.log('CallService: Notifica dello stream locale al UI (risposta)');
          this.onLocalStreamCallback(this.localStream);
        }
      } catch (error) {
        console.error('CallService: Errore fatale nell\'acquisizione media (risposta):', error);
        this.cleanupCall(true);
        throw new Error('Impossibile accedere ai dispositivi media. Verifica le autorizzazioni del browser.');
      }

      // Crea peer connection
      this.createPeerConnection();

      if (!this.peerConnection || !this.localStream) {
        throw new Error('Impossibile inizializzare la connessione per rispondere alla chiamata.');
      }

      // Imposta prima l'offerta remota (importante per l'ordine)
      try {
        console.log('CallService: Impostazione della remote description', offer);
        
        // Verifica e normalizza l'offerta
        let offerObject;
        if (typeof offer === 'string') {
          offerObject = JSON.parse(offer);
        } else {
          offerObject = offer;
        }
        
        const sessionDesc = new RTCSessionDescription({
          type: offerObject.type,
          sdp: offerObject.sdp
        });
        
        await this.peerConnection.setRemoteDescription(sessionDesc);
        console.log('CallService: Remote description impostata');
      } catch (error) {
        console.error('CallService: Errore nell\'impostazione della remote description:', error);
        this.cleanupCall(true);
        throw new Error('Impossibile processare l\'offerta di chiamata. Riprova più tardi.');
      }

      // Ora aggiungi le tracce locali
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          console.log(`CallService: Aggiunta traccia ${track.kind} alla connessione (risposta)`);
          try {
            this.peerConnection.addTrack(track, this.localStream);
          } catch (err) {
            console.error(`CallService: Errore nell'aggiunta della traccia ${track.kind} (risposta):`, err);
          }
        }
      });
        
      // Crea una risposta
      try {
        console.log('CallService: Creazione risposta');
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        console.log('CallService: Local description (risposta) impostata');

        // Invia la risposta tramite WebSocket
        console.log('CallService: Invio risposta via WebSocket', { callerId, isVideo: this.isVideoCall });
        
        const serializableAnswer = {
          type: answer.type,
          sdp: answer.sdp
        };
        
        // Gestione dell'ID utente
        const userId = Number(localStorage.getItem('userId'));
        if (!userId || isNaN(userId)) {
          console.error('CallService: ID utente mancante o non valido nel localStorage');
        }
        
        websocketService.send({
          type: WebSocketMessageType.CALL_ANSWER,
          recipientId: callerId,
          answer: serializableAnswer,
          isVideo: this.isVideoCall,
          senderId: userId || 1
        });

        // Notifica che la chiamata è iniziata
        if (this.onCallStartedCallback) {
          this.onCallStartedCallback();
        }
      } catch (error) {
        console.error('CallService: Errore durante la creazione della risposta:', error);
        this.cleanupCall(true);
        throw new Error('Impossibile rispondere alla chiamata. Riprova più tardi.');
      }
    } catch (error) {
      console.error('CallService: Errore durante la risposta alla chiamata:', error);
      this.cleanupCall(true);
      throw error;
    }
  }

  // Rifiuta una chiamata in arrivo
  rejectCall(callerId: number): void {
    console.log(`CallService: Rifiuto chiamata da ${callerId}`);
    
    // Gestione dell'ID utente
    const userId = Number(localStorage.getItem('userId'));
    if (!userId || isNaN(userId)) {
      console.error('CallService: ID utente mancante o non valido nel localStorage');
    }
    
    // Invia un messaggio di rifiuto
    websocketService.send({
      type: WebSocketMessageType.CALL_REJECT,
      recipientId: callerId,
      senderId: userId || 1
    });
    
    // Pulisce eventuali risorse già allocate
    this.cleanupCall(true);
  }

  // Termina una chiamata attiva
  endCall(): void {
    console.log('CallService: Termine chiamata');
    
    // Invia un messaggio di fine chiamata al destinatario attuale
    if (this.currentRecipientId) {
      // Gestione dell'ID utente
      const userId = Number(localStorage.getItem('userId'));
      if (!userId || isNaN(userId)) {
        console.error('CallService: ID utente mancante o non valido nel localStorage');
      }
      
      websocketService.send({
        type: WebSocketMessageType.CALL_END,
        recipientId: this.currentRecipientId,
        senderId: userId || 1
      });
    }
    
    // Pulisce le risorse
    this.cleanupCall(true);
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
      this.cleanupCall(true);
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
      
      // Assicurati di chiudere qualsiasi connessione esistente
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      this.peerConnection = new RTCPeerConnection(this.config);
      
      // Crea un nuovo stream remoto
      this.remoteStream = new MediaStream();
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
      
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
          
          // Gestione dell'ID utente
          const userId = Number(localStorage.getItem('userId'));
          if (!userId || isNaN(userId)) {
            console.error('CallService: ID utente mancante o non valido nel localStorage');
            return;
          }
          
          websocketService.send({
            type: WebSocketMessageType.ICE_CANDIDATE,
            recipientId: this.currentRecipientId,
            candidate: serializableCandidate,
            senderId: userId
          });
        } else if (!event.candidate) {
          console.log('CallService: Raccolta candidati ICE completata');
        }
      };

      // Handler per le tracce remote
      this.peerConnection.ontrack = (event) => {
        console.log('CallService: Nuova traccia remota ricevuta:', event.track.kind);
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          
          // Configura le tracce audio remote
          this.remoteStream.getAudioTracks().forEach(track => {
            track.enabled = true;
            // Imposta il volume al massimo
            if ('volume' in track) {
              (track as any).volume = 1.0;
            }
          });
          
          if (this.onRemoteStreamCallback) {
            this.onRemoteStreamCallback(this.remoteStream);
          }
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
      
      // Gestione dell'ID utente
      const userId = Number(localStorage.getItem('userId'));
      if (!userId || isNaN(userId)) {
        console.error('CallService: ID utente mancante o non valido nel localStorage');
      }
      
      websocketService.send({
        type: WebSocketMessageType.CALL_OFFER,
        recipientId: this.currentRecipientId,
        offer: serializableOffer,
        isVideo: this.isVideoCall,
        senderId: userId || 1
      });
      
      console.log('CallService: Riavvio ICE iniziato');
    } catch (error) {
      console.error('CallService: Errore durante il riavvio ICE:', error);
      this.endCall();
    }
  }

  // METODO MIGLIORATO: Pulisce lo stato della chiamata e rilascia le risorse
  private cleanupCall(forceFull: boolean = false): void {
    console.log(`CallService: Pulizia risorse chiamata ${forceFull ? '(completa forzata)' : ''}`);
    
    // Rilascia le risorse dello stream remoto
    if (this.remoteStream) {
      try {
        this.remoteStream.getTracks().forEach(track => {
          track.stop();
          this.remoteStream?.removeTrack(track);
        });
      } catch (err) {
        console.warn('CallService: Errore nel rilascio delle tracce dello stream remoto:', err);
      }
      this.remoteStream = null;
    }
    
    // Rilascia le risorse dello stream locale - IMPORTANTE per evitare conflitti
    if (this.localStream) {
      try {
        console.log('CallService: Arresto di tutte le tracce locali');
        this.localStream.getTracks().forEach(track => {
          console.log(`CallService: Arresto traccia ${track.kind} (enabled: ${track.enabled}, readyState: ${track.readyState})`);
          track.stop();
        });
        this.localStream = null;
      } catch (err) {
        console.warn('CallService: Errore nel rilascio delle tracce dello stream locale:', err);
      }
    }
    
    // Chiudi la connessione peer
    if (this.peerConnection) {
      try {
        // Rimuovi tutti gli event listener
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onconnectionstatechange = null;
        
        // Chiudi la connessione
        this.peerConnection.close();
      } catch (err) {
        console.warn('CallService: Errore nella chiusura della connessione peer:', err);
      }
      this.peerConnection = null;
    }
    
    // Reimposta le variabili di stato
    this.currentRecipientId = null;
    this.isCallInitiator = false;
    
    // IMPORTANTE: Libera la memoria video esplicitamente
    if (forceFull) {
      try {
        // Richiedi al browser di rilasciare esplicitamente le risorse della telecamera
        navigator.mediaDevices.getUserMedia({ audio: false, video: false })
          .then(stream => {
            // Questo è solo un trick per forzare il rilascio delle risorse
            stream.getTracks().forEach(track => track.stop());
          })
          .catch(err => {
            console.warn('CallService: Piccolo errore nel rilascio forzato delle risorse:', err);
          });
      } catch (e) {
        console.warn('CallService: Errore nel rilascio forzato delle risorse:', e);
      }
    }
    
    // Notifica che la chiamata è terminata
    if (this.onCallEndedCallback) {
      this.onCallEndedCallback();
    }
    
    // NUOVO: Piccolo delay per garantire il completo rilascio delle risorse
    if (forceFull) {
      setTimeout(() => {
        console.log('CallService: Pulizia completa terminata');
      }, 500);
    }
  }

  // Imposta il callback per lo stream remoto
  setOnRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
    
    // Se abbiamo già uno stream remoto, notificalo subito
    if (this.remoteStream && callback) {
      callback(this.remoteStream);
    }
  }
  
  // Imposta il callback per lo stream locale
  setOnLocalStream(callback: (stream: MediaStream) => void): void {
    this.onLocalStreamCallback = callback;
    
    // Se abbiamo già uno stream locale, notificalo subito
    if (this.localStream && callback) {
      callback(this.localStream);
    }
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
  setOnIceConnectionStateChange(
    callback: (state: RTCIceConnectionState) => void): void {
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
    
    // Verifica se siamo l'iniziatore della chiamata
    isInitiator(): boolean {
      return this.isCallInitiator;
    }
    
    // NUOVO: Metodo per diagnosticare lo stato dei dispositivi media
    async checkMediaDevices(): Promise<{audio: boolean, video: boolean}> {
      let hasAudio = false;
      let hasVideo = false;
      
      try {
        // Enumera i dispositivi
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Verifica che ci siano microfoni
        hasAudio = devices.some(device => device.kind === 'audioinput');
        
        // Verifica che ci siano webcam
        hasVideo = devices.some(device => device.kind === 'videoinput');
        
        console.log('CallService: Dispositivi disponibili:', {
          microphones: devices.filter(d => d.kind === 'audioinput').length,
          cameras: devices.filter(d => d.kind === 'videoinput').length
        });
        
        return { audio: hasAudio, video: hasVideo };
      } catch (error) {
        console.error('CallService: Errore nell\'enumerazione dei dispositivi media:', error);
        return { audio: false, video: false };
      }
    }
    
    // NUOVO: Metodo per forzare il rilascio delle risorse media
    async forceReleaseMediaResources(): Promise<void> {
      console.log('CallService: Forzatura rilascio risorse media');
      
      // Prima assicurati che tutte le chiamate attive siano terminate
      this.cleanupCall(true);
      
      try {
        // Trick per forzare il rilascio delle risorse della telecamera
        const emptyStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: false });
        emptyStream.getTracks().forEach(track => track.stop());
        
        // Attendere un piccolo periodo per permettere al browser di rilasciare le risorse
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('CallService: Rilascio risorse completato');
      } catch (error) {
        console.warn('CallService: Errore nel rilascio forzato delle risorse:', error);
      }
    }
  }
  
  // Esporta un'istanza del servizio di chiamata
  const callService = new CallService();
  export default callService;