import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  Search,
  Plus,
  X,
  Lock,
  Sparkles,
  MapPin,
  Flame,
  Download,
  Calendar,
  Layers,
  BarChart3,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { UserProfile } from '../../../core/types';

interface NeuralMarketTrendsProps {
  profile?: UserProfile | null;
  isRtl?: boolean;
  onUpgradeClick?: () => void;
}

// Preset trending terms in Jordan & Regional B2B market
const SAMPLE_TERMS = [
  { ar: 'حديد تسليح', en: 'Rebar Steel', color: '#6366f1', baseVolume: 85 },
  { ar: 'إسمنت مقاوم', en: 'Resistant Cement', color: '#10b981', baseVolume: 65 },
  { ar: 'أنظمة طاقة شمسية', en: 'Solar Systems', color: '#f59e0b', baseVolume: 92 },
  { ar: 'كابلات نحاسية', en: 'Copper Cables', color: '#ec4899', baseVolume: 45 }
];

const GEO_DATA = [
  { nameAr: 'عمان', nameEn: 'Amman', demand: 42, growth: '+28%' },
  { nameAr: 'الزرقاء', nameEn: 'Zarqa', demand: 24, growth: '+15%' },
  { nameAr: 'إربد', nameEn: 'Irbid', demand: 18, growth: '+22%' },
  { nameAr: 'العقبة', nameEn: 'Aqaba', demand: 10, growth: '+35%' },
  { nameAr: 'السلط والوسط', nameEn: 'Balqa & Central', demand: 6, growth: '+10%' }
];

const BREAKOUT_KEYWORDS = [
  { termAr: 'نخب أول سيراميك إسباني', termEn: 'Spanish First Grade Tiles', growth: '+340%', category: 'building' },
  { termAr: 'مضخات مياه غاطسة 10 حصان', termEn: '10HP Submersible Pumps', growth: '+280%', category: 'industrial' },
  { termAr: 'محولات كهربائية 11KV', termEn: '11KV Transformers', growth: '+210%', category: 'energy' },
  { termAr: 'ألواح عزل حراري بوليوثين', termEn: 'PU Thermal Insulation', growth: '+195%', category: 'construction' },
  { termAr: 'أجهزة قياس وتتبع GPS', termEn: 'GPS Tracking Devices', growth: '+160%', category: 'tech' }
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export const NeuralMarketTrends: React.FC<NeuralMarketTrendsProps> = ({
  profile,
  isRtl = true,
  onUpgradeClick
}) => {
  // Check subscription plan - Pro or Elite unlock full trends
  const plan = profile?.subscriptionPlan?.code || profile?.plan || 'basic';
  const isProOrElite = plan === 'pro' || plan === 'elite' || plan === 'enterprise' || profile?.role === 'admin';

  const [activeTerms, setActiveTerms] = useState<string[]>([
    isRtl ? 'حديد تسليح' : 'Rebar Steel',
    isRtl ? 'أنظمة طاقة شمسية' : 'Solar Systems'
  ]);
  const [inputTerm, setInputTerm] = useState('');
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '12m'>('30d');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [demoUnlocked, setDemoUnlocked] = useState(isProOrElite);

  // Synchronize when profile changes
  useEffect(() => {
    if (isProOrElite) {
      setDemoUnlocked(true);
    }
  }, [isProOrElite]);

  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTerm.trim()) return;
    if (activeTerms.length >= 4) return;
    if (!activeTerms.includes(inputTerm.trim())) {
      setActiveTerms([...activeTerms, inputTerm.trim()]);
    }
    setInputTerm('');
  };

  const handleRemoveTerm = (termToRemove: string) => {
    if (activeTerms.length <= 1) return;
    setActiveTerms(activeTerms.filter(t => t !== termToRemove));
  };

  // Generate historical trend data points based on selected terms
  const generateTrendData = () => {
    const pointsCount = timeRange === '30d' ? 10 : timeRange === '90d' ? 12 : 12;
    const labels = timeRange === '30d' 
      ? ['1 Jul', '4 Jul', '7 Jul', '10 Jul', '13 Jul', '16 Jul', '19 Jul', '22 Jul', '25 Jul', '28 Jul']
      : timeRange === '90d'
      ? ['May W1', 'May W3', 'Jun W1', 'Jun W3', 'Jul W1', 'Jul W3', 'Aug W1', 'Aug W3', 'Sep W1', 'Sep W3', 'Oct W1', 'Oct W3']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return labels.map((label, idx) => {
      const dataObj: Record<string, any> = { date: label };
      activeTerms.forEach((term, tIdx) => {
        const seed = (tIdx + 1) * 17 + idx * 7;
        const wave = Math.sin(idx + tIdx) * 20 + 55;
        const noise = (seed % 25);
        dataObj[term] = Math.min(100, Math.max(10, Math.round(wave + noise)));
      });
      return dataObj;
    });
  };

  const trendData = generateTrendData();

  const handleExportCSV = () => {
    const headers = ['Date', ...activeTerms].join(',');
    const rows = trendData.map(row => [row.date, ...activeTerms.map(t => row[t])].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SouqConnect_Market_Trends_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-slate-900 to-brand-primary p-8 md:p-10 text-white shadow-2xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 rounded-full bg-brand-teal/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{isRtl ? 'القاموس العصبي - تحليل الاتجاهات' : 'Neural Lexicon - Google Trends for Souq Connect'}</span>
              <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                Pro & Elite
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
              {isRtl ? 'اتجاهات الطلب والسوق الحي' : 'Live Market & Demand Trends'}
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              {isRtl
                ? 'قارن حجم الطلب، الكلمات الأكثر بحثاً، والتوزيع الجغرافي لاحتياجات المشترين والموردين في الأردن والمنطقة.'
                : 'Compare search demand, surging keywords, and geographic buying patterns across Jordan and the region.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isProOrElite && !demoUnlocked && (
              <button
                onClick={onUpgradeClick}
                className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs md:text-sm flex items-center gap-2 shadow-lg hover:shadow-amber-400/20 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                {isRtl ? 'رقّ حسابك للباقة الاحترافية' : 'Upgrade to Pro Plan'}
              </button>
            )}

            {demoUnlocked && (
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition-all cursor-pointer backdrop-blur-md"
              >
                <Download className="w-4 h-4" />
                {isRtl ? 'تصدير البيانات CSV' : 'Export Data CSV'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Trends Explorer Container */}
      <div className="relative rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-xl overflow-hidden">
        {/* Lock Overlay for Basic Tier */}
        {!demoUnlocked && (
          <div className="absolute inset-0 z-30 backdrop-blur-md bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="p-4 rounded-3xl bg-amber-500/20 border border-amber-400/40 text-amber-400 mb-4 shadow-2xl animate-bounce">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black mb-2">
              {isRtl ? 'تحليلات اتجاهات السوق مخصصة لمشتركي باقة Pro و Elite' : 'Market Trends Analytics are Reserved for Pro & Elite Tiers'}
            </h3>
            <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
              {isRtl
                ? 'احصل على وصول كامل لمقارنة الكلمات الأكثر طلباً، وتحديد الأوقات الذهبية للبيع، والوصول للفرص الجغرافية قبل المنافسين.'
                : 'Unlock live demand comparisons, optimal sales timing, and geographic search volumes ahead of competitors.'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onUpgradeClick}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-sm shadow-xl hover:scale-105 transition-all cursor-pointer"
              >
                {isRtl ? 'ترقية الاشتراك الآن' : 'Upgrade Subscription Now'}
              </button>
              <button
                onClick={() => setDemoUnlocked(true)}
                className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 cursor-pointer transition-all"
              >
                {isRtl ? 'معاينة تجريبية للميزة' : 'Preview Demo Mode'}
              </button>
            </div>
          </div>
        )}

        {/* Controls Bar */}
        <div className="space-y-6 mb-8">
          {/* Keyword Search & Tags */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <form onSubmit={handleAddTerm} className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={inputTerm}
                  onChange={(e) => setInputTerm(e.target.value)}
                  placeholder={isRtl ? 'أدخل كلمة بحث لمقارنتها (مثال: أسمنت نخب أول)...' : 'Type a search term to compare (e.g. Solar panels)...'}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={activeTerms.length >= 4}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                {isRtl ? 'إضافة للمقارنة' : 'Add to Compare'}
              </button>
            </form>

            {/* Time Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto">
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  timeRange === '30d'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {isRtl ? 'آخر 30 يوم' : 'Past 30 Days'}
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  timeRange === '90d'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {isRtl ? 'آخر 90 يوم' : 'Past 90 Days'}
              </button>
              <button
                onClick={() => setTimeRange('12m')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  timeRange === '12m'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {isRtl ? 'السنة الكاملة' : 'Past Year'}
              </button>
            </div>
          </div>

          {/* Active Compared Terms Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 ml-2">
              {isRtl ? 'المصطلحات المقارنة حالياً:' : 'Comparing terms:'}
            </span>
            {activeTerms.map((term, index) => {
              const color = COLORS[index % COLORS.length];
              return (
                <div
                  key={`term-chip-${term}-${index}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black shadow-sm"
                  style={{
                    borderColor: `${color}40`,
                    backgroundColor: `${color}10`,
                    color: color
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span>{term}</span>
                  {activeTerms.length > 1 && (
                    <button
                      onClick={() => handleRemoveTerm(term)}
                      className="hover:opacity-75 cursor-pointer ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Recharts Line Chart */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              {isRtl ? 'مؤشر اهتمام البحث والطلب (0 - 100)' : 'Search Interest & Demand Index (0 - 100)'}
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {isRtl ? 'القاموس العصبي - تحديث يومي' : 'Neural Lexicon - Daily Update'}
            </span>
          </div>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '1rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                {activeTerms.map((term, idx) => (
                  <Line
                    key={`line-${term}-${idx}`}
                    type="monotone"
                    dataKey={term}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          {/* Geographic Demand Distribution */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                {isRtl ? 'التوزيع الجغرافي للطلب حسب المحافظة' : 'Geographic Demand Distribution'}
              </h4>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              {GEO_DATA.map((geo, idx) => (
                <div key={`geo-row-${geo.nameAr}-${idx}`} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{isRtl ? geo.nameAr : geo.nameEn}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-black">{geo.growth}</span>
                      <span className="text-slate-400">({geo.demand}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${geo.demand}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakout / Hot Keywords */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                {isRtl ? 'الكلمات المتصاعدة والأعلى نمواً (Breakout)' : 'Breakout & Surging Queries'}
              </h4>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full">
                +150%+ {isRtl ? 'نمو' : 'Growth'}
              </span>
            </div>

            <div className="space-y-2.5">
              {BREAKOUT_KEYWORDS.map((item, idx) => (
                <div
                  key={`breakout-${idx}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-amber-400 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-xs group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                        {isRtl ? item.termAr : item.termEn}
                      </p>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                      {item.growth}
                    </span>
                    <button
                      onClick={() => {
                        if (!activeTerms.includes(isRtl ? item.termAr : item.termEn) && activeTerms.length < 4) {
                          setActiveTerms([...activeTerms, isRtl ? item.termAr : item.termEn]);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                      title={isRtl ? 'إضافة للمقارنة' : 'Add to comparison'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Predictive Market Insights Box */}
        <div className="mt-8 p-6 rounded-3xl bg-gradient-to-r from-indigo-900/10 via-brand-teal/10 to-transparent border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-indigo-600 text-white shrink-0 shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">
                {isRtl ? 'توقعات النواة الذكية للطلب القادم' : 'Neural AI Seasonal Forecast'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {isRtl
                  ? 'يتوقع المحرك العصبي ارتفاع طلب مواد العزل وأنظمة التدفئة بنسبة 35% خلال الـ 45 يوماً القادمة. يُنصح الموردون بتجهيز المخزون ونشر العروض مبكراً.'
                  : 'Neural models project a 35% spike in insulation materials and heating systems over the next 45 days. Suppliers are advised to optimize inventory early.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              {isRtl ? 'دقة التوقع: 94%' : 'Accuracy: 94%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuralMarketTrends;
