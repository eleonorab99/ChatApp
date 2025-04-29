import { WebSocketMessage, WebSocketMessageType } from '../types/chat.types';

// Classe per gestire la connessione WebSocket
class WebSocketService {
  private ws: WebSocket | null = null;
  private messageListeners: ((message: WebSocketMessage) => void)[] = [];
  private url: string = import.meta.env.VITE_WS_URL || 'wss://localhost:3000';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = 5000; // 5 secondi
  private reconnectIntervalId: number | null = null;

  // Inizializza la connessione WebSocket
  connect(token: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket già connesso');
      return;
    }

    try {
      const wsUrl = `${this.url}?token=${token}`;
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
    
    if (this.reconnectIntervalId) {
      clearInterval(this.reconnectIntervalId);
      this.reconnectIntervalId = null;
    }
  }

  // Gestisce i messaggi in arrivo
  private onMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      console.log('Messaggio WebSocket ricevuto:', message);
      
      // Notifica tutti i listener registrati
      this.messageListeners.forEach(listener => listener(message));
    } catch (error) {
      console.error('Errore nel parsing del messaggio WebSocket:', error);
    }
  }

  // Gestisce la chiusura della connessione
  private onClose(event: CloseEvent): void {
    console.log(`Connessione WebSocket chiusa: ${event.code} ${event.reason}`);
    
    if (event.code !== 1000) {
      // 1000 è il codice per chiusura normale
      this.scheduleReconnect();
    }
  }

  // Gestisce gli errori della connessione
  private onError(error: Event): void {
    console.error('Errore WebSocket:', error);
  }

  // Pianifica un tentativo di riconnessione
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Numero massimo di tentativi di riconnessione raggiunto');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Tentativo di riconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts} tra ${this.reconnectTimeout}ms`);
    
    if (this.reconnectIntervalId) {
      clearTimeout(this.reconnectIntervalId);
    }
    
    this.reconnectIntervalId = window.setTimeout(() => {
      const token = localStorage.getItem('token');
      if (token) {
        this.connect(token);
      }
    }, this.reconnectTimeout);
  }

  // Invia un messaggio WebSocket
  send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket non connesso, impossibile inviare il messaggio');
      this.scheduleReconnect();
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Errore nell\'invio del messaggio WebSocket:', error);
    }
  }

  // Invia un messaggio di chat
  sendChatMessage(content: string, receiverId?: number, fileUrl?: string): void {
    this.send({
      type: WebSocketMessageType.CHAT_MESSAGE,
      content,
      recipientId: receiverId,
      fileUrl
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
  }

  // Aggiunge un listener per i messaggi
  addMessageListener(listener: (message: WebSocketMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }
}

// Esporta un'istanza del servizio WebSocket
const websocketService = new WebSocketService();
export default websocketService;