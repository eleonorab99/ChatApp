import { WebSocketMessage, WebSocketMessageType } from '../types/chat.types';

// Classe per gestire la connessione WebSocket
class WebSocketService {
  private ws: WebSocket | null = null;
  private messageListeners: ((message: WebSocketMessage) => void)[] = [];
  private connectionStatusListeners: ((status: 'connected' | 'disconnected' | 'reconnecting') => void)[] = [];
  private url: string = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimeout: number = 3000; // 3 secondi
  private reconnectIntervalId: number | null = null;
  private token: string | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private heartbeatInterval: number | null = null;

  // Controlla lo stato della connessione WebSocket
  checkConnection() {
    if ((!this.ws || this.ws.readyState !== WebSocket.OPEN) && this.token) {
      console.log('Connessione non attiva, tentativo di riconnessione');
      this.reconnect(this.token);
      return false;
    }
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Inizializza la connessione WebSocket
  connect(token: string): void {
    this.token = token;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket già connesso');
      return;
    }

    try {
      // URL WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = '3000'; // Assicurati che questa porta sia corretta
      const wsUrl = `${protocol}//${host}:${port}?token=${encodeURIComponent(token)}`;
      
      console.log('Connessione a:', wsUrl);
      
      this.updateConnectionStatus('reconnecting');
      
      // Chiudi qualsiasi connessione esistente
      if (this.ws) {
        try {
          this.ws.close();
        } catch (e) {
          console.error('Errore nella chiusura del WebSocket:', e);
        }
      }
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onclose = this.onClose.bind(this);
      this.ws.onerror = this.onError.bind(this);
    } catch (error) {
      console.error('Errore durante la connessione WebSocket:', error);
      this.updateConnectionStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  // Gestisce l'apertura della connessione
  private onOpen(): void {
    console.log('Connessione WebSocket stabilita');
    this.reconnectAttempts = 0;
    this.updateConnectionStatus('connected');
    
    if (this.reconnectIntervalId) {
      clearInterval(this.reconnectIntervalId);
      this.reconnectIntervalId = null;
    }
    
    // Invia i messaggi in buffer
    this.sendBufferedMessages();
    
    // Avvia l'heartbeat per mantenere la connessione attiva
    this.startHeartbeat();
  }

  // Gestisce i messaggi in arrivo
  private onMessage(event: MessageEvent): void {
    try {
      // Limitiamo il log a 100 caratteri per non intasare la console
      console.log('Messaggio WebSocket ricevuto:', event.data.substring(0, 100));
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Log dettagliato per messaggi di chiamata - importante per debug
      if (message.type === WebSocketMessageType.CALL_OFFER || 
          message.type === WebSocketMessageType.CALL_ANSWER || 
          message.type === WebSocketMessageType.CALL_END || 
          message.type === WebSocketMessageType.CALL_REJECT) {
        console.log(`WebSocketService: Ricevuto messaggio di chiamata ${message.type}`, {
          senderId: message.senderId,
          recipientId: message.recipientId,
          isVideo: message.isVideo,
          hasOffer: !!message.offer,
          hasAnswer: !!message.answer
        });
      }
      
      // Notifica tutti i listener registrati
      this.messageListeners.forEach(listener => listener(message));
    } catch (error) {
      console.error('Errore nel parsing del messaggio WebSocket:', error);
    }
  }

  // Gestisce la chiusura della connessione
  private onClose(event: CloseEvent): void {
    console.log(`Connessione WebSocket chiusa: ${event.code} ${event.reason}`);
    this.updateConnectionStatus('disconnected');
    this.stopHeartbeat();
    
    if (event.code !== 1000) {
      // 1000 è il codice per chiusura normale
      this.scheduleReconnect();
    }
  }

  // Gestisce gli errori della connessione
  private onError(error: Event): void {
    console.error('Errore WebSocket:', error);
    this.updateConnectionStatus('disconnected');
    // Non chiamiamo scheduleReconnect qui perché onClose verrà chiamato dopo onError
  }

  // Aggiorna lo stato della connessione e notifica i listener
  private updateConnectionStatus(status: 'connected' | 'disconnected' | 'reconnecting'): void {
    if (this.connectionStatus !== status) {
      console.log(`Cambio stato connessione WebSocket: ${this.connectionStatus} -> ${status}`);
      this.connectionStatus = status;
      this.notifyConnectionStatusChange(status);
    }
  }

  // Notifica i listener del cambio di stato della connessione
  private notifyConnectionStatusChange(status: 'connected' | 'disconnected' | 'reconnecting'): void {
    this.connectionStatusListeners.forEach(listener => listener(status));
  }

  // Avvia l'heartbeat per mantenere la connessione attiva
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Ferma eventuali heartbeat esistenti
    
    this.heartbeatInterval = window.setInterval(() => {
      if (!this.checkConnection()) {
        console.log('Heartbeat: connessione persa, tentativo di riconnessione');
        return;
      }
      
      // Invia un messaggio di ping per mantenere la connessione attiva
      try {
        this.send({
          type: 'ping' as WebSocketMessageType,
        });
      } catch (error) {
        console.error('Errore nell\'invio dell\'heartbeat:', error);
      }
    }, 30000); // 30 secondi
  }

  // Ferma l'heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Pianifica un tentativo di riconnessione
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Numero massimo di tentativi di riconnessione raggiunto');
      return;
    }

    this.reconnectAttempts++;
    const timeout = this.reconnectTimeout * Math.min(this.reconnectAttempts, 5); // Backoff esponenziale limitato
    console.log(`Tentativo di riconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts} tra ${timeout}ms`);
    
    this.updateConnectionStatus('reconnecting');
    
    if (this.reconnectIntervalId) {
      clearTimeout(this.reconnectIntervalId);
    }
    
    this.reconnectIntervalId = window.setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      } else {
        const token = localStorage.getItem('token');
        if (token) {
          this.connect(token);
        }
      }
    }, timeout);
  }

  // Forza una riconnessione 
  reconnect(token: string): void {
    console.log('Riconnessione forzata WebSocket');
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        console.error('Errore nella chiusura del WebSocket:', e);
      }
      this.ws = null;
    }
    
    this.token = token;
    this.reconnectAttempts = 0; // Resetta i tentativi
    
    // Piccolo timeout per dare tempo alla connessione precedente di chiudersi
    setTimeout(() => {
      this.connect(token);
    }, 500);
  }

  // Invia un messaggio WebSocket
  send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket non connesso, impossibile inviare il messaggio');
      this.bufferMessage(message);
      this.checkConnection(); // Controlla e riconnetti se necessario
      return;
    }

    try {
      // Log dettagliato per messaggi di chiamata - importante per debug
      if (message.type === WebSocketMessageType.CALL_OFFER || 
          message.type === WebSocketMessageType.CALL_ANSWER || 
          message.type === WebSocketMessageType.CALL_END || 
          message.type === WebSocketMessageType.CALL_REJECT) {
        console.log(`WebSocketService: Invio messaggio di chiamata ${message.type}`, {
          recipientId: message.recipientId,
          isVideo: message.isVideo,
          hasOffer: !!message.offer,
          hasAnswer: !!message.answer
        });
      }
      
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      console.log(`Messaggio inviato: ${message.type}`);
    } catch (error) {
      console.error('Errore nell\'invio del messaggio WebSocket:', error);
      this.bufferMessage(message);
    }
  }

  // Buffer temporaneo per messaggi che non possono essere inviati
  private messageBuffer: WebSocketMessage[] = [];
  
  // Salva il messaggio nel buffer per inviarlo quando la connessione sarà ristabilita
  private bufferMessage(message: WebSocketMessage): void {
    // Salviamo solo messaggi di chat e non segnali di chiamata che potrebbero non essere più validi
    if (message.type === WebSocketMessageType.CHAT_MESSAGE ||
        message.type === WebSocketMessageType.READ_RECEIPT) {
      this.messageBuffer.push(message);
      console.log('Messaggio salvato nel buffer per invio successivo');
    }
  }
  
  // Invia i messaggi nel buffer
  private sendBufferedMessages(): void {
    if (this.messageBuffer.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`Invio di ${this.messageBuffer.length} messaggi dal buffer`);
      
      while (this.messageBuffer.length > 0) {
        const message = this.messageBuffer.shift();
        if (message) {
          try {
            this.ws.send(JSON.stringify(message));
          } catch (error) {
            console.error('Errore nell\'invio del messaggio dal buffer:', error);
            // Non rimettiamo nel buffer per evitare loop infiniti
          }
        }
      }
    }
  }

  // Invia un messaggio di chat
  sendChatMessage(
    content: string, 
    receiverId?: number, 
    fileUrl?: string, 
    fileSize?: number,
    fileType?: string,
    fileName?: string
  ): void {
    this.send({
      type: WebSocketMessageType.CHAT_MESSAGE,
      content,
      recipientId: receiverId,
      fileUrl,
      fileSize,
      fileType,
      fileName
    });
  }

  // Chiude la connessione WebSocket
  disconnect(): void {
    console.log('Disconnessione WebSocket volontaria');
    if (this.ws) {
      try {
        this.ws.close(1000, 'Disconnessione volontaria');
      } catch (e) {
        console.error('Errore nella chiusura del WebSocket:', e);
      }
      this.ws = null;
    }
    
    if (this.reconnectIntervalId) {
      clearTimeout(this.reconnectIntervalId);
      this.reconnectIntervalId = null;
    }
    
    this.stopHeartbeat();
    
    this.token = null;
    this.updateConnectionStatus('disconnected');
  }

  // Verifica se la connessione è attiva
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Aggiunge un listener per i messaggi
  addMessageListener(listener: (message: WebSocketMessage) => void): () => void {
    // Verifica se il listener è già stato aggiunto per evitare duplicazioni
    if (!this.messageListeners.includes(listener)) {
      this.messageListeners.push(listener);
    }
    
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  // Aggiunge un listener per lo stato della connessione
  onConnectionStatusChange(listener: (status: 'connected' | 'disconnected' | 'reconnecting') => void): void {
    // Verifica se il listener è già stato aggiunto per evitare duplicazioni
    if (!this.connectionStatusListeners.includes(listener)) {
      this.connectionStatusListeners.push(listener);
      // Invia subito lo stato attuale
      listener(this.connectionStatus);
    }
  }

  // Rimuove un listener per lo stato della connessione
  offConnectionStatusChange(listener: (status: 'connected' | 'disconnected' | 'reconnecting') => void): void {
    this.connectionStatusListeners = this.connectionStatusListeners.filter(l => l !== listener);
  }
}

// Aggiungi PING al WebSocketMessageType
if (!Object.values(WebSocketMessageType).includes('PING' as any)) {
  (WebSocketMessageType as any).PING = 'ping';
}

// Esporta un'istanza del servizio WebSocket
const websocketService = new WebSocketService();
export default websocketService;