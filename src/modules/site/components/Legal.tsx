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
      title: isRtl ? 'سياسة الخصوصية وحماية البيانات العصبية' : 'Privacy & Neural Data Protection Policy',
      lastUpdated: isRtl ? 'آخر تحديث: 19 أبريل 2026' : 'Last Updated: April 19, 2026',
      sections: [
        {
          title: isRtl ? '1. بروتوكول جمع البيانات والشفافية' : '1. Data Collection & Transparency Protocol',
          body: isRtl 
            ? 'نجمع البيانات الضرورية فقط لتشغيل النظام، بما في ذلك بيانات الهوية الرقمية، السجلات التجارية الموثقة، والمواقع الجغرافية الدقيقة عبر GPS لضمان دقة المطابقة المحلية. نلتزم بمبدأ "الحد الأدنى من البيانات" حيث لا يتم جمع أي معلومة لا تخدم عملية الربط التجاري أو تحسين أداء الذكاء الاصطناعي.'
            : 'We collect only the essential data required for system operation, including digital identity data, verified commercial registrations, and precise GPS locations to ensure accurate local matching. We adhere to the "Data Minimization" principle, where no information is gathered unless it serves the commercial connection process or AI performance enhancement.'
        },
        {
          title: isRtl ? '2. المعالجة العصبية والذكاء الاصطناعي (Gemini)' : '2. Neural Processing & AI (Gemini)',
          body: isRtl
            ? 'تتم معالجة بياناتك عبر محركنا العصبي المدعوم بـ Gemini AI لتحليل الأنماط التجارية والمطابقة الذكية. يتم تشفير البيانات قبل معالجتها لضمان عدم وصول الخوارزميات إلى معلوماتك الشخصية الحساسة بشكل مباشر. نستخدم هذه البيانات للتنبؤ باحتياجات السوق وتقديم توصيات استباقية ترفع كفاءة عملياتك.'
            : 'Your data is processed via our neural engine powered by Gemini AI to analyze business patterns and smart matching. Data is encrypted prior to processing to ensure algorithms do not directly access your sensitive personal information. We utilize this data to predict market needs and provide proactive recommendations that boost your operational efficiency.'
        },
        {
          title: isRtl ? '3. سياسة التتبع والتحليلات المتقدمة' : '3. Advanced Tracking & Analytics Policy',
          body: isRtl
            ? 'لتطوير المنصة، نستخدم أدوات تتبع متطورة لمراقبة "رحلة المستخدم" من الدخول حتى إتمام الطلب (Conversion Rate). يساعدنا ذلك في تحديد العقبات التقنية وتحسين واجهة المستخدم. جميع هذه البيانات مجهولة المصدر (Anonymized) وتستخدم لأغراض تطوير الأداء الكلي للنظام فقط.'
            : 'To develop the platform, we use advanced tracking tools to monitor the "User Journey" from entry to order completion (Conversion Rate). This helps us identify technical bottlenecks and optimize the UI. All such data is anonymized and used exclusively for overall system performance development purposes.'
        },
        {
          title: isRtl ? '4. حماية فريق النواة والوصول المدروس (ABAC)' : '4. Core Team Security & Attribute-Based Access (ABAC)',
          body: isRtl
            ? 'بياناتك ليست مجرد أرقام، بل هي أصول تجارية محمية. يطبق فريق النواة نظام وصول صارم يعتمد على السمات (ABAC)، حيث لا يمكن لأي موظف أو طرف ثالث الوصول لبياناتك إلا إذا توفرت فيه سمات الصلاحية المطلوبة والضرورة الفنية. يتم تسجيل جميع عمليات الوصول في سجل تجريبي غير قابل للتلاعب.'
            : 'Your data is not just numbers; it is a protected commercial asset. The Core Team implements a strict Attribute-Based Access Control (ABAC) system, where no employee or third party can access your data unless they possess the required authorization attributes and technical necessity. All access operations are logged in an immutable audit trail.'
        },
        {
          title: isRtl ? '5. سياسة "الحذف الناعم" والاحتفاظ القانوني' : '5. "Soft Delete" & Legal Retention Policy',
          body: isRtl
            ? 'عند طلب حذف الحساب، نطبق مبدأ "الحذف الناعم". يتم إخفاء بياناتك من الواجهات العامة فوراً، ولكن يتم الاحتفاظ بنسخة مشفرة في الأرشيف القانوني لمدة محددة للامتثال للمتطلبات الضريبية والتجارية ومنع الاحتيال. بعد هذه المدة، يتم إتلاف البيانات تماماً.'
            : 'Upon account deletion request, we apply the "Soft Delete" principle. Your data is immediately hidden from public interfaces, but an encrypted copy is retained in a legal archive for a specific duration to comply with tax and commercial requirements and prevent fraud. After this period, the data is completely destroyed.'
        }
      ]
    },
    terms: {
      title: isRtl ? 'اتفاقية مستوى الخدمة والشروط التجارية' : 'Service Level Agreement & Commercial Terms',
      lastUpdated: isRtl ? 'آخر تحديث: 19 أبريل 2026' : 'Last Updated: April 19, 2026',
      sections: [
        {
          title: isRtl ? '1. ميثاق النزاهة والتحقق الرقمي' : '1. Integrity Charter & Digital Verification',
          body: isRtl
            ? 'منصة كونيكت هي مجتمع للأعمال الموثوقة. يجب على جميع الموردين اجتياز مراحل التحقق (Verification) التي تشمل فحص السجل التجاري واختبار الاستجابة. تقديم معلومات مضللة يؤدي إلى حظر الحساب فوراً دون إشعار مسبق، مع الاحتفاظ بالحق في إبلاغ الجهات المعنية في حالات الاحتيال.'
            : 'Connect platform is a community of trusted businesses. All suppliers must pass verification stages, including commercial registration checks and response tests. Providing misleading information results in immediate account suspension without prior notice, reserving the right to inform relevant authorities in cases of fraud.'
        },
        {
          title: isRtl ? '2. مسؤولية الوساطة الذكية' : '2. Smart Intermediation Responsibility',
          body: isRtl
            ? 'نحن نوفر البنية التحتية والذكاء الاصطناعي للربط بين الأطراف. المنصة غير مسؤولة عن جودة الخدمات أو البضائع الفعلية، ولكنها توفر نظام تقييم عصبي يعكس موثوقية كل طرف. النزاعات المالية يجب أن تحل وفقاً للعقود المبرمة بين الأطراف، ونحن نشجع بقوة على توثيق جميع الاتفاقات داخل نظام الرسائل الموثق بالمنصة.'
            : 'We provide the infrastructure and AI for connecting parties. The platform is not liable for the quality of services or actual goods but provides a neural rating system reflecting each party\'s reliability. Financial disputes must be resolved according to contracts between parties; we strongly encourage documenting all agreements within the platform\'s verified messaging system.'
        },
        {
          title: isRtl ? '3. الاستغلال العادل وحظر "التنقيب"' : '3. Fair Usage & Scraping Prohibition',
          body: isRtl
            ? 'يمنع استخدام أي أدوات آلية أو خوارزميات لاستخراج البيانات (Data Scraping) من المنصة. كما يمنع محاولة التلاعب بنتائج المطابقة (Algorithm Gaming) أو استهلاك موارد النظام بشكل غير عادل. نطبق أنظمة حماية (Stress Shields) تكتشف هذه الأنماط آلياً.'
            : 'Using automated tools or algorithms for data scraping from the platform is prohibited. Attempting to manipulate matching results (Algorithm Gaming) or unfair system resource consumption is also forbidden. We implement "Stress Shields" to detect these patterns automatically.'
        },
        {
          title: isRtl ? '4. نظام الرسوم والاشتراكات النخبوية' : '4. Fee System & Elite Subscriptions',
          body: isRtl
            ? 'قد تفرض المنصة رسوماً على خدمات معينة أو اشتراكات شهرية للميزات المتقدمة. يتم توضيح الرسوم قبل إتمام أي عملية دفع. جميع المدفوعات تتم عبر بوابات دفع آمنة ومعتمدة، وتخضع لسياسة الاسترداد المحددة في لوحة الفواتير.'
            : 'The platform may charge fees for certain services or monthly subscriptions for advanced features. Fees are clarified before any payment. All payments occur via secure, certified gateways and are subject to the refund policy specified in the billing dashboard.'
        },
        {
          title: isRtl ? '5. النسخة التجريبية (Beta) وضمان الاعتمادية' : '5. Beta Version & Reliability Assurance',
          body: isRtl
            ? 'المشاركون في النسخة التجريبية يدركون أن النظام في مرحلة "التطوير الحي". فريق النواة يعمل على مدار الساعة لضمان استقرار النظام (uptime)، ولكن قد تحدث فترات توقف قصيرة للصيانة أو اختبار الضغط. ملاحظات مستخدمي Beta هي العمود الفقري لتطوير النسخة الرسمية.'
            : 'Participants in the Beta version acknowledge the system is in "Live Development." The Core Team works around the clock to ensure system stability (uptime), but brief downtimes for maintenance or stress testing may occur. Beta user feedback is the backbone for developing the official version.'
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
