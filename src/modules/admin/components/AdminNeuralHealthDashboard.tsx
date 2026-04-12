import React from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, AlertCircle, Clock, Cpu } from 'lucide-react';
import { GeminiApiKey } from '../../../core/types';

interface HealthDashboardProps {
  keys: GeminiApiKey[];
  isRtl: boolean;
}

export const AdminNeuralHealthDashboard: React.FC<HealthDashboardProps> = ({ keys, isRtl }) => {
  const activeKeys = keys.filter(k => k.status === 'active');
  const errorKeys = keys.filter(k => k.status === 'error');
  const totalUsage = keys.reduce((acc, k) => acc + (k.usageCount || 0), 0);
  const avgLatency = activeKeys.length > 0 
    ? Math.floor(activeKeys.reduce((acc, k) => acc + (k.latency || 0), 0) / activeKeys.length)
    : 0;

  const stats = [
    { label: isRtl ? 'المحركات النشطة' : 'Active Engines', value: activeKeys.length, icon: Zap, color: 'text-emerald-500' },
    { label: isRtl ? 'حالات الخطأ' : 'Error States', value: errorKeys.length, icon: AlertCircle, color: 'text-red-500' },
    { label: isRtl ? 'إجمالي الاستخدام' : 'Total Usage', value: totalUsage, icon: Activity, color: 'text-brand-primary' },
    { label: isRtl ? 'متوسط الاستجابة' : 'Avg Latency', value: `${avgLatency}ms`, icon: Clock, color: 'text-amber-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white/5 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 flex items-center gap-4"
        >
          <div className={`w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center ${stat.color}`}>
            <stat.icon size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
            <div className="text-xl font-black text-white">{stat.value}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
