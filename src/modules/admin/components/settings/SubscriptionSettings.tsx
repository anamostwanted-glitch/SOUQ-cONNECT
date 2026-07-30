import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, onSnapshot, doc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../core/firebase';
import { SubscriptionPlan } from '../../../../core/types';
import { handleFirestoreError, OperationType } from '../../../../core/utils/errorHandling';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Zap, 
  Star, 
  Layers, 
  DollarSign, 
  X, 
  Loader2, 
  Bot, 
  Users, 
  Building2,
  RefreshCw,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const DEFAULT_PLANS: Omit<SubscriptionPlan, 'id'>[] = [
  {
    nameAr: 'الباقة المجانية الأساسية',
    nameEn: 'Basic Free Plan',
    code: 'basic',
    targetRole: 'supplier',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'JOD',
    descriptionAr: 'انطلاقة مثالية للموردين الجدد للربط المباشر مع الطلبات',
    descriptionEn: 'Ideal starting point for new suppliers to connect directly with buyers',
    badgeAr: 'المجانية',
    badgeEn: 'Free',
    featuresAr: [
      'إضافة حتى 10 منتجات / خدمات في المعرض',
      'تقديم حتى 15 عرض سعر شهرياً',
      'التواصل المباشر عبر المحادثات الذكية',
      'نسبة عمولة المنصة 5%',
      'دعم فني عبر البريد الإلكتروني'
    ],
    featuresEn: [
      'Add up to 10 products / services in showcase',
      'Submit up to 15 quotes monthly',
      'Direct smart chat communication',
      'Platform commission fee 5%',
      'Standard email support'
    ],
    isPopular: false,
    isDefault: true,
    maxProductsLimit: 10,
    maxOffersMonthly: 15,
    commissionPercentage: 5,
    aiMatchPriority: false,
    supportLevel: 'standard',
    status: 'active',
    order: 1,
    createdAt: new Date().toISOString()
  },
  {
    nameAr: 'باقة المورد الاحترافي',
    nameEn: 'Pro Supplier Plan',
    code: 'pro',
    targetRole: 'supplier',
    priceMonthly: 25,
    priceYearly: 240,
    currency: 'JOD',
    descriptionAr: 'للموردين والشركات الراغبة بتوسيع المبيعات وأولوية الماتش بالذكاء الاصطناعي',
    descriptionEn: 'For suppliers & companies aiming to scale sales with AI match priority',
    badgeAr: 'الأكثر شعبية ⭐',
    badgeEn: 'Most Popular ⭐',
    featuresAr: [
      'منتجات وخدمات غير محدودة في المعرض',
      'تقديم حتى 100 عرض سعر شهرياً',
      'أولوية ظهور بالذكاء الاصطناعي (AI Predictive Match)',
      'تنبيهات فورية بالواتساب للطلبات الجديدة',
      'نسبة عمولة منخفضة 2.5%',
      'لوحة تحليل أداء الطلبات والمنافسين',
      'دعم فني أولوية عبر الواتساب'
    ],
    featuresEn: [
      'Unlimited products & services in showcase',
      'Submit up to 100 quotes monthly',
      'AI Predictive Match top visibility',
      'Instant WhatsApp notifications for new RFQs',
      'Reduced platform commission 2.5%',
      'Demand & competitor analytics dashboard',
      'Priority WhatsApp support'
    ],
    isPopular: true,
    isDefault: false,
    maxProductsLimit: 9999,
    maxOffersMonthly: 100,
    commissionPercentage: 2.5,
    aiMatchPriority: true,
    supportLevel: 'priority',
    status: 'active',
    order: 2,
    createdAt: new Date().toISOString()
  },
  {
    nameAr: 'باقة النخبة B2B VIP',
    nameEn: 'Enterprise B2B VIP',
    code: 'enterprise',
    targetRole: 'supplier',
    priceMonthly: 60,
    priceYearly: 580,
    currency: 'JOD',
    descriptionAr: 'حلول الشركات الكبرى والمؤسسات، بدون عمولات مبيعات مع مدير حساب خاص',
    descriptionEn: 'Solutions for large enterprises & corporations with zero commission & dedicated manager',
    badgeAr: 'النخبة للمؤسسات',
    badgeEn: 'Enterprise VIP',
    featuresAr: [
      'معرض منتجات وخدمات لا محدود + توثيق شارة المورد المعتمد',
      'تقديم عروض أسعار لا محدودة',
      'عمولة مبيعات 0% (صفر عمولة)',
      'أولوية قصوى في ترشيحات الذكاء الاصطناعي Neural Pulse',
      'مدير حساب خاص لربط الصفقات المباشرة',
      'تصدير وتقارير تحليلية مخصصة للنمو',
      'ربط API ومساعد ذكاء اصطناعي مخصص'
    ],
    featuresEn: [
      'Unlimited showcase + Verified Trust Badge',
      'Unlimited quotes submission',
      '0% Sales commission (Zero Commission)',
      'Top priority in Neural Pulse AI match',
      'Dedicated account manager for direct deals',
      'Custom analytical exports & growth reports',
      'API integration & custom AI assistant'
    ],
    isPopular: false,
    isDefault: false,
    maxProductsLimit: 99999,
    maxOffersMonthly: 99999,
    commissionPercentage: 0,
    aiMatchPriority: true,
    supportLevel: 'dedicated',
    status: 'active',
    order: 3,
    createdAt: new Date().toISOString()
  }
];

export const SubscriptionSettings: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    nameAr: '',
    nameEn: '',
    code: 'pro',
    targetRole: 'supplier',
    priceMonthly: 25,
    priceYearly: 240,
    currency: 'JOD',
    descriptionAr: '',
    descriptionEn: '',
    badgeAr: '',
    badgeEn: '',
    featuresAr: [],
    featuresEn: [],
    isPopular: false,
    isDefault: false,
    maxProductsLimit: 50,
    maxOffersMonthly: 50,
    commissionPercentage: 2.5,
    aiMatchPriority: true,
    supportLevel: 'priority',
    status: 'active',
    order: 1
  });

  const [newFeatureAr, setNewFeatureAr] = useState('');
  const [newFeatureEn, setNewFeatureEn] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'subscription_plans'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: SubscriptionPlan[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SubscriptionPlan;
          if (!data.isDeleted) {
            loaded.push({ id: docSnap.id, ...data });
          }
        });

        // Sort by order
        loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPlans(loaded);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'subscription_plans');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      for (const defaultPlan of DEFAULT_PLANS) {
        await addDoc(collection(db, 'subscription_plans'), defaultPlan);
      }
      toast.success(isRtl ? 'تم زرع خطط الاشتراكات الافتراضية بنجاح' : 'Default subscription plans seeded successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'subscription_plans');
      toast.error(isRtl ? 'حدث خطأ أثناء إضافة الخطط' : 'Failed to seed plans');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({ ...plan });
    } else {
      setEditingPlan(null);
      setFormData({
        nameAr: '',
        nameEn: '',
        code: `plan_${Date.now()}`,
        targetRole: 'supplier',
        priceMonthly: 20,
        priceYearly: 200,
        currency: 'JOD',
        descriptionAr: '',
        descriptionEn: '',
        badgeAr: '',
        badgeEn: '',
        featuresAr: [],
        featuresEn: [],
        isPopular: false,
        isDefault: false,
        maxProductsLimit: 50,
        maxOffersMonthly: 50,
        commissionPercentage: 2.5,
        aiMatchPriority: false,
        supportLevel: 'standard',
        status: 'active',
        order: plans.length + 1
      });
    }
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    if (!newFeatureAr.trim() && !newFeatureEn.trim()) return;
    
    setFormData((prev) => ({
      ...prev,
      featuresAr: [...(prev.featuresAr || []), newFeatureAr.trim() || newFeatureEn.trim()],
      featuresEn: [...(prev.featuresEn || []), newFeatureEn.trim() || newFeatureAr.trim()]
    }));

    setNewFeatureAr('');
    setNewFeatureEn('');
  };

  const handleRemoveFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      featuresAr: (prev.featuresAr || []).filter((_, i) => i !== index),
      featuresEn: (prev.featuresEn || []).filter((_, i) => i !== index)
    }));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr || !formData.nameEn) {
      toast.error(isRtl ? 'يرجى كتابة اسم الخطة باللغتين العربية والإنجليزية' : 'Please provide plan names');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        priceMonthly: Number(formData.priceMonthly || 0),
        priceYearly: Number(formData.priceYearly || 0),
        commissionPercentage: Number(formData.commissionPercentage || 0),
        maxProductsLimit: Number(formData.maxProductsLimit || 0),
        maxOffersMonthly: Number(formData.maxOffersMonthly || 0),
        updatedAt: new Date().toISOString()
      };

      if (editingPlan) {
        await updateDoc(doc(db, 'subscription_plans', editingPlan.id), payload);
        toast.success(isRtl ? 'تم تحديث خطة الاشتراك بنجاح' : 'Subscription plan updated');
      } else {
        await addDoc(collection(db, 'subscription_plans'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        toast.success(isRtl ? 'تم إنشاء خطة اشتراك جديدة' : 'New subscription plan created');
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingPlan ? OperationType.UPDATE : OperationType.WRITE, 'subscription_plans');
      toast.error(isRtl ? 'فشل حفظ البيانات' : 'Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(isRtl ? `هل أنت تأكد من نقل خطة "${plan.nameAr}" إلى الأرشيف؟` : `Are you sure to archive "${plan.nameEn}"?`)) return;

    try {
      await updateDoc(doc(db, 'subscription_plans', plan.id), {
        status: 'inactive',
        isDeleted: true,
        deletedAt: new Date().toISOString()
      });
      toast.success(isRtl ? 'تم أرشفة الخطة بنجاح (Soft Delete)' : 'Plan archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `subscription_plans/${plan.id}`);
      toast.error(isRtl ? 'فشلت عملية الأرشفة' : 'Failed to archive');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-brand-primary/10 via-amber-500/10 to-brand-primary/5 border border-brand-primary/20 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-brand-text-main flex items-center gap-2">
              {isRtl ? 'إدارة خطط الاشتراكات والأسعار' : 'Subscription Plans & Pricing Manager'}
              <span className="px-2.5 py-0.5 bg-brand-primary/10 text-brand-primary text-xs font-extrabold rounded-full">
                JOD - الدينار الأردني
              </span>
            </h2>
            <p className="text-xs text-brand-text-muted font-bold mt-1">
              {isRtl 
                ? 'تحكم ديناميكي كامل في باقات الموردين والمشتركين، العمولات، ومميزات الذكاء الاصطناعي' 
                : 'Full dynamic control over supplier/user tiers, commission rates, and AI match privileges'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {plans.length === 0 && (
            <HapticButton
              onClick={handleSeedDefaults}
              className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md hover:bg-amber-600 transition-all"
            >
              <RefreshCw size={16} />
              <span>{isRtl ? 'زرع الخطط الافتراضية' : 'Seed Default Plans'}</span>
            </HapticButton>
          )}

          <HapticButton
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all"
          >
            <Plus size={18} />
            <span>{isRtl ? 'إضافة خطة اشتراك جديدة' : 'Add New Plan'}</span>
          </HapticButton>
        </div>
      </div>

      {/* Grid of Plans */}
      {loading ? (
        <div className="p-12 text-center text-brand-text-muted">
          <Loader2 size={32} className="animate-spin mx-auto mb-3 text-brand-primary" />
          <span className="text-xs font-bold">{isRtl ? 'جاري تحميل خطط الاشتراكات...' : 'Loading subscription plans...'}</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-brand-surface border border-brand-border rounded-3xl space-y-4">
          <Layers size={48} className="mx-auto text-brand-text-muted opacity-40" />
          <div>
            <h3 className="text-base font-black text-brand-text-main">{isRtl ? 'لا توجد خطط اشتراك مسجلة حالياً' : 'No Subscription Plans Configured'}</h3>
            <p className="text-xs text-brand-text-muted mt-1">{isRtl ? 'يمكنك إما إضافة خطة مخصصة أو زرع الباقات الافتراضية بنقرة واحدة' : 'Click below to seed standard default plans or create custom tiers'}</p>
          </div>
          <HapticButton
            onClick={handleSeedDefaults}
            className="px-6 py-3 bg-brand-primary text-white rounded-2xl text-xs font-black inline-flex items-center gap-2 shadow-lg"
          >
            <Sparkles size={16} />
            <span>{isRtl ? 'تفعيل الخطط الافتراضية بالدينار الأردني' : 'Activate Default JOD Plans'}</span>
          </HapticButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-brand-surface border rounded-3xl p-6 flex flex-col justify-between transition-all hover:shadow-xl ${
                plan.isPopular 
                  ? 'border-brand-primary ring-2 ring-brand-primary/20 shadow-lg' 
                  : 'border-brand-border'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-primary text-white text-[10px] font-black rounded-full shadow-md uppercase tracking-wider flex items-center gap-1">
                  <Star size={12} className="fill-white" />
                  {isRtl ? plan.badgeAr || 'الأكثر شعبية' : plan.badgeEn || 'Popular'}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                    plan.targetRole === 'supplier' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {plan.targetRole === 'supplier' ? (isRtl ? 'للموردين' : 'Suppliers') : (isRtl ? 'للمستخدمين' : 'Customers')}
                  </span>
                  {plan.isDefault && (
                    <span className="px-2 py-0.5 bg-gray-500/10 text-gray-500 text-[9px] font-black rounded">
                      {isRtl ? 'الباقة الافتراضية' : 'Default'}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black text-brand-text-main">{isRtl ? plan.nameAr : plan.nameEn}</h3>
                <p className="text-xs text-brand-text-muted mt-1 min-h-[32px] font-bold">
                  {isRtl ? plan.descriptionAr : plan.descriptionEn}
                </p>

                {/* Price Display */}
                <div className="my-6 p-4 bg-brand-background rounded-2xl border border-brand-border flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-black text-brand-primary">{plan.priceMonthly}</span>
                    <span className="text-xs font-bold text-brand-text-muted ml-1 uppercase">{plan.currency || 'JOD'}</span>
                    <span className="text-[10px] text-brand-text-muted font-bold block">{isRtl ? '/ شهرياً' : '/ monthly'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-brand-text-main">{plan.priceYearly} {plan.currency || 'JOD'}</span>
                    <span className="text-[10px] text-brand-text-muted font-bold block">{isRtl ? '/ سنوياً' : '/ yearly'}</span>
                  </div>
                </div>

                {/* Metrics Badges */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <div className="p-2.5 bg-brand-surface rounded-xl border border-brand-border text-[11px] font-bold text-brand-text-main">
                    <span className="text-brand-text-muted block text-[9px]">{isRtl ? 'العمولة' : 'Commission'}</span>
                    {plan.commissionPercentage}%
                  </div>
                  <div className="p-2.5 bg-brand-surface rounded-xl border border-brand-border text-[11px] font-bold text-brand-text-main">
                    <span className="text-brand-text-muted block text-[9px]">{isRtl ? 'عروض شهرياً' : 'Monthly Quotes'}</span>
                    {plan.maxOffersMonthly > 9000 ? (isRtl ? 'غير محدود' : 'Unlimited') : plan.maxOffersMonthly}
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 mb-6">
                  <div className="text-xs font-black text-brand-text-main flex items-center gap-1.5">
                    <Zap size={14} className="text-brand-primary" />
                    {isRtl ? 'المميزات المتضمنة:' : 'Included Features:'}
                  </div>
                  <ul className="space-y-2">
                    {(isRtl ? plan.featuresAr : plan.featuresEn)?.map((feat, idx) => (
                      <li key={idx} className="text-xs text-brand-text-main flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-brand-border flex items-center justify-between gap-2">
                <HapticButton
                  onClick={() => handleOpenModal(plan)}
                  className="flex-1 py-2.5 bg-brand-background border border-brand-border hover:border-brand-primary rounded-xl text-xs font-bold text-brand-text-main flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit3 size={14} />
                  <span>{isRtl ? 'تعديل الخطة' : 'Edit Plan'}</span>
                </HapticButton>

                <HapticButton
                  onClick={() => handleSoftDelete(plan)}
                  className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
                  title={isRtl ? 'أرشفة الخطة' : 'Archive Plan'}
                >
                  <Trash2 size={16} />
                </HapticButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface w-full max-w-2xl rounded-3xl border border-brand-border shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 bg-brand-background border-b border-brand-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-brand-text-main">
                      {editingPlan 
                        ? (isRtl ? `تعديل خطة: ${editingPlan.nameAr}` : `Edit Plan: ${editingPlan.nameEn}`) 
                        : (isRtl ? 'إضافة خطة اشتراك جديدة' : 'Create New Subscription Plan')}
                    </h3>
                    <p className="text-xs text-brand-text-muted font-bold">
                      {isRtl ? 'حدد السعر بالدينار الأردني والعمولات والمميزات' : 'Set price in JOD, commissions and features'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-brand-text-muted hover:text-brand-text-main">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'اسم الباقة بالعربية *' : 'Plan Name (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nameAr || ''}
                      onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                      className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none focus:border-brand-primary"
                      placeholder="مثال: باقة المورد الفضية"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'اسم الباقة بالإنجليزية *' : 'Plan Name (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nameEn || ''}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none focus:border-brand-primary"
                      placeholder="e.g. Silver Supplier Tier"
                    />
                  </div>
                </div>

                {/* Pricing & Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-brand-background rounded-2xl border border-brand-border">
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'السعر الشهري' : 'Monthly Price'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.priceMonthly || 0}
                      onChange={(e) => setFormData({ ...formData, priceMonthly: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 bg-brand-surface rounded-xl border border-brand-border text-xs font-black text-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'السعر السنوي' : 'Yearly Price'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.priceYearly || 0}
                      onChange={(e) => setFormData({ ...formData, priceYearly: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 bg-brand-surface rounded-xl border border-brand-border text-xs font-black text-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'العملة' : 'Currency'}
                    </label>
                    <select
                      value={formData.currency || 'JOD'}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full p-3 bg-brand-surface rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none"
                    >
                      <option value="JOD">JOD - دينار أردني</option>
                      <option value="SAR">SAR - ريال سعودي</option>
                      <option value="USD">USD - دولار أمريكي</option>
                      <option value="AED">AED - درهم إماراتي</option>
                    </select>
                  </div>
                </div>

                {/* Commission & Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'نسبة العمولة (%)' : 'Commission (%)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.commissionPercentage || 0}
                      onChange={(e) => setFormData({ ...formData, commissionPercentage: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'حد المنتجات' : 'Max Products Limit'}
                    </label>
                    <input
                      type="number"
                      value={formData.maxProductsLimit || 0}
                      onChange={(e) => setFormData({ ...formData, maxProductsLimit: parseInt(e.target.value) || 0 })}
                      className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'حد العروض شهرياً' : 'Max Monthly Quotes'}
                    </label>
                    <input
                      type="number"
                      value={formData.maxOffersMonthly || 0}
                      onChange={(e) => setFormData({ ...formData, maxOffersMonthly: parseInt(e.target.value) || 0 })}
                      className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none"
                    />
                  </div>
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'الوصف بالعربية' : 'Description (Arabic)'}
                    </label>
                    <textarea
                      rows={2}
                      value={formData.descriptionAr || ''}
                      onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                      className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-brand-text-main block mb-1">
                      {isRtl ? 'الوصف بالإنجليزية' : 'Description (English)'}
                    </label>
                    <textarea
                      rows={2}
                      value={formData.descriptionEn || ''}
                      onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                      className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none"
                    />
                  </div>
                </div>

                {/* Features Builder */}
                <div className="space-y-3 p-4 bg-brand-background rounded-2xl border border-brand-border">
                  <label className="text-xs font-black text-brand-text-main block">
                    {isRtl ? 'إدارة مميزات الخطة' : 'Plan Features Management'}
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={isRtl ? 'ميزة بالعربية...' : 'Feature in Arabic...'}
                      value={newFeatureAr}
                      onChange={(e) => setNewFeatureAr(e.target.value)}
                      className="flex-1 p-2.5 bg-brand-surface rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none"
                    />
                    <input
                      type="text"
                      placeholder={isRtl ? 'ميزة بالإنجليزية...' : 'Feature in English...'}
                      value={newFeatureEn}
                      onChange={(e) => setNewFeatureEn(e.target.value)}
                      className="flex-1 p-2.5 bg-brand-surface rounded-xl border border-brand-border text-xs font-bold text-brand-text-main outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="px-4 py-2 bg-brand-primary text-white text-xs font-black rounded-xl hover:bg-brand-primary/90"
                    >
                      {isRtl ? 'إضافة' : 'Add'}
                    </button>
                  </div>

                  {/* Added Features List */}
                  <div className="space-y-2 max-h-40 overflow-y-auto pt-2">
                    {formData.featuresAr?.map((feat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-brand-surface rounded-xl border border-brand-border text-xs font-bold text-brand-text-main">
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-emerald-500" />
                          <span>{feat} {formData.featuresEn?.[idx] && `(${formData.featuresEn[idx]})`}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveFeature(idx)} className="text-red-500 hover:text-red-700">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggles & Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 bg-brand-background rounded-xl border border-brand-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPopular || false}
                      onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                      className="w-4 h-4 text-brand-primary accent-brand-primary rounded"
                    />
                    <span className="text-xs font-bold text-brand-text-main">
                      {isRtl ? 'تمييز كباقة الأكثر شعبية (Popular Badge)' : 'Mark as Popular Plan'}
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-brand-background rounded-xl border border-brand-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.aiMatchPriority || false}
                      onChange={(e) => setFormData({ ...formData, aiMatchPriority: e.target.checked })}
                      className="w-4 h-4 text-brand-primary accent-brand-primary rounded"
                    />
                    <span className="text-xs font-bold text-brand-text-main">
                      {isRtl ? 'أولوية الظهور بالذكاء الاصطناعي (AI Priority Match)' : 'AI Match Priority Visibility'}
                    </span>
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-brand-border flex items-center gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 bg-brand-background border border-brand-border rounded-xl text-xs font-bold text-brand-text-main hover:bg-brand-surface"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <HapticButton
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-3 bg-brand-primary text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-brand-primary/20"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    <span>{isRtl ? 'حفظ وتطبيق الخطة' : 'Save & Deploy Plan'}</span>
                  </HapticButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
