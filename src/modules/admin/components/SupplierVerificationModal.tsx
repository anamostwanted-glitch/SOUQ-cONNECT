import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Sparkles,
  Calendar,
  Building2,
  Hash,
  Activity,
  ArrowRight,
  Fingerprint,
  Lock,
  Eye,
  Scan,
  ShieldQuestion
} from 'lucide-react';
import { UserProfile } from '../../../core/types';
import { analyzeSupplierDocument, handleAiError } from '../../../core/services/geminiService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { toast } from 'sonner';

import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface SupplierVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: UserProfile;
}

export const SupplierVerificationModal: React.FC<SupplierVerificationModalProps> = ({
  isOpen,
  onClose,
  supplier
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleRunAiAnalysis = async () => {
    if (!supplier.verificationDocUrl) {
      toast.error(isRtl ? 'لا يوجد مستند للتحليل' : 'No document to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Fetch image and convert to base64
      const response = await fetch(supplier.verificationDocUrl);
      if (!response.ok) throw new Error('Failed to fetch document');
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          if (result) {
            const base64String = result.split(',')[1];
            resolve(base64String);
          } else {
            reject(new Error('Failed to read file: Empty result'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file: Reader error'));
      });
      reader.readAsDataURL(blob);
      const base64Image = await base64Promise;

      const result = await analyzeSupplierDocument(base64Image, blob.type, i18n.language);
      setAnalysisResult(result);
      toast.success(isRtl ? 'اكتمل تحليل الذكاء الاصطناعي' : 'AI analysis completed');
    } catch (error) {
      handleAiError(error, 'Supplier document analysis');
      toast.error(isRtl ? 'فشل تحليل المستند' : 'Document analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFinalVerify = async (isVerified: boolean) => {
    setIsVerifying(true);
    try {
      await updateDoc(doc(db, 'users', supplier.uid), {
        isVerified,
        verificationDetails: analysisResult ? (isRtl ? analysisResult.analysisAr : analysisResult.analysisEn) : 'Manual verification',
        verificationExpiryDate: analysisResult?.extractedData?.expiryDate || null,
        trustScore: analysisResult?.trustScore || (isVerified ? 70 : 0)
      });
      toast.success(isVerified ? (isRtl ? 'تم توثيق المورد' : 'Supplier verified') : (isRtl ? 'تم رفض التوثيق' : 'Verification rejected'));
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'supplier_verification', false);
      toast.error(isRtl ? 'فشل تحديث حالة التوثيق' : 'Failed to update verification status');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-background/80 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl bg-brand-surface border border-brand-border rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-brand-border flex items-center justify-between bg-brand-surface/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${supplier.isVerified ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-brand-primary shadow-brand-primary/20'}`}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-text-main flex items-center gap-2">
                {isRtl ? 'درع التحقق العصبي' : 'Neural Verification Shield'}
                <div className="flex gap-1 ml-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse [animation-delay:200ms]" />
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse [animation-delay:400ms]" />
                </div>
              </h2>
              <p className="text-brand-text-muted text-sm font-bold">
                {supplier.name} • {supplier.companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-brand-background rounded-2xl transition-colors text-brand-text-muted"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Document Preview */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-brand-text-main uppercase tracking-widest flex items-center gap-2">
                  <FileText size={16} className="text-brand-primary" />
                  {isRtl ? 'المستند المرفوع' : 'Uploaded Document'}
                </h3>
                {supplier.verificationDocUrl && (
                  <a 
                    href={supplier.verificationDocUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-black text-brand-primary hover:underline uppercase tracking-widest"
                  >
                    {isRtl ? 'فتح في نافذة جديدة' : 'Open in new tab'}
                  </a>
                )}
              </div>
              
              <div className="aspect-[3/4] bg-brand-background rounded-[2rem] border-2 border-brand-border border-dashed overflow-hidden relative group">
                {supplier.verificationDocUrl ? (
                  <img 
                    src={supplier.verificationDocUrl} 
                    alt="Verification Document"
                    className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-text-muted/30 space-y-4">
                    <FileText size={64} strokeWidth={1} />
                    <p className="text-xs font-bold">{isRtl ? 'لا يوجد مستند مرفوع' : 'No document uploaded'}</p>
                  </div>
                )}
              </div>

              {!analysisResult && supplier.verificationDocUrl && (
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  {isRtl ? 'تحليل المستند بالذكاء الاصطناعي' : 'Analyze Document with AI'}
                </button>
              )}
            </div>

            {/* Right: Analysis Results */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-brand-text-main uppercase tracking-widest flex items-center gap-2">
                <Search size={16} className="text-brand-primary" />
                {isRtl ? 'نتائج الفحص الذكي' : 'Smart Scan Results'}
              </h3>

              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-8 bg-brand-surface border border-brand-border rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 min-h-[400px]"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-primary animate-pulse" size={24} />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-black text-brand-text-main">{isRtl ? 'جاري فحص المستند...' : 'Scanning Document...'}</p>
                      <p className="text-xs text-brand-text-muted">{isRtl ? 'يتم استخراج البيانات والتحقق من الصحة' : 'Extracting data and verifying authenticity'}</p>
                    </div>
                  </motion.div>
                ) : analysisResult ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Trust Score Card */}
                    <div className="p-6 bg-brand-background rounded-[2rem] border border-brand-border flex items-center justify-between relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10 space-y-1">
                        <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'مؤشر الثقة العصبية' : 'Neural Trust Score'}</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-4xl font-black text-brand-text-main">{analysisResult.trustScore}%</p>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            analysisResult.securityTier === 'tier_1_verified' ? 'bg-brand-primary text-white' :
                            analysisResult.securityTier === 'tier_2_enhanced' ? 'bg-brand-teal text-white' :
                            'bg-brand-error text-white'
                          }`}>
                            {analysisResult.securityTier?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center ${
                        analysisResult.trustScore >= 80 ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' :
                        analysisResult.trustScore >= 50 ? 'bg-amber-500/10 text-amber-500' :
                        'bg-brand-error/10 text-brand-error animate-pulse'
                      }`}>
                        {analysisResult.trustScore >= 80 ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
                      </div>
                    </div>

                    {/* Forensic Analysis Section */}
                    <div className="p-6 bg-brand-surface border border-brand-border rounded-[2.5rem] space-y-4">
                      <div className="flex items-center justify-between">
                         <h4 className="text-xs font-black text-brand-text-main uppercase tracking-widest flex items-center gap-2">
                           <Fingerprint size={14} className="text-brand-primary" />
                           {isRtl ? 'التحريات الجنائية الرقمية' : 'Digital Forensics'}
                         </h4>
                         <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                           analysisResult.forensics?.tamperDetected ? 'bg-brand-error text-white' : 'bg-brand-teal text-white'
                         }`}>
                           {analysisResult.forensics?.tamperDetected ? (isRtl ? 'تم كشف تلاعب' : 'Tamper Detected') : (isRtl ? 'مستند سليم' : 'Intact')}
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                         <div className="p-4 bg-brand-background rounded-2xl border border-brand-border">
                           <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'صحة الأرتام' : 'Stamp Validity'}</p>
                           <p className="text-xs font-bold text-brand-text-main">{analysisResult.forensics?.stampValidity || 'Verified'}</p>
                         </div>
                         <div className="p-4 bg-brand-background rounded-2xl border border-brand-border">
                           <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'سلامة الخطوط' : 'Font Integrity'}</p>
                           <p className="text-xs font-bold text-brand-text-main">
                             {analysisResult.forensics?.tamperDetected ? (isRtl ? 'خطوط غير متناسقة' : 'Inconsistent') : (isRtl ? 'خطوط أصلية' : 'Original Fonts')}
                           </p>
                         </div>
                      </div>

                      {analysisResult.forensics?.inconsistencies?.length > 0 && (
                        <div className="p-4 bg-brand-error/5 border border-brand-error/10 rounded-2xl">
                          <p className="text-[10px] font-black text-brand-error uppercase tracking-widest mb-2">{isRtl ? 'نقاط الارتياب' : 'Points of Suspicion'}</p>
                          <ul className="space-y-1">
                            {analysisResult.forensics.inconsistencies.map((inc: string, idx: number) => (
                              <li key={idx} className="text-[10px] font-medium text-brand-text-main flex gap-2">
                                <span className="text-brand-error">•</span> {inc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Extracted Data */}
                    <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] overflow-hidden">
                      <div className="p-6 border-b border-brand-border bg-brand-background/50">
                        <h4 className="text-xs font-black text-brand-text-main uppercase tracking-widest">{isRtl ? 'البيانات المستخرجة' : 'Extracted Data'}</h4>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-brand-text-muted uppercase flex items-center gap-1">
                              <Building2 size={10} /> {isRtl ? 'اسم الشركة' : 'Company Name'}
                            </p>
                            <p className="text-xs font-black text-brand-text-main">{analysisResult.extractedData?.companyName || '---'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-brand-text-muted uppercase flex items-center gap-1">
                              <Hash size={10} /> {isRtl ? 'رقم السجل' : 'Reg. Number'}
                            </p>
                            <p className="text-xs font-black text-brand-text-main">{analysisResult.extractedData?.registrationNumber || '---'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-brand-text-muted uppercase flex items-center gap-1">
                              <Calendar size={10} /> {isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}
                            </p>
                            <p className="text-xs font-black text-brand-text-main">{analysisResult.extractedData?.expiryDate || '---'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-brand-text-muted uppercase flex items-center gap-1">
                              <Activity size={10} /> {isRtl ? 'النشاط' : 'Activity'}
                            </p>
                            <p className="text-xs font-black text-brand-text-main truncate">{analysisResult.extractedData?.activity || '---'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis Text */}
                    <div className="p-6 bg-brand-primary/5 rounded-[2rem] border border-brand-primary/10 space-y-3">
                      <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={14} />
                        {isRtl ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}
                      </h4>
                      <p className="text-xs font-bold text-brand-text-main leading-relaxed">
                        {isRtl ? analysisResult.analysisAr : analysisResult.analysisEn}
                      </p>
                    </div>

                    {/* Recommendation */}
                    <div className={`p-6 rounded-[2rem] border flex items-start gap-4 ${
                      analysisResult.isValid ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-amber-500/5 border-amber-500/10'
                    }`}>
                      <div className={`p-2 rounded-xl ${analysisResult.isValid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {analysisResult.isValid ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-brand-text-main">{isRtl ? 'التوصية' : 'Recommendation'}</p>
                        <p className="text-[11px] font-bold text-brand-text-muted">{isRtl ? analysisResult.recommendationAr : analysisResult.recommendationEn}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="p-8 bg-brand-surface border border-brand-border border-dashed rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 min-h-[400px] opacity-50">
                    <div className="w-16 h-16 bg-brand-background rounded-2xl flex items-center justify-center text-brand-text-muted/20">
                      <Search size={32} />
                    </div>
                    <p className="text-xs font-bold text-brand-text-muted text-center max-w-[200px]">
                      {isRtl ? 'قم بتشغيل التحليل الذكي لعرض النتائج هنا' : 'Run AI analysis to see results here'}
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-brand-border bg-brand-surface/50 backdrop-blur-md flex items-center justify-end gap-4 sticky bottom-0">
          <button
            onClick={() => handleFinalVerify(false)}
            disabled={isVerifying}
            className="px-8 py-4 bg-brand-background text-brand-error border border-brand-error/20 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-error/5 transition-all disabled:opacity-50"
          >
            {isVerifying ? <Loader2 size={20} className="animate-spin" /> : (isRtl ? 'رفض التوثيق' : 'Reject Verification')}
          </button>
          <button
            onClick={() => handleFinalVerify(true)}
            disabled={isVerifying}
            className="px-12 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-3 disabled:opacity-50"
          >
            {isVerifying ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
            {isRtl ? 'اعتماد التوثيق' : 'Approve Verification'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
