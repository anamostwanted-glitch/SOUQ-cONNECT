import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  ShieldCheck, 
  FileText, 
  Printer, 
  ArrowLeft,
  BrainCircuit,
  Zap,
  MapPin,
  Mic,
  ImageIcon,
  Lock,
  Eye,
  Database
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HelpCenterProps {
  onClose: () => void;
  isRtl: boolean;
}

const HelpCenter: React.FC<HelpCenterProps> = ({ onClose, isRtl }) => {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const Section = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <div className="mb-12 break-inside-avoid">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
          <Icon size={24} />
        </div>
        <h2 className="text-2xl font-black text-brand-text-main uppercase tracking-widest">
          {title}
        </h2>
      </div>
      <div className="space-y-4 text-brand-text-muted leading-relaxed">
        {children}
      </div>
    </div>
  );

  const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="p-6 bg-brand-background/50 rounded-3xl border border-brand-border/50 mb-4">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary mt-1">
          <Icon size={18} />
        </div>
        <div>
          <h4 className="font-bold text-brand-text-main mb-1">{title}</h4>
          <p className="text-sm">{desc}</p>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[100] bg-brand-background overflow-y-auto pb-20"
    >
      {/* Header - Hidden on Print */}
      <div className="sticky top-0 z-10 bg-brand-background/80 backdrop-blur-xl border-b border-brand-border/50 p-4 flex items-center justify-between print:hidden">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-brand-background rounded-full transition-all flex items-center gap-2 font-bold text-sm"
        >
          <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          {isRtl ? 'العودة' : 'Back'}
        </button>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-full font-bold text-sm shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all"
          >
            <Printer size={18} />
            {isRtl ? 'حفظ كـ PDF' : 'Save as PDF'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div ref={printRef} className="max-w-4xl mx-auto p-8 md:p-16 print:p-0">
        {/* Document Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center p-4 bg-brand-primary/10 rounded-3xl text-brand-primary mb-6">
            <BrainCircuit size={48} />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-brand-text-main uppercase tracking-tighter mb-4">
            {isRtl ? 'دليل المستخدم والسياسات' : 'User Guide & Legal Policies'}
          </h1>
          <p className="text-brand-text-muted font-bold uppercase tracking-widest text-sm">
            {isRtl ? 'النسخة الاحترافية 2026' : 'Professional Version 2026'}
          </p>
        </div>

        {/* 1. User Guide */}
        <Section icon={BookOpen} title={isRtl ? 'دليل ميزات المنصة' : 'Platform Features Guide'}>
          <p>
            {isRtl 
              ? 'مرحباً بك في منصة التوريد الذكية. تم تصميم هذا النظام ليكون شريكك الاستراتيجي في عمليات البحث والتوريد العالمية باستخدام أحدث تقنيات الذكاء الاصطناعي.'
              : 'Welcome to the Smart Sourcing Platform. This system is designed to be your strategic partner in global sourcing using cutting-edge AI technology.'}
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            <FeatureCard 
              icon={Zap}
              title={isRtl ? 'النبض العصبي (Neural Pulse)' : 'Neural Pulse'}
              desc={isRtl 
                ? 'محرك ذكاء اصطناعي استباقي يحلل الصور، الصوت، والموقع الجغرافي لتقديم فرص توريد فورية.'
                : 'Proactive AI engine that analyzes images, voice, and geo-location to provide instant sourcing opportunities.'}
            />
            <FeatureCard 
              icon={Database}
              title={isRtl ? 'الذاكرة العصبية (Neural Memory)' : 'Neural Memory'}
              desc={isRtl 
                ? 'تقنية توأمة محلية تخزن النتائج السابقة لتقليل استهلاك البيانات وتسريع الاستجابة بنسبة 90%.'
                : 'Local mirroring technology that stores previous results to reduce data usage and speed up response by 90%.'}
            />
            <FeatureCard 
              icon={MapPin}
              title={isRtl ? 'الرؤى الجغرافية' : 'Geo Insights'}
              desc={isRtl 
                ? 'تنبيهات ذكية بناءً على موقعك الحالي، تربطك بالموردين والمصانع القريبة منك.'
                : 'Smart alerts based on your current location, connecting you with nearby suppliers and factories.'}
            />
            <FeatureCard 
              icon={FileText}
              title={isRtl ? 'إدارة طلبات العروض (RFQ)' : 'RFQ Management'}
              desc={isRtl 
                ? 'تحويل المحادثات الصوتية إلى طلبات عروض رسمية مهيكلة وجاهزة للإرسال.'
                : 'Transforming voice conversations into formal, structured RFQs ready for submission.'}
            />
          </div>
        </Section>

        {/* 2. Terms of Use */}
        <Section icon={ShieldCheck} title={isRtl ? 'شروط الاستخدام' : 'Terms of Use'}>
          <div className="space-y-4">
            <div className="p-6 bg-brand-background/30 rounded-3xl border border-brand-border">
              <h4 className="font-bold text-brand-text-main mb-2">{isRtl ? '1. دقة البيانات' : '1. Data Accuracy'}</h4>
              <p className="text-sm">
                {isRtl 
                  ? 'يتم توليد جميع التحليلات والاقتراحات بواسطة نماذج الذكاء الاصطناعي. رغم دقتها العالية، يجب على المستخدم التحقق من المواصفات الفنية والأسعار مع الموردين مباشرة قبل إتمام أي صفقة.'
                  : 'All analyses and suggestions are generated by AI models. Despite high accuracy, users must verify technical specs and prices directly with suppliers before finalizing any deal.'}
              </p>
            </div>
            <div className="p-6 bg-brand-background/30 rounded-3xl border border-brand-border">
              <h4 className="font-bold text-brand-text-main mb-2">{isRtl ? '2. الاستخدام العادل' : '2. Fair Use'}</h4>
              <p className="text-sm">
                {isRtl 
                  ? 'تخضع ميزات الذكاء الاصطناعي لسياسة الاستخدام العادل (Fair Use Policy). قد يتم تقييد الوصول مؤقتاً في حال تجاوز حدود الاستهلاك اليومية المخصصة للحساب.'
                  : 'AI features are subject to a Fair Use Policy. Access may be temporarily restricted if daily consumption limits for the account are exceeded.'}
              </p>
            </div>
          </div>
        </Section>

        {/* 3. Privacy Policy */}
        <Section icon={Lock} title={isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}>
          <div className="space-y-6">
            <div className="flex gap-4">
              <Eye className="text-brand-primary shrink-0" size={20} />
              <div>
                <h4 className="font-bold text-brand-text-main">{isRtl ? 'الشفافية في المعالجة' : 'Processing Transparency'}</h4>
                <p className="text-sm">
                  {isRtl 
                    ? 'نحن نعالج الصور والبيانات الصوتية فقط لغرض تقديم الخدمة. لا يتم تخزين هذه البيانات بشكل دائم على خوادمنا لأغراض تدريب النماذج دون إذن صريح.'
                    : 'We process images and voice data only for service delivery. This data is not stored permanently on our servers for model training without explicit consent.'}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <MapPin className="text-brand-primary shrink-0" size={20} />
              <div>
                <h4 className="font-bold text-brand-text-main">{isRtl ? 'بيانات الموقع' : 'Location Data'}</h4>
                <p className="text-sm">
                  {isRtl 
                    ? 'يتم استخدام بيانات الموقع الجغرافي محلياً لتقديم "الرؤى الجغرافية". يمكنك تعطيل الوصول للموقع في أي وقت من إعدادات المتصفح أو التطبيق.'
                    : 'Location data is used locally to provide "Geo Insights". You can disable location access at any time from browser or app settings.'}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <ShieldCheck className="text-brand-primary shrink-0" size={20} />
              <div>
                <h4 className="font-bold text-brand-text-main">{isRtl ? 'أمن البيانات' : 'Data Security'}</h4>
                <p className="text-sm">
                  {isRtl 
                    ? 'نستخدم بروتوكولات تشفير متقدمة لحماية حسابك وبياناتك التجارية. يتم تخزين "الذاكرة العصبية" محلياً على جهازك لضمان أقصى درجات الخصوصية والسرعة.'
                    : 'We use advanced encryption protocols to protect your account and business data. "Neural Memory" is stored locally on your device to ensure maximum privacy and speed.'}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-20 pt-10 border-t border-brand-border/50 text-center text-[10px] uppercase tracking-widest text-brand-text-muted font-bold">
          <p>© 2026 NEURAL SOURCING PLATFORM - ALL RIGHTS RESERVED</p>
          <p className="mt-2">{isRtl ? 'تم التوليد بواسطة الذكاء الاصطناعي الاستباقي' : 'GENERATED BY PROACTIVE AI INTELLIGENCE'}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          .bg-brand-background { background: white !important; }
          .text-brand-text-muted { color: #666 !important; }
          .border-brand-border { border-color: #eee !important; }
          .bg-brand-primary\\/10 { background: #f0f9fa !important; border: 1px solid #eee; }
          .rounded-3xl { border-radius: 1rem !important; }
          @page { margin: 2cm; }
        }
      `}} />
    </motion.div>
  );
};

export default HelpCenter;
