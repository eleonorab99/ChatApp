import { WebSocketMessage, WebSocketMessageType } from '../types/chat.types';

// Classe per gestire la connessione WebSocket
class WebSocketService {
  private ws: WebSocket | null = null;
  private messageListeners: ((message: WebSocketMessage) => void)[] = [];
  private connectionStatusListeners: ((status: 'connected' | 'disconnected' | 'reconnecting') => void)[] = [];
  private url: string = import.meta.env.VITE_WS_URL || 'wss://localhost:3000';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimeout: number = 3000; // 3 secondi
  private reconnectIntervalId: number | null = null;
  private token: string | null = null;

  // Inizializza la connessione WebSocket
  connect(token: string): void {
    this.token = token;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket già connesso');
      return;
    }

    try {
      // Stiamo usando il token nell'URL per l'autenticazione
      // Assicuriamoci che l'URL sia formattato correttamente
      const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
      console.log('Connessione WebSocket a:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onclose = this.onClose.bind(this);
      this.ws.onerror = this.onError.bind(this);
    } catch (error) {
      console.error('Errore durante la connessione WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  // Gestisce l'apertura della connessione
  private onOpen(): void {
    console.log('Connessione WebSocket stabilita');
    this.reconnectAttempts = 0;
    this.notifyConnectionStatusChange('connected');
    
    if (this.reconnectIntervalId) {
      clearInterval(this.reconnectIntervalId);
      this.reconnectIntervalId = null;
    }
    
    // Invia i messaggi in buffer
    this.sendBufferedMessages();
  }

  // Gestisce i messaggi in arrivo
  private onMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      console.log('Messaggio WebSocket ricevuto:', message.type);
      
      // Notifica tutti i listener registrati
      this.messageListeners.forEach(listener => listener(message));
    } catch (error) {
      console.error('Errore nel parsing del messaggio WebSocket:', error);
    }
  }

  // Gestisce la chiusura della connessione
  private onClose(event: CloseEvent): void {
    console.log(`Connessione WebSocket chiusa: ${event.code} ${event.reason}`);
    this.notifyConnectionStatusChange('disconnected');
    
    if (event.code !== 1000) {
      // 1000 è il codice per chiusura normale
      this.scheduleReconnect();
    }
  }

  // Gestisce gli errori della connessione
  private onError(error: Event): void {
    console.error('Errore WebSocket:', error);
    this.notifyConnectionStatusChange('disconnected');
    // Non chiamiamo scheduleReconnect qui perché onClose verrà chiamato dopo onError
  }

  // Notifica i listener del cambio di stato della connessione
  private notifyConnectionStatusChange(status: 'connected' | 'disconnected' | 'reconnecting'): void {
    this.connectionStatusListeners.forEach(listener => listener(status));
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
    
    this.notifyConnectionStatusChange('reconnecting');
    
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.token = token;
    this.reconnectAttempts = 0; // Resetta i tentativi
    this.connect(token);
  }

  // Invia un messaggio WebSocket
  send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket non connesso, impossibile inviare il messaggio');
      this.bufferMessage(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
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
    if (message.type === WebSocketMessageType.CHAT_MESSAGE) {
      this.messageBuffer.push(message);
      console.log('Messaggio salvato nel buffer per invio successivo');
      this.scheduleReconnect();
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
    if (this.ws) {
      this.ws.close(1000, 'Disconnessione volontaria');
      this.ws = null;
    }
    
    if (this.reconnectIntervalId) {
      clearTimeout(this.reconnectIntervalId);
      this.reconnectIntervalId = null;
    }
    
    this.token = null;
    this.notifyConnectionStatusChange('disconnected');
  }

  // Verifica se la connessione è attiva
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Aggiunge un listener per i messaggi
  addMessageListener(listener: (message: WebSocketMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  // Aggiunge un listener per lo stato della connessione
  onConnectionStatusChange(listener: (status: 'connected' | 'disconnected' | 'reconnecting') => void): void {
    this.connectionStatusListeners.push(listener);
    // Invia subito lo stato attuale
    listener(this.isConnected() ? 'connected' : 'disconnected');
  }

  // Rimuove un listener per lo stato della connessione
  offConnectionStatusChange(listener: (status: 'connected' | 'disconnected' | 'reconnecting') => void): void {
    this.connectionStatusListeners = this.connectionStatusListeners.filter(l => l !== listener);
  }
}

// Esporta un'istanza del servizio WebSocket
const websocketService = new WebSocketService();
export default websocketService;