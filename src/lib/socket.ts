import { io, Socket } from 'socket.io-client';
import { logger } from './logger';
import { SOCKET_URL } from './runtime';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string): Socket {
  // If socket exists with same token, return it
  if (socket && currentToken === token && socket.connected) {
    return socket;
  }

  // If socket exists but with different token or disconnected, clean up first
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  socket = io(SOCKET_URL ?? '/', {
    path: '/api/socket.io',
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.3,
    timeout: 15000
  });

  // Add connection state logging for debugging
  socket.on('connect', () => {
    logger.info('[Socket] Connected');
  });

  socket.on('disconnect', (reason) => {
    logger.info('[Socket] Disconnected', { reason });
  });

  socket.on('connect_error', (error) => {
    logger.error('[Socket] Connection error', { message: error.message }, error);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    currentToken = null;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
