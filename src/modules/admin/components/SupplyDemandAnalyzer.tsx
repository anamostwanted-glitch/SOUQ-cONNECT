import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  BarChart3, 
  ArrowRight,
  Users,
  ShoppingBag,
  Target,
  Zap,
  BookOpen,
  Search
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { Category, ProductRequest, UserProfile } from '../../../core/types';
import { analyzeSupplyDemandGap, handleAiError } from '../../../core/services/geminiService';
import { toast } from 'sonner';

import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface SupplyDemandAnalyzerProps {
  categories: Category[];
  allUsers: UserProfile[];
  onManageKeywords?: (category: Category) => void;
}

export const SupplyDemandAnalyzer: React.FC<SupplyDemandAnalyzerProps> = ({ categories, allUsers, onManageKeywords }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const requestsSnap = await getDocs(collection(db, 'requests'));
        const fetchedRequests = requestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest));
        setRequests(fetchedRequests);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'requests', false);
        toast.error(isRtl ? 'فشل تحميل بيانات الطلبات' : 'Failed to load requests data');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const suppliers = allUsers.filter(u => u.role === 'supplier');
      const result = await analyzeSupplyDemandGap(categories, requests, suppliers, i18n.language);
      setAnalysisResult(result);
      toast.success(isRtl ? 'اكتمل التحليل بنجاح' : 'Analysis completed successfully');
    } catch (error) {
      handleAiError(error, 'Supply-demand gap analysis');
      toast.error(isRtl ? 'فشل إجراء التحليل' : 'Failed to run analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="animate-spin text-brand-primary" size={48} />
        <p className="text-brand-text-muted font-black uppercase tracking-widest text-xs">
          {isRtl ? 'جاري تحضير البيانات...' : 'Preparing data...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-brand-text-main flex items-center gap-3">
            <BarChart3 className="text-brand-primary" />
            {isRtl ? 'تحليل فجوة العرض والطلب' : 'Supply-Demand Gap Analysis'}
          </h2>
          <p className="text-brand-text-muted text-sm max-w-xl">
            {isRtl 
              ? 'تحليل ذكي للعلاقة بين طلبات المنتجات وتوفر الموردين لتحديد الفرص الضائعة والمجالات التي تحتاج لزيادة الموردين.' 
              : 'Smart analysis of the relationship between product requests and supplier availability to identify missed opportunities.'}
          </p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-3 px-8 py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 shrink-0"
        >
          {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          {isRtl ? 'بدء التحليل الذكي' : 'Start AI Analysis'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isAnalyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-20 space-y-6 bg-brand-surface/50 rounded-[3rem] border border-brand-border border-dashed"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-primary animate-pulse" size={32} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-brand-text-main">
                {isRtl ? 'جاري معالجة البيانات...' : 'Processing Market Data...'}
              </h3>
              <p className="text-sm text-brand-text-muted max-w-xs mx-auto">
                {isRtl 
                  ? 'يقوم الذكاء الاصطناعي الآن بمقارنة آلاف الطلبات مع قاعدة بيانات الموردين لتحديد الفجوات.' 
                  : 'AI is comparing thousands of requests with the supplier database to identify gaps.'}
              </p>
            </div>
          </motion.div>
        ) : analysisResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm space-y-6">
                  <h3 className="text-lg font-black text-brand-text-main flex items-center gap-2">
                    <Target className="text-brand-primary" />
                    {isRtl ? 'التحليل الاستراتيجي' : 'Strategic Analysis'}
                  </h3>
                  <div className="prose prose-sm max-w-none dark:prose-invert text-brand-text-main leading-relaxed">
                    {isRtl ? analysisResult.analysisAr : analysisResult.analysisEn}
                  </div>
                </div>

                <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm space-y-6">
                  <h3 className="text-lg font-black text-brand-text-main flex items-center gap-2">
                    <Zap className="text-brand-primary" />
                    {isRtl ? 'الفجوات المكتشفة حسب الفئات' : 'Detected Gaps by Category'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisResult.gaps.map((gap: any) => {
                      const category = categories.find(c => c.id === gap.categoryId);
                      return (
                        <div key={`gap-${gap.categoryId}`} className="p-4 bg-brand-background rounded-2xl border border-brand-border flex items-center justify-between group hover:border-brand-primary/50 transition-all">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-brand-text-main">
                              {isRtl ? category?.nameAr : category?.nameEn}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-brand-text-muted flex items-center gap-1">
                                <ShoppingBag size={10} />
                                {isRtl ? 'الطلب: ' : 'Demand: '} {gap.demandScore}
                              </span>
                              <span className="text-[10px] font-bold text-brand-text-muted flex items-center gap-1">
                                <Users size={10} />
                                {isRtl ? 'العرض: ' : 'Supply: '} {gap.supplyScore}
                              </span>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            gap.gapLevel === 'high' ? 'bg-brand-error/10 text-brand-error' :
                            gap.gapLevel === 'medium' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {gap.gapLevel} {isRtl ? 'فجوة' : 'Gap'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-brand-primary p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl shadow-brand-primary/20">
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <Sparkles size={20} />
                    {isRtl ? 'توصيات النمو' : 'Growth Recommendations'}
                  </h3>
                  <div className="space-y-4">
                    {(isRtl ? analysisResult.recommendationsAr : analysisResult.recommendationsEn).map((rec: string, i: number) => (
                      <div key={`rec-${i}`} className="flex gap-3 items-start group">
                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-all">
                          <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
                        </div>
                        <p className="text-xs font-bold leading-relaxed opacity-90">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                    {isRtl ? 'إحصائيات سريعة' : 'Quick Stats'}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-brand-text-muted">{isRtl ? 'إجمالي الطلبات' : 'Total Requests'}</span>
                      <span className="text-sm font-black text-brand-text-main">{requests.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-brand-text-muted">{isRtl ? 'إجمالي الموردين' : 'Total Suppliers'}</span>
                      <span className="text-sm font-black text-brand-text-main">{allUsers.filter(u => u.role === 'supplier').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-brand-text-muted">{isRtl ? 'الفئات النشطة' : 'Active Categories'}</span>
                      <span className="text-sm font-black text-brand-text-main">{categories.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Neural Lexicon: Learned Keywords Section */}
            <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm space-y-8">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-brand-text-main flex items-center gap-3">
                        <BookOpen className="text-brand-primary" />
                        {isRtl ? 'معجم الكلمات الذكي (Lexicon)' : 'Neural Lexicon'}
                    </h3>
                    <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider">
                        {isRtl ? 'الكلمات المفتاحية التي تم تعلمها من بحث المستخدمين' : 'Keywords learned from user search behavior'}
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-brand-primary/5 rounded-xl border border-brand-primary/10">
                    <div className="text-[10px] font-black text-brand-primary uppercase tracking-widest leading-none mb-1">
                        {isRtl ? 'إجمالي الكلمات المتعلمة' : 'Total Learned'}
                    </div>
                    <div className="text-lg font-black text-brand-primary leading-none">
                        {categories.reduce((acc, cat) => acc + (cat.suggestedKeywords?.length || 0), 0)}
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.filter(c => c.suggestedKeywords && c.suggestedKeywords.length > 0).map(cat => (
                    <div key={`lex-${cat.id}`} className="group p-6 bg-brand-background rounded-[2rem] border border-brand-border hover:border-brand-primary/30 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                          <Search size={16} />
                        </div>
                        <p className="font-black text-brand-text-main text-sm truncate">
                          {isRtl ? cat.nameAr : cat.nameEn}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {cat.suggestedKeywords?.map((kw, i) => (
                          <span 
                            key={`${cat.id}-kw-${i}`}
                            className="px-3 py-1 bg-brand-surface border border-brand-border rounded-full text-[10px] font-bold text-brand-text-muted group-hover:border-brand-primary/20 transition-colors"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>

                      <div className="mt-6 pt-4 border-t border-brand-border/50 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-brand-text-muted">
                           {isRtl ? 'تحسين SEO للفئة؟' : 'Optimize SEO for Category?'}
                        </p>
                        <button 
                          onClick={() => onManageKeywords?.(cat)}
                          className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-sm group-hover:scale-110"
                        >
                          <Zap size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
               </div>

               {categories.every(cat => !cat.suggestedKeywords || cat.suggestedKeywords.length === 0) && (
                 <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-brand-background rounded-2xl flex items-center justify-center mx-auto text-brand-text-muted/30">
                        <BookOpen size={32} />
                    </div>
                    <p className="text-sm font-bold text-brand-text-muted">
                        {isRtl ? 'لا توجد كلمات مفتاحية متعلمة بعد. ابدأ بالبحث في الموقع لتغذية الحصيلة المعرفية.' : 'No learned keywords yet. Start searching to feed the knowledge base.'}
                    </p>
                 </div>
               )}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 space-y-6 bg-brand-surface rounded-[3rem] border border-brand-border border-dashed opacity-60">
            <div className="w-20 h-20 bg-brand-background rounded-[2rem] flex items-center justify-center text-brand-text-muted/20">
              <BarChart3 size={40} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-brand-text-main">
                {isRtl ? 'جاهز للتحليل' : 'Ready for Analysis'}
              </h3>
              <p className="text-sm text-brand-text-muted max-w-xs mx-auto">
                {isRtl 
                  ? 'اضغط على الزر أعلاه للبدء في تحليل فجوة العرض والطلب في منصتك.' 
                  : 'Click the button above to start analyzing the supply-demand gap in your platform.'}
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
