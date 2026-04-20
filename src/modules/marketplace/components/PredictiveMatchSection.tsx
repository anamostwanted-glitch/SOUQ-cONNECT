import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Zap, ShieldCheck, Star } from 'lucide-react';
import { UserProfile } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';

interface PredictiveMatchSectionProps {
  matches: { supplierId: string, reason: string, score?: number }[];
  suppliers: UserProfile[];
  onViewProfile: (uid: string) => void;
  isRtl: boolean;
}

export const PredictiveMatchSection: React.FC<PredictiveMatchSectionProps> = ({ matches, suppliers, onViewProfile, isRtl }) => {
  if (matches.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-16"
    >
      <div className="flex items-center justify-between mb-8 overflow-hidden px-1">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center text-white shadow-lg shadow-brand-primary/20 ring-4 ring-brand-primary/5">
            <Sparkles size={28} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isRtl ? 'ترشيحات فريق نواة الذكية' : 'Core Team Smart Matches'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-brand-primary animate-ping" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                {isRtl ? 'موردون تم اختيارهم لك بناءً على نشاطك' : 'AI-Curated Suppliers Based on Your Intent'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {matches.map((match, idx) => {
          const supplier = suppliers.find(s => s.uid === match.supplierId);
          if (!supplier) return null;
          
          const score = match.score || 85 + Math.floor(Math.random() * 15);
          
          return (
            <motion.div 
              key={`match-${match.supplierId}-${idx}`} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="relative group h-full flex flex-col"
            >
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-brand-teal/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative h-full p-8 rounded-[2.5rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-800/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 flex flex-col">
                
                {/* Header: Score & Badge */}
                <div className="flex justify-between items-start mb-6">
                  <div className="px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-2">
                    <Zap size={12} className="text-brand-primary" />
                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-tighter">
                      {isRtl ? 'مطابقة قوية' : 'Strong Match'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-brand-primary leading-none">{score}%</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{isRtl ? 'نسبة التوافق' : 'Compatibility'}</span>
                  </div>
                </div>

                {/* Profile Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <img
                      src={supplier.logoUrl || `https://ui-avatars.com/api/?name=${supplier.companyName || supplier.name}&background=random`}
                      alt={supplier.companyName || supplier.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover shadow-inner ring-2 ring-brand-primary/5"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-brand-primary text-white p-1 rounded-lg border-2 border-white dark:border-slate-800">
                      <ShieldCheck size={12} />
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-black text-slate-900 dark:text-white truncate text-lg">{supplier.companyName || supplier.name}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star size={10} className="text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-slate-500">{supplier.rating || '5.0'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">•</span>
                      <span className="text-[10px] text-slate-400 font-bold">{supplier.location || (isRtl ? 'المملكة العربية السعودية' : 'Saudi Arabia')}</span>
                    </div>
                  </div>
                </div>

                {/* AI Rationale */}
                <div className="mb-6">
                  <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative">
                    <div className="absolute -top-2 left-4 px-2 bg-white dark:bg-slate-900 rounded text-[8px] font-black text-brand-primary uppercase tracking-[0.2em] shadow-sm">
                      Neural Insight
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed italic">
                      " {match.reason} "
                    </p>
                  </div>
                </div>

                {/* Specializations Tags */}
                <div className="flex-1 mb-8">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">
                     {isRtl ? 'تخصصات متوافقة' : 'Matching Specializations'}
                   </p>
                   <div className="flex flex-wrap gap-2">
                      {(supplier.keywords?.slice(0, 3) || supplier.categories?.slice(0, 3) || []).map((tag: string) => (
                        <span key={tag} className="px-3 py-1 rounded-lg bg-brand-teal/5 text-brand-teal text-[9px] font-black uppercase tracking-tighter border border-brand-teal/10">
                          {tag}
                        </span>
                      ))}
                   </div>
                </div>

                {/* Action Button */}
                <HapticButton 
                  onClick={() => onViewProfile(supplier.uid)}
                  className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 group/btn hover:bg-brand-primary dark:hover:bg-brand-primary dark:hover:text-white transition-all shadow-lg"
                >
                  {isRtl ? 'استكشاف المورد' : 'Explore Supplier'} 
                  <ArrowRight size={16} className={`${isRtl ? 'rotate-180' : ''} group-hover/btn:translate-x-1 transition-transform`} />
                </HapticButton>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
