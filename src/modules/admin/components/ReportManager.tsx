import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc,
  getDoc,
  where
} from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink,
  User,
  Trash2,
  Shield,
  Loader2,
  Filter,
  Search,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: 'marketplace_item' | 'user';
  targetOwnerId: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
}

export const ReportManager: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    const reportsQuery = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(reportsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports', false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (reportId: string, newStatus: Report['status']) => {
    setIsUpdating(reportId);
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success(`تم تحديث حالة الإبلاغ إلى ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`, false);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleArchiveItem = async (itemId: string) => {
    try {
      await updateDoc(doc(db, 'marketplace', itemId), {
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        deletedBy: 'admin_report_action'
      });
      toast.success('تم أرشفة المنتج بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${itemId}`, false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesFilter = filter === 'all' || (filter === 'pending' && report.status === 'pending') || (filter === 'resolved' && report.status !== 'pending');
    const matchesSearch = 
      report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.details?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 size={40} className="animate-spin text-brand-primary" />
        <p className="text-brand-text-muted font-bold animate-pulse">جاري تحميل الإبلاغات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-brand-text-main flex items-center gap-3">
            <Flag className="text-brand-error" size={32} />
            إدارة الإبلاغات
          </h2>
          <p className="text-brand-text-muted font-medium mt-1">
            مراجعة ومعالجة إبلاغات المستخدمين عن المحتوى غير اللائق
          </p>
        </div>

        <div className="flex items-center gap-2 bg-brand-surface p-1.5 rounded-2xl border border-brand-border shadow-sm">
          {(['all', 'pending', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                filter === f 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'text-brand-text-muted hover:bg-brand-background'
              }`}
            >
              {f === 'all' ? 'الكل' : f === 'pending' ? 'قيد الانتظار' : 'تمت المعالجة'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 right-4 flex items-center text-brand-text-muted group-focus-within:text-brand-primary transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث في الإبلاغات، الأسباب، أو المبلّغين..."
          className="w-full pr-12 pl-6 py-4 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 font-bold transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredReports.map((report) => (
            <motion.div
              key={report.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface rounded-[2rem] border border-brand-border p-6 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        report.status === 'pending' ? 'bg-brand-error/10 text-brand-error' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-brand-text-main">{report.reason}</h3>
                        <div className="flex items-center gap-2 text-xs text-brand-text-muted font-bold">
                          <Clock size={12} />
                          {new Date(report.createdAt).toLocaleString('ar-EG')}
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      report.status === 'pending' ? 'bg-brand-error/10 text-brand-error' : 
                      report.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {report.status === 'pending' ? 'قيد الانتظار' : 
                       report.status === 'resolved' ? 'تم الحل' : 
                       report.status === 'dismissed' ? 'تم التجاهل' : 'تمت المراجعة'}
                    </div>
                  </div>

                  <div className="p-4 bg-brand-background rounded-2xl border border-brand-border">
                    <p className="text-sm font-medium text-brand-text-main leading-relaxed italic">
                      "{report.details || 'لا توجد تفاصيل إضافية'}"
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm font-bold">
                    <div className="flex items-center gap-2 text-brand-text-muted">
                      <User size={16} className="text-brand-primary" />
                      <span>المبلّغ:</span>
                      <span className="text-brand-text-main">{report.reporterName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand-text-muted">
                      <Shield size={16} className="text-brand-primary" />
                      <span>النوع:</span>
                      <span className="text-brand-text-main">{report.targetType === 'marketplace_item' ? 'إعلان منتج' : 'مستخدم'}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:w-72 flex flex-col gap-3 justify-center">
                  <button
                    onClick={() => window.open(`/marketplace/item/${report.targetId}`, '_blank')}
                    className="w-full py-3 bg-brand-primary/10 text-brand-primary rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-brand-primary/20 transition-all"
                  >
                    <ExternalLink size={14} />
                    معاينة المحتوى
                  </button>

                  {report.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'resolved')}
                        disabled={isUpdating === report.id}
                        className="py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-1 hover:bg-emerald-600 transition-all"
                      >
                        <CheckCircle2 size={12} />
                        تم الحل
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                        disabled={isUpdating === report.id}
                        className="py-3 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] flex items-center justify-center gap-1 hover:bg-slate-300 transition-all"
                      >
                        <XCircle size={12} />
                        تجاهل
                      </button>
                    </div>
                  )}

                  {report.targetType === 'marketplace_item' && report.status === 'pending' && (
                    <button
                      onClick={() => handleArchiveItem(report.targetId)}
                      className="w-full py-3 bg-brand-error/10 text-brand-error rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-brand-error hover:text-white transition-all border border-brand-error/20"
                    >
                      <Trash2 size={14} />
                      أرشفة الإعلان فوراً
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredReports.length === 0 && (
          <div className="text-center py-20 bg-brand-surface rounded-[3rem] border-2 border-dashed border-brand-border">
            <div className="w-20 h-20 bg-brand-background rounded-full flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-xl font-black text-brand-text-main">لا توجد إبلاغات حالياً</h3>
            <p className="text-brand-text-muted font-medium">كل شيء يبدو آمناً في المجتمع!</p>
          </div>
        )}
      </div>
    </div>
  );
};
