import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { GeminiApiKey } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';

interface AlertDashboardProps {
  keys: GeminiApiKey[];
  isRtl: boolean;
  onRetry: (id: string, key: string) => void;
  isTesting: string | null;
}

export const AdminNeuralAlertDashboard: React.FC<AlertDashboardProps> = ({ keys, isRtl, onRetry, isTesting }) => {
  const errorKeys = keys.filter(k => k.status === 'error');

  if (errorKeys.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem]"
    >
      <h3 className="text-red-500 font-black text-lg mb-4 flex items-center gap-2">
        <AlertTriangle size={20} />
        {isRtl ? 'تنبيهات النظام' : 'System Alerts'}
      </h3>
      <div className="space-y-3">
        {errorKeys.map(key => (
          <div key={key.id} className="flex items-center justify-between bg-red-500/5 p-4 rounded-xl border border-red-500/10">
            <div>
              <div className="font-bold text-white">{key.label}</div>
              <div className="text-xs text-red-400">
                {isRtl ? 'المحرك لا يستجيب بشكل صحيح' : 'Engine is not responding correctly'}
              </div>
            </div>
            <HapticButton
              onClick={() => onRetry(key.id, key.key)}
              disabled={isTesting === key.id}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-all"
            >
              {isTesting === key.id ? <RefreshCw size={14} className="animate-spin" /> : (isRtl ? 'إعادة فحص' : 'Retry')}
            </HapticButton>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
