import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { GeminiApiKey } from '../../../core/types';
import { handleAiError } from '../../../core/services/geminiService';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Key
} from 'lucide-react';
import { AdminNeuralHealthDashboard } from './AdminNeuralHealthDashboard';
import { AdminNeuralAlertDashboard } from './AdminNeuralAlertDashboard';
import { HapticButton } from '../../../shared/components/HapticButton';
import { toast } from 'sonner';

export const AdminNeuralHub: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [keys, setKeys] = useState<GeminiApiKey[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'gemini_config'), (docSnap) => {
      if (docSnap.exists()) {
        setKeys(docSnap.data().keys || []);
      } else {
        setKeys([]);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/gemini_config', false);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const saveKeys = async (updatedKeys: GeminiApiKey[]) => {
    try {
      await setDoc(doc(db, 'settings', 'gemini_config'), { 
        keys: updatedKeys,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/gemini_config', false);
      toast.error(isRtl ? 'فشل حفظ المفاتيح' : 'Failed to save keys');
    }
  };

  const handleAddKey = async () => {
    if (!newKey.trim()) return;
    
    const id = Math.random().toString(36).substring(2, 15);
    const keyData: GeminiApiKey = {
      id,
      key: newKey.trim(),
      label: newLabel.trim() || (isRtl ? `محرك ${keys.length + 1}` : `Engine ${keys.length + 1}`),
      status: 'testing',
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    const updatedKeys = [...keys, keyData];
    setKeys(updatedKeys);
    setNewKey('');
    setNewLabel('');
    await saveKeys(updatedKeys);
    
    // Automatically test the new key with the fresh list
    try {
      await testKey(id, newKey.trim(), updatedKeys);
    } catch (error) {
      handleAiError(error, "Auto-testing new key");
    }
  };

  const testKey = async (id: string, key: string, currentKeys?: GeminiApiKey[]) => {
    setIsTesting(id);
    const startTime = Date.now();
    const keysToMap = currentKeys || keys;
    
    try {
      const response = await fetch('/api/test-ai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Test failed');
      }

      const latency = Date.now() - startTime;
      const isSuccess = data.success;

      const updatedKeys = keysToMap.map(k => {
        if (k.id === id) {
          return {
            ...k,
            status: isSuccess ? 'active' : 'error' as any,
            latency,
            lastTested: new Date().toISOString(),
            modelType: 'Gemini 1.5 Flash'
          };
        }
        return k;
      });

      setKeys(updatedKeys);
      await saveKeys(updatedKeys);
      
      if (isSuccess) {
        toast.success(isRtl ? 'تم تفعيل المحرك بنجاح' : 'Engine activated successfully');
      } else {
        toast.error(isRtl ? 'فشل اختبار المحرك' : 'Engine test failed');
      }
    } catch (error: any) {
      handleAiError(error, 'AI key test');
      
      // التمييز بين أنواع الأخطاء
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        toast.error(isRtl ? 'تم تجاوز حصة الاستخدام (Quota Exceeded)' : 'Quota exceeded');
      } else if (errorMessage.includes('invalid') || errorMessage.includes('401') || errorMessage.includes('403')) {
        toast.error(isRtl ? 'مفتاح غير صالح أو صلاحيات غير كافية' : 'Invalid key or insufficient permissions');
      } else {
        toast.error(isRtl ? 'خطأ غير معروف في المحرك' : 'Unknown engine error');
      }

      const updatedKeys = keysToMap.map(k => {
        if (k.id === id) {
          return { ...k, status: 'error' as any, lastTested: new Date().toISOString() };
        }
        return k;
      });
      setKeys(updatedKeys);
      await saveKeys(updatedKeys);
    } finally {
      setIsTesting(null);
    }
  };

  const handleDeleteKey = async (id: string) => {
    const updatedKeys = keys.filter(k => k.id !== id);
    setKeys(updatedKeys);
    await saveKeys(updatedKeys);
    toast.success(isRtl ? 'تم حذف المحرك' : 'Engine removed');
  };

  const toggleKeyStatus = async (id: string) => {
    const updatedKeys = keys.map(k => {
      if (k.id === id) {
        return { ...k, status: k.status === 'disabled' ? 'testing' : 'disabled' as any };
      }
      return k;
    });
    setKeys(updatedKeys);
    await saveKeys(updatedKeys);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center text-brand-primary border border-brand-primary/30 shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.2)]">
              <Cpu size={28} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                {isRtl ? 'النواة العصبية لجيمناي' : 'Gemini Neural Core'}
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                {isRtl ? 'إدارة محركات الذكاء الاصطناعي للمنصة' : 'Manage AI engines for the platform'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-full border border-white/5">
            <Activity size={16} className="text-emerald-500" />
            <span className="text-xs font-bold text-slate-300">
              {keys.filter(k => k.status === 'active').length} {isRtl ? 'محركات نشطة' : 'Active Engines'}
            </span>
          </div>
        </header>

        <AdminNeuralHealthDashboard keys={keys} isRtl={isRtl} />
        <AdminNeuralAlertDashboard keys={keys} isRtl={isRtl} onRetry={testKey} isTesting={isTesting} />

        {/* Add New Key Section */}
        <section className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 blur-[100px] -z-10 group-hover:bg-brand-primary/20 transition-all duration-700" />
          
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus size={20} className="text-brand-primary" />
            {isRtl ? 'إضافة خلية طاقة جديدة' : 'Add New Power Cell'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                {isRtl ? 'تسمية المحرك' : 'Engine Label'}
              </label>
              <input 
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={isRtl ? "مثال: محرك الطوارئ" : "e.g., Emergency Engine"}
                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                {isRtl ? 'مفتاح API' : 'API Key'}
              </label>
              <div className="relative">
                <input 
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all pr-12"
                />
                <Key size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
              </div>
            </div>
          </div>

          <HapticButton
            onClick={handleAddKey}
            disabled={!newKey.trim()}
            className="w-full mt-6 py-4 bg-brand-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all disabled:opacity-50 disabled:grayscale"
          >
            {isRtl ? 'تنشيط الخلية' : 'Activate Cell'}
          </HapticButton>
        </section>

        {/* Keys List */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] px-2">
            {isRtl ? 'المحركات المتصلة' : 'Connected Engines'}
          </h2>

          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={`neural-engine-skeleton-${i}`} className="h-32 bg-white/5 animate-pulse rounded-[2rem]" />
                ))}
              </div>
            ) : keys.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <Zap size={48} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500 font-medium">
                  {isRtl ? 'لا توجد محركات متصلة حالياً' : 'No engines connected yet'}
                </p>
              </div>
            ) : (
              keys.map((key, index) => (
                <motion.div
                  key={key.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative group bg-white/5 backdrop-blur-xl rounded-[2rem] p-5 border ${
                    key.status === 'active' ? 'border-emerald-500/20' : 
                    key.status === 'error' ? 'border-red-500/20' : 'border-white/10'
                  } hover:bg-white/[0.08] transition-all`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        key.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 
                        key.status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isTesting === key.id ? (
                          <RefreshCw size={24} className="animate-spin" />
                        ) : key.status === 'active' ? (
                          <Zap size={24} />
                        ) : key.status === 'error' ? (
                          <AlertCircle size={24} />
                        ) : (
                          <ShieldCheck size={24} />
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-100">{key.label}</h3>
                          {key.isPaid && (
                            <span className="px-2 py-0.5 bg-brand-primary/20 text-brand-primary text-[10px] font-black rounded-full uppercase">
                              Paid
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <button 
                            onClick={() => setShowKeyId(showKeyId === key.id ? null : key.id)}
                            className="text-xs font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                          >
                            {showKeyId === key.id ? key.key : '••••••••••••••••'}
                            {showKeyId === key.id ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <HapticButton
                        onClick={() => testKey(key.id, key.key)}
                        disabled={isTesting !== null}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-brand-primary transition-all"
                      >
                        <RefreshCw size={18} className={isTesting === key.id ? 'animate-spin' : ''} />
                      </HapticButton>
                      <HapticButton
                        onClick={() => handleDeleteKey(key.id)}
                        className="p-2 bg-white/5 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={18} />
                      </HapticButton>
                    </div>
                  </div>

                  {/* Stats Footer */}
                  <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {isRtl ? 'الحالة' : 'Status'}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          key.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                          key.status === 'error' ? 'bg-red-500' : 'bg-slate-600'
                        }`} />
                        <span className={`text-[11px] font-bold ${
                          key.status === 'active' ? 'text-emerald-500' : 
                          key.status === 'error' ? 'text-red-500' : 'text-slate-500'
                        }`}>
                          {key.status === 'active' ? (isRtl ? 'نشط' : 'Active') : 
                           key.status === 'error' ? (isRtl ? 'خطأ' : 'Error') : 
                           (isRtl ? 'معطل' : 'Disabled')}
                        </span>
                      </div>
                    </div>
                    
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {isRtl ? 'الاستجابة' : 'Latency'}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={12} className="text-slate-600" />
                          <span className={`text-[11px] font-bold ${
                            !key.latency ? 'text-slate-500' :
                            key.latency < 500 ? 'text-emerald-400' :
                            key.latency < 1500 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {key.latency ? `${key.latency}ms` : '--'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {isRtl ? 'النموذج' : 'Model'}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Cpu size={12} className="text-slate-600" />
                          <span className="text-[11px] font-bold text-slate-300 truncate max-w-[80px]">
                            {key.modelType || 'Gemini 3'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {isRtl ? 'الاستخدام' : 'Usage'}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Activity size={12} className="text-slate-600" />
                          <span className="text-[11px] font-bold text-slate-300">
                            {key.usageCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {key.lastTested && (
                      <div className="mt-3 flex items-center gap-2 text-[9px] text-slate-600 font-medium">
                        <Clock size={10} />
                        {isRtl ? 'آخر فحص:' : 'Last tested:'} {new Date(key.lastTested).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                      </div>
                    )}
                  </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <footer className="pt-8 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <ShieldCheck size={14} className="text-brand-primary" />
            {isRtl ? 'نظام موازنة الأحمال الذكي مفعل' : 'Smart Load Balancing System Active'}
          </div>
        </footer>
      </div>
    </div>
  );
};
