import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRtl: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRtl: document.documentElement.dir === 'rtl' || localStorage.getItem('i18nextLng') === 'ar'
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRtl: document.documentElement.dir === 'rtl' || localStorage.getItem('i18nextLng') === 'ar' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const { isRtl } = this.state;
      let errorMessage = isRtl ? "حدث خطأ غير متوقع." : "Something went wrong.";
      let details = null;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && (parsed.error.includes('permission') || parsed.error.includes('insufficient'))) {
            errorMessage = isRtl 
              ? "عذراً، ليس لديك صلاحية للقيام بهذا الإجراء." 
              : "You don't have permission to perform this action.";
            details = (
              <div className="mt-4 p-4 bg-red-50 rounded-2xl text-xs font-mono text-red-600 overflow-auto max-h-40 border border-red-100 text-left" dir="ltr">
                <p className="mb-1"><strong>Operation:</strong> {parsed.operationType}</p>
                <p className="mb-1"><strong>Path:</strong> {parsed.path}</p>
                <p><strong>Error:</strong> {parsed.error}</p>
              </div>
            );
          } else {
            errorMessage = parsed.error || errorMessage;
          }
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 text-center border border-gray-100">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
              <AlertCircle size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
              {isRtl ? 'عذراً! حدث خطأ' : 'Oops! An error occurred'}
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed text-sm">
              {errorMessage}
            </p>
            {details}
            
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-6 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 group"
              >
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                {isRtl ? 'تحديث الصفحة' : 'Reload Page'}
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Home size={18} />
                {isRtl ? 'العودة للرئيسية' : 'Back to Home'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
