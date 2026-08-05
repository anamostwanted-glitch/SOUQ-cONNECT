import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { translateText, addCustomLexiconRule, deleteCustomLexiconRule } from '../../../core/services/geminiService';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Sparkles, 
  ArrowRightLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Search,
  Languages,
  Zap,
  RotateCcw
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { toast } from 'sonner';

interface LexiconRule {
  id: string;
  ar: string;
  en: string;
  source?: string;
  createdAt?: string;
  status?: string;
  isDeleted?: boolean;
}

export const AdminNeuralLexiconManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [rules, setRules] = useState<LexiconRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAr, setNewAr] = useState('');
  const [newEn, setNewEn] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Live Translation Playground State
  const [testInput, setTestInput] = useState('');
  const [testTargetLang, setTestTargetLang] = useState<'English' | 'Arabic'>('English');
  const [testResult, setTestResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'lexicon_custom'), (snap) => {
      const fetched: LexiconRule[] = [];
      snap.forEach((d) => {
        const data = d.data() as LexiconRule;
        if (data.status !== 'deleted' && !data.isDeleted) {
          fetched.push({ ...data, id: d.id });
        }
      });
      setRules(fetched);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lexicon_custom', false);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAr.trim() || !newEn.trim()) {
      toast.error(isRtl ? 'يرجى إدخال النص بالعربية والإنجليزية' : 'Please enter both Arabic and English phrases');
      return;
    }

    try {
      await addCustomLexiconRule(newAr, newEn);
      toast.success(isRtl ? 'تم إضافة المصطلح إلى المعجم بنجاح' : 'Custom lexicon rule added successfully');
      setNewAr('');
      setNewEn('');
    } catch (err) {
      toast.error(isRtl ? 'فشل حفظ المصطلح' : 'Failed to save lexicon rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteCustomLexiconRule(id);
      toast.success(isRtl ? 'تم حذف المصطلح' : 'Rule deleted');
    } catch (err) {
      toast.error(isRtl ? 'فشل حذف المصطلح' : 'Failed to delete rule');
    }
  };

  const handleRunTestTranslation = async () => {
    if (!testInput.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateText(testInput, testTargetLang);
      setTestResult(res);
    } catch (err) {
      toast.error(isRtl ? 'فشلت الترجمة' : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const filteredRules = rules.filter(r => 
    r.ar.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <BookOpen className="w-7 h-7 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isRtl ? 'المعجم العصبي وفحص الترجمة الفوري (Neural Lexicon Hub)' : 'Neural Lexicon & Live Translation Hub'}
              </h2>
              <p className="text-emerald-100/90 text-sm mt-0.5">
                {isRtl 
                  ? 'إدارة مصطلحات المؤسسات والفئات مع محرك الحماية من الترجمة الحرفية (Anti-Transliteration Engine)'
                  : 'Manage dynamic organizational terminology & verify AI translation semantic accuracy'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 border border-white/20 py-1.5 rounded-lg text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>{isRtl ? 'نظام الحماية المعجمية نشط' : 'Neural Protection Active'}</span>
          </div>
        </div>
      </div>

      {/* Grid Layout: Playground & Rule Creator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Translation Testing Sandbox */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {isRtl ? 'مختبر فحص الترجمة الفوري' : 'Live Translation Sandbox'}
              </h3>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              {isRtl ? 'اختبار المحرك' : 'Test Engine'}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {isRtl ? 'النص المطلوب اختباره (مثل: فريق النواة، أجهزة منزلية)' : 'Text to Test (e.g. فريق النواة, Specialty Coffee)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder={isRtl ? 'أدخل المصطلح هنا...' : 'Enter term to test...'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTestTargetLang('English')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    testTargetLang === 'English'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {isRtl ? 'إلى الإنجليزية (En)' : 'To English (En)'}
                </button>
                <button
                  type="button"
                  onClick={() => setTestTargetLang('Arabic')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    testTargetLang === 'Arabic'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {isRtl ? 'إلى العربية (Ar)' : 'To Arabic (Ar)'}
                </button>
              </div>

              <HapticButton
                type="button"
                onClick={handleRunTestTranslation}
                disabled={isTranslating || !testInput.trim()}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-medium rounded-lg shadow-sm hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isTranslating ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Languages className="w-3.5 h-3.5" />
                )}
                <span>{isRtl ? 'فحص الترجمة' : 'Run Test'}</span>
              </HapticButton>
            </div>

            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs space-y-1"
              >
                <div className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isRtl ? 'نتيجة الترجمة المعجمية:' : 'Neural Translation Result:'}</span>
                </div>
                <div className="text-slate-900 dark:text-slate-100 text-sm font-medium pt-1">
                  "{testResult}"
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Add Custom Lexicon Rule Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Plus className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              {isRtl ? 'إضافة مصطلح معجمي مخصص' : 'Add Custom Lexicon Mapping'}
            </h3>
          </div>

          <form onSubmit={handleAddRule} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {isRtl ? 'المصطلح بالعربية' : 'Arabic Phrase'}
                </label>
                <input
                  type="text"
                  value={newAr}
                  onChange={(e) => setNewAr(e.target.value)}
                  placeholder={isRtl ? 'مثال: فريق النواة' : 'e.g. فريق النواة'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {isRtl ? 'الترجمة الإنجليزية المعتمدة' : 'Standard English Translation'}
                </label>
                <input
                  type="text"
                  value={newEn}
                  onChange={(e) => setNewEn(e.target.value)}
                  placeholder={isRtl ? 'مثال: Core Team' : 'e.g. Core Team'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <HapticButton
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'حفظ المصطلح في المعجم الحي' : 'Save Term to Dynamic Lexicon'}</span>
            </HapticButton>
          </form>
        </div>
      </div>

      {/* Rules Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              {isRtl ? 'قائمة مصطلحات المعجم المخصصة' : 'Active Lexicon Dictionary'}
            </h3>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
              {rules.length} {isRtl ? 'مصطلح' : 'terms'}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute top-2.5 left-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'بحث في المصطلحات...' : 'Search lexicon rules...'}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {isRtl ? 'جاري تحميل المعجم...' : 'Loading lexicon dictionary...'}
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {isRtl ? 'لا توجد مصطلحات مخصصة حالياً. المعجم الذكي يضمن دقة المصطلحات الافتراضية.' : 'No custom rules found. The default Neural Lexicon is handling standard translations.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase text-[10px] text-slate-400 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 rounded-l-lg">{isRtl ? 'المصطلح العربي' : 'Arabic Term'}</th>
                  <th className="px-4 py-2.5">{isRtl ? 'الترجمة الإنجليزية' : 'English Translation'}</th>
                  <th className="px-4 py-2.5 text-right rounded-r-lg">{isRtl ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 dir-rtl">
                      {rule.ar}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 dir-ltr">
                      {rule.en}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title={isRtl ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
