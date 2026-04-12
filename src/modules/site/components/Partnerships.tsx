import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Building2, Handshake, Target, ArrowRight, Loader2 } from 'lucide-react';
import { db } from '../../../core/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

export const Partnerships: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [formData, setFormData] = useState({ name: '', company: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'partnershipRequests'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setFormData({ name: '', company: '', email: '', message: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'partnershipRequests', false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-text-main mb-6">
          {isRtl ? 'شراكات الأعمال الاستراتيجية' : 'Strategic Souq Connect Partnerships'}
        </h1>
        <p className="text-xl text-brand-text-muted max-w-2xl mx-auto">
          {isRtl 
            ? 'انضم إلى شبكتنا المتنامية ووسع نطاق أعمالك من خلال منصتنا المدعومة بالذكاء الاصطناعي.' 
            : 'Join our growing network and scale your business with our AI-powered platform.'}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {[
          { icon: Building2, title: isRtl ? 'وصول واسع' : 'Broad Reach', desc: isRtl ? 'الوصول لآلاف الموردين' : 'Reach thousands of suppliers' },
          { icon: Target, title: isRtl ? 'مطابقة ذكية' : 'Smart Matching', desc: isRtl ? 'تكنولوجيا ذكاء اصطناعي' : 'AI-driven technology' },
          { icon: Handshake, title: isRtl ? 'نمو مشترك' : 'Mutual Growth', desc: isRtl ? 'فرص شراكة مستدامة' : 'Sustainable partnership' }
        ].map((feat, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-brand-border text-center">
            <feat.icon className="mx-auto text-brand-primary mb-4" size={40} />
            <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
            <p className="text-sm text-brand-text-muted">{feat.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand-surface p-8 md:p-12 rounded-3xl border border-brand-border">
        <h2 className="text-2xl font-bold mb-8">{isRtl ? 'قدم طلب شراكة' : 'Submit Partnership Inquiry'}</h2>
        {success ? (
          <div className="bg-green-50 text-green-700 p-6 rounded-2xl text-center font-bold">
            {isRtl ? 'شكراً لاهتمامك! سنتواصل معك قريباً.' : 'Thank you for your interest! We will contact you soon.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input type="text" placeholder={isRtl ? 'الاسم' : 'Name'} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 rounded-xl border border-brand-border" required />
              <input type="text" placeholder={isRtl ? 'الشركة' : 'Company'} value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full p-4 rounded-xl border border-brand-border" required />
            </div>
            <input type="email" placeholder={isRtl ? 'البريد الإلكتروني' : 'Email'} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 rounded-xl border border-brand-border" required />
            <textarea placeholder={isRtl ? 'رسالتك' : 'Message'} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full p-4 rounded-xl border border-brand-border h-32" required />
            <button type="submit" disabled={loading} className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold hover:bg-brand-primary-hover transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>{isRtl ? 'إرسال الطلب' : 'Submit Inquiry'} <ArrowRight size={20} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
