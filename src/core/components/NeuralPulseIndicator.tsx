import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useImmuneSystem } from '../providers/ImmuneSystemProvider';
import { Zap, ShieldAlert, Activity } from 'lucide-react';

export const NeuralPulseIndicator: React.FC = () => {
  const { neuralPulse, securityStatus } = useImmuneSystem();

  const statusConfig = useMemo(() => {
    switch (securityStatus) {
      case 'alert':
        return {
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          label: 'Fluctuating',
          icon: <Activity className="w-3 h-3" />
        };
      case 'lockdown':
        return {
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          label: 'Defensive',
          icon: <ShieldAlert className="w-3 h-3" />
        };
      default:
        return {
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          label: 'Stable',
          icon: <Zap className="w-3 h-3" />
        };
    }
  }, [securityStatus]);

  return (
    <div className="hidden md:flex fixed top-4 right-20 z-[60] items-center gap-3 pointer-events-none">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md pointer-events-auto ${statusConfig.bg}`}>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 100 / neuralPulse, repeat: Infinity }}
          className={`${statusConfig.color}`}
        >
          {statusConfig.icon}
        </motion.div>
        
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
          Pulse: <span className={statusConfig.color}>{Math.round(neuralPulse)}%</span>
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              height: [4, Math.random() * 8 + 4, 4],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 1 + Math.random(), 
              repeat: Infinity,
              delay: i * 0.1
            }}
            className={`w-0.5 rounded-full ${statusConfig.color.replace('text', 'bg')}`}
          />
        ))}
      </div>
    </div>
  );
};
