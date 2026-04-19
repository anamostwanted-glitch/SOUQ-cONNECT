import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, FileText, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface LegalProps {
  type: 'privacy' | 'terms';
  onBack: () => void;
}

const Legal: React.FC<LegalProps> = ({ type, onBack }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const content = {
    privacy: {
      title: isRtl ? 'سياسة الخصوصية والأمان' : 'Privacy & Security Policy',
      lastUpdated: isRtl ? 'آخر تحديث: 19 أبريل 2026' : 'Last Updated: April 19, 2026',
      sections: [
        {
          title: isRtl ? '1. المعلومات التي نجمعها' : '1. Information We Collect',
          body: isRtl 
            ? 'نجمع المعلومات اللازمة لضمان سلامة العمليات التجارية، بما في ذلك: الهوية الشخصية، السجل التجاري، بيانات الموقع الجغرافي الدقيقة عبر GPS، ومعلومات الاتصال. كما نستخدم ملفات تعريف الارتباط لتحسين تجربة المستخدم وتحليل نبض السوق.'
            : 'We collect information necessary for secure business operations, including: personal identity, commercial registration, precise GPS location data, and contact information. We also use cookies to enhance user experience and analyze market pulse.'
        },
        {
          title: isRtl ? '2. كيفية استخدام البيانات والذكاء الاصطناعي' : '2. Data Usage & AI Processing',
          body: isRtl
            ? 'نستخدم بياناتك لتشغيل محرك المطابقة الذكي (Smart Matching) المدعوم بـ Gemini AI. يتم تحليل طلباتك لتقديم أفضل الموردين لك، وتحليل أداء الموردين لرفع مستوى الموثوقية في الشبكة. نحن لا نشارك بياناتك الحساسة مع أي طرف خارجي لأغراض تسويقية.'
            : 'We use your data to power the Smart Matching engine driven by Gemini AI. Your requests are analyzed to present the best suppliers, and supplier performance is analyzed to raise network reliability. We do not share your sensitive data with external parties for marketing purposes.'
        },
        {
          title: isRtl ? '3. معايير أمان فريق النواة' : '3. Core Team Security Standards',
          body: isRtl
            ? 'يتم تشفير جميع البيانات الحساسة ونقلها عبر بروتوكولات آمنة. يطبق فريق النواة (Core Team) معايير وصول صارمة (ABAC) لضمان أن بياناتك متاحة فقط للأطراف المخولة قانوناً وتجارياً بمشاهدتها.'
            : 'All sensitive data is encrypted and transmitted via secure protocols. The Core Team implements strict Attribute-Based Access Control (ABAC) to ensure your data is accessible only to parties legally and commercially authorized to view it.'
        },
        {
          title: isRtl ? '4. حقوق المستخدم' : '4. User Rights',
          body: isRtl
            ? 'لك الحق في الوصول إلى بياناتك، تصحيحها، أو طلب حذف حسابك (بناءً على سياسة الحذف الناعم الخاصة بنا). يمكنك إدارة تفضيلات الخصوصية وتنبيهات الذكاء الاصطناعي من خلال لوحة التحكم الخاصة بك.'
            : 'You have the right to access, correct, or request deletion of your account (subject to our Soft Delete policy). You can manage privacy preferences and AI alerts through your dashboard.'
        }
      ]
    },
    terms: {
      title: isRtl ? 'شروط الخدمة التجارية' : 'Commercial Terms of Service',
      lastUpdated: isRtl ? 'آخر تحديث: 19 أبريل 2026' : 'Last Updated: April 19, 2026',
      sections: [
        {
          title: isRtl ? '1. الأهلية والتحقق' : '1. Eligibility & Verification',
          body: isRtl
            ? 'لاستخدام سوق كونيكت كمورد، يجب أن تمتلك سجلاً تجارياً سارياً وهصية قانونية معتبرة. نحن نحتفظ بالحق في تعليق أي حساب لا يستوفي معايير التحقق الخاصة بنا (Verified Status).'
            : 'To use Souq Connect as a supplier, you must possess a valid commercial registration and legal identity. We reserve the right to suspend any account that does not meet our Verification Status standards.'
        },
        {
          title: isRtl ? '2. النزاعات التجارية' : '2. Business Disputes',
          body: isRtl
            ? 'سوق كونيكت هو وسيط ذكي يسهل الربط بين المؤسسات. نحن لا نتحمل المسؤولية القانونية عن جودة البضائع أو الخدمات أو شروط الدفع خارج المنصة. ننصح باستخدام العقود الموثقة والتوثيق عبر المحادثات الرسمية داخل المنصة.'
            : 'Souq Connect is a smart intermediary facilitating institutional connections. We assume no legal liability for goods quality, services, or off-platform payment terms. We recommend using documented contracts and official platform chat for all business logs.'
        },
        {
          title: isRtl ? '3. الملكية الفكرية والذكاء الاصطناعي' : '3. Intellectual Property & AI Models',
          body: isRtl
            ? 'جميع خوارزميات المطابقة والتصاميم ونظام "نبض السوق" هي ملكية فكرية مملوكة للمنصة. يمنع استخدام الأنظمة لاستخراج البيانات (Scraping) أو محاولة عكس هندسة نماذج الذكاء الاصطناعي الخاصة بنا.'
            : 'All matching algorithms, designs, and the "Market Pulse" system are intellectual property owned by the platform. Scraping or attempting to reverse engineer our AI models is strictly prohibited.'
        },
        {
          title: isRtl ? '4. الإنهاء والحذف الناعم' : '4. Termination & Soft Delete',
          body: isRtl
            ? 'نحتفظ بالحق في إنهاء الخدمة لأي مستخدم يتلاعب بالأسعار أو ينتهك معايير النزاهة التجارية. تخضع جميع عمليات الحذف لسياسة "الحذف الناعم" (Soft Delete) حيث يتم الاحتفاظ بالبيانات لأغراض تدقيق النظام والامتثال القانوني.'
            : 'We reserve the right to terminate service for any user manipulating prices or violating business integrity standards. All deletions follow our Soft Delete policy where data is retained for system audit and legal compliance purposes.'
        }
      ]
    }
  };

  const currentContent = content[type];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 py-12"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-brand-text-muted hover:text-brand-primary transition-colors mb-8"
      >
        <ArrowLeft size={20} />
        <span>{isRtl ? 'العودة' : 'Back'}</span>
      </button>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-brand-border/50 border border-brand-border-light p-8 md:p-12">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
            {type === 'privacy' ? <Shield size={32} /> : <FileText size={32} />}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-brand-text-main tracking-tight">
              {currentContent.title}
            </h1>
            <p className="text-sm text-brand-text-muted mt-1">
              {currentContent.lastUpdated}
            </p>
          </div>
        </div>

        <div className="space-y-10 mt-12">
          {currentContent.sections.map((section) => (
            <div key={section.title} className="group">
              <h2 className="text-xl font-bold text-brand-text-main mb-4 group-hover:text-brand-primary transition-colors">
                {section.title}
              </h2>
              <p className="text-brand-text-muted leading-relaxed text-lg">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-brand-border-light text-center">
          <p className="text-brand-text-muted text-sm">
            {isRtl 
              ? 'إذا كان لديك أي أسئلة، يرجى الاتصال بنا عبر البريد الإلكتروني.' 
              : 'If you have any questions, please contact us via email.'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Legal;
