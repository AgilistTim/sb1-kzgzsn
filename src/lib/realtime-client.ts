import { CONFIG } from './config';
import { EventEmitter } from './event-emitter';

export class RealtimeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;

  constructor() {
    super();
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(CONFIG.ws.url);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('Connection error:', error);
      this.handleReconnect();
    }
  }

  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.debug('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
      
      // Initialize session with default configuration
      this.send({
        type: 'session.update',
        session: CONFIG.ws.options
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerEvent(data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.debug('WebSocket closed');
      this.handleReconnect();
    };
  }

  private handleServerEvent(event: any) {
    if (event.type === 'error') {
      console.error('Server error:', event.error);
      this.emit('error', event.error);
      return;
    }

    this.emit(event.type, event);
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= CONFIG.ws.reconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      console.debug(`Reconnecting... Attempt ${this.reconnectAttempts + 1}`);
      this.reconnectAttempts++;
      this.connect();
    }, CONFIG.ws.reconnectDelay);
  }

  public send(data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('Error sending message:', error);
      this.emit('error', error);
    }
  }

  public disconnect() {
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}