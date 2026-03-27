import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      let details = null;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && (parsed.error.includes('permission') || parsed.error.includes('insufficient'))) {
            errorMessage = "You don't have permission to perform this action.";
            details = (
              <div className="mt-4 p-4 bg-brand-error/10 rounded-2xl text-xs font-mono text-brand-error overflow-auto max-h-40 border border-brand-error/20">
                <p className="mb-1"><strong>Operation:</strong> {parsed.operationType}</p>
                <p className="mb-1"><strong>Path:</strong> {parsed.path}</p>
                <p><strong>Error:</strong> {parsed.error}</p>
              </div>
            );
          }
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-background p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 text-center border border-brand-border-light">
            <div className="w-20 h-20 bg-brand-error/10 rounded-3xl flex items-center justify-center mx-auto mb-8 transform rotate-3">
              <AlertCircle size={40} className="text-brand-error" />
            </div>
            <h2 className="text-3xl font-bold text-brand-text-main mb-3 tracking-tight">Oops!</h2>
            <p className="text-brand-text-muted mb-8 leading-relaxed">{errorMessage}</p>
            {details}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 px-8 bg-brand-text-main hover:bg-black text-white font-bold rounded-2xl transition-all shadow-xl shadow-brand-border flex items-center justify-center gap-2 group"
            >
              <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
