import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-brand-surface border border-brand-error/20 rounded-2xl shadow-sm text-center">
      <AlertTriangle className="text-brand-error mb-4" size={48} />
      <h3 className="text-lg font-black text-brand-text-main mb-2">عذراً، حدث خطأ</h3>
      <p className="text-sm text-brand-text-muted mb-6 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary/90 transition-all"
        >
          حاول مرة أخرى
        </button>
      )}
    </div>
  );
};
