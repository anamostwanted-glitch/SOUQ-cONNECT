import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Printer, 
  Download,
  ArrowLeft,
  BrainCircuit,
  Zap,
  Search,
  Lock,
  Eye,
  Database,
  Store,
  UserCheck,
  Building2,
  Sparkles,
  FileText,
  BadgeCheck,
  CheckCircle2,
  Target,
  Mic,
  MessageSquare
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HelpCenterProps {
  onClose: () => void;
  isRtl: boolean;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({ onClose, isRtl }) => {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'how_it_works' | 'features' | 'roles' | 'security'>('how_it_works');
  const [searchQuery, setSearchQuery] = useState('');

  // Enhanced Print function with fallback for iframe sandboxing
  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML || '';
    try {
      const printWin = window.open('', '_blank', 'width=1000,height=800');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
          <head>
            <meta charset="UTF-8">
            <title>${isRtl ? 'دليل المستخدم والمركز المعرفي - سوق كونيكت' : 'User Guide & Knowledge Center - Souq Connect'}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { background: white !important; color: black !important; padding: 30px; font-family: system-ui, -apple-system, sans-serif; }
              @media print {
                body { padding: 0; }
                .print\\:hidden { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div style="max-width: 900px; margin: 0 auto;">
              ${printContent}
            </div>
            <script>
              setTimeout(function() {
                window.print();
              }, 600);
            </script>
          </body>
          </html>
        `);
        printWin.document.close();
      } else {
        window.print();
      }
    } catch (err) {
      window.print();
    }
  };

  // Direct HTML / PDF-ready document download
  const handleDownloadDoc = () => {
    const title = isRtl ? 'دليل المستخدم والمركز المعرفي الموحد - سوق كونيكت' : 'User Guide & Knowledge Center - Souq Connect';
    const content = `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #ffffff; color: #0f172a; line-height: 1.8; }
    .header { text-align: center; border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #0284c7; font-size: 28px; margin-bottom: 8px; }
    .header p { color: #64748b; font-size: 14px; }
    h2 { color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; font-size: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
    .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; }
    .step-num { font-size: 22px; font-weight: bold; color: #0284c7; margin-bottom: 6px; }
    .card-title { font-weight: bold; font-size: 16px; color: #0f172a; margin-bottom: 6px; }
    .card-desc { font-size: 13px; color: #475569; }
    ul { padding-inline-start: 20px; }
    li { margin-bottom: 8px; font-size: 14px; }
    .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>${isRtl ? 'منصة التوريد المباشرة بالذكاء الاصطناعي - سوق كونيكت 2026' : 'AI-Powered Sourcing Platform - Souq Connect 2026'}</p>
  </div>

  <h2>1. ${isRtl ? 'آلية العمل ورحلة المستخدم (4 خطوات)' : '1. Core Workflow (4 Steps)'}</h2>
  <div class="grid">
    <div class="card">
      <div class="step-num">01</div>
      <div class="card-title">${isRtl ? 'التسجيل وتحديد الهوية' : 'Register & Role Setup'}</div>
      <div class="card-desc">${isRtl ? 'إنشاء حساب وتحديد نوع النشاط (مشتري / شركة أو مورد / مصنع) لبناء ملف عصبي موحد.' : 'Create an account and set your role (Buyer or Supplier).'}</div>
    </div>
    <div class="card">
      <div class="step-num">02</div>
      <div class="card-title">${isRtl ? 'تحديد الطلب أو العرض' : 'Express Need or Post Offer'}</div>
      <div class="card-desc">${isRtl ? 'إدخال الاحتياج عبر البحث الصوتي، الصورة، أو إنشاء طلب عرض (RFQ) محدد بالمواصفات.' : 'Input demand via voice, visual image, or detailed RFQ form.'}</div>
    </div>
    <div class="card">
      <div class="step-num">03</div>
      <div class="card-title">${isRtl ? 'المطابقة الذكية والنبض العصبي' : 'Neural Matching & Pulse'}</div>
      <div class="card-desc">${isRtl ? 'يقوم المحرك العصبي بمطابقة الطلب تلقائياً مع أفضل الموردين المعتمدين وتعلّم كلمات البحث.' : 'AI analyzes demand, learns keywords (Demand Lexicon), and matches with top suppliers.'}</div>
    </div>
    <div class="card">
      <div class="step-num">04</div>
      <div class="card-title">${isRtl ? 'التواصل وإتمام الصفقة' : 'Deal Negotiation & Closure'}</div>
      <div class="card-desc">${isRtl ? 'تلقي العروض التنافسية، المحادثة المباشرة، والموافقة على التوريد بأعلى درجات الأمان.' : 'Receive quotes, conduct live chat, and finalize supply contracts.'}</div>
    </div>
  </div>

  <h2>2. ${isRtl ? 'دليل المزايا والتقنيات العصبية' : '2. Advanced Neural Features'}</h2>
  <ul>
    <li><strong>${isRtl ? 'مركز القيادة العصبي (Unified Command Center):' : 'Unified Command Center:'}</strong> ${isRtl ? 'لوحة تحكم موحدة تجمع كافة الأدوات، الإحصائيات، وسرعة الوصول بتصميم Bento Matrix.' : 'Unified dashboard grouping all tools, stats, and quick links.'}</li>
    <li><strong>${isRtl ? 'محرك النبض العصبي (Neural Pulse):' : 'Neural Pulse Engine:'}</strong> ${isRtl ? 'محرك تحليلي يراقب سلوك البحث والطلب محلياً، ويتنبأ بالفرص الاستثمارية.' : 'Analytical engine tracking search/demand behavior to predict supply opportunities.'}</li>
    <li><strong>${isRtl ? 'المطابقة التنبؤية (Predictive Matching):' : 'Predictive Matching:'}</strong> ${isRtl ? 'ربط تلقائي بالذكاء الاصطناعي بين طلبات المشتري العصبية وأفضل الموردين المعتمدين.' : 'Automated AI pairing between buyer demand and verified top suppliers.'}</li>
    <li><strong>${isRtl ? 'القاموس العصبي للطلب (Demand Lexicon):' : 'Demand Lexicon Learning:'}</strong> ${isRtl ? 'خوارزمية ذكية تتعلّم الكلمات المفتاحية الجديدة لتعزيز اكتشاف الفئات ومساعدة الموردين.' : 'Smart algorithm learning search terms to enhance category discovery.'}</li>
    <li><strong>${isRtl ? 'البحث الصوتي الذكي (Voice Sourcing):' : 'Voice Sourcing:'}</strong> ${isRtl ? 'إملاء الطلبات بالصوت وتحويلها فوراً إلى نتائج بحث مفلترة وطلبات عروض.' : 'Voice input support for dictating specs and turning requests into structured RFQs.'}</li>
    <li><strong>${isRtl ? 'التقاط الصور والتحليل البصري (Visual Search):' : 'Visual Search:'}</strong> ${isRtl ? 'رفع صورة المنتج أو المواصفات، ليقوم الذكاء الاصطناعي باستخراج المواصفات والوصول للمورد المطابق.' : 'Upload product images or specs for instant AI visual feature extraction.'}</li>
  </ul>

  <h2>3. ${isRtl ? 'دليل الأدوار والصلاحيات' : '3. User Roles Guide'}</h2>
  <div class="card">
    <div class="card-title">${isRtl ? 'المشتري (Buyer)' : 'Buyer Role'}</div>
    <div class="card-desc">${isRtl ? 'إنشاء وتقديم طلبات العروض (RFQs)، استخدام البحث الصوتي والبصري، مقارنة العروض، والمحادثة المباشرة.' : 'Create & submit RFQs, voice/visual search, compare quotes, and direct live chat.'}</div>
  </div>
  <div class="card" style="margin-top: 10px;">
    <div class="card-title">${isRtl ? 'المورد (Supplier / Vendor)' : 'Supplier Role'}</div>
    <div class="card-desc">${isRtl ? 'عرض المنتجات في السوق، تقديم عروض أسعار على طلبات المشتري، تتبع النبض العصبي للطلب، وتأكيد الهوية.' : 'Post products, quote on buyer RFQs, track demand pulse, and verify store profile.'}</div>
  </div>

  <h2>4. ${isRtl ? 'الأمان وسياسة الحذف الآمن (Soft Delete)' : '4. Security & Soft Delete Policy'}</h2>
  <p>${isRtl ? 'جميع بيانات الحسابات والطلبات والعروض محمية. لا يتم حذف أي بيانات نهائياً من قاعدة البيانات، بل توسم بحالة Soft Delete لحفظ الحقوق والتاريخ التجاري.' : 'All account and trade data is protected. Soft delete pattern ensures transaction history remains preserved.'}</p>

  <div class="footer">
    © 2026 SOUQ CONNECT - DEVELOPED BY CORE TEAM - UNIFIED AI PLATFORM
  </div>
</body>
</html>`;

    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SouqConnect_UserGuide_${isRtl ? 'AR' : 'EN'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'how_it_works', label: isRtl ? 'آلية العمل والبدء السريع' : 'How It Works', icon: Zap },
    { id: 'features', label: isRtl ? 'دليل المزايا والذكاء الاصطناعي' : 'Features & AI', icon: BrainCircuit },
    { id: 'roles', label: isRtl ? 'دليل الأدوار (المشتري / المورد)' : 'Roles Guide', icon: Building2 },
    { id: 'security', label: isRtl ? 'الأمان والسياسات' : 'Security & Policies', icon: ShieldCheck },
  ];

  const filteredFeatures = [
    {
      icon: Zap,
      category: 'ai',
      title: isRtl ? 'مركز القيادة العصبي (Unified Command Center)' : 'Unified Command Center',
      desc: isRtl ? 'لوحة تحكم موحدة تجمع كافة الأدوات، الإحصائيات، وسرعة الوصول إلى كافة الأقسام بتصميم Bento Matrix فاخر.' : 'Unified dashboard grouping all tools, stats, and quick links in a sleek Bento Matrix design.'
    },
    {
      icon: BrainCircuit,
      category: 'ai',
      title: isRtl ? 'محرك النبض العصبي (Neural Pulse)' : 'Neural Pulse Engine',
      desc: isRtl ? 'محرك تحليلي يراقب سلوك البحث والطلب محلياً، ويتنبأ بالفرص الاستثمارية والتوريدية في الوقت الفعلي.' : 'Analytical engine tracking local search/demand behavior to predict supply/investment opportunities in real time.'
    },
    {
      icon: Target,
      category: 'ai',
      title: isRtl ? 'المطابقة التنبؤية (Predictive Matching)' : 'Predictive Matching',
      desc: isRtl ? 'ربط تلقائي بالذكاء الاصطناعي بين طلبات المشتري العصبية وأفضل الموردين المعتمدين لتوفير أفضل العروض.' : 'Automated AI pairing between buyer demand and verified top suppliers for optimal deal matching.'
    },
    {
      icon: Search,
      category: 'ai',
      title: isRtl ? 'القاموس العصبي للطلب (Demand Lexicon)' : 'Demand Lexicon Learning',
      desc: isRtl ? 'خوارزمية ذكية تتعلّم المصطلحات والكلمات المفتاحية الجديدة لتعزيز اكتشاف الفئات ومساعدة الموردين.' : 'Smart algorithm learning search terms to enhance category discovery and empower supplier visibility.'
    },
    {
      icon: Mic,
      category: 'search',
      title: isRtl ? 'البحث الصوتي الذكي (Voice Sourcing)' : 'Voice Smart Search',
      desc: isRtl ? 'إمكانية إملاء الطلبات والمواصفات بالصوت وتحويلها فوراً إلى نتائج بحث مفلترة وطلبات عروض.' : 'Voice input support for dictating specs and turning voice requests into structured RFQs and results.'
    },
    {
      icon: Sparkles,
      category: 'search',
      title: isRtl ? 'التقاط الصور والتحليل البصري (Visual Search)' : 'Visual AI Search',
      desc: isRtl ? 'رفع صورة المنتج أو المواصفات، ليقوم الذكاء الاصطناعي باستخراج الكلمات والوصول للمورد المطابق.' : 'Upload product images or specs for instant AI visual feature extraction and supplier matching.'
    },
    {
      icon: FileText,
      category: 'trade',
      title: isRtl ? 'طلب العروض الذكي (Smart RFQs)' : 'Smart RFQ System',
      desc: isRtl ? 'إنشاء وتخصيص طلبات العروض بسهولة وإرسالها للموردين المعتمدين مع تتبع حالة الردود.' : 'Effortlessly generate and dispatch custom RFQs to certified suppliers with real-time tracking.'
    },
    {
      icon: Store,
      category: 'trade',
      title: isRtl ? 'السوق التفاعلي المباشر (Live Marketplace)' : 'Live Interactive Marketplace',
      desc: isRtl ? 'تصفح العروض والمنتجات المتاحة من الموردين، وتصفية الموردين حسب الفئة والنطاق الجغرافي.' : 'Browse products and services from verified suppliers, filtered by category and geolocation.'
    },
  ].filter(item => 
    !searchQuery || 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[100] bg-brand-background overflow-y-auto pb-20 text-brand-text-main"
    >
      {/* Top Header Controls - Print Hidden */}
      <div className="sticky top-0 z-20 bg-brand-background/95 backdrop-blur-xl border-b border-brand-border/60 px-6 py-4 flex items-center justify-between print:hidden">
        <button 
          onClick={onClose}
          className="p-2.5 hover:bg-brand-primary/10 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm text-brand-text-main hover:text-brand-primary"
        >
          <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          {isRtl ? 'العودة للموقع' : 'Back to App'}
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadDoc}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-surface border border-brand-border text-brand-text-main hover:border-brand-primary rounded-2xl font-bold text-xs md:text-sm shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download size={18} className="text-brand-primary" />
            {isRtl ? 'تحميل الدليل (PDF/HTML)' : 'Download Guide (HTML/PDF)'}
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-2xl font-bold text-xs md:text-sm shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Printer size={18} />
            {isRtl ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div ref={printRef} className="max-w-5xl mx-auto px-6 py-10 md:py-16 print:p-0">
        
        {/* Banner Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 rounded-3xl text-brand-primary mb-6 shadow-inner border border-brand-primary/20">
            <BrainCircuit size={48} className="animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4 text-brand-text-main">
            {isRtl ? 'دليل المستخدم والمركز المعرفي الموحد' : 'User Guide & Unified Knowledge Center'}
          </h1>
          <p className="text-brand-text-muted font-bold text-sm md:text-base max-w-2xl mx-auto">
            {isRtl 
              ? 'دليلك الشامل للفهم والتطوير: اكتشف كيفية عمل سوق كونيكت، محرك النبض العصبي، وآلية الربط بين المشترين والموردين.'
              : 'Your complete user guide: Discover how Souq Connect, Neural Pulse, and Buyer-Supplier matching work.'}
          </p>
        </div>

        {/* Search Bar in Guide - Hidden in Print */}
        <div className="mb-8 max-w-xl mx-auto relative print:hidden">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={20} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'ابحث عن ميزة أو خطوة أو أداة...' : 'Search for a feature, step, or tool...'}
            className="w-full pl-4 pr-12 py-3.5 bg-brand-background/60 border border-brand-border/80 rounded-2xl focus:outline-none focus:border-brand-primary font-medium text-sm transition-all"
          />
        </div>

        {/* Navigation Tabs - Hidden in Print */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12 print:hidden border-b border-brand-border/50 pb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' 
                    : 'bg-brand-background/50 hover:bg-brand-primary/10 text-brand-text-muted hover:text-brand-text-main border border-brand-border/40'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: How It Works (آلية العمل والبدء السريع) */}
        {(activeTab === 'how_it_works' || searchQuery) && (
          <div className="space-y-12 mb-16">
            <div className="flex items-center gap-3 border-b border-brand-border/60 pb-4">
              <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black">{isRtl ? '1. آلية العمل ومراحل رحلة المستخدم' : '1. Core Workflow & User Journey'}</h2>
                <p className="text-sm text-brand-text-muted">{isRtl ? 'كيف تدور دورة العمل في منصة سوق كونيكت من البداية وحتى التوريد' : 'How the entire procurement lifecycle functions in Souq Connect'}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  step: '01',
                  title: isRtl ? 'التسجيل وتحديد الهوية' : 'Register & Role Setup',
                  desc: isRtl ? 'يقوم المستخدم بإنشاء حسابه وتحديد نوع النشاط (مشتري / شركة أو مورد / مصنع) لبناء ملف عصبي موحد.' : 'Create an account and choose your role (Buyer or Supplier) to build your unified profile.',
                  icon: UserCheck
                },
                {
                  step: '02',
                  title: isRtl ? 'تحديد الطلب أو العرض' : 'Express Need or Post Offer',
                  desc: isRtl ? 'إدخال الاحتياج عبر البحث الصوتي، الصورة، أو إنشاء طلب عرض (RFQ) محدد بالمواصفات.' : 'Input your demand via voice, visual image, or detailed RFQ specification form.',
                  icon: Mic
                },
                {
                  step: '03',
                  title: isRtl ? 'المطابقة الذكية والنبض العصبي' : 'Neural Matching & Analysis',
                  desc: isRtl ? 'يقوم الخوارزم العصبي بتحليل الطلب وتأطير الكلمات المفتاحية ومطابقتها فوراً مع أفضل الموردين.' : 'AI analyzes demand, learns keywords (Demand Lexicon), and matches with certified suppliers.',
                  icon: BrainCircuit
                },
                {
                  step: '04',
                  title: isRtl ? 'التواصل وإتمام الصفقة' : 'Deal Negotiation & Closure',
                  desc: isRtl ? 'تلقي العروض التنافسية، المحادثة المباشرة، والموافقة على التوريد بأعلى درجات الأمان.' : 'Receive competitive offers, conduct live chat, and finalize supply deals securely.',
                  icon: BadgeCheck
                }
              ].map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={idx} className="p-6 bg-brand-background/40 border border-brand-border/60 rounded-3xl relative overflow-hidden group hover:border-brand-primary/50 transition-all">
                    <div className="text-3xl font-black text-brand-primary/30 mb-4">{s.step}</div>
                    <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary w-fit mb-4">
                      <Icon size={22} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                    <p className="text-xs text-brand-text-muted leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Start Matrix */}
            <div className="p-8 bg-gradient-to-br from-brand-primary/10 via-transparent to-brand-primary/5 border border-brand-primary/20 rounded-3xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                <Sparkles className="text-brand-primary" size={22} />
                {isRtl ? 'أبرز ميزات سرعة الاستخدام' : 'Efficiency Highlights'}
              </h3>
              <ul className="grid md:grid-cols-2 gap-4 text-sm">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-brand-primary shrink-0 mt-0.5" size={18} />
                  <span>{isRtl ? 'واجهة Bento Matrix تفاعلية تتيح الانتقال السريع بنقرة واحدة.' : 'Interactive Bento Matrix interface offering 1-click navigation.'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-brand-primary shrink-0 mt-0.5" size={18} />
                  <span>{isRtl ? 'حفظ محلي استباقي لتسريع فتح الصفحات بنسبة تصل إلى 90%.' : 'Proactive local memory cache speeding up load times by 90%.'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-brand-primary shrink-0 mt-0.5" size={18} />
                  <span>{isRtl ? 'دعم كامل باللغتين العربية والإنجليزية مع اتجاه RTL/LTR مثالي.' : 'Full Arabic/English support with pixel-perfect RTL/LTR layouts.'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-brand-primary shrink-0 mt-0.5" size={18} />
                  <span>{isRtl ? 'تنبيهات فورية عند ورود عروض جديدة أو تحديثات على الطلبات.' : 'Real-time notifications for incoming supplier offers and RFQ updates.'}</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Detailed Features & AI (دليل المزايا والذكاء الاصطناعي) */}
        {(activeTab === 'features' || searchQuery) && (
          <div className="space-y-8 mb-16">
            <div className="flex items-center gap-3 border-b border-brand-border/60 pb-4">
              <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                <BrainCircuit size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black">{isRtl ? '2. دليل المزايا المتقدمة والتقنيات العصبية' : '2. Advanced Features & Neural Tech'}</h2>
                <p className="text-sm text-brand-text-muted">{isRtl ? 'استعرض المزايا بالتفصيل وكيف تساعدك في إنجاز أعمالك' : 'Detailed breakdown of AI features designed for seamless operations'}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {filteredFeatures.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="p-6 bg-brand-background/50 rounded-3xl border border-brand-border/70 hover:border-brand-primary/60 transition-all flex items-start gap-4">
                    <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary shrink-0">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base mb-1 text-brand-text-main">{item.title}</h4>
                      <p className="text-xs text-brand-text-muted leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Roles Guide (دليل الأدوار) */}
        {(activeTab === 'roles' || searchQuery) && (
          <div className="space-y-8 mb-16">
            <div className="flex items-center gap-3 border-b border-brand-border/60 pb-4">
              <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black">{isRtl ? '3. دليل الأدوار والصلاحيات (المشتري / المورد / الإدارة)' : '3. User Roles Guide'}</h2>
                <p className="text-sm text-brand-text-muted">{isRtl ? 'الأدوات والوظائف المصممة خصيصاً لكل فئة مستخدمين' : 'Custom tools tailored for Buyers, Suppliers, and Admins'}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Buyer */}
              <div className="p-6 bg-brand-background/40 border border-brand-border/70 rounded-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                    <UserCheck size={20} />
                  </div>
                  <h3 className="font-bold text-lg">{isRtl ? 'المشتري (Buyer)' : 'Buyer'}</h3>
                </div>
                <ul className="space-y-2.5 text-xs text-brand-text-muted">
                  <li className="flex items-center gap-2">✓ {isRtl ? 'إنشاء وتقديم طلبات العروض (RFQs)' : 'Create & submit RFQs'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'استخدام البحث الصوتي والبصري بالصور' : 'Voice and visual search'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'مقارنة العروض المقدمة من الموردين' : 'Compare supplier quotes'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'محادثة الموردين المباشرة والتفاوض' : 'Direct live chat & negotiation'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'إدارة المفضلات والتحليلات الشحصية' : 'Favorites & personal analytics'}</li>
                </ul>
              </div>

              {/* Supplier */}
              <div className="p-6 bg-brand-background/40 border border-brand-border/70 rounded-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Store size={20} />
                  </div>
                  <h3 className="font-bold text-lg">{isRtl ? 'المورد (Supplier / Vendor)' : 'Supplier'}</h3>
                </div>
                <ul className="space-y-2.5 text-xs text-brand-text-muted">
                  <li className="flex items-center gap-2">✓ {isRtl ? 'إضافة وعرض المنتجات في السوق' : 'Post & manage products'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'تقديم عروض أسعار على طلبات المشتري' : 'Submit quotes on buyer RFQs'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'تتبع طلبات العروض والنبض العصبي' : 'Track RFQs & Demand Pulse'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'الاستفادة من كلمات القاموس العصبي' : 'Gain insights from Demand Lexicon'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'تأكيد الهوية وشارة التوثيق' : 'Verification badge & store profile'}</li>
                </ul>
              </div>

              {/* Admin */}
              <div className="p-6 bg-brand-background/40 border border-brand-border/70 rounded-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="font-bold text-lg">{isRtl ? 'الإدارة (Admin Command)' : 'Admin'}</h3>
                </div>
                <ul className="space-y-2.5 text-xs text-brand-text-muted">
                  <li className="flex items-center gap-2">✓ {isRtl ? 'مراقبة النبض العصبي والكلمات الأكثر طلباً' : 'Monitor Neural Pulse & search trends'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'مراجعة الموردين وتوثيق الحسابات' : 'Review & verify supplier accounts'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'إدارة الأقسام والفئات التنافسية' : 'Manage categories & market metrics'}</li>
                  <li className="flex items-center gap-2">✓ {isRtl ? 'تحليلات الأداء والتقارير الشاملة' : 'System analytics & compliance audit'}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Security & Policies (الأمان والسياسات) */}
        {(activeTab === 'security' || searchQuery) && (
          <div className="space-y-8 mb-16">
            <div className="flex items-center gap-3 border-b border-brand-border/60 pb-4">
              <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black">{isRtl ? '4. الحماية وسياسة الحذف الآمن (Soft Delete)' : '4. Security & Soft Delete Policy'}</h2>
                <p className="text-sm text-brand-text-muted">{isRtl ? 'كيف نضمن سلامة بياناتك وعدم فقدان أي طلب أو عرض تجاري' : 'How we safeguard your trade data and prevent data loss'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-brand-background/30 rounded-3xl border border-brand-border">
                <h4 className="font-bold text-brand-text-main mb-2 flex items-center gap-2">
                  <Lock className="text-brand-primary" size={18} />
                  {isRtl ? '1. سياسة الحذف الآمن (Soft Delete Pattern)' : '1. Soft Delete Pattern'}
                </h4>
                <p className="text-sm text-brand-text-muted leading-relaxed">
                  {isRtl 
                    ? 'في منصة سوق كونيكت، لا يتم حذف أي طلبات أو عروض أو سجلات تجارية نهائياً من قاعدة البيانات. عند اختيار الحذف، يتم وسم العنصر بحالة (Soft Deleted) لحماية الحقوق التجارية والمالية لكلا الطرفين ومراجعتها عند الحاجة.'
                    : 'In Souq Connect, no user data, offer, or RFQ is permanently deleted. Items are soft-deleted with a status flag to protect trade and legal history.'}
                </p>
              </div>

              <div className="p-6 bg-brand-background/30 rounded-3xl border border-brand-border">
                <h4 className="font-bold text-brand-text-main mb-2 flex items-center gap-2">
                  <Eye className="text-brand-primary" size={18} />
                  {isRtl ? '2. سرية البيانات والصوت والفرز البصري' : '2. Voice & Visual Data Privacy'}
                </h4>
                <p className="text-sm text-brand-text-muted leading-relaxed">
                  {isRtl 
                    ? 'التحليل البصري والصوتي يتم عبر معالجة فورية مشفرة. لا يتم تسريب أو مشاركة الصور أو التسجيلات الخاصة بشركتك مع أي أطراف خارجية بدون موافقة.'
                    : 'Visual and voice processing are encrypted in real time. Your company photos and voice notes are never shared with unauthorized third parties.'}
                </p>
              </div>

              <div className="p-6 bg-brand-background/30 rounded-3xl border border-brand-border">
                <h4 className="font-bold text-brand-text-main mb-2 flex items-center gap-2">
                  <Database className="text-brand-primary" size={18} />
                  {isRtl ? '3. دقة التنبؤ بالذكاء الاصطناعي' : '3. AI Prediction Accuracy'}
                </h4>
                <p className="text-sm text-brand-text-muted leading-relaxed">
                  {isRtl 
                    ? 'اقتراحات محرك النبض العصبي ومطابقة الموردين استرشادية، ويتحقق الطرفان من المواصفات الفنية والشروط المالية قبل توقيع عقود التوريد.'
                    : 'Neural Pulse recommendations are predictive tools. Both parties verify technical specifications and terms prior to contract execution.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 pt-10 border-t border-brand-border/60 text-center text-xs uppercase tracking-widest text-brand-text-muted font-bold space-y-2">
          <p>© 2026 SOUQ CONNECT - UNIFIED NEURAL SOURCING PLATFORM</p>
          <p className="text-[10px] text-brand-primary">{isRtl ? 'تم التطوير بواسطة فريق النواة - الذكاء الاصطناعي الموحد' : 'DEVELOPED BY CORE TEAM - UNIFIED AI PLATFORM'}</p>
        </div>

      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          .bg-brand-background { background: white !important; }
          .text-brand-text-muted { color: #555 !important; }
          .border-brand-border { border-color: #ddd !important; }
          .bg-brand-primary\\/10 { background: #f0f9fa !important; border: 1px solid #ddd; }
          .rounded-3xl { border-radius: 1rem !important; }
          @page { margin: 2cm; }
        }
      `}} />
    </motion.div>
  );
};

export default HelpCenter;
