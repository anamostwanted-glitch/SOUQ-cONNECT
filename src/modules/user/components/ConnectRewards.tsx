import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Share2, 
  Gift, 
  TrendingUp, 
  DollarSign, 
  Copy, 
  Check, 
  Award,
  Zap,
  ShieldCheck,
  ChevronRight,
  Users,
  BarChart3,
  BrainCircuit,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { UserProfile, SiteSettings } from '../../../core/types';
import { db } from '../../../core/firebase';
import { doc, onSnapshot, updateDoc, increment, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { HapticButton } from '../../../shared/components/HapticButton';
import { soundService, SoundType } from '../../../core/utils/soundService';
import { getProfileInsights } from '../../../core/services/geminiService';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, handleAiError } from '../../../core/utils/errorHandling';

interface ConnectRewardsProps {
  profile: UserProfile;
  settings: SiteSettings;
  onBack: () => void;
}

export const ConnectRewards: React.FC<ConnectRewardsProps> = ({ profile, settings, onBack }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [copied, setCopied] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    viralCoefficient: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(collection(db, 'users'), where('referredBy', '==', profile.uid));
        const snap = await getDocs(q);
        setStats({
          totalReferrals: snap.size,
          activeReferrals: snap.docs.filter(d => d.data().role !== 'customer').length,
          viralCoefficient: (snap.size / 10).toFixed(1) as any
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users', false);
      }
    };
    fetchStats();
  }, [profile.uid]);

  useEffect(() => {
    const generateInsight = async () => {
      setIsGeneratingInsight(true);
      try {
        const prompt = `As a growth marketing AI, analyze this user's referral performance:
          - Points: ${profile.referralPoints || 0}
          - Total Referrals: ${stats.totalReferrals}
          - Language: ${i18n.language}
          Provide a short, motivating, and strategic tip (max 2 sentences) on how to increase their viral growth. 
          Focus on "Connect" branding and "Neural Growth".`;
        
        const result = await getProfileInsights(stats, isRtl ? 'ar' : 'en');
        setAiInsight(result?.summaryAr || result?.summaryEn || (isRtl ? 'شارك رابطك في مجموعات العمل لزيادة فرصك في الربح.' : 'Share your link in business groups to increase your earning potential.'));
      } catch (err) {
        handleAiError(err, 'ConnectRewards:generateInsight', false);
      } finally {
        setIsGeneratingInsight(false);
      }
    };

    if (stats.totalReferrals >= 0) {
      generateInsight();
    }
  }, [stats.totalReferrals, i18n.language]);
  
  const referralLink = `${window.location.origin}?ref=${profile.referralCode || profile.uid}`;
  const pointsToCash = (profile.referralPoints || 0) * (settings.pointsToCashRatio || 0.001);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    soundService.play(SoundType.SUCCESS);
    toast.success(isRtl ? 'تم نسخ الرابط بنجاح' : 'Link copied successfully');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: settings.siteName || 'B2B2C Connect',
          text: isRtl ? 'انضم إلينا واكتشف أفضل المنتجات والخدمات!' : 'Join us and discover the best products and services!',
          url: referralLink,
        });
        // Points are usually awarded on successful sign-up via the link, 
        // but we can add a small "Share Bonus" here if desired.
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  const handleRedeem = async () => {
    if ((profile.referralPoints || 0) < (settings.minWithdrawalAmount || 1000)) {
      toast.error(isRtl ? 'لم تصل للحد الأدنى للسحب بعد' : 'Minimum withdrawal amount not reached');
      return;
    }

    setIsRedeeming(true);
    try {
      // Create a withdrawal request
      await addDoc(collection(db, 'withdrawal_requests'), {
        userId: profile.uid,
        userName: profile.name,
        points: profile.referralPoints,
        amount: pointsToCash,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Reset points (optimistic)
      await updateDoc(doc(db, 'users', profile.uid), {
        referralPoints: 0
      });

      soundService.play(SoundType.SUCCESS);
      toast.success(isRtl ? 'تم تقديم طلب السحب بنجاح' : 'Withdrawal request submitted successfully');
    } catch (err) {
      toast.error(isRtl ? 'فشل تقديم الطلب' : 'Failed to submit request');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto pb-24">
      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-primary to-brand-primary/80 p-8 text-white shadow-2xl shadow-brand-primary/20"
      >
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 opacity-80">
              <Award size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Connect Ambassador</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              {profile.referralPoints || 0}
              <span className="text-lg opacity-60 ml-2 uppercase">Points</span>
            </h1>
            <p className="text-brand-primary-100 font-medium">
              {isRtl ? 'رصيدك الحالي قابل للتحويل إلى كاش' : 'Your current balance is convertible to cash'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 text-center min-w-[200px]">
            <span className="block text-xs opacity-60 uppercase font-bold mb-1">{isRtl ? 'القيمة التقريبية' : 'Estimated Value'}</span>
            <div className="text-3xl font-black flex items-center justify-center gap-1">
              <DollarSign size={24} className="text-brand-primary-200" />
              {pointsToCash.toFixed(2)}
            </div>
            <HapticButton
              onClick={handleRedeem}
              disabled={isRedeeming || (profile.referralPoints || 0) < (settings.minWithdrawalAmount || 1000)}
              className="mt-4 w-full bg-white text-brand-primary hover:bg-brand-primary-50 rounded-2xl py-3 font-black text-sm transition-all disabled:opacity-50"
            >
              {isRedeeming ? '...' : (isRtl ? 'سحب الكاش' : 'Withdraw Cash')}
            </HapticButton>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
      </motion.div>

      {/* Share Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Share2 size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg">{isRtl ? 'شارك واربح' : 'Share & Earn'}</h3>
              <p className="text-sm text-brand-text-muted">{isRtl ? 'احصل على نقاط مقابل كل شخص ينضم عبر رابطك' : 'Get points for every person who joins via your link'}</p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-brand-primary/5 rounded-2xl blur-xl group-hover:bg-brand-primary/10 transition-all" />
            <div className="relative flex items-center gap-2 bg-brand-bg border border-brand-border rounded-2xl p-2 pl-4">
              <span className="flex-1 text-xs font-mono text-brand-text-muted truncate">
                {referralLink}
              </span>
              <HapticButton
                onClick={handleCopy}
                className="bg-brand-surface hover:bg-brand-bg p-3 rounded-xl text-brand-primary transition-colors"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </HapticButton>
            </div>
          </div>

          <HapticButton
            onClick={handleShare}
            className="w-full bg-brand-primary text-white rounded-2xl py-4 font-black flex items-center justify-center gap-3 shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Zap size={20} />
            {isRtl ? 'مشاركة الرابط الآن' : 'Share Link Now'}
          </HapticButton>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg">{isRtl ? 'إحصائيات كونكت' : 'Connect Stats'}</h3>
              <p className="text-sm text-brand-text-muted">{isRtl ? 'تتبع نمو شبكتك وتأثيرك' : 'Track your network growth and impact'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-brand-bg rounded-2xl p-4 border border-brand-border">
              <Users size={16} className="text-brand-primary mb-2" />
              <div className="text-xl font-black">{stats.totalReferrals}</div>
              <div className="text-[10px] text-brand-text-muted uppercase font-bold">{isRtl ? 'إجمالي الإحالات' : 'Total Referrals'}</div>
            </div>
            <div className="bg-brand-bg rounded-2xl p-4 border border-brand-border">
              <BarChart3 size={16} className="text-brand-primary mb-2" />
              <div className="text-xl font-black">{stats.viralCoefficient}x</div>
              <div className="text-[10px] text-brand-text-muted uppercase font-bold">{isRtl ? 'معامل الانتشار' : 'Viral Coeff.'}</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-brand-primary" />
              <span className="text-sm font-bold">{isRtl ? 'حالة الحساب: موثوق' : 'Account Status: Trusted'}</span>
            </div>
            <ChevronRight size={16} className="text-brand-primary" />
          </div>
        </motion.div>
      </div>

      {/* AI Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-brand-surface to-brand-bg border border-brand-border rounded-[2.5rem] p-8 relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
            {isGeneratingInsight ? (
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce delay-150" />
              </div>
            ) : (
              <Zap size={40} className="animate-pulse" />
            )}
          </div>
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-black flex items-center justify-center md:justify-start gap-2">
              {isRtl ? 'توصيات الذكاء الاصطناعي' : 'AI Neural Insights'}
              <span className="bg-brand-primary/10 text-brand-primary text-[10px] px-2 py-1 rounded-full uppercase font-black">AI Powered</span>
            </h3>
            <p className="text-brand-text-muted leading-relaxed">
              {isGeneratingInsight ? (isRtl ? 'جاري تحليل الأنماط العصبية...' : 'Analyzing neural patterns...') : aiInsight}
            </p>
          </div>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--brand-primary) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        </div>
      </motion.div>

      {/* Rules Section */}
      <div className="bg-brand-surface/50 rounded-[2rem] p-8 border border-brand-border/50">
        <h4 className="font-black text-sm uppercase tracking-widest text-brand-text-muted mb-4 flex items-center gap-2">
          <Gift size={14} />
          {isRtl ? 'كيف تعمل المكافآت؟' : 'How Rewards Work?'}
        </h4>
        <ul className="space-y-3 text-sm text-brand-text-muted">
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />
            {isRtl ? `كل إحالة ناجحة تمنحك ${settings.pointsPerShare || 100} نقطة.` : `Each successful referral grants you ${settings.pointsPerShare || 100} points.`}
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />
            {isRtl ? `يمكنك سحب الكاش عند وصولك إلى ${settings.minWithdrawalAmount || 1000} نقطة.` : `You can withdraw cash once you reach ${settings.minWithdrawalAmount || 1000} points.`}
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />
            {isRtl ? 'يتم فحص جميع الإحالات بواسطة الذكاء الاصطناعي لضمان النزاهة.' : 'All referrals are checked by AI to ensure integrity.'}
          </li>
        </ul>
      </div>
    </div>
  );
};
