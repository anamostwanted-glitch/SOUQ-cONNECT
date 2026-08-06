import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Smartphone, 
  Code2, 
  Key, 
  CheckCircle, 
  Copy, 
  Terminal, 
  User, 
  Briefcase, 
  Layers, 
  Activity, 
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export const AdminMobileApiGateway: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState<'user' | 'supplier' | 'health'>('user');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await fetch('/api/mobile/v1/health');
      const data = await res.json();
      setHealthStatus(data);
    } catch (e) {
      console.error('Health fetch error:', e);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(label);
    toast.success(isRtl ? 'تم نسخ النص إلى الحافظة' : 'Copied to clipboard!');
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const userEndpoints = [
    {
      method: 'GET',
      path: '/api/mobile/v1/user/categories',
      auth: false,
      titleAr: 'جلب كل التصنيفات',
      titleEn: 'Fetch All Categories',
      descAr: 'استرجاع جميع تصنيفات السوق الرئيسية والفرعية للتطبيق.',
      descEn: 'Retrieve all main and sub-categories for the mobile UI.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/user/categories"`
    },
    {
      method: 'GET',
      path: '/api/mobile/v1/user/marketplace',
      auth: false,
      titleAr: 'البحث في منتجات السوق',
      titleEn: 'Search Marketplace Items',
      descAr: 'البحث والتصفية بالكلمات المفتاحية والتصنيفات.',
      descEn: 'Search and filter active products & services by query or category.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/user/marketplace?search=phone"`
    },
    {
      method: 'POST',
      path: '/api/mobile/v1/user/requests',
      auth: true,
      titleAr: 'إنشاء طلب جديد (RFQ)',
      titleEn: 'Submit Service/Product Request',
      descAr: 'إرسال طلب جديد مع الميزانية والكمية والتفاصيل لتوليد مطابقة ذكية.',
      descEn: 'Submit a buyer request with budget & description for predictive supplier matching.',
      curl: `curl -X POST "${baseUrl}/api/mobile/v1/user/requests" \\\n  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"productName":"كاميرات مراقبة","description":"مطلوب 5 كاميرات عالية الدقة","budget":350}'`
    },
    {
      method: 'GET',
      path: '/api/mobile/v1/user/requests',
      auth: true,
      titleAr: 'قائمة طلباتي',
      titleEn: 'List My Requests',
      descAr: 'استرجاع الطلبات المقدمة بواسطة العميل مع حالتها.',
      descEn: 'Get all requests submitted by the logged-in buyer.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/user/requests" \\\n  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    },
    {
      method: 'GET',
      path: '/api/mobile/v1/user/requests/:id/offers',
      auth: true,
      titleAr: 'عروض السعر المستلمة',
      titleEn: 'Get Received Offers for Request',
      descAr: 'استعراض عروض الأسعار المقدمة من الموردين لطلب معين.',
      descEn: 'Fetch supplier proposals submitted for a specific request ID.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/user/requests/REQ_123/offers" \\\n  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    },
    {
      method: 'POST',
      path: '/api/mobile/v1/user/offers/:id/accept',
      auth: true,
      titleAr: 'قبول عرض سعر',
      titleEn: 'Accept Supplier Offer',
      descAr: 'قبول عرض المورد وتحويل حالة الطلب إلى مكتمل.',
      descEn: 'Accept a supplier offer and transition request status to completed.',
      curl: `curl -X POST "${baseUrl}/api/mobile/v1/user/offers/OFFER_456/accept" \\\n  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    }
  ];

  const supplierEndpoints = [
    {
      method: 'GET',
      path: '/api/mobile/v1/supplier/leads',
      auth: true,
      role: 'supplier',
      titleAr: 'فرص الأعمال والطلبات المتاحة',
      titleEn: 'Fetch Open Client Leads',
      descAr: 'استرجاع الطلبات النشطة المترددة التي تطابق تخصص المورد.',
      descEn: 'Retrieve open client requests matching supplier tags.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/supplier/leads" \\\n  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    },
    {
      method: 'POST',
      path: '/api/mobile/v1/supplier/offers',
      auth: true,
      role: 'supplier',
      titleAr: 'تقديم عرض سعر لعميل',
      titleEn: 'Submit Proposal / Price Offer',
      descAr: 'إرسال عرض سعر تفصيلي مع مدة التسليم والملاحظات.',
      descEn: 'Send a detailed proposal with price, currency, and delivery days.',
      curl: `curl -X POST "${baseUrl}/api/mobile/v1/supplier/offers" \\\n  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"requestId":"REQ_123","price":320,"currency":"JOD","deliveryDays":2}'`
    },
    {
      method: 'GET',
      path: '/api/mobile/v1/supplier/products',
      auth: true,
      role: 'supplier',
      titleAr: 'كتالوج منتجات المورد',
      titleEn: 'List Storefront Products',
      descAr: 'استرجاع كافة المنتجات والخدمات المدرجة في متجر المورد.',
      descEn: 'Fetch all active products and services in the supplier store.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/supplier/products" \\\n  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    },
    {
      method: 'POST',
      path: '/api/mobile/v1/supplier/products',
      auth: true,
      role: 'supplier',
      titleAr: 'إضافة منتج/خدمة جديدة',
      titleEn: 'Create New Store Listing',
      descAr: 'إضافة منتج أو خدمة جديدة في الكتالوج المخصص.',
      descEn: 'Create a new item in the supplier catalog.',
      curl: `curl -X POST "${baseUrl}/api/mobile/v1/supplier/products" \\\n  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title":"خدمة تركيب شبكات","price":150,"category":"IT Services"}'`
    },
    {
      method: 'GET',
      path: '/api/mobile/v1/supplier/stats',
      auth: true,
      role: 'supplier',
      titleAr: 'إحصائيات المورد والأداء',
      titleEn: 'Supplier Analytics & Stats',
      descAr: 'استرجاع إحصائيات الأرباح، نسبة الفوز بالعروض، والطلبات النشطة.',
      descEn: 'Retrieve total proposals sent, win rate percentage, and active listings.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/supplier/stats" \\\n  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    }
  ];

  return (
    <div className={`space-y-6 ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-8 rounded-3xl relative overflow-hidden flex items-center justify-between shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-lg">
            <Smartphone className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight">
                {isRtl ? 'بوابة واجهة برمجة التطبيقات للموبايل (Mobile API Gateway)' : 'Mobile Web API Gateway'}
              </h2>
              <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-black border border-teal-500/30 uppercase tracking-widest">
                Admin Secure v1.0
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              {isRtl ? 'محمي بالكامل داخل لوحة تحكم الإدارة المركزية. واجهات RESTful مخصصة لتطبيقات الهواتف للعملاء ومزودي الخدمات.' : 'Secured inside Admin Central Control. Dedicated RESTful endpoints powering iOS, Android, and Flutter mobile applications.'}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-xs font-mono text-teal-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Protected Endpoint</span>
        </div>
      </div>

      {/* Navigation & Status Bar */}
      <div className="bg-brand-surface border border-brand-border p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('user')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'user' 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25' 
                : 'bg-brand-background text-brand-text-muted hover:text-brand-text-main border border-brand-border'
            }`}
          >
            <User className="w-4 h-4" />
            {isRtl ? 'واجهات العملاء (Buyers)' : 'Buyer APIs'}
          </button>

          <button
            onClick={() => setActiveTab('supplier')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'supplier' 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25' 
                : 'bg-brand-background text-brand-text-muted hover:text-brand-text-main border border-brand-border'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            {isRtl ? 'واجهات مزودي الخدمات (Suppliers)' : 'Service Provider APIs'}
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'health' 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25' 
                : 'bg-brand-background text-brand-text-muted hover:text-brand-text-main border border-brand-border'
            }`}
          >
            <Activity className="w-4 h-4" />
            {isRtl ? 'حالة الخدمة والمواصفات' : 'Server Health & Spec'}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="font-bold text-brand-text-muted">Auth Scheme:</span>
          <span className="font-mono bg-brand-background text-brand-text-main px-2.5 py-1 rounded-lg text-xs border border-brand-border">
            Bearer &lt;firebase_id_token&gt;
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {activeTab === 'health' ? (
          <div className="space-y-6">
            <div className="p-6 bg-slate-900 text-teal-400 rounded-3xl border border-slate-800 font-mono text-xs space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-300 font-sans font-bold text-sm">
                  {isRtl ? 'فحص الاتصال المباشر (Live Ping)' : 'Live Health Endpoint'}
                </span>
                <button
                  onClick={fetchHealth}
                  className="px-4 py-1.5 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 rounded-xl transition-all font-sans text-xs flex items-center gap-1.5 font-bold"
                >
                  <Activity className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                  {isRtl ? 'تحديث الفحص' : 'Re-check'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap overflow-x-auto text-emerald-400">
                {JSON.stringify(healthStatus || { message: "Loading status..." }, null, 2)}
              </pre>
            </div>

            <div className="p-8 bg-teal-50/50 rounded-3xl border border-teal-200 shadow-sm">
              <h4 className="font-black text-teal-950 text-base flex items-center gap-2.5 mb-3">
                <Sparkles className="w-5 h-5 text-teal-600" />
                {isRtl ? 'تعليمات المطورين لتطبيقات الموبايل (Flutter / React Native)' : 'Mobile Developer Quickstart'}
              </h4>
              <p className="text-xs text-teal-900 leading-relaxed mb-4 font-medium">
                {isRtl 
                  ? 'عند تسجيل المستخدم أو المورد دخوله عبر Firebase SDK في تطبيق الموبايل، استخدم `user.getIdToken()` لإرسال الـ Token في هيدر Request:'
                  : 'When users or suppliers log in via Firebase SDK in your mobile app, obtain their ID token using `user.getIdToken()` and pass it in the HTTP headers:'}
              </p>
              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono text-xs overflow-x-auto dir-ltr shadow-inner">
                <code>
                  {`// Example Flutter / Dart Headers:\nMap<String, String> headers = {\n  'Authorization': 'Bearer \${await user.getIdToken()}',\n  'Content-Type': 'application/json',\n};`}
                </code>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {(activeTab === 'user' ? userEndpoints : supplierEndpoints).map((ep) => (
              <div key={`${ep.method}-${ep.path}`} className="p-6 bg-brand-surface hover:bg-brand-surface/80 rounded-3xl border border-brand-border transition-all space-y-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                      ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                      ep.method === 'POST' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                      'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-bold text-brand-text-main bg-brand-background px-3 py-1.5 rounded-xl border border-brand-border">
                      {ep.path}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {ep.auth && (
                      <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 text-[11px] font-black border border-purple-500/20">
                        🔒 {isRtl ? 'يتطلب مصادقة' : 'Auth Required'}
                      </span>
                    )}
                    {ep.role && (
                      <span className="px-3 py-1 rounded-xl bg-teal-500/10 text-teal-600 text-[11px] font-black border border-teal-500/20">
                        💼 {isRtl ? 'مزود خدمة' : 'Supplier Only'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-brand-text-main text-base">
                    {isRtl ? ep.titleAr : ep.titleEn}
                  </h4>
                  <p className="text-xs text-brand-text-muted mt-1 font-medium">
                    {isRtl ? ep.descAr : ep.descEn}
                  </p>
                </div>

                {/* cURL snippet */}
                <div className="relative group">
                  <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto whitespace-pre-wrap dir-ltr shadow-inner">
                    {ep.curl}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(ep.curl, ep.path)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all shadow-md"
                    title="Copy cURL"
                  >
                    {copiedPath === ep.path ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-5 bg-brand-surface rounded-2xl border border-brand-border flex items-center justify-between text-xs text-brand-text-muted font-bold flex-wrap gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-teal-600" />
          <span>
            {isRtl ? 'جميع مسارات الموبايل مؤمنة ومحمية بـ Firebase Auth ID Tokens وتعمل مع تطبيقات الهواتف الذكية بسلاسة' : 'All mobile routes are secured with Firebase Auth ID Tokens and ready for production mobile app integration.'}
          </span>
        </div>

        <a
          href="/api/mobile/v1/docs"
          target="_blank"
          rel="noreferrer"
          className="text-teal-600 hover:text-teal-700 font-black flex items-center gap-1.5 transition-all bg-teal-500/10 px-4 py-2 rounded-xl border border-teal-500/20"
        >
          <span>{isRtl ? 'فتح مواصفات JSON المباشرة' : 'Open Raw JSON Spec'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
