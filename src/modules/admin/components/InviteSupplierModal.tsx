import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  Mail, 
  MessageSquare, 
  Share2, 
  Link as LinkIcon,
  Sparkles,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { HapticButton } from '../../../shared/components/HapticButton';
import { INVITE_TEMPLATES } from '../constants';
import { soundService, SoundType } from '../../../core/utils/soundService';
import { analytics } from '../../../core/services/AnalyticsService';

interface InviteSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRtl: boolean;
}

export const InviteSupplierModal: React.FC<InviteSupplierModalProps> = ({ isOpen, onClose, isRtl }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'ar' | 'en'>(isRtl ? 'ar' : 'en');
  
  const inviteLink = `${window.location.origin}/auth?role=supplier&ref=beta_invite`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text.replace('[INVITE_LINK]', inviteLink));
    setCopied(id);
    soundService.play(SoundType.SUCCESS);
    toast.success(isRtl ? 'تم النسخ إلى الحافظة' : 'Copied to clipboard');
    analytics.trackEvent('performance_metric', { action: 'copy_invite', template: id, lang: selectedLang });
    setTimeout(() => setCopied(null), 2000);
  };

  const templates = INVITE_TEMPLATES[selectedLang];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-brand-border relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles size={80} className="text-brand-primary" />
              </div>
              
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-brand-background transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                  <Zap size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-brand-text-main">
                    {isRtl ? 'دعوة أول مورد' : 'Invite First Supplier'}
                  </h2>
                  <p className="text-sm font-bold text-brand-text-muted">
                    {isRtl ? 'اختر القالب المناسب لإرسال الدعوة' : 'Choose a template to send the invitation'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                {(['ar', 'en'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                      selectedLang === lang 
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                        : 'bg-brand-background text-brand-text-muted hover:text-brand-primary border border-brand-border'
                    }`}
                  >
                    {lang === 'ar' ? 'العربية' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              {/* Direct Invite Link */}
              <div className="space-y-3">
                <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest pl-1">
                  {isRtl ? 'رابط التسجيل المباشر' : 'Direct Registration Link'}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-brand-background border border-brand-border rounded-2xl px-4 py-3 text-xs font-mono text-brand-primary truncate">
                    {inviteLink}
                  </div>
                  <HapticButton
                    onClick={() => handleCopy(inviteLink, 'link')}
                    className="shrink-0 w-12 h-12 flex items-center justify-center bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 hover:scale-105 transition-transform"
                  >
                    {copied === 'link' ? <Check size={20} /> : <LinkIcon size={20} />}
                  </HapticButton>
                </div>
              </div>

              {/* Email Template */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                    {isRtl ? 'قالب البريد الإلكتروني' : 'Email Template'}
                  </label>
                  <HapticButton
                    onClick={() => handleCopy(`${templates.subject}\n\n${templates.body}`, 'email')}
                    className="flex items-center gap-2 text-brand-primary hover:underline text-xs font-black"
                  >
                    {copied === 'email' ? <Check size={14} /> : <Copy size={14} />}
                    {isRtl ? 'نسخ الكل' : 'Copy All'}
                  </HapticButton>
                </div>
                <div className="bg-brand-background border border-brand-border rounded-2xl p-4 space-y-3">
                  <div className="pb-3 border-b border-brand-border">
                    <span className="text-[10px] font-black text-brand-text-muted block mb-1 uppercase">Subject:</span>
                    <p className="text-xs font-bold text-brand-text-main">{templates.subject}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-brand-text-muted block mb-1 uppercase">Body:</span>
                    <p className="text-xs leading-relaxed text-brand-text-muted whitespace-pre-wrap">
                      {templates.body.replace('[INVITE_LINK]', inviteLink)}
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Template */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                    {isRtl ? 'رسالة واتساب / تلغرام' : 'WhatsApp / Telegram Message'}
                  </label>
                  <HapticButton
                    onClick={() => handleCopy(templates.whatsapp, 'whatsapp')}
                    className="flex items-center gap-2 text-brand-primary hover:underline text-xs font-black"
                  >
                    {copied === 'whatsapp' ? <Check size={14} /> : <Copy size={14} />}
                    {isRtl ? 'نسخ الرسالة' : 'Copy Message'}
                  </HapticButton>
                </div>
                <div className="bg-brand-background border border-brand-border rounded-2xl p-4">
                  <p className="text-xs leading-relaxed text-brand-text-muted italic">
                    "{templates.whatsapp.replace('[INVITE_LINK]', inviteLink)}"
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-brand-background border-t border-brand-border flex items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-brand-text-muted max-w-[60%] leading-tight">
                {isRtl 
                  ? 'عند استخدام هذه الروابط، سيتم وسم المورد تلقائياً بوسم Beta لسهولة تتبعه.' 
                  : 'Suppliers joining via these links will be automatically tagged as Beta for easy tracking.'}
              </p>
              <HapticButton
                onClick={onClose}
                className="px-8 h-12 bg-brand-surface border border-brand-border rounded-2xl text-xs font-black hover:bg-brand-border transition-colors"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </HapticButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
