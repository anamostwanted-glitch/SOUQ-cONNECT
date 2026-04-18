import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Target, 
  Users, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight,
  Info 
} from 'lucide-react';

interface B2BAnalyticsDashboardProps {
  isRtl: boolean;
  data: {
    marketDemand: any[];
    demandTrends: any[];
    competitorPricing: any[];
  }
}

export const B2BAnalyticsDashboard: React.FC<B2BAnalyticsDashboardProps> = ({ isRtl, data }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-2">
        <div>
          <h3 className="text-2xl font-black text-brand-text-main flex items-center gap-2">
            <Zap className="text-brand-primary" fill="currentColor" />
            {isRtl ? 'ذكاء السوق والأعمال' : 'Market & Business Intelligence'}
          </h3>
          <p className="text-sm text-brand-text-muted font-medium">
            {isRtl ? 'تحليل حي للطلب والمنافسة في قطاعك' : 'Live analysis of demand and competition in your sector'}
          </p>
        </div>
        
        <div className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl text-xs font-black uppercase tracking-widest border border-brand-primary/20">
          {isRtl ? 'تحديث اللحظة' : 'Real-time Sync'}
        </div>
      </div>

      {/* Primary Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Market Demand vs Supply */}
        <div className="lg:col-span-2 p-8 bg-white dark:bg-slate-900 border border-brand-border rounded-[2.5rem] shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="font-black text-brand-text-main">{isRtl ? 'مؤشر الطلب حسب الفئة' : 'Demand Index by Category'}</h4>
              <p className="text-xs text-brand-text-muted font-bold">{isRtl ? 'مقارنة بين عدد الطلبات المفتوحة والمعروض' : 'Comparison between open requests and supply'}</p>
            </div>
            <Target className="text-brand-primary opacity-20" size={32} />
          </div>

          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.marketDemand} layout="vertical" margin={{ left: isRtl ? 0 : 40, right: isRtl ? 40 : 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} 
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="demand" fill="#0D9488" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.marketDemand.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#0D9488' : '#14B8A6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Momentum Card */}
        <div className="p-8 bg-brand-primary text-white rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <h4 className="text-2xl font-black mb-2">{isRtl ? 'زخم النمو' : 'Growth Momentum'}</h4>
            <p className="text-white/60 text-xs font-medium leading-relaxed">
              {isRtl ? 'تحسن ظهورك في السوق بنسبة 24% خلال آخر 7 أيام بفضل نشاطك الأخير.' : 'Your market visibility increased by 24% over the last 7 days due to recent activity.'}
            </p>
          </div>

          <div className="mt-8 relative z-10">
            <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-black tracking-tighter">92</span>
              <span className="text-lg font-black opacity-40">/100</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '92%' }}
                 transition={{ duration: 1.5, ease: "easeOut" }}
                 className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
               />
            </div>
            <p className="mt-4 text-[10px] uppercase font-black tracking-widest text-white/50">{isRtl ? 'فئة النخبة في منطقتك' : 'Elite status in your region'}</p>
          </div>

          {/* Abstract SVG Background */}
          <svg className="absolute bottom-0 right-0 w-48 opacity-10 pointer-events-none" viewBox="0 0 200 200">
             <path fill="currentColor" d="M40,-67.5C51.6,-60.1,60.6,-48.3,67.3,-35.4C74,-22.4,78.3,-8.4,76.6,5C74.9,18.4,67.1,31.2,57.1,41.4C47.1,51.6,34.8,59.3,21.3,64.2C7.9,69.1,-6.6,71.2,-20.5,68.2C-34.4,65.2,-47.7,57.1,-58.5,46.1C-69.3,35.1,-77.6,21.1,-79.8,6.2C-82,-8.7,-78.2,-24.5,-69.1,-36.4C-60,-48.3,-45.6,-56.3,-32,-62.7C-18.4,-69.1,-5.6,-73.9,7.4,-86.6C20.4,-99.3,33.5,-120,40,-67.5Z" transform="translate(100 100)" />
          </svg>
        </div>
      </div>

      {/* Secondary Intelligence Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Trend Analysis */}
        <div className="p-8 bg-white dark:bg-slate-900 border border-brand-border rounded-[2.5rem] shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="font-black text-brand-text-main">{isRtl ? 'سلوك المشترين' : 'Buyer Behavior Trend'}</h4>
                <p className="text-xs text-brand-text-muted font-bold">{isRtl ? 'حجم الطلبات الجديدة خلال الأسبوع' : 'New request volume over the week'}</p>
              </div>
              <div className="flex items-center gap-1 text-brand-teal font-black text-xs">
                 <ArrowUpRight size={14} /> +18.4%
              </div>
           </div>

           <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={data.demandTrends}>
                    <defs>
                       <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0D9488" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    />
                    <Area type="monotone" dataKey="value" stroke="#0D9488" strokeWidth={3} fillOpacity={1} fill="url(#colorDemand)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Pricing Strategy Hub */}
        <div className="p-8 bg-white dark:bg-slate-900 border border-brand-border rounded-[2.5rem] shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="font-black text-brand-text-main">{isRtl ? 'تحليل تنافسية الأسعار' : 'Pricing Competitiveness'}</h4>
                <p className="text-xs text-brand-text-muted font-bold">{isRtl ? 'موقع أسعارك مقارنة بالمعدل المحلي' : 'Your pricing position vs local average'}</p>
              </div>
              <Info size={20} className="text-brand-text-muted opacity-40" />
           </div>

           <div className="space-y-4">
              {data.competitorPricing.map((item, idx) => (
                <div key={idx} className="p-4 bg-brand-background rounded-2xl border border-brand-border hover:border-brand-primary transition-all group">
                   <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-brand-text-main">{item.name}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'optimal' ? 'text-brand-teal' : 'text-brand-amber'}`}>
                        {item.status === 'optimal' ? (isRtl ? 'مثالي' : 'Optimal') : (isRtl ? 'مرتفع' : 'Higher')}
                      </span>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                         <div className="h-full bg-brand-primary rounded-full transition-all duration-1000" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-brand-text-muted">{item.diff}%</span>
                   </div>
                </div>
              ))}
           </div>
        </div>

      </div>

      {/* AI Intelligence Bulletin */}
      <div className="p-6 bg-brand-teal/5 border border-brand-teal/10 rounded-[2rem] flex items-center gap-6">
         <div className="w-12 h-12 bg-brand-teal text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-teal/20">
            <Zap size={24} />
         </div>
         <div className="flex-1">
            <h5 className="text-sm font-black text-brand-teal uppercase tracking-widest mb-1">{isRtl ? 'توصية الذكاء الاصطناعي' : 'Connect AI Insight'}</h5>
            <p className="text-sm text-brand-text-main font-medium leading-relaxed italic">
               "{isRtl 
                 ? 'لوحظ نمو بنسبة 40% في طلبات قطاع الصيانة الكهربائية بجدة. ننصح بتحديث قائمة منتجاتك لتشمل أنظمة الحماية الذكية لزيادة مبيعاتك بنسبة متوقعة تصل لـ 15%.' 
                 : 'We noticed a 40% growth in Electrical Maintenance requests in Jeddah. We recommend updating your inventory with smart protection systems to increase projected sales by 15%.'}"
            </p>
         </div>
      </div>
    </div>
  );
};
