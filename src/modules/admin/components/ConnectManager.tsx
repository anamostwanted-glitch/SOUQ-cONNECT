import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Gift, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
  BarChart3,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Save,
  Loader2,
  BrainCircuit
} from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile, SiteSettings } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

import { analyzeWithdrawalFraud } from '../../../core/services/geminiService';

interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  points: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  fraudScore?: number;
  fraudAnalysis?: string;
  fraudStatus?: 'safe' | 'suspicious' | 'high_risk';
  fraudRecommendations?: string[];
}

export const ConnectManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalWithdrawals: 0,
    activeAmbassadors: 0,
    viralGrowthRate: 0
  });

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  useEffect(() => {
    // Listen to settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SiteSettings);
      }
    });

    // Listen to withdrawals
    let unsubWithdrawals = () => {};
    try {
      const qWithdrawals = query(collection(db, 'withdrawal_requests'), orderBy('createdAt', 'desc'), limit(50));
      unsubWithdrawals = onSnapshot(qWithdrawals, (snap) => {
        setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest)));
        setLoading(false);
      }, (error) => {
        console.error('Withdrawals listener error:', error);
        handleFirestoreError(error, OperationType.LIST, 'withdrawal_requests', false);
        setLoading(false);
      });
    } catch (err) {
      console.error('Failed to setup withdrawals listener:', err);
      setLoading(false);
    }

    // Fetch Stats
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('referralPoints', '>', 0)));
        let total = 0;
        usersSnap.forEach(d => total += (d.data().referralPoints || 0));
        
        // Also fetch total withdrawals count from collection size (approximate)
        const withdrawalsSnap = await getDocs(collection(db, 'withdrawal_requests'));
        const approvedWithdrawals = withdrawalsSnap.docs.filter(d => d.data().status === 'approved');
        const totalCashOut = approvedWithdrawals.reduce((sum, d) => sum + (d.data().amount || 0), 0);

        setStats({
          totalPoints: total,
          totalWithdrawals: totalCashOut,
          activeAmbassadors: usersSnap.size,
          viralGrowthRate: usersSnap.size > 0 ? (usersSnap.size * 1.5).toFixed(1) as any : 0
        });
      } catch (err) {
        console.error('Stats error:', err);
      }
    };
    fetchStats();

    return () => {
      unsubSettings();
      unsubWithdrawals();
    };
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), settings, { merge: true });
      toast.success(isRtl ? 'تم حفظ إعدادات كونكت بنجاح' : 'Connect settings saved successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/site', false);
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyzeFraud = async (req: WithdrawalRequest) => {
    setAnalyzingId(req.id);
    try {
      // Fetch user profile and recent withdrawals for context
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', req.userId)));
      const userProfile = userDoc.docs[0]?.data();
      
      const recentWithdrawals = withdrawals.filter(w => w.userId === req.userId && w.id !== req.id);
      
      const result = await analyzeWithdrawalFraud(req, userProfile, recentWithdrawals);
      
      await updateDoc(doc(db, 'withdrawal_requests', req.id), {
        fraudScore: result.fraudScore,
        fraudAnalysis: result.analysis,
        fraudStatus: result.status,
        fraudRecommendations: result.recommendations
      });
      
      toast.success(isRtl ? 'اكتمل تحليل الاحتيال' : 'Fraud analysis completed');
    } catch (error) {
      console.error('Fraud analysis error:', error);
      toast.error(isRtl ? 'فشل التحليل' : 'Analysis failed');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleUpdateWithdrawal = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'withdrawal_requests', id), { status });
      toast.success(isRtl ? 'تم تحديث حالة الطلب' : 'Request status updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `withdrawal_requests/${id}`, false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-text-main tracking-tight flex items-center gap-3">
            <Zap className="text-brand-primary" />
            {isRtl ? 'إدارة نمو كونكت' : 'Connect Growth Manager'}
          </h1>
          <p className="text-brand-text-muted mt-1 font-medium">
            {isRtl ? 'تحكم في نظام الإحالات والمكافآت الذكي' : 'Control the smart referral and rewards system'}
          </p>
        </div>
        <HapticButton
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {isRtl ? 'حفظ التغييرات' : 'Save Changes'}
        </HapticButton>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isRtl ? 'إجمالي النقاط' : 'Total Points', value: stats.totalPoints, icon: Gift, color: 'text-brand-primary' },
          { label: isRtl ? 'السحوبات الكلية' : 'Total Withdrawals', value: `$${stats.totalWithdrawals}`, icon: DollarSign, color: 'text-emerald-500' },
          { label: isRtl ? 'السفراء النشطون' : 'Active Ambassadors', value: stats.activeAmbassadors, icon: Users, color: 'text-amber-500' },
          { label: isRtl ? 'معدل النمو الفيروسي' : 'Viral Growth Rate', value: `${stats.viralGrowthRate}%`, icon: TrendingUp, color: 'text-indigo-500' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-brand-surface border border-brand-border p-6 rounded-[2rem] shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center mb-4 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div className="text-2xl font-black text-brand-text-main">{stat.value}</div>
            <div className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
              <Settings className="text-brand-primary" size={20} />
              <h2 className="font-black text-lg">{isRtl ? 'إعدادات المكافآت' : 'Reward Settings'}</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-brand-background rounded-2xl border border-brand-border">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-brand-text-main">{isRtl ? 'تفعيل النظام' : 'Enable System'}</span>
                  <span className="text-[10px] font-bold text-brand-text-muted uppercase">{isRtl ? 'تشغيل نظام الإحالات' : 'Turn on referral system'}</span>
                </div>
                <button
                  onClick={() => setSettings(s => s ? { ...s, enableNexusRewards: !s.enableNexusRewards } : null)}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings?.enableNexusRewards ? 'bg-brand-primary' : 'bg-brand-border'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings?.enableNexusRewards ? (isRtl ? 'right-7' : 'left-7') : (isRtl ? 'right-1' : 'left-1')}`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-2">
                  {isRtl ? 'نقاط لكل إحالة' : 'Points per Referral'}
                </label>
                <input
                  type="number"
                  value={settings?.pointsPerShare || 0}
                  onChange={e => setSettings(s => s ? { ...s, pointsPerShare: parseInt(e.target.value) } : null)}
                  className="w-full bg-brand-background border border-brand-border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-2">
                  {isRtl ? 'نسبة التحويل (نقطة = $)' : 'Cash Ratio (Points = $)'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={settings?.pointsToCashRatio || 0}
                  onChange={e => setSettings(s => s ? { ...s, pointsToCashRatio: parseFloat(e.target.value) } : null)}
                  className="w-full bg-brand-background border border-brand-border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-2">
                  {isRtl ? 'الحد الأدنى للسحب' : 'Min Withdrawal'}
                </label>
                <input
                  type="number"
                  value={settings?.minWithdrawalAmount || 0}
                  onChange={e => setSettings(s => s ? { ...s, minWithdrawalAmount: parseInt(e.target.value) } : null)}
                  className="w-full bg-brand-background border border-brand-border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
          </div>

          {/* AI Growth Insight */}
          <div className="bg-gradient-to-br from-brand-primary to-brand-primary/80 rounded-[2rem] p-8 text-white relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 opacity-80">
                <Zap size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">AI Viral Analysis</span>
              </div>
              <h3 className="text-xl font-black leading-tight">
                {isRtl ? 'نمو فيروسي متوقع بنسبة 40%' : 'Expected 40% Viral Growth'}
              </h3>
              <p className="text-sm text-brand-primary-100 leading-relaxed">
                {isRtl 
                  ? 'بناءً على حملاتك الحالية، نوصي بزيادة مكافأة "الإحالة الأولى" بنسبة 10% لتحفيز المستخدمين الجدد.' 
                  : 'Based on current campaigns, we recommend increasing the "First Referral" bonus by 10% to incentivize new users.'}
              </p>
              <HapticButton className="bg-white text-brand-primary px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                {isRtl ? 'تطبيق التوصية' : 'Apply Recommendation'}
              </HapticButton>
            </div>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* Withdrawal Requests Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 min-h-[600px]">
            <div className="flex items-center justify-between pb-4 border-b border-brand-border mb-6">
              <div className="flex items-center gap-3">
                <DollarSign className="text-brand-primary" size={20} />
                <h2 className="font-black text-lg">{isRtl ? 'طلبات السحب' : 'Withdrawal Requests'}</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
                  <input 
                    type="text" 
                    placeholder={isRtl ? 'بحث...' : 'Search...'}
                    className="bg-brand-background border border-brand-border rounded-xl py-2 pl-9 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <HapticButton className="p-2 bg-brand-background border border-brand-border rounded-xl text-brand-text-muted">
                  <Filter size={16} />
                </HapticButton>
              </div>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {withdrawals.length > 0 ? withdrawals.map((req) => (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col gap-4 p-6 bg-brand-background border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black">
                          {req.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-brand-text-main">{req.userName}</div>
                          <div className="text-[10px] text-brand-text-muted font-bold flex items-center gap-2">
                            <Clock size={10} />
                            {new Date(req.createdAt).toLocaleDateString(i18n.language)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <div className="text-lg font-black text-brand-text-main flex items-center gap-1">
                            <DollarSign size={16} className="text-emerald-500" />
                            {req.amount.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">{req.points} Points</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {req.status === 'pending' ? (
                            <>
                              <HapticButton
                                onClick={() => handleAnalyzeFraud(req)}
                                disabled={analyzingId === req.id}
                                className={`p-2 rounded-xl transition-all ${
                                  req.fraudStatus === 'high_risk' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 
                                  req.fraudStatus === 'suspicious' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                                  'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white hover:shadow-lg hover:shadow-brand-primary/20'
                                }`}
                                title={isRtl ? 'القرار الذكي بالذكاء الاصطناعي' : 'AI Smart Verdict'}
                              >
                                {analyzingId === req.id ? <Loader2 size={20} className="animate-spin" /> : <BrainCircuit size={20} />}
                              </HapticButton>
                              <HapticButton
                                onClick={() => handleUpdateWithdrawal(req.id, 'approved')}
                                className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                <CheckCircle2 size={20} />
                              </HapticButton>
                              <HapticButton
                                onClick={() => handleUpdateWithdrawal(req.id, 'rejected')}
                                className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                              >
                                <XCircle size={20} />
                              </HapticButton>
                            </>
                          ) : (
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {req.status}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fraud Analysis Result */}
                    {req.fraudScore !== undefined && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`p-4 rounded-xl border ${
                          req.fraudStatus === 'high_risk' ? 'bg-red-500/5 border-red-500/20' : 
                          req.fraudStatus === 'suspicious' ? 'bg-amber-500/5 border-amber-500/20' :
                          'bg-emerald-500/5 border-emerald-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            req.fraudStatus === 'high_risk' ? 'bg-red-500/20 text-red-500' : 
                            req.fraudStatus === 'suspicious' ? 'bg-amber-500/20 text-amber-500' :
                            'bg-emerald-500/20 text-emerald-500'
                          }`}>
                            <ShieldCheck size={16} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-widest">AI Fraud Score: {req.fraudScore}/100</span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                req.fraudStatus === 'high_risk' ? 'bg-red-500 text-white' : 
                                req.fraudStatus === 'suspicious' ? 'bg-amber-500 text-white' :
                                'bg-emerald-500 text-white'
                              }`}>
                                {req.fraudStatus?.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-brand-text-muted leading-relaxed italic">
                              "{req.fraudAnalysis}"
                            </p>
                            {req.fraudRecommendations && req.fraudRecommendations.length > 0 && (
                              <div className="pt-2 flex flex-wrap gap-2">
                                {req.fraudRecommendations.map((rec, idx) => (
                                  <span key={idx} className="text-[9px] bg-white/50 border border-brand-border px-2 py-1 rounded-md font-bold text-brand-text-main">
                                    • {rec}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-brand-text-muted">
                    <BarChart3 size={48} className="opacity-20 mb-4" />
                    <p className="font-bold">{isRtl ? 'لا توجد طلبات سحب حالياً' : 'No withdrawal requests yet'}</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
