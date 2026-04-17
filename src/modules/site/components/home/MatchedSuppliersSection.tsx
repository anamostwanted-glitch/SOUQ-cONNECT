import React from 'react';
import { motion } from 'motion/react';
import { Sparkles as SparklesIcon, Building2, ArrowRight, Zap, Target, Star } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { UserProfile } from '../../../../core/types';
import { getUserImageUrl } from '../../../../core/utils/imageUtils';

interface MatchedSuppliersSectionProps {
  matchedSuppliers: UserProfile[];
  matchMetadata?: Record<string, { 
    score: number; 
    highlight: string; 
    strength: 'high' | 'medium' | 'perfect';
    vectors?: { capability: number; capacity: number; consistency: number; logistics: number };
    fit?: string;
  }>;
  isRtl: boolean;
  onOpenChat: (uid: string) => void;
  onViewProfile: (uid: string) => void;
}

export const MatchedSuppliersSection: React.FC<MatchedSuppliersSectionProps> = ({ 
  matchedSuppliers, 
  matchMetadata = {},
  isRtl, 
  onOpenChat, 
  onViewProfile 
}) => {
  if (matchedSuppliers.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary relative">
            <SparklesIcon size={24} className="animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-teal rounded-full border-2 border-brand-surface animate-ping" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-brand-text-main tracking-tight">
              {isRtl ? 'الموردون المقترحون لك' : 'Matched For You'}
            </h3>
            <p className="text-[10px] text-brand-text-muted font-black uppercase tracking-[0.2em] mt-0.5">
              {isRtl ? 'بناءً على تحليلات النبض العصبي لطلبك' : 'Powered by Neural Pulse Analysis'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {matchedSuppliers.map((supplier) => {
          const meta = matchMetadata[supplier.uid];
          const hasScore = meta && meta.score !== undefined;
          
          return (
            <motion.div
              key={supplier.uid}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-brand-border/40 rounded-[2.5rem] p-6 shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-brand-primary/10 transition-all duration-500 flex flex-col relative overflow-hidden"
            >
              {/* Subtle Neural Mesh Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-[60px] group-hover:bg-brand-primary/10 transition-colors" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-teal/5 rounded-full blur-[40px]" />

              {/* AI Score Badge - Floating */}
              {hasScore && (
                <div className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} z-30`}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border backdrop-blur-md shadow-lg ${
                    meta.strength === 'perfect' 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' 
                      : 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                  }`}>
                    {meta.strength === 'perfect' ? (
                      <Star size={12} fill="currentColor" className="animate-pulse" />
                    ) : (
                      <Zap size={12} fill="currentColor" className="animate-pulse" />
                    )}
                    <span className="text-[10px] font-black tracking-widest">{meta.score}%</span>
                  </div>
                </div>
              )}

              <div className="relative z-10 flex flex-col items-center text-center flex-1 pt-2">
                {/* Avatar Squircle with Neural Pulse */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="w-24 h-24 rounded-[2rem] bg-brand-surface border-2 border-white dark:border-slate-800 shadow-2xl relative z-10 overflow-hidden group-hover:scale-105 transition-transform duration-500 ring-4 ring-brand-primary/5">
                    <img 
                      src={getUserImageUrl(supplier)} 
                      alt={supplier.companyName || supplier.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                
                <h4 className="text-xl font-black text-brand-text-main mb-1.5 leading-tight group-hover:text-brand-primary transition-colors">
                  {supplier.companyName || supplier.name}
                </h4>
                
                {/* Visual Neural DNA - Vector Visualization */}
                {meta?.vectors && (
                  <div className="w-full bg-brand-background/40 backdrop-blur-sm border border-brand-border/30 rounded-2xl p-4 my-5 hover:bg-brand-background/60 transition-colors">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-1 h-1 bg-brand-primary rounded-full" />
                      <span className="text-[8px] font-black text-brand-text-muted uppercase tracking-[0.2em]">{isRtl ? 'بصمة التطابق الذكي' : 'Neural Match DNA'}</span>
                      <div className="w-1 h-1 bg-brand-primary rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        { label: isRtl ? 'الكفاءة' : 'Expertise', value: meta.vectors.capability, color: 'from-brand-primary to-brand-primary-dark' },
                        { label: isRtl ? 'الثقة' : 'Trust', value: meta.vectors.consistency, color: 'from-emerald-400 to-emerald-600' },
                        { label: isRtl ? 'القدرة' : 'Capacity', value: meta.vectors.capacity, color: 'from-brand-teal to-brand-teal-dark' },
                        { label: isRtl ? 'اللوجستية' : 'Velocity', value: meta.vectors.logistics, color: 'from-amber-400 to-amber-600' },
                      ].map((vector, idx) => (
                        <div key={vector.label} className="space-y-1">
                          <div className="flex justify-between items-center px-0.5">
                            <span className="text-[7px] font-black text-brand-text-muted uppercase tracking-wider">{vector.label}</span>
                            <span className="text-[8px] font-black text-brand-text-main">{vector.value}%</span>
                          </div>
                          <div className="h-1 w-full bg-brand-border/40 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              whileInView={{ width: `${vector.value}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 }}
                              className={`h-full bg-gradient-to-r ${vector.color}`} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasoning Pill */}
                {meta?.fit && (
                  <div className="mb-6 px-4 py-2 bg-brand-primary/5 border border-brand-primary/10 rounded-xl relative group-hover:bg-brand-primary/10 transition-colors">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 bg-white dark:bg-slate-900 text-[6px] font-black uppercase tracking-widest text-brand-primary">
                      {isRtl ? 'لماذا يتطابق؟' : 'AI Reasoning'}
                    </div>
                    <p className="text-[10px] font-bold text-brand-primary leading-relaxed">
                      "{meta.fit}"
                    </p>
                  </div>
                )}

                <p className="text-xs text-brand-text-muted line-clamp-2 mb-8 italic leading-relaxed px-4 opacity-80">
                  {supplier.bio || (isRtl ? 'مورد معتمد في منصتنا' : 'Verified supplier on our platform')}
                </p>

                <div className="flex items-center gap-3 w-full mt-auto">
                  <HapticButton
                    onClick={() => onOpenChat(supplier.uid)}
                    className="flex-[2] bg-brand-primary text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <SparklesIcon size={14} className="animate-pulse" />
                    {isRtl ? 'تواصل الآن' : 'Connect Now'}
                  </HapticButton>
                  <HapticButton
                    onClick={() => onViewProfile(supplier.uid)}
                    className="flex-1 py-4 bg-brand-surface text-brand-text-main rounded-2xl border border-brand-border hover:bg-white dark:hover:bg-slate-800 transition-all hover:scale-[1.02]"
                  >
                    <ArrowRight size={18} className={isRtl ? 'rotate-180' : ''} />
                  </HapticButton>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
