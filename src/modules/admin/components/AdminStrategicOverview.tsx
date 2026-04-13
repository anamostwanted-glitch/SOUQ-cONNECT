import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  MessageSquare, 
  PhoneCall, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  AlertCircle,
  ArrowUpRight,
  Clock,
  Eye,
  MousePointer2,
  BrainCircuit,
  Target
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface StrategicMetric {
  label: string;
  value: string | number;
  change: number;
  icon: any;
  color: string;
}

interface AdminStrategicOverviewProps {
  stats: {
    visitors: number;
    chats: number;
    connections: number;
    activeUsers: number;
  };
  timeRange: 'day' | 'week' | 'year';
  setTimeRange: (range: 'day' | 'week' | 'year') => void;
  onAction: (action: string) => void;
}

export const AdminStrategicOverview: React.FC<AdminStrategicOverviewProps> = ({
  stats,
  timeRange,
  setTimeRange,
  onAction
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const metrics: StrategicMetric[] = [
    { 
      label: isRtl ? 'الزوار' : 'Visitors', 
      value: stats.visitors.toLocaleString(), 
      change: 12.5, 
      icon: Eye, 
      color: 'text-blue-500' 
    },
    { 
      label: isRtl ? 'المحادثات' : 'Conversations', 
      value: stats.chats.toLocaleString(), 
      change: 8.2, 
      icon: MessageSquare, 
      color: 'text-emerald-500' 
    },
    { 
      label: isRtl ? 'الارتباطات' : 'Connections', 
      value: stats.connections.toLocaleString(), 
      change: 14.7, 
      icon: Zap, 
      color: 'text-amber-500' 
    },
    { 
      label: isRtl ? 'المستخدمين النشطين' : 'Active Users', 
      value: stats.activeUsers.toLocaleString(), 
      change: 15.1, 
      icon: Users, 
      color: 'text-purple-500' 
    },
  ];

  const directives = [
    {
      id: 'verify',
      title: isRtl ? 'توثيق الموردين' : 'Supplier Verification',
      description: isRtl ? 'هناك 5 موردين بانتظار التوثيق لزيادة موثوقية السوق.' : '5 suppliers are awaiting verification to increase marketplace trust.',
      priority: 'high',
      icon: ShieldCheck,
      action: 'users'
    },
    {
      id: 'gap',
      title: isRtl ? 'فجوة العرض والطلب' : 'Supply-Demand Gap',
      description: isRtl ? 'زيادة في الطلب على "الإلكترونيات" بنسبة 20%. اقترح إضافة موردين جدد.' : '20% surge in "Electronics" requests. Suggest recruiting new suppliers.',
      priority: 'medium',
      icon: Target,
      action: 'gap-analysis'
    },
    {
      id: 'ai',
      title: isRtl ? 'تحسين الذكاء الاصطناعي' : 'AI Optimization',
      description: isRtl ? 'أداء محرك جيمناي الحالي ممتاز (استجابة 450ms).' : 'Current Gemini engine performance is excellent (450ms latency).',
      priority: 'low',
      icon: BrainCircuit,
      action: 'ai'
    }
  ];

  return (
    <div className="space-y-8 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Neural Pulse Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-brand-text-main tracking-tight">
            {isRtl ? 'نظرة استراتيجية' : 'Strategic Overview'}
          </h1>
          <p className="text-brand-text-muted font-bold mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {isRtl ? 'النظام يعمل بكفاءة عالية' : 'System operating at peak efficiency'}
          </p>
        </div>

        <div className="flex p-1 bg-brand-surface border border-brand-border rounded-2xl shadow-inner">
          {(['day', 'week', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                timeRange === range 
                  ? 'bg-brand-primary text-white shadow-lg' 
                  : 'text-brand-text-muted hover:text-brand-text-main'
              }`}
            >
              {range === 'day' ? (isRtl ? 'اليوم' : 'Day') : 
               range === 'week' ? (isRtl ? 'الأسبوع' : 'Week') : 
               (isRtl ? 'السنة' : 'Year')}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Strategic Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-brand-surface p-6 rounded-[2rem] border border-brand-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-brand-primary/10 transition-all" />
            
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-brand-background border border-brand-border flex items-center justify-center ${metric.color} shadow-inner`}>
                <metric.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${metric.change >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                {metric.change >= 0 ? '+' : ''}{metric.change}%
                <TrendingUp size={10} className={metric.change < 0 ? 'rotate-180' : ''} />
              </div>
            </div>

            <div className="text-3xl font-black text-brand-text-main mb-1">{metric.value}</div>
            <div className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em]">{metric.label}</div>
          </motion.div>
        ))}
      </div>

      {/* 3. Neural Directives (The Genius Idea) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-brand-text-main flex items-center gap-2">
              <BrainCircuit className="text-brand-primary" size={24} />
              {isRtl ? 'التوجيهات الاستراتيجية (AI)' : 'Strategic Directives (AI)'}
            </h2>
            <span className="text-[10px] font-black text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
              {isRtl ? 'مباشر' : 'Live'}
            </span>
          </div>

          <div className="space-y-4">
            {directives.map((directive, i) => (
              <motion.div
                key={directive.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="bg-brand-surface p-6 rounded-[2rem] border border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-brand-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                    directive.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                    directive.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    <directive.icon size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-text-main group-hover:text-brand-primary transition-colors">{directive.title}</h3>
                    <p className="text-sm text-brand-text-muted font-medium max-w-md">{directive.description}</p>
                  </div>
                </div>
                <HapticButton
                  onClick={() => onAction(directive.action)}
                  className="w-full sm:w-auto px-6 py-3 bg-brand-background border border-brand-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all flex items-center justify-center gap-2"
                >
                  {isRtl ? 'تنفيذ' : 'Execute'}
                  <ArrowUpRight size={14} />
                </HapticButton>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 4. Quick Access Bento */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-brand-text-main px-2">
            {isRtl ? 'الوصول السريع' : 'Quick Access'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'site', label: isRtl ? 'إعدادات الموقع' : 'Site Settings', icon: MousePointer2, color: 'bg-blue-500' },
              { id: 'categories', label: isRtl ? 'الفئات' : 'Categories', icon: Target, color: 'bg-emerald-500' },
              { id: 'broadcast', label: isRtl ? 'البث' : 'Broadcast', icon: Zap, color: 'bg-purple-500' },
              { id: 'ai', label: isRtl ? 'الذكاء الاصطناعي' : 'AI Hub', icon: BrainCircuit, color: 'bg-pink-500' },
            ].map((item, i) => (
              <HapticButton
                key={item.id}
                onClick={() => onAction(item.id)}
                className="aspect-square bg-brand-surface rounded-[2rem] border border-brand-border p-6 flex flex-col items-center justify-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all group"
              >
                <div className={`w-12 h-12 rounded-2xl ${item.color}/10 ${item.color.replace('bg-', 'text-')} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon size={24} />
                </div>
                <span className="text-[10px] font-black text-brand-text-main uppercase tracking-widest text-center">{item.label}</span>
              </HapticButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
