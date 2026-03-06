/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';

/**
 * Comprehensive Logging System
 * Provides structured logging with levels, context, and performance monitoring.
 * Do not log PII (email, phone, tokens) in message or context; use IDs or redacted placeholders.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  duration?: number; // For performance logging
  userId?: string;
  sessionId?: string;
}

type PerformanceMemory = {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
};

type PerformanceWithMemory = Performance & { memory?: PerformanceMemory };

class Logger {
  private minLevel: LogLevel = 'info';
  private buffer: LogEntry[] = [];
  private bufferSize = 100;
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    // Set log level based on environment
    if (import.meta.env.DEV) {
      this.minLevel = 'debug';
    } else if (import.meta.env.MODE === 'test') {
      this.minLevel = 'warn';
    }

    // Setup performance monitoring
    this.setupPerformanceMonitoring();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.minLevel];
  }

  private formatLog(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const context = entry.context ? JSON.stringify(entry.context) : '';
    const error = entry.error ? `\nError: ${entry.error.message}\nStack: ${entry.error.stack}` : '';
    const duration = entry.duration ? ` (${entry.duration}ms)` : '';

    return `[${timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${duration}${context ? ` ${context}` : ''}${error}`;
  }

  private addToBuffer(entry: LogEntry) {
    this.buffer.push(entry);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
  }

  private sendToServer(entry: LogEntry) {
    // In production, send to logging service (e.g., Sentry, LogRocket, etc.)
    if (import.meta.env.PROD && this.isBrowser) {
      // Example: fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) });
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('debug')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    };

    console.debug(this.formatLog(entry));
    this.addToBuffer(entry);
  }

  info(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('info')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    };

    console.info(this.formatLog(entry));
    this.addToBuffer(entry);
    this.sendToServer(entry);
  }

  warn(message: string, context?: Record<string, unknown>, error?: Error) {
    if (!this.shouldLog('warn')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
      error,
    };

    console.warn(this.formatLog(entry));
    this.addToBuffer(entry);
    this.sendToServer(entry);
  }

  error(message: string, context?: Record<string, unknown>, error?: Error) {
    if (!this.shouldLog('error')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error,
    };

    console.error(this.formatLog(entry));
    this.addToBuffer(entry);
    this.sendToServer(entry);

    // In production, also send to error tracking service
    if (import.meta.env.PROD && error) {
      // Example: Sentry.captureException(error);
    }
  }

  // Performance logging
  time<T>(label: string, fn: () => T, context?: Record<string, unknown>): T {
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;

      this.info(`Performance: ${label}`, { ...context, duration });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`Performance error: ${label}`, { ...context, duration }, error as Error);
      throw error;
    }
  }

  async timeAsync<T>(
    label: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      this.info(`Performance: ${label}`, { ...context, duration });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`Performance error: ${label}`, { ...context, duration }, error as Error);
      throw error;
    }
  }

  // User action logging
  userAction(action: string, details?: Record<string, unknown>) {
    this.info(`User Action: ${action}`, {
      ...details,
      userAgent: this.isBrowser ? navigator.userAgent : 'server',
      url: this.isBrowser ? window.location.href : 'server',
    });
  }

  // API call logging
  apiCall(method: string, url: string, status: number, duration: number, error?: Error) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';

    this[level](
      `API ${method} ${url}`,
      {
        status,
        duration,
        success: status < 400,
      },
      error
    );
  }

  // Get recent logs
  getRecentLogs(count = 50): LogEntry[] {
    return this.buffer.slice(-count);
  }

  // Clear logs
  clearLogs() {
    this.buffer = [];
  }

  // Setup performance monitoring
  private setupPerformanceMonitoring() {
    if (!this.isBrowser) return;

    // Monitor page load performance
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming;
          if (perfData) {
            this.info('Page Load Performance', {
              loadTime: perfData.loadEventEnd - perfData.loadEventStart,
              domContentLoaded:
                perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
              firstPaint: perfData.domInteractive - perfData.fetchStart,
            });
          }
        }, 0);
      });
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            // Long task threshold
            this.warn('Long Task Detected', {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long tasks not supported
      }
    }
  }

  // Memory usage monitoring
  monitorMemory() {
    if (!this.isBrowser || !('memory' in performance)) return;

    const memory = (performance as PerformanceWithMemory).memory;
    if (memory) {
      const usageMB = Math.round(memory.usedJSHeapSize / 1048576);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);

      if (usageMB > limitMB * 0.8) {
        // 80% threshold
        this.warn('High Memory Usage', {
          usedMB: usageMB,
          limitMB: limitMB,
          percentage: Math.round((usageMB / limitMB) * 100),
        });
      }
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience functions
export const log = {
  debug: (message: string, context?: Record<string, unknown>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, unknown>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, unknown>, error?: Error) =>
    logger.warn(message, context, error),
  error: (message: string, context?: Record<string, unknown>, error?: Error) =>
    logger.error(message, context, error),
  time: <T>(label: string, fn: () => T, context?: Record<string, unknown>) =>
    logger.time(label, fn, context),
  timeAsync: <T>(label: string, fn: () => Promise<T>, context?: Record<string, unknown>) =>
    logger.timeAsync(label, fn, context),
  userAction: (action: string, details?: Record<string, unknown>) =>
    logger.userAction(action, details),
  apiCall: (method: string, url: string, status: number, duration: number, error?: Error) =>
    logger.apiCall(method, url, status, duration, error),
};

// React component performance logging HOC
export function withPerformanceLogging<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function WithPerformanceLogging(props: P) {
    return logger.time(
      `Render ${componentName}`,
      () => React.createElement(WrappedComponent, props),
      { props: Object.keys(props) }
    );
  };
}

// Hook for performance monitoring
export function usePerformanceLogger() {
  const lastMark = React.useRef<number | null>(null);

  const logRender = React.useCallback((componentName: string) => {
    const now = performance.now();
    const duration = lastMark.current ? now - lastMark.current : 0;
    logger.info(`Component Render: ${componentName}`, { duration });
    lastMark.current = now;
  }, []);

  return { logRender };
}
