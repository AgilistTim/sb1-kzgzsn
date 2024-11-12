import { EventEmitter } from './event-emitter';
import { WS_CONFIG } from './config';
import { toast } from 'sonner';

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private url: string;

  constructor() {
    super();
    this.url = WS_CONFIG.BASE_URL;
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('Connection error:', error);
      this.handleError(error);
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.debug('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('open');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (error) {
        console.error('Error parsing message:', error);
        this.handleError(error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleError(error);
    };

    this.ws.onclose = (event) => {
      console.debug('WebSocket closed:', event.code, event.reason);
      this.emit('close', event);
      if (!event.wasClean) {
        this.handleReconnect();
      }
    };
  }

  private handleError(error: any): void {
    this.emit('error', error);
    const message = error instanceof Error ? error.message : 'Connection error';
    toast.error('WebSocket Error', { description: message });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < WS_CONFIG.RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      const delay = WS_CONFIG.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CLOSED) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      toast.error('Connection lost', {
        description: 'Please refresh the page to reconnect'
      });
    }
  }

  send(data: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('Send error:', error);
      this.handleError(error);
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client closing connection');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}