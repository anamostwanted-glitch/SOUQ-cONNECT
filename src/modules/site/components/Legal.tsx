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
      title: isRtl ? 'سياسة الخصوصية' : 'Privacy Policy',
      lastUpdated: isRtl ? 'آخر تحديث: 14 مارس 2026' : 'Last Updated: March 14, 2026',
      sections: [
        {
          title: isRtl ? '1. جمع المعلومات' : '1. Information Collection',
          body: isRtl 
            ? 'نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند إنشاء حساب، مثل الاسم، البريد الإلكتروني، رقم الهاتف، وتفاصيل الشركة. كما نجمع بيانات الموقع الجغرافي لتقديم خدمات أفضل.'
            : 'We collect information you provide directly to us when creating an account, such as name, email, phone number, and company details. We also collect geolocation data to provide better services.'
        },
        {
          title: isRtl ? '2. استخدام المعلومات' : '2. Use of Information',
          body: isRtl
            ? 'نستخدم المعلومات لتسهيل التواصل بين المشترين والموردين، ومعالجة الطلبات، وتحسين تجربة المستخدم، وإرسال التنبيهات الضرورية.'
            : 'We use the information to facilitate communication between buyers and suppliers, process requests, improve user experience, and send necessary notifications.'
        },
        {
          title: isRtl ? '3. حماية البيانات' : '3. Data Protection',
          body: isRtl
            ? 'نحن نطبق إجراءات أمنية تقنية وإدارية متقدمة لحماية بياناتك الشخصية من الوصول غير المصرح به أو الإفصاح أو التغيير.'
            : 'We implement advanced technical and administrative security measures to protect your personal data from unauthorized access, disclosure, or alteration.'
        },
        {
          title: isRtl ? '4. مشاركة البيانات' : '4. Data Sharing',
          body: isRtl
            ? 'لا نقوم ببيع بياناتك الشخصية لأطراف ثالثة. يتم مشاركة المعلومات فقط مع الأطراف المعنية بالعملية التجارية (مثل الموردين عند تقديم طلب).'
            : 'We do not sell your personal data to third parties. Information is only shared with parties involved in the business process (e.g., suppliers when making a request).'
        }
      ]
    },
    terms: {
      title: isRtl ? 'شروط الاستخدام' : 'Terms of Use',
      lastUpdated: isRtl ? 'آخر تحديث: 14 مارس 2026' : 'Last Updated: March 14, 2026',
      sections: [
        {
          title: isRtl ? '1. قبول الشروط' : '1. Acceptance of Terms',
          body: isRtl
            ? 'باستخدامك لهذا التطبيق، فإنك توافق على الالتزام بهذه الشروط والأحكام وجميع القوانين واللوائح المعمول بها.'
            : 'By using this application, you agree to be bound by these terms and conditions and all applicable laws and regulations.'
        },
        {
          title: isRtl ? '2. سلوك المستخدم' : '2. User Conduct',
          body: isRtl
            ? 'يجب استخدام التطبيق لأغراض تجارية مشروعة فقط. يمنع منعاً باتاً نشر محتوى مسيء، احتيالي، أو ينتهك حقوق الملكية الفكرية للآخرين.'
            : 'The application must be used for legitimate business purposes only. It is strictly prohibited to post offensive, fraudulent content, or content that violates the intellectual property rights of others.'
        },
        {
          title: isRtl ? '3. المسؤولية' : '3. Liability',
          body: isRtl
            ? 'نحن نعمل كمنصة للربط بين الأطراف، ولسنا مسؤولين عن جودة المنتجات أو الخدمات المقدمة من قبل الموردين أو أي نزاعات تجارية تنشأ بينهم.'
            : 'We act as a platform to connect parties and are not responsible for the quality of products or services provided by suppliers or any business disputes that arise between them.'
        },
        {
          title: isRtl ? '4. الحسابات والأمان' : '4. Accounts and Security',
          body: isRtl
            ? 'أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور، وعن جميع الأنشطة التي تحدث تحت حسابك.'
            : 'You are responsible for maintaining the confidentiality of your account information and password, and for all activities that occur under your account.'
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
