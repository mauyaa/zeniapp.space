import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../lib/runtime';

let paySocket: Socket | null = null;
let currentToken: string | null = null;

export function getPaySocket(token: string): Socket {
  if (paySocket && currentToken === token && paySocket.connected) return paySocket;
  if (paySocket) {
    paySocket.removeAllListeners();
    paySocket.disconnect();
    paySocket = null;
  }
  currentToken = token;
  paySocket = io(SOCKET_URL ?? '/', {
    path: '/api/socket.io',
    auth: { token },
    transports: ['polling', 'websocket']
  });
  return paySocket;
}

export function disconnectPaySocket() {
  if (paySocket) {
    currentToken = null;
    paySocket.removeAllListeners();
    paySocket.disconnect();
    paySocket = null;
  }
}
