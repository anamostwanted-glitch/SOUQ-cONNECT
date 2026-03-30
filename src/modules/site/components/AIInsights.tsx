import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { UserRole } from '../../../core/types';
import { 
  Activity, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  BarChart3, 
  Zap,
  Sparkles,
  ArrowUpRight,
  Target,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface AIInsightsProps {
  role: UserRole;
  stats?: {
    matchRate?: number;
    avgResponseTime?: string;
    marketActivity?: number;
    requestQuality?: number;
  };
}

export const AIInsights: React.FC<AIInsightsProps> = ({ role, stats }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const defaultStats = {
    matchRate: 94,
    avgResponseTime: '12m',
    marketActivity: 82,
    requestQuality: 88
  };

  const currentStats = { ...defaultStats, ...stats };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-black text-brand-text-main flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-brand-teal/10 text-brand-teal rounded-xl">
            <Cpu size={20} />
          </div>
          {isRtl ? 'تحليلات الذكاء الاصطناعي' : 'AI Smart Insights'}
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-teal/5 border border-brand-teal/10 rounded-full">
          <div className="w-2 h-2 bg-brand-teal rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-brand-teal uppercase tracking-widest">
            {isRtl ? 'مباشر' : 'Live Analysis'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Match Rate / Success Rate */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="p-5 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-[2rem] border border-brand-border/50 shadow-sm group cursor-default"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-brand-teal/10 text-brand-teal rounded-xl group-hover:scale-110 transition-transform">
              <Target size={18} />
            </div>
            <TrendingUp size={14} className="text-brand-teal" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
              {role === 'supplier' ? (isRtl ? 'معدل القبول' : 'Acceptance Rate') : (isRtl ? 'دقة المطابقة' : 'Match Accuracy')}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-brand-text-main">{currentStats.matchRate}%</span>
              <span className="text-[10px] font-bold text-brand-teal">+2.4%</span>
            </div>
          </div>
        </motion.div>

        {/* Avg Response Time */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="p-5 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-[2rem] border border-brand-border/50 shadow-sm group cursor-default"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-brand-purple/10 text-brand-purple rounded-xl group-hover:scale-110 transition-transform">
              <Clock size={18} />
            </div>
            <Activity size={14} className="text-brand-purple" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
              {isRtl ? 'سرعة الاستجابة' : 'Response Speed'}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-brand-text-main">{currentStats.avgResponseTime}</span>
              <span className="text-[10px] font-bold text-brand-purple">-{isRtl ? '٣د' : '3m'}</span>
            </div>
          </div>
        </motion.div>

        {/* Market Activity */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="p-5 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-[2rem] border border-brand-border/50 shadow-sm group cursor-default"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-brand-accent/10 text-brand-accent rounded-xl group-hover:scale-110 transition-transform">
              <BarChart3 size={18} />
            </div>
            <Zap size={14} className="text-brand-accent" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
              {isRtl ? 'نشاط السوق' : 'Market Activity'}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-brand-text-main">{currentStats.marketActivity}%</span>
              <span className="text-[10px] font-bold text-brand-accent">High</span>
            </div>
          </div>
        </motion.div>

        {/* Request Quality */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="p-5 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-[2rem] border border-brand-border/50 shadow-sm group cursor-default"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-brand-teal/10 text-brand-teal rounded-xl group-hover:scale-110 transition-transform">
              <ShieldCheck size={18} />
            </div>
            <CheckCircle2 size={14} className="text-brand-teal" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
              {isRtl ? 'جودة الطلبات' : 'Request Quality'}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-brand-text-main">{currentStats.requestQuality}%</span>
              <span className="text-[10px] font-bold text-brand-teal">Optimal</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Predictive Assistance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-gradient-to-br from-brand-primary to-brand-primary/90 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                <Sparkles size={20} className="text-brand-teal" />
              </div>
              <h4 className="text-lg font-black tracking-tight">
                {isRtl ? 'المساعد الذكي يتوقع احتياجك' : 'Smart Predictive Assistant'}
              </h4>
            </div>
            <p className="text-white/70 text-sm mb-8 leading-relaxed">
              {role === 'supplier' 
                ? (isRtl ? 'بناءً على نشاطك الأخير، هناك طلبات متزايدة في قسم "مواد البناء" في منطقتك. ننصحك بتحديث قائمة أسعارك.' : 'Based on your recent activity, there is increasing demand in "Construction Materials" in your area. We recommend updating your price list.')
                : (isRtl ? 'بناءً على طلبك الأخير لـ "إسمنت"، قد تحتاج قريباً إلى "حديد تسليح". هل ترغب في استكشاف الموردين المتاحين؟' : 'Based on your recent request for "Cement", you might soon need "Rebar". Would you like to explore available suppliers?')}
            </p>
            <button className="flex items-center gap-2 px-6 py-3 bg-white text-brand-primary rounded-2xl font-black text-sm hover:bg-brand-teal hover:text-white transition-all group/btn">
              {isRtl ? 'استكشاف المقترحات' : 'Explore Suggestions'}
              <ArrowUpRight size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Performance Monitoring / Diagnostics */}
        <div className="p-8 bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-brand-border/50 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-black text-brand-text-main flex items-center gap-3">
              <div className="p-2 bg-brand-purple/10 text-brand-purple rounded-xl">
                <Activity size={20} />
              </div>
              {isRtl ? 'تشخيصات النظام' : 'Smart Diagnostics'}
            </h4>
            <span className="text-[10px] font-black text-brand-teal bg-brand-teal/10 px-3 py-1 rounded-full uppercase tracking-widest">
              {isRtl ? 'مثالي' : 'Optimal'}
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                <span>{isRtl ? 'سرعة المعالجة' : 'Processing Speed'}</span>
                <span>98%</span>
              </div>
              <div className="h-1.5 w-full bg-brand-border/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '98%' }}
                  className="h-full bg-brand-teal" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                <span>{isRtl ? 'دقة البيانات' : 'Data Integrity'}</span>
                <span>100%</span>
              </div>
              <div className="h-1.5 w-full bg-brand-border/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-brand-purple" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                <span>{isRtl ? 'أمان المعاملات' : 'Transaction Security'}</span>
                <span>99.9%</span>
              </div>
              <div className="h-1.5 w-full bg-brand-border/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '99.9%' }}
                  className="h-full bg-brand-accent" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
