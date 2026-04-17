import React from 'react';
import { motion } from 'motion/react';
import { Building2, Package, Sparkles, Users, Zap, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HomeStatsProps {
  stats: { suppliers: number; requests: number; satisfaction: number };
}

export const HomeStats: React.FC<HomeStatsProps> = ({ stats }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const statItems = [
    { 
      id: 'suppliers', 
      icon: Building2, 
      value: `${stats.suppliers}+`, 
      label: isRtl ? 'مورد معتمد' : 'Verified Suppliers',
      color: 'bg-brand-primary/10 text-brand-primary',
      delay: 0.1
    },
    { 
      id: 'requests', 
      icon: Package, 
      value: `${stats.requests}+`, 
      label: isRtl ? 'طلب مكتمل' : 'Fulfilled Requests',
      color: 'bg-brand-teal/10 text-brand-teal',
      delay: 0.2
    },
    { 
      id: 'satisfaction', 
      icon: CheckCircle2, 
      value: `${stats.satisfaction}%`, 
      label: isRtl ? 'نسبة الرضا' : 'Satisfaction Rate',
      color: 'bg-amber-500/10 text-amber-500',
      delay: 0.3
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-6 mb-12 md:mb-16">
      {statItems.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: item.delay }}
          className="bg-brand-surface/50 backdrop-blur-xl p-4 md:p-6 rounded-[2rem] text-center border border-brand-border/40 hover:border-brand-primary/30 transition-all group hover:shadow-xl hover:shadow-black/5"
        >
          <div className={`w-10 h-10 md:w-12 md:h-12 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
            <item.icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="text-xl md:text-3xl font-black text-brand-text-main mb-1 tracking-tight">
            {item.value}
          </div>
          <div className="text-[9px] md:text-xs text-brand-text-muted font-black uppercase tracking-widest opacity-70">
            {item.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
