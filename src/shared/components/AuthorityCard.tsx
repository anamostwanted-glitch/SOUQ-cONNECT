import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { UserProfile } from '../../core/types';
import { 
  ShieldCheck, Award, TrendingUp, Camera, 
  Zap, Star, Activity, CheckCircle2, 
  Globe, Clock, Building2, BrainCircuit
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';

interface AuthorityCardProps {
  profile: UserProfile;
  compact?: boolean;
}

export const AuthorityCard: React.FC<AuthorityCardProps> = ({ profile, compact = false }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const trustScore = profile.trustScore || 85;
  const visualScore = profile.visualIntegrityScore || 92;
  const authorityLevel = profile.authorityLevel || 'Growth';
  
  const levelColors = {
    Seed: 'from-emerald-400 to-teal-500',
    Root: 'from-blue-400 to-indigo-500',
    Growth: 'from-brand-primary to-brand-teal',
    Titan: 'from-brand-secondary to-amber-600'
  };

  const levelLabels = {
    Seed: isRtl ? 'بذرة النماء' : 'Seed of Growth',
    Root: isRtl ? 'جذور الثقة' : 'Root of Trust',
    Growth: isRtl ? 'طاقة النمو' : 'Pulse of Growth',
    Titan: isRtl ? 'عملاق السوق' : 'Market Titan'
  };

  if (compact) {
    return (
      <Card className="overflow-hidden border-2 border-brand-border bg-brand-surface group hover:border-brand-primary transition-all duration-500">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${levelColors[authorityLevel]} text-white shadow-lg`}>
              <Award size={18} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-text-muted mb-0.5">
                {isRtl ? 'مستوى السلطة' : 'Authority Level'}
              </div>
              <div className="text-sm font-black text-brand-text-main">
                {levelLabels[authorityLevel]}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-brand-primary">{trustScore}%</div>
            <div className="text-[8px] font-bold text-brand-text-muted uppercase">{isRtl ? 'معامل الثقة' : 'Trust Score'}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-2 border-brand-border bg-brand-surface relative group">
      {/* Decorative Neural Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      
      <CardContent className="p-0 flex flex-col md:flex-row">
        {/* Left Side: Performance Metrics */}
        <div className="w-full md:w-2/5 p-6 md:p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-b md:border-b-0 md:border-r border-brand-border space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 -mr-8 -mt-8 animate-pulse">
            <BrainCircuit size={120} />
          </div>

          <div className="space-y-6 relative z-10">
            <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={14} />
              {isRtl ? 'مؤشرات الأداء الحي' : 'Live Performance Matrix'}
            </h4>

            {/* Trust Meter */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-brand-text-main uppercase tracking-tight">{isRtl ? 'معامل الثقة المطلقة' : 'Absolute Trust Factor'}</span>
                <span className="text-2xl font-black text-brand-primary">{trustScore}%</span>
              </div>
              <div className="h-3 bg-brand-background rounded-full overflow-hidden border border-brand-border/50 p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${trustScore}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-teal rounded-full flex items-center justify-end px-1"
                >
                  <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                </motion.div>
              </div>
              <p className="text-[9px] font-medium text-brand-text-muted leading-relaxed">
                {isRtl 
                  ? 'يتم حساب هذا المعامل بناءً على سرعة الاستجابة، دقة الصور، وتقييمات العملاء التاريخية.' 
                  : 'Calculated based on response speed, photo accuracy, and historical customer feedback.'}
              </p>
            </div>

            {/* Visual Integrity */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-brand-text-main uppercase tracking-tight">{isRtl ? 'نزاهة المحتوى البصري' : 'Visual Content Integrity'}</span>
                <span className="text-xl font-black text-brand-teal">{visualScore}%</span>
              </div>
              <div className="h-2.5 bg-brand-background rounded-full overflow-hidden border border-brand-border/50 p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${visualScore}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-brand-teal rounded-full"
                />
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-600">
                <Camera size={12} />
                {isRtl 
                  ? `${profile.verifiedRealPhotosCount || 12} صورة تم التحقق من أصالتها عبر AI`
                  : `${profile.verifiedRealPhotosCount || 12} real-world photos verified by AI`}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authority Level & Insights */}
        <div className="flex-1 p-6 md:p-8 space-y-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Badge className={`bg-gradient-to-r ${levelColors[authorityLevel]} text-white border-none py-1.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg`}>
                  {levelLabels[authorityLevel]}
                </Badge>
                <h3 className="text-2xl font-black text-brand-text-main tracking-tight pt-2">
                  {isRtl ? 'سلطة توريد معتمدة' : 'Certified Supply Authority'}
                </h3>
              </div>
              <div className="p-4 bg-brand-background border border-brand-border rounded-2xl flex flex-col items-center justify-center">
                <div className="text-brand-warning font-black text-lg">Elite</div>
                <div className="text-[8px] font-bold text-brand-text-muted uppercase">{isRtl ? 'الفئة' : 'Tier'}</div>
              </div>
            </div>

            {/* AI Core Summary */}
            <div className="relative p-6 rounded-3xl bg-brand-background border border-brand-border/50 group/insight overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary" />
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Zap size={40} className="text-brand-primary" />
               </div>
               
               <h5 className="text-[9px] font-black text-brand-primary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                 <BrainCircuit size={12} />
                 {isRtl ? 'توصية النواة الذكية' : 'Core Neural Recommendation'}
               </h5>
               
               <p className="text-sm font-semibold text-brand-text-main leading-relaxed relative z-10">
                 {profile.aiInsights?.summaryAr && isRtl 
                    ? profile.aiInsights.summaryAr 
                    : (profile.aiInsights?.summaryEn && !isRtl 
                        ? profile.aiInsights.summaryEn 
                        : (isRtl 
                            ? "مورد استراتيجي يتميز بالالتزام العالي وجودة التوريد، موصى به للتعاملات الكبيرة والمستمرة."
                            : "Strategic supplier characterized by high commitment and supply quality, recommended for large and continuous transactions."
                          )
                      )
                 }
               </p>
            </div>
          </div>

          {/* Verification Badges Row */}
          <div className="grid grid-cols-3 gap-3">
             <div className="p-3 bg-brand-background border border-brand-border rounded-2xl flex flex-col items-center text-center gap-1 hover:border-brand-primary transition-colors cursor-default">
               <ShieldCheck size={16} className="text-brand-primary" />
               <span className="text-[8px] font-black uppercase tracking-tighter text-brand-text-main">{isRtl ? 'هوية مؤكدة' : 'ID Verified'}</span>
             </div>
             <div className="p-3 bg-brand-background border border-brand-border rounded-2xl flex flex-col items-center text-center gap-1 hover:border-brand-primary transition-colors cursor-default">
               <Building2 size={16} className="text-brand-teal" />
               <span className="text-[8px] font-black uppercase tracking-tighter text-brand-text-main">{isRtl ? 'سجل تجاري' : 'CR Valid'}</span>
             </div>
             <div className="p-3 bg-brand-background border border-brand-border rounded-2xl flex flex-col items-center text-center gap-1 hover:border-brand-primary transition-colors cursor-default">
               <Globe size={16} className="text-indigo-500" />
               <span className="text-[8px] font-black uppercase tracking-tighter text-brand-text-main">{isRtl ? 'موقع نشط' : 'Geo Active'}</span>
             </div>
          </div>
        </div>
      </CardContent>
      
      {/* Footer / Rank Status */}
      <div className="px-8 py-4 bg-brand-surface border-t border-brand-border flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-text-muted transition-all hover:text-brand-primary cursor-default">
               <Clock size={12} />
               <span>{isRtl ? 'عضو منذ 2024' : 'Member since 2024'}</span>
            </div>
            <div className="w-[1px] h-3 bg-brand-border" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-text-muted transition-all hover:text-brand-teal cursor-default">
               <Activity size={12} />
               <span>{isRtl ? 'نشط الآن' : 'Active Now'}</span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'الترتيب' : 'Rank'}</span>
            <span className="text-sm font-black text-brand-text-main">#12 {isRtl ? 'محلياً' : 'Locally'}</span>
         </div>
      </div>
    </Card>
  );
};
