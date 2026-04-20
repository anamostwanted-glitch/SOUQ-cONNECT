import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldCheck, Zap, Database, Cpu, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { HapticButton } from '../../../shared/components/HapticButton';

export const AdminSystemHealth: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const metrics = [
    { label: isRtl ? 'استجابة الخادم' : 'Server Response', value: '42ms', status: 'optimal', icon: Zap },
    { label: isRtl ? 'صحة قاعدة البيانات' : 'DB Health', value: '99.9%', status: 'optimal', icon: Database },
    { label: isRtl ? 'استهلاك الذكاء الاصطناعي' : 'AI Usage', value: '24%', status: 'normal', icon: Cpu },
    { label: isRtl ? 'أمان النظام' : 'System Security', value: 'Protected', status: 'optimal', icon: ShieldCheck },
  ];

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error(isRtl ? 'يرجى إدخال بريد إلكتروني للاختبار' : 'Please enter an email address to test');
      return;
    }
    setIsTestingEmail(true);
    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isRtl ? 'تم إرسال بريد الاختبار بنجاح! تفقد بريدك.' : 'Test email sent successfully! Check your inbox.');
      } else {
        toast.error(`${isRtl ? 'فشل إرسال البريد:' : 'Email failed:'} ${data.details || data.error}`);
      }
    } catch (err) {
      toast.error(isRtl ? 'حدث خطأ أثناء الاتصال بالخادم' : 'Server connection error');
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border p-6 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-text-main flex items-center gap-2">
          <Activity size={20} className="text-emerald-500" />
          {isRtl ? 'صحة النظام' : 'System Health'}
        </h3>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">{isRtl ? 'مباشر' : 'Live'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, i) => (
          <motion.div
            key={`sys-health-${metric.label}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-2xl bg-brand-background border border-brand-border/50 group hover:border-brand-primary/30 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <metric.icon size={16} className="text-brand-text-muted group-hover:text-brand-primary transition-colors" />
              <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{metric.label}</span>
            </div>
            <div className="text-lg font-black text-brand-text-main">{metric.value}</div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${metric.status === 'optimal' ? 'bg-emerald-500' : 'bg-brand-primary'} animate-pulse`} />
              <span className="text-[8px] font-bold text-brand-text-muted uppercase tracking-tighter">
                {metric.status === 'optimal' ? (isRtl ? 'مثالي' : 'Optimal') : (isRtl ? 'طبيعي' : 'Normal')}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* SMTP Diagnostic Section */}
      <div className="pt-6 border-t border-brand-border/30">
        <div className="bg-brand-background rounded-3xl p-5 border border-brand-border/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Mail size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black text-brand-text-main uppercase tracking-widest">
                {isRtl ? 'اختبار نظام البريد (SMTP)' : 'SMTP Diagnostics'}
              </h4>
              <p className="text-[10px] text-brand-text-muted">
                {isRtl ? 'تحقق من صحة إعدادات خادم البريد الخاص بك' : 'Verify your SMTP mail server configuration'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input 
              type="email" 
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={isRtl ? 'بريدك الإلكتروني...' : 'Your email...'}
              className="flex-1 bg-brand-surface border border-brand-border px-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
            <HapticButton
              onClick={handleTestEmail}
              disabled={isTestingEmail}
              className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {isTestingEmail ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {isRtl ? 'اختبار' : 'Test'}
            </HapticButton>
          </div>
        </div>
      </div>
    </div>
  );
};
