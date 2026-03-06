import { api } from './api';
import { logger } from './logger';
import type { ListingSearchParams } from './api';

/**
 * Enhanced API client with retry mechanisms and offline detection
 */

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  exponentialBase: 2,
  retryableErrors: ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT'],
  maxQueueSize: 50, // Prevent unbounded queue growth
};

// Network status
let isOnline = navigator.onLine;
let retryQueue: Array<() => Promise<unknown>> = [];

// Update network status
window.addEventListener('online', () => {
  isOnline = true;
  logger.info('Network: Online');
  processRetryQueue();
});

window.addEventListener('offline', () => {
  isOnline = false;
  logger.info('Network: Offline');
});

async function processRetryQueue() {
  const queue = [...retryQueue];
  retryQueue = [];
  for (const request of queue) {
    try {
      await request();
    } catch (error) {
      logger.error('Failed to process queued request:', error as Record<string, unknown>);
    }
  }
}

function getDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.exponentialBase, attempt),
    RETRY_CONFIG.maxDelay
  );
  return delay * (0.5 + Math.random() * 0.5);
}

interface RetryableErrorLike {
  code?: string;
  message?: string;
  response?: { status?: number };
}

function isRetryableError(error: unknown): boolean {
  const e = error as RetryableErrorLike;
  if (e?.code && RETRY_CONFIG.retryableErrors.includes(e.code)) return true;
  if (typeof e?.response?.status === 'number') {
    const status = e.response.status;
    return status === 408 || status === 429 || status >= 500;
  }
  if (!isOnline || (typeof e?.message === 'string' && e.message.includes('Network Error')))
    return true;
  return false;
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === retries) throw error;
      if (!isOnline) {
        if (retryQueue.length < RETRY_CONFIG.maxQueueSize) {
          retryQueue.push(() => operation());
        } else {
          logger.warn('Retry queue full — dropping request');
        }
        throw new Error('Network is offline. Request queued for retry.');
      }
      const delay = getDelay(attempt);
      logger.info(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Enhanced API methods with retry
export const enhancedApi = {
  async getProperties(params?: ListingSearchParams) {
    return retryWithBackoff(() => api.searchListings(params || {}));
  },

  async getProperty(id: string) {
    return retryWithBackoff(() => api.fetchListing(id));
  },

  async login(email: string, password: string) {
    return retryWithBackoff(() => api.login(email, password));
  },

  async register(userData: Record<string, unknown>) {
    return retryWithBackoff(() => api.register(userData));
  },

  async getConversations() {
    return retryWithBackoff(() => api.fetchConversations());
  },

  async getMessages(conversationId: string) {
    return retryWithBackoff(() => api.fetchMessages(conversationId));
  },

  async sendMessage(conversationId: string, message: { type: string; content: unknown }) {
    return retryWithBackoff(() => api.postMessage(conversationId, message));
  },

  async saveProperty(propertyId: string) {
    return retryWithBackoff(() => api.toggleSaveListing(propertyId));
  },

  async unsaveProperty(propertyId: string) {
    return retryWithBackoff(() => api.toggleSaveListing(propertyId));
  },

  async getSavedProperties() {
    return retryWithBackoff(() => Promise.resolve({ items: [], total: 0 }));
  },

  async reportListing(
    listingId: string,
    reportData: { category: string; severity?: string; message?: string }
  ) {
    return retryWithBackoff(() => api.reportListing(listingId, reportData));
  },

  // Generic method for custom requests
  async request<T>(method: () => Promise<T>, options: { retries?: number } = {}) {
    const maxRetries = options.retries ?? RETRY_CONFIG.maxRetries;
    return retryWithBackoff(method, maxRetries);
  },
};

// Network status utilities
export const network = {
  isOnline: () => isOnline,

  getRetryQueueLength: () => retryQueue.length,

  clearRetryQueue: () => {
    retryQueue = [];
  },

  addOnlineListener: (callback: () => void) => {
    const handler = () => {
      if (isOnline) callback();
    };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  },

  addOfflineListener: (callback: () => void) => {
    const handler = () => {
      if (!isOnline) callback();
    };
    window.addEventListener('offline', handler);
    return () => window.removeEventListener('offline', handler);
  },
};

export { RETRY_CONFIG, isRetryableError, retryWithBackoff };
