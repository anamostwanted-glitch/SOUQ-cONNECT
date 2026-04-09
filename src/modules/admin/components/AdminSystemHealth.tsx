import React from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldCheck, Zap, Database, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AdminSystemHealth: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const metrics = [
    { label: isRtl ? 'استجابة الخادم' : 'Server Response', value: '42ms', status: 'optimal', icon: Zap },
    { label: isRtl ? 'صحة قاعدة البيانات' : 'DB Health', value: '99.9%', status: 'optimal', icon: Database },
    { label: isRtl ? 'استهلاك الذكاء الاصطناعي' : 'AI Usage', value: '24%', status: 'normal', icon: Cpu },
    { label: isRtl ? 'أمان النظام' : 'System Security', value: 'Protected', status: 'optimal', icon: ShieldCheck },
  ];

  return (
    <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border p-6 shadow-sm">
      <h3 className="font-black text-brand-text-main mb-6 flex items-center gap-2">
        <Activity size={20} className="text-emerald-500" />
        {isRtl ? 'صحة النظام' : 'System Health'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-2xl bg-brand-background border border-brand-border/50 group hover:border-brand-primary/30 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <metric.icon size={16} className="text-brand-text-muted group-hover:text-brand-primary transition-colors" />
              <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{metric.label}</span>
            </div>
            <div className="text-lg font-black text-brand-text-main">{metric.value}</div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${metric.status === 'optimal' ? 'bg-emerald-500' : 'bg-brand-primary'} animate-pulse`} />
              <span className="text-[8px] font-bold text-brand-text-muted uppercase tracking-tighter">
                {metric.status === 'optimal' ? (isRtl ? 'مثالي' : 'Optimal') : (isRtl ? 'طبيعي' : 'Normal')}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
