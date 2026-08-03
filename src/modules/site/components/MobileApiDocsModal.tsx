import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  X, 
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface MobileApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileApiDocsModal: React.FC<MobileApiDocsModalProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState<'user' | 'supplier' | 'health'>('user');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

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

  const userEndpoints: Array<{ method: string; path: string; auth: boolean; role?: string; titleAr: string; titleEn: string; descAr: string; descEn: string; curl: string }> = [
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
      curl: `curl -X POST "${baseUrl}/api/mobile/v1/user/requests" \\
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"productName":"كاميرات مراقبة","description":"مطلوب 5 كاميرات عالية الدقة","budget":350}'`
    },
    {
      method: 'GET',
      path: '/api/mobile/v1/user/requests',
      auth: true,
      titleAr: 'قائمة طلباتي',
      titleEn: 'List My Requests',
      descAr: 'استرجاع الطلبات المقدمة بواسطة العميل مع حالتها.',
      descEn: 'Get all requests submitted by the logged-in buyer.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/user/requests" \\
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    },
    {
      method: 'GET',
      path: '/api/mobile/v1/user/requests/:id/offers',
      auth: true,
      titleAr: 'عروض السعر المستلمة',
      titleEn: 'Get Received Offers for Request',
      descAr: 'استعراض عروض الأسعار المقدمة من الموردين لطلب معين.',
      descEn: 'Fetch supplier proposals submitted for a specific request ID.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/user/requests/REQ_123/offers" \\
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    },
    {
      method: 'POST',
      path: '/api/mobile/v1/user/offers/:id/accept',
      auth: true,
      titleAr: 'قبول عرض سعر',
      titleEn: 'Accept Supplier Offer',
      descAr: 'قبول عرض المورد وتحويل حالة الطلب إلى مكتمل.',
      descEn: 'Accept a supplier offer and transition request status to completed.',
      curl: `curl -X POST "${baseUrl}/api/mobile/v1/user/offers/OFFER_456/accept" \\
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    }
  ];

  const supplierEndpoints: Array<{ method: string; path: string; auth: boolean; role?: string; titleAr: string; titleEn: string; descAr: string; descEn: string; curl: string }> = [
    {
      method: 'GET',
      path: '/api/mobile/v1/supplier/leads',
      auth: true,
      role: 'supplier',
      titleAr: 'فرص الأعمال والطلبات المتاحة',
      titleEn: 'Fetch Open Client Leads',
      descAr: 'استرجاع الطلبات النشطة المترددة التي تطابق تخصص المورد.',
      descEn: 'Retrieve open client requests matching supplier tags.',
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/supplier/leads" \\
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
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
      curl: `curl -X POST "${baseUrl}/api/mobile/v1/supplier/offers" \\
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"requestId":"REQ_123","price":320,"currency":"JOD","deliveryDays":2}'`
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
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/supplier/products" \\
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
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
      curl: `curl -X POST "${baseUrl}/api/mobile/v1/supplier/products" \\
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"خدمة تركيب شبكات","price":150,"category":"IT Services"}'`
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
      curl: `curl -X GET "${baseUrl}/api/mobile/v1/supplier/stats" \\
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>"`
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col ${isRtl ? 'rtl' : 'ltr'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 relative overflow-hidden flex items-center justify-between">
          <div className="flex items-center gap-4 z-10">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">
                  {isRtl ? 'واجهة البرمجة للتطبيقات (Mobile Web API Gateway)' : 'Mobile Web API Gateway'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-black border border-teal-500/30 uppercase tracking-widest">
                  v1.0 REST
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isRtl ? 'واجهات برمجية مخصصة لتطبيقات الهواتف للعملاء ومزودي الخدمات (بدون مسؤولي النظام)' : 'Exposed APIs for iOS/Android/Flutter mobile apps supporting Buyers & Service Providers'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('user')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'user' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              {isRtl ? 'واجهات العملاء (Buyers)' : 'Buyer APIs'}
            </button>

            <button
              onClick={() => setActiveTab('supplier')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'supplier' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              {isRtl ? 'واجهات مزودي الخدمات (Suppliers)' : 'Service Provider APIs'}
            </button>

            <button
              onClick={() => setActiveTab('health')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'health' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              {isRtl ? 'حالة الخدمة والمواصفات' : 'Server Health & Spec'}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Auth:</span>
            <span className="font-mono bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[11px]">
              Bearer &lt;firebase_id_token&gt;
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 max-h-[60vh]">
          {activeTab === 'health' ? (
            <div className="space-y-6">
              <div className="p-6 bg-slate-900 text-teal-400 rounded-2xl border border-slate-800 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-slate-400 font-sans font-bold text-sm">
                    {isRtl ? 'فحص الاتصال المباشر (Live Ping)' : 'Live Health Endpoint'}
                  </span>
                  <button
                    onClick={fetchHealth}
                    className="px-3 py-1 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 rounded-lg transition-all font-sans text-xs flex items-center gap-1"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                    {isRtl ? 'تحديث' : 'Re-check'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(healthStatus || { message: "Loading status..." }, null, 2)}
                </pre>
              </div>

              <div className="p-6 bg-teal-50 rounded-2xl border border-teal-200">
                <h4 className="font-bold text-teal-950 text-sm flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  {isRtl ? 'تعليمات المطورين لتطبيقات الموبايل (Flutter / React Native)' : 'Mobile Developer Quickstart'}
                </h4>
                <p className="text-xs text-teal-900 leading-relaxed mb-3">
                  {isRtl 
                    ? 'عند تسجيل المستخدم أو المورد دخوله عبر Firebase SDK في تطبيق الموبايل، استخدم `user.getIdToken()` لإرسال الـ Token في هيدر Request:'
                    : 'When users or suppliers log in via Firebase SDK in your mobile app, obtain their ID token using `user.getIdToken()` and pass it in the HTTP headers:'}
                </p>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto dir-ltr">
                  <code>
                    {`// Example Flutter / Dart Headers:\nMap<String, String> headers = {\n  'Authorization': 'Bearer \${await user.getIdToken()}',\n  'Content-Type': 'application/json',\n};`}
                  </code>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(activeTab === 'user' ? userEndpoints : supplierEndpoints).map((ep) => (
                <div key={`${ep.method}-${ep.path}`} className="p-5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-all space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                        ep.method === 'GET' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        ep.method === 'POST' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                        {ep.path}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ep.auth && (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">
                          🔒 {isRtl ? 'يتطلب مصادقة' : 'Auth Required'}
                        </span>
                      )}
                      {ep.role && (
                        <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold border border-teal-200">
                          💼 {isRtl ? 'مزود خدمة' : 'Supplier Only'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      {isRtl ? ep.titleAr : ep.titleEn}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {isRtl ? ep.descAr : ep.descEn}
                    </p>
                  </div>

                  {/* cURL snippet */}
                  <div className="relative group">
                    <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap dir-ltr">
                      {ep.curl}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(ep.curl, ep.path)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
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

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-teal-600" />
            <span>
              {isRtl ? 'المسارات مجهزة لاستقبال طلبات التطبيقات بجميع الصيغ' : 'All mobile routes output JSON with standardized error codes'}
            </span>
          </div>

          <a
            href="/api/mobile/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 transition-all"
          >
            <span>{isRtl ? 'فتح مواصفات JSON المباشرة' : 'Open Raw JSON Spec'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>
    </div>
  );
};
