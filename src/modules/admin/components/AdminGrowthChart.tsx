import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, ShoppingBag } from 'lucide-react';

export const AdminGrowthChart: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const data = [
    { name: isRtl ? 'يناير' : 'Jan', users: 400, requests: 240 },
    { name: isRtl ? 'فبراير' : 'Feb', users: 600, requests: 350 },
    { name: isRtl ? 'مارس' : 'Mar', users: 800, requests: 520 },
    { name: isRtl ? 'أبريل' : 'Apr', users: 1200, requests: 780 },
    { name: isRtl ? 'مايو' : 'May', users: 1500, requests: 900 },
    { name: isRtl ? 'يونيو' : 'Jun', users: 2100, requests: 1300 },
  ];

  return (
    <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-black text-brand-text-main flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-primary" />
            {isRtl ? 'تحليل النمو' : 'Growth Analytics'}
          </h3>
          <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mt-1">
            {isRtl ? 'آخر 6 أشهر' : 'Last 6 Months'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-brand-primary" />
            <span className="text-[10px] font-bold text-brand-text-muted">{isRtl ? 'المستخدمين' : 'Users'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-brand-teal" />
            <span className="text-[10px] font-bold text-brand-text-muted">{isRtl ? 'الطلبات' : 'Requests'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-brand-teal)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--color-brand-teal)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-brand-text-muted)' }}
              reversed={isRtl}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-brand-text-muted)' }}
              orientation={isRtl ? 'right' : 'left'}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--color-brand-surface)', 
                border: '1px solid var(--color-brand-border)',
                borderRadius: '1rem',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="users" 
              stroke="var(--color-brand-primary)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorUsers)" 
            />
            <Area 
              type="monotone" 
              dataKey="requests" 
              stroke="var(--color-brand-teal)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRequests)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
