/* eslint-disable react-refresh/only-export-components */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { logger } from '../lib/logger';
import { captureException } from '../lib/sentry';
import { clearStoredPayAuth } from '../pay/payApi';

/**
 * Enhanced Error Boundary with multiple recovery strategies
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  recoveryStrategy?: 'refresh' | 'home' | 'retry' | 'none';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
  retryKey: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
      retryKey: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isRetrying: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error', { error, errorInfo });

    this.setState({
      error,
      errorInfo,
    });

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);

    if (import.meta.env.PROD) captureException(error);
  }

  handleRetry = () => {
    this.setState((s) => ({
      isRetrying: true,
      hasError: false,
      error: null,
      errorInfo: null,
      retryKey: s.retryKey + 1,
    }));
    requestAnimationFrame(() => {
      this.setState({ isRetrying: false });
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo, isRetrying } = this.state;
    const { children, fallback, showDetails = false, recoveryStrategy = 'retry' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorDisplay
          error={error}
          errorInfo={errorInfo}
          isRetrying={isRetrying}
          showDetails={showDetails}
          recoveryStrategy={recoveryStrategy}
          onRetry={this.handleRetry}
          onRefresh={this.handleRefresh}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return <React.Fragment key={this.state.retryKey}>{children}</React.Fragment>;
  }
}

interface ErrorDisplayProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
  showDetails: boolean;
  recoveryStrategy: string;
  onRetry: () => void;
  onRefresh: () => void;
  onGoHome: () => void;
}

function ErrorDisplay({
  error,
  errorInfo,
  isRetrying,
  showDetails,
  recoveryStrategy,
  onRetry,
  onRefresh,
  onGoHome,
}: ErrorDisplayProps) {
  const getRecoveryButton = () => {
    switch (recoveryStrategy) {
      case 'refresh':
        return (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors"
            aria-label="Refresh the page"
          >
            <RefreshCw className="w-4 h-4" aria-hidden />
            Refresh page
          </button>
        );
      case 'home':
        return (
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors"
            aria-label="Go to homepage"
          >
            <Home className="w-4 h-4" aria-hidden />
            Go home
          </button>
        );
      case 'retry':
        return (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors"
            aria-label={isRetrying ? 'Retrying' : 'Try again'}
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden />
            {isRetrying ? 'Retrying…' : 'Try again'}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center text-slate-900 dark:text-slate-100 mb-2">
            Something went wrong
          </h2>

          {/* Message: actionable, not generic */}
          <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
            This page hit an error. Try again below, or go home and retry your action.
          </p>

          {/* Error details (in development) */}
          {showDetails && error && (
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Error Details
                </span>
              </div>
              <pre className="text-slate-600 dark:text-slate-400 overflow-x-auto">
                {error.toString()}
              </pre>
              {errorInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                    Component stack trace
                  </summary>
                  <pre className="mt-2 text-xs text-slate-500">{errorInfo.componentStack}</pre>
                </details>
              )}
            </div>
          )}

          {/* Recovery actions */}
          <div className="flex flex-col gap-3">
            {getRecoveryButton()}

            {recoveryStrategy !== 'home' && (
              <button
                onClick={onGoHome}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-medium transition-colors"
              >
                Go to Homepage
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Error ID: {error?.name || 'Unknown'}-{Date.now()}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Route-specific error boundary
 */
interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName: string;
}

export function RouteErrorBoundary({ children, routeName }: RouteErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    logger.error(`Error in route ${routeName}`, { error, errorInfo });
    // Log to analytics/monitoring
  };

  return (
    <ErrorBoundary
      onError={handleError}
      showDetails={import.meta.env.DEV}
      recoveryStrategy="refresh"
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Component-level error boundary
 */
interface ComponentErrorBoundaryProps {
  children: ReactNode;
  componentName: string;
  fallbackUI?: ReactNode;
}

export function ComponentErrorBoundary({
  children,
  componentName,
  fallbackUI,
}: ComponentErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    logger.error(`Error in component ${componentName}`, { error, errorInfo });
  };

  return (
    <ErrorBoundary onError={handleError} fallback={fallbackUI} recoveryStrategy="none">
      {children}
    </ErrorBoundary>
  );
}

/**
 * Page-specific error boundaries for heavy views (messages, pay).
 * Provide targeted recovery when these complex components fail.
 */
const PageErrorFallback = ({
  title,
  message,
  onRefresh,
  showReset,
}: {
  title: string;
  message: string;
  onRefresh: () => void;
  showReset?: boolean;
}) => (
  <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
    <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <button
        onClick={onRefresh}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label="Refresh page"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
      {showReset && (
        <button
          onClick={() => {
            clearStoredPayAuth();
            window.location.href = '/pay/login';
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Reset pay session
        </button>
      )}
    </div>
  </div>
);

export function MessagesErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      showDetails={import.meta.env.DEV}
      recoveryStrategy="refresh"
      fallback={
        <PageErrorFallback
          title="Messages couldn't load"
          message="Something went wrong loading your conversations. Try refreshing the page."
          onRefresh={() => window.location.reload()}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function PayErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      showDetails={import.meta.env.DEV}
      onError={(err) => {
        console.error('Pay portal error:', err);
        clearStoredPayAuth();
      }}
      recoveryStrategy="refresh"
      fallback={
        <PageErrorFallback
          title="Payments couldn't load"
          message="Something went wrong with the payments console. Try refreshing the page."
          onRefresh={() => window.location.reload()}
          showReset
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Global error handler
 */
export function setupGlobalErrorHandling() {
  window.addEventListener('error', (event) => {
    logger.error('Global error caught', { error: event.error });
    captureException(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', { reason: event.reason });
    captureException(event.reason);
    event.preventDefault();
  });
}
