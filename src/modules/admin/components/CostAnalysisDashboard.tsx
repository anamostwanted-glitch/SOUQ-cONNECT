import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { createNotification } from '../../../core/services/notificationService';
import { UsageLog } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  DollarSign, 
  Zap, 
  Users, 
  Clock, 
  ArrowUpRight,
  Sparkles,
  Cpu,
  PieChart as PieChartIcon
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const CostAnalysisDashboard: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'usage_logs'), orderBy('createdAt', 'desc'), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      try {
        const fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UsageLog));
        setLogs(fetchedLogs);
        setLoading(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'usage_logs/processing', false);
        setLoading(false);
      }
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'usage_logs', false);
    });

    return () => unsub();
  }, []);

  const stats = useMemo(() => {
    const totalCost = logs.reduce((acc, log) => acc + (log.estimatedCost || 0), 0);
    const totalRequests = logs.length;
    const cachedRequests = logs.filter(log => log.isCached).length;
    const savings = logs.reduce((acc, log) => acc + (log.isCached ? 0.000125 : 0), 0); // Estimate savings
    
    // 1M User Projection
    const uniqueUsers = new Set(logs.map(l => l.uid)).size || 1;
    const costPerUser = totalCost / uniqueUsers;
    const projected1MCost = costPerUser * 1000000;

    // AI Cost Insights
    const avgCostPerRequest = totalCost / (totalRequests || 1);
    const anomalies = logs.filter(log => (log.estimatedCost || 0) > avgCostPerRequest * 5);
    const recommendations = [];
    if (anomalies.length > 5) recommendations.push(isRtl ? 'تم اكتشاف نشاط غير طبيعي في التكاليف، يرجى مراجعة سجلات العمليات.' : 'Anomalous cost activity detected, please review operation logs.');
    if (cachedRequests / totalRequests < 0.2) recommendations.push(isRtl ? 'نسبة التخزين المؤقت منخفضة، نقترح تفعيل الكاش لميزات أكثر.' : 'Low cache ratio, consider enabling caching for more features.');

    return {
      totalCost,
      totalRequests,
      cachedRequests,
      savings,
      projected1MCost,
      uniqueUsers,
      anomalies,
      recommendations
    };
  }, [logs, isRtl]);

  const featureDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    logs.forEach(log => {
      distribution[log.feature] = (distribution[log.feature] || 0) + (log.estimatedCost || 0);
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const dailyTrend = useMemo(() => {
    const trend: Record<string, number> = {};
    logs.forEach(log => {
      const date = new Date(log.createdAt).toLocaleDateString();
      trend[date] = (trend[date] || 0) + (log.estimatedCost || 0);
    });
    return Object.entries(trend)
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 days
  }, [logs]);

  const userCosts = useMemo(() => {
    const users: Record<string, { email: string; count: number; cost: number }> = {};
    logs.forEach(log => {
      if (!users[log.uid]) {
        users[log.uid] = { email: log.email || 'Anonymous', count: 0, cost: 0 };
      }
      users[log.uid].count += 1;
      users[log.uid].cost += (log.estimatedCost || 0);
    });
    return Object.entries(users)
      .map(([uid, data]) => ({ uid, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [logs]);

  const lastNotificationRef = React.useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (stats.anomalies.length > 0 && auth.currentUser && now - lastNotificationRef.current > 3600000) {
      lastNotificationRef.current = now;
      createNotification({
        userId: auth.currentUser.uid,
        titleAr: 'تنبيه: نشاط تكاليف غير طبيعي',
        titleEn: 'Alert: Anomalous Cost Activity',
        bodyAr: `تم اكتشاف ${stats.anomalies.length} عملية استهلاك غير طبيعية. يرجى مراجعة لوحة تحكم التكاليف.`,
        bodyEn: `${stats.anomalies.length} anomalous cost operations detected. Please review the cost dashboard.`,
        actionType: 'cost_alert'
      });
    }
  }, [stats.anomalies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <span className="text-sm font-bold text-brand-text-muted uppercase tracking-wider">
              {isRtl ? 'إجمالي التكلفة' : 'Total Cost'}
            </span>
          </div>
          <div className="text-3xl font-black text-brand-text-main">
            ${stats.totalCost.toFixed(4)}
          </div>
          <div className="mt-2 text-xs font-bold text-brand-success flex items-center gap-1">
            <TrendingUp size={12} />
            {isRtl ? 'مبني على الاستخدام الفعلي' : 'Based on actual usage'}
          </div>
        </div>

        <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-success/10 text-brand-success flex items-center justify-center">
              <Activity size={24} />
            </div>
            <span className="text-sm font-bold text-brand-text-muted uppercase tracking-wider">
              {isRtl ? 'إجمالي الطلبات' : 'Total Requests'}
            </span>
          </div>
          <div className="text-3xl font-black text-brand-text-main">
            {stats.totalRequests.toLocaleString()}
          </div>
          <div className="mt-2 text-xs font-bold text-brand-primary">
            {stats.uniqueUsers} {isRtl ? 'مستخدم نشط' : 'Active Users'}
          </div>
        </div>

        <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-warning/10 text-brand-warning flex items-center justify-center">
              <Zap size={24} />
            </div>
            <span className="text-sm font-bold text-brand-text-muted uppercase tracking-wider">
              {isRtl ? 'التوفير المحقق' : 'Neural Savings'}
            </span>
          </div>
          <div className="text-3xl font-black text-brand-text-main">
            ${stats.savings.toFixed(4)}
          </div>
          <div className="mt-2 text-xs font-bold text-brand-warning">
            {stats.cachedRequests} {isRtl ? 'عملية من الذاكرة' : 'Cached operations'}
          </div>
        </div>

        <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-error/10 text-brand-error flex items-center justify-center">
              <Users size={24} />
            </div>
            <span className="text-sm font-bold text-brand-text-muted uppercase tracking-wider">
              {isRtl ? 'توقعات مليون مستخدم' : '1M User Projection'}
            </span>
          </div>
          <div className="text-3xl font-black text-brand-text-main">
            ${stats.projected1MCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-2 text-xs font-bold text-brand-error">
            {isRtl ? 'تكلفة شهرية تقديرية' : 'Estimated monthly cost'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm">
          <h3 className="text-lg font-black text-brand-text-main mb-8 flex items-center gap-2">
            <PieChartIcon size={20} className="text-brand-primary" />
            {isRtl ? 'توزيع التكاليف حسب الميزة' : 'Cost Distribution by Feature'}
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={featureDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {featureDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => `$${value.toFixed(4)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {featureDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-xs font-bold text-brand-text-muted truncate">{item.name}</span>
                <span className="text-xs font-black text-brand-text-main ml-auto">${item.value.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm">
          <h3 className="text-lg font-black text-brand-text-main mb-8 flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-success" />
            {isRtl ? 'اتجاه التكاليف اليومي' : 'Daily Cost Trend'}
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => `$${value.toFixed(4)}`}
                />
                <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* User Costs & Recent Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm overflow-hidden">
          <h3 className="text-lg font-black text-brand-text-main mb-6 flex items-center gap-2">
            <Users size={20} className="text-brand-secondary" />
            {isRtl ? 'التكلفة حسب المستخدم' : 'Cost per User'}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="pb-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider">{isRtl ? 'المستخدم' : 'User'}</th>
                  <th className="pb-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider text-center">{isRtl ? 'العمليات' : 'Ops'}</th>
                  <th className="pb-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider text-right">{isRtl ? 'التكلفة' : 'Cost'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {userCosts.map((user, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-4">
                      <div className="text-sm font-bold text-brand-text-main truncate max-w-[150px]">{user.email}</div>
                      <div className="text-[10px] text-brand-text-muted font-mono">{user.uid.substring(0, 8)}...</div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="px-2 py-1 bg-brand-background rounded-lg text-xs font-bold text-brand-text-main">
                        {user.count}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span className="text-sm font-black text-brand-primary">
                        ${user.cost.toFixed(4)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm overflow-hidden">
          <h3 className="text-lg font-black text-brand-text-main mb-6 flex items-center gap-2">
            <Clock size={20} className="text-brand-info" />
            {isRtl ? 'آخر العمليات' : 'Recent Operations'}
          </h3>
          <div className="space-y-4">
            {logs.slice(0, 10).map((log, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-brand-background/50 rounded-2xl border border-brand-border/50 group hover:border-brand-primary/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-surface flex items-center justify-center text-brand-primary shadow-sm group-hover:scale-110 transition-transform">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-text-main">{log.feature}</div>
                    <div className="text-[10px] text-brand-text-muted flex items-center gap-2">
                      <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span className="truncate max-w-[100px]">{log.email}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-brand-primary">${(log.estimatedCost || 0).toFixed(5)}</div>
                  <div className="text-[10px] font-bold text-brand-text-muted">{log.tokens} tokens</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
