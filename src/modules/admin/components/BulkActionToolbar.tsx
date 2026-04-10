import React from 'react';
import { Trash2, ShieldCheck, UserCheck, X } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface BulkActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkVerify: () => void;
  isRtl: boolean;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkVerify,
  isRtl
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand-surface border border-brand-border p-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50">
      <div className="flex items-center gap-2 text-sm font-black text-brand-text-main">
        <span className="bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-lg">{selectedCount}</span>
        {isRtl ? 'محدد' : 'selected'}
      </div>
      <div className="h-6 w-px bg-brand-border" />
      <HapticButton onClick={onBulkVerify} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-xs">
        <ShieldCheck size={16} />
        {isRtl ? 'توثيق' : 'Verify'}
      </HapticButton>
      <HapticButton onClick={onBulkDelete} className="flex items-center gap-2 text-brand-error hover:text-red-700 font-bold text-xs">
        <Trash2 size={16} />
        {isRtl ? 'حذف' : 'Delete'}
      </HapticButton>
      <HapticButton onClick={onClearSelection} className="p-2 hover:bg-brand-background rounded-lg text-brand-text-muted">
        <X size={16} />
      </HapticButton>
    </div>
  );
};
