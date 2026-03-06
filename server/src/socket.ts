/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { corsOrigins } from './config/cors';
import { UserModel } from './models/User';

let io: Server | null = null;

// Track connection attempts for rate limiting
const connectionAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_CONNECTION_ATTEMPTS = 10;
const CONNECTION_WINDOW_MS = 60000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = connectionAttempts.get(ip);

  if (!record) {
    connectionAttempts.set(ip, { count: 1, lastAttempt: now });
    return false;
  }

  // Reset if outside window
  if (now - record.lastAttempt > CONNECTION_WINDOW_MS) {
    connectionAttempts.set(ip, { count: 1, lastAttempt: now });
    return false;
  }

  record.count++;
  record.lastAttempt = now;

  return record.count > MAX_CONNECTION_ATTEMPTS;
}

export const getIO = (): Server | null => io;

export function initSocket(httpServer: any): Server {
  io = new Server(httpServer, {
    path: '/api/socket.io',
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
    connectTimeout: 10000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Connection rate limiting middleware
  io.use((socket, next) => {
    const ip = socket.handshake.address;
    if (isRateLimited(ip)) {
      return next(new Error('Too many connection attempts. Please try again later.'));
    }
    next();
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth as any)?.token ||
      (socket.handshake.headers.authorization as string)?.replace('Bearer ', '');
    const publicKey = (socket.handshake.auth as any)?.publicKey;

    // Allow public, read-only landing feed when key matches
    if (!token && publicKey && env.publicFeedKey && publicKey === env.publicFeedKey) {
      (socket as any).user = { id: 'public', role: 'guest' };
      socket.join('public:listings');
      return next();
    }

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret) as { sub: string; role: string };
      const user = await UserModel.findById(payload.sub).select('_id role status').lean();

      if (!user) {
        return next(new Error('User not found'));
      }

      if (user.status === 'banned') {
        return next(new Error('Account is banned'));
      }

      (socket as any).user = { id: String(user._id), role: user.role };
      socket.join(`user:${user._id}`);
      socket.join(`role:${user.role}`);

      if (user.role === 'agent') {
        socket.join(`agent:${user._id}`);
      }

      next();
    } catch (e) {
      const error = e as Error;
      console.error('[Socket] Auth error:', error.message);
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] User connected: ${user?.id} (${user?.role})`);

    // Handle typing indicators
    socket.on('typing', (data: { conversationId: string }) => {
      if (data.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('typing', {
          conversationId: data.conversationId,
          from: user?.id,
        });
      }
    });

    // Handle joining conversation rooms
    socket.on('join:conversation', (conversationId: string) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave:conversation', (conversationId: string) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${user?.id} (${reason})`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket] Error for user ${user?.id}:`, error.message);
    });
  });

  // Periodic cleanup of rate limit records
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of connectionAttempts.entries()) {
      if (now - record.lastAttempt > CONNECTION_WINDOW_MS) {
        connectionAttempts.delete(ip);
      }
    }
  }, CONNECTION_WINDOW_MS);

  return io;
}

export function closeSocket(): Promise<void> {
  return new Promise((resolve) => {
    if (io) {
      io.close(() => {
        io = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
