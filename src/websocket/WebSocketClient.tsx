import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class WebSocketClient extends EventEmitter {
  private serverUrl: string;
  private ws: WebSocket;

  constructor(serverUrl: string) {
    super();
    this.serverUrl = serverUrl;
    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      this.emit('connected');
    });

    this.ws.on('message', (data : any) => {
      this.emit('public', data); // Emit a "public" event with the received data
    });

    this.ws.on('close', () => {
      console.log('Disconnected from WebSocket server');
      this.emit('disconnected');
    });
  }

  sendMessage(payload: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.log('WebSocket connection not open. Unable to send message.');
    }
  }

  closeConnection() {
    this.ws.close();
  }
}

 