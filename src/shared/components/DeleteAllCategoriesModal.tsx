import React from 'react';
import { motion } from 'motion/react';

interface DeleteAllCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isRtl: boolean;
  t: (key: string) => string;
}

export const DeleteAllCategoriesModal: React.FC<DeleteAllCategoriesModalProps> = ({ isOpen, onClose, onConfirm, isRtl, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-brand-surface w-full max-w-sm rounded-[2rem] border border-brand-border shadow-2xl p-8 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-brand-primary/20 scrollbar-track-brand-surface"
      >
        <h3 className="text-lg font-black text-brand-text-main mb-4">
          {isRtl ? 'هل أنت متأكد؟' : 'Are you sure?'}
        </h3>
        <p className="text-sm text-brand-text-muted mb-8">
          {isRtl ? 'سيتم حذف جميع الفئات نهائياً. لا يمكن التراجع عن هذا الإجراء.' : 'All categories will be permanently deleted. This action cannot be undone.'}
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-brand-text-muted hover:bg-brand-surface-hover rounded-xl transition-all"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-brand-error text-white rounded-xl hover:bg-brand-error-hover transition-all font-bold text-sm shadow-lg shadow-brand-error/20"
          >
            {isRtl ? 'حذف الكل' : 'Delete All'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
