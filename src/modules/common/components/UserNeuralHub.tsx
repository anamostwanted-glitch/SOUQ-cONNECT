import React from 'react';
import { motion } from 'motion/react';
import { Brain, Sparkles, TrendingUp, Target, Zap } from 'lucide-react';

export const UserNeuralHub: React.FC<{ profile: any; isRtl: boolean }> = ({ profile, isRtl }) => {
  const insights = [
    {
      icon: <TrendingUp className="text-brand-teal" />,
      title: isRtl ? 'تحليل السوق' : 'Market Analysis',
      value: isRtl ? 'نمو بنسبة 12%' : '12% Growth',
      description: isRtl ? 'هناك طلب متزايد على فئة البناء هذا الأسبوع.' : 'There is an increasing demand in the construction category this week.'
    },
    {
      icon: <Target className="text-brand-primary" />,
      title: isRtl ? 'توصية ذكية' : 'Smart Recommendation',
      value: isRtl ? 'تحسين الملف' : 'Profile Optimization',
      description: isRtl ? 'إضافة صور لمنتجاتك قد تزيد من فرص قبول عروضك بنسبة 40%.' : 'Adding images to your products could increase offer acceptance by 40%.'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-brand-primary/10 via-brand-teal/5 to-transparent p-12 border border-white/20 backdrop-blur-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Brain size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/20 text-brand-primary text-sm font-bold mb-6">
            <Sparkles size={16} />
            {isRtl ? 'فريق النواة - تحليل حي' : 'Core Team - Live Analysis'}
          </div>
          
          <h2 className="text-4xl font-black text-brand-text-main mb-4">
            {isRtl ? `مرحباً ${profile?.name || 'بك'} في المركز العصبي` : `Welcome ${profile?.name || ''} to the Neural Hub`}
          </h2>
          <p className="text-xl text-brand-text-muted max-w-2xl">
            {isRtl 
              ? 'نحن نقوم بتحليل بيانات السوق وسلوك المستخدمين لنقدم لك أفضل الفرص والتحليلات في الوقت الفعلي.' 
              : 'We analyze market data and user behavior to provide you with the best opportunities and insights in real-time.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-8 rounded-[2.5rem] bg-white/50 dark:bg-gray-900/50 border border-white/20 backdrop-blur-lg hover:shadow-xl transition-all group"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm group-hover:scale-110 transition-transform">
                {insight.icon}
              </div>
              <div className="px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold">
                {insight.value}
              </div>
            </div>
            <h3 className="text-xl font-bold text-brand-text-main mb-2">{insight.title}</h3>
            <p className="text-brand-text-muted leading-relaxed">{insight.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="p-8 rounded-[2.5rem] bg-brand-primary text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full animate-shimmer" />
        <div className="relative z-10 flex items-center justify-between gap-8">
          <div>
            <h3 className="text-2xl font-black mb-2">{isRtl ? 'النبض الذكي مفعل' : 'Smart Pulse Active'}</h3>
            <p className="opacity-90">{isRtl ? 'نظامنا يراقب السوق من أجلك 24/7.' : 'Our system monitors the market for you 24/7.'}</p>
          </div>
          <Zap size={48} className="opacity-50" />
        </div>
      </div>
    </div>
  );
};
