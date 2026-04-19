import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { HapticButton } from './HapticButton';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-brand-surface rounded-[2rem] border border-brand-border/50 shadow-xl m-4">
          <div className="w-16 h-16 bg-brand-error/10 rounded-full flex items-center justify-center text-brand-error mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-brand-text-main mb-2">Something went wrong</h2>
          <p className="text-sm text-brand-text-muted mb-8 max-w-xs mx-auto">
            Our system encountered an unexpected issue. We've been notified and are working on it.
          </p>
          <HapticButton
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20"
          >
            <RefreshCcw size={16} />
            Reload Page
          </HapticButton>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 p-4 bg-black/5 rounded-xl text-[10px] font-mono text-brand-error text-left w-full overflow-auto max-h-40">
              {this.state.error.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
