import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface ProfileCompletionMeterProps {
  percentage: number;
  isRtl: boolean;
}

export const ProfileCompletionMeter: React.FC<ProfileCompletionMeterProps> = ({ percentage, isRtl }) => {
  return (
    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-white/20 dark:border-slate-700/50 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 text-brand-primary">
          <Sparkles size={16} />
          <span className="text-xs font-black uppercase tracking-widest">
            {isRtl ? 'اكتمال الملف' : 'Profile Completion'}
          </span>
        </div>
        <span className="text-sm font-black text-brand-text-main">{percentage}%</span>
      </div>
      <div className="h-2 bg-brand-background rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${percentage === 100 ? 'bg-emerald-500' : 'bg-brand-primary'}`}
        />
      </div>
      {percentage < 100 && (
        <p className="text-[10px] text-brand-text-muted mt-2 font-bold">
          {isRtl 
            ? 'أكمل ملفك الشخصي لزيادة فرصك في الحصول على طلبات.' 
            : 'Complete your profile to increase your chances of getting requests.'}
        </p>
      )}
    </div>
  );
};
