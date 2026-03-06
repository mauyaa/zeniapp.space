import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './runtime';

let publicSocket: Socket | null = null;

export function getPublicSocket(publicKey: string): Socket {
  if (publicSocket && publicSocket.connected) return publicSocket;
  if (publicSocket) {
    publicSocket.removeAllListeners();
    publicSocket.disconnect();
    publicSocket = null;
  }
  publicSocket = io(SOCKET_URL ?? '/', {
    path: '/api/socket.io',
    transports: ['websocket', 'polling'],
    auth: { publicKey },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.3,
  });
  return publicSocket;
}

export function disconnectPublicSocket() {
  if (publicSocket) {
    publicSocket.removeAllListeners();
    publicSocket.disconnect();
    publicSocket = null;
  }
}
