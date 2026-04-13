import * as XLSX from 'xlsx';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { db, storage, firebaseConfig, auth } from '../../../core/firebase';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import imageCompression from 'browser-image-compression';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { UserProfile, ProductRequest, Offer, Category, Chat, MarketTrend, PriceInsight, AppFeatures, ContactEvent } from '../../../core/types';
import { QRCodeCanvas } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import SupplierProfileModal from '../../../shared/components/UserProfileModal';
import { DeleteAllCategoriesModal } from '../../../shared/components/DeleteAllCategoriesModal';
import { CategoryList } from '../../../shared/components/CategoryList';
import { CategoryManagement } from '../../../shared/components/CategoryManagement';
import { RequestSkeleton } from '../../../shared/components/Skeleton';
import { AdminNeuralHub } from '../../admin/components/AdminNeuralHub';
import { CostAnalysisDashboard } from '../../admin/components/CostAnalysisDashboard';
import HelpCenter from './HelpCenter';
import { 
  MessageSquare, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Tag, 
  Sparkles,
  Users,
  Mail,
  User as UserIcon,
  Phone,
  Building2,
  Save,
  Upload,
  Edit2,
  Globe,
  Package,
  MapPin,
  Settings,
  LayoutGrid,
  Search,
  Filter,
  ChevronRight,
  MoreVertical,
  Star,
  Camera,
  ArrowLeft,
  Mic,
  MicOff,
  Bot,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap,
  Layers,
  ListTree,
  Trash2,
  GripVertical,
  ShieldCheck,
  BookOpen,
  FileText,
  Lock,
  PlusCircle,
  Archive,
  Combine,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Cpu,
  Shield,
  LineChart,
  ShieldAlert,
  LogOut,
  Calendar,
  Tags,
  Database,
  Download,
  Megaphone,
  RotateCcw,
  Copy,
  Share2,
  Palette,
  Wand2,
  Loader2,
  BrainCircuit
} from 'lucide-react';
import { 
  translateText, 
  suggestMainCategories,
  suggestSubcategories, 
  optimizeSupplierProfile, 
  summarizeChat, 
  analyzeMarketTrends,
  semanticSearch,
  analyzeProductImage,
  parseVoiceRequest,
  generateNegotiationResponse,
  getPriceIntelligence,
  extractKeywordsFromRequests,
  suggestSupplierCategories,
  formatCategoryName,
  suggestCategoryMerges,
  generateSupplierLogo,
  suggestColorHarmony,
  handleAiError
} from '../../../core/services/geminiService';
import { createNotification } from '../../../core/services/notificationService';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { HapticButton } from '../../../shared/components/HapticButton';
import { BlurImage } from '../../../shared/components/BlurImage';
import { isAdmin, isSupplier, isCustomer } from '../../../core/utils/rbac';
import BrandingSettings from './BrandingSettings';

interface DashboardProps {
  profile: UserProfile | null;
  features: AppFeatures;
  onOpenChat: (chatId: string) => void;
  onViewProfile?: (uid: string) => void;
  supplierTab?: string;
  setSupplierTab?: (tab: string) => void;
}

import { KeywordManagerModal } from '../../../shared/components/KeywordManagerModal';

const SortableMainCategory: React.FC<{
  mainCat: Category;
  subCats: Category[];
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  handleDeleteCategory: (id: string) => void;
  onManageKeywords: (category: Category) => void;
  t: any;
  i18n: any;
  viewMode: 'grid' | 'list';
}> = ({ mainCat, subCats, categories, setCategories, confirmDeleteId, setConfirmDeleteId, handleDeleteCategory, onManageKeywords, t, i18n, viewMode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mainCat.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-brand-surface rounded-[2rem] border border-brand-border overflow-hidden shadow-sm hover:shadow-md transition-all group">
      <div className="bg-brand-background/50 px-6 py-5 flex justify-between items-center border-b border-brand-border">
        <div className="flex items-center gap-4">
          <div {...attributes} {...listeners} className="cursor-grab text-brand-text-muted hover:text-brand-primary p-2 hover:bg-brand-surface rounded-lg transition-colors">
            <GripVertical size={16} />
          </div>
          <div className="w-10 h-10 bg-brand-surface rounded-xl border border-brand-border flex items-center justify-center text-brand-primary shadow-sm">
            <Layers size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-brand-text-main text-lg leading-tight">{i18n.language === 'ar' ? mainCat.nameAr : mainCat.nameEn}</span>
            <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{i18n.language === 'ar' ? mainCat.nameEn : mainCat.nameAr}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-brand-surface rounded-lg border border-brand-border text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
            {subCats.length} {i18n.language === 'ar' ? 'فئات فرعية' : 'Sub-items'}
          </div>
          <button 
            onClick={() => onManageKeywords(mainCat)}
            className="text-brand-text-muted hover:text-brand-primary p-3 rounded-xl hover:bg-brand-primary/10 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1.5 relative"
            title={i18n.language === 'ar' ? 'إدارة الكلمات المفتاحية' : 'Manage Keywords'}
          >
            <Tag size={18} />
            {((mainCat.keywords?.length || 0) > 0 || (mainCat.suggestedKeywords?.length || 0) > 0) && (
              <span className="flex items-center gap-1">
                <span className="text-[10px] font-black bg-brand-primary text-white px-1.5 py-0.5 rounded-md shadow-sm">
                  {mainCat.keywords?.length || 0}
                </span>
                {(mainCat.suggestedKeywords?.length || 0) > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-warning animate-pulse" />
                )}
              </span>
            )}
          </button>
          {confirmDeleteId === mainCat.id ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleDeleteCategory(mainCat.id)}
                className="bg-brand-error text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-brand-error transition-all"
              >
                {t('confirm')}
              </button>
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="text-brand-text-muted hover:text-brand-text-main p-2 bg-brand-surface rounded-lg border border-brand-border"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setConfirmDeleteId(mainCat.id)}
              className="text-brand-text-muted hover:text-brand-error p-2 rounded-xl hover:bg-brand-error/10 transition-all opacity-0 group-hover:opacity-100"
              title={t('delete')}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      
      <div className="p-6">
        <CategoryList 
            categories={subCats} 
            allCategories={categories}
            onManageKeywords={onManageKeywords}
            viewMode={viewMode}
            onReorder={(newSubCats) => {
              setCategories(prev => {
                const otherCategories = prev.filter(c => !newSubCats.find(nc => nc.id === c.id));
                return [...otherCategories, ...newSubCats];
              });
            }}
          />
        {subCats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-brand-background/50 rounded-2xl border border-dashed border-brand-border">
            <div className="p-3 bg-brand-surface rounded-full text-brand-text-muted/30 mb-2">
              <Plus size={20} />
            </div>
            <p className="text-xs text-brand-text-muted font-medium">{i18n.language === 'ar' ? 'لا توجد فئات فرعية بعد' : 'No subcategories yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BroadcastBox = ({ t, i18n, allUsers, size = 'default' }: { t: any, i18n: any, allUsers: UserProfile[], size?: 'default' | 'compact' }) => {
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSend = async () => {
    if (!message.trim() || !title.trim()) return;
    setIsSending(true);
    try {
      let fileUrl = '';
      if (file) {
        const storageRef = ref(storage, `broadcasts/${Date.now()}_${file.name}`);
        const uploadTask = await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(uploadTask.ref);
      }

      const batch = writeBatch(db);
      allUsers.forEach(user => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: user.uid,
          titleAr: title,
          titleEn: title,
          bodyAr: message,
          bodyEn: message,
          link: fileUrl || '',
          actionType: 'general',
          read: false,
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
      setMessage('');
      setTitle('');
      setFile(null);
      alert(i18n.language === 'ar' ? 'تم إرسال الإشعار بنجاح' : 'Notification sent successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications', false);
      alert(i18n.language === 'ar' ? 'حدث خطأ أثناء الإرسال' : 'Error sending notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`bg-white ${size === 'compact' ? 'p-4' : 'p-6'} rounded-[2rem] border border-brand-border-light shadow-sm`}>
      <h3 className={`${size === 'compact' ? 'text-md' : 'text-lg'} font-black text-brand-text-main mb-4`}>{i18n.language === 'ar' ? 'إرسال إشعار جماعي' : 'Broadcast Notification'}</h3>
      <input 
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={i18n.language === 'ar' ? 'العنوان' : 'Title'}
        className={`w-full px-4 ${size === 'compact' ? 'py-2' : 'py-2.5'} bg-brand-surface border border-brand-border rounded-xl mb-3 text-sm`}
      />
      <textarea 
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={i18n.language === 'ar' ? 'الرسالة' : 'Message'}
        className={`w-full px-4 ${size === 'compact' ? 'py-2' : 'py-2.5'} bg-brand-surface border border-brand-border rounded-xl mb-3 text-sm`}
        rows={size === 'compact' ? 2 : 3}
      />
      <div className="mb-3">
        <input 
          type="file"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="w-full text-xs text-brand-text-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"
        />
      </div>
      <HapticButton
        onClick={handleSend}
        disabled={isSending}
        className={`w-full bg-brand-primary text-white ${size === 'compact' ? 'py-2' : 'py-2.5'} rounded-xl font-bold text-sm hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50`}
      >
        {isSending ? (i18n.language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (i18n.language === 'ar' ? 'إرسال' : 'Send')}
      </HapticButton>
    </div>
  );
};

const UserDataManager: React.FC<{
  allUsers: UserProfile[];
  isRtl: boolean;
  t: any;
}> = ({ allUsers, isRtl, t }) => {
  const [activeSubTab, setActiveSubTab] = useState<'phones' | 'emails' | 'locations'>('phones');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = allUsers.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchLower) || 
      user.companyName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower) ||
      user.location?.toLowerCase().includes(searchLower);
    
    if (activeSubTab === 'phones') return matchesSearch && user.phone;
    if (activeSubTab === 'emails') return matchesSearch && user.email;
    return matchesSearch && user.location;
  });

  const handleExportExcel = () => {
    const dataToExport = filteredUsers.map(user => {
      const baseData = {
        [isRtl ? 'الاسم' : 'Name']: user.name || '',
        [isRtl ? 'الشركة' : 'Company']: user.companyName || '',
        [isRtl ? 'الدور' : 'Role']: user.role === 'supplier' ? (isRtl ? 'مورد' : 'Supplier') : (isRtl ? 'عميل' : 'Customer'),
      };

      if (activeSubTab === 'phones') {
        return {
          ...baseData,
          [isRtl ? 'رقم الهاتف' : 'Phone Number']: user.phone || '',
          [isRtl ? 'الموقع' : 'Location']: user.location || '',
          [isRtl ? 'تاريخ التسجيل' : 'Joined At']: user.createdAt ? new Date(user.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US') : ''
        };
      } else if (activeSubTab === 'emails') {
        return {
          ...baseData,
          [isRtl ? 'البريد الإلكتروني' : 'Email']: user.email || '',
          [isRtl ? 'الموقع' : 'Location']: user.location || '',
          [isRtl ? 'تاريخ التسجيل' : 'Joined At']: user.createdAt ? new Date(user.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US') : ''
        };
      } else {
        return {
          ...baseData,
          [isRtl ? 'الموقع' : 'Location']: user.location || '',
          [isRtl ? 'رقم الهاتف' : 'Phone Number']: user.phone || '',
          [isRtl ? 'البريد الإلكتروني' : 'Email']: user.email || '',
          [isRtl ? 'تاريخ التسجيل' : 'Joined At']: user.createdAt ? new Date(user.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US') : ''
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isRtl ? 'بيانات المستخدمين' : 'User Data');
    
    const fileName = `user_${activeSubTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm">
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-brand-text-main tracking-tight">
            {isRtl ? 'دليل بيانات المستخدمين' : 'User Data Directory'}
          </h3>
          <p className="text-sm text-brand-text-muted font-medium">
            {isRtl ? 'إدارة وتصدير بيانات الاتصال الخاصة بالموردين والعملاء' : 'Manage and export contact data for suppliers and customers'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-brand-background p-1.5 rounded-2xl border border-brand-border shadow-inner">
            <HapticButton
              onClick={() => setActiveSubTab('phones')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeSubTab === 'phones' 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'text-brand-text-muted hover:text-brand-text-main'
              }`}
            >
              {isRtl ? 'أرقام الجوال' : 'Phone Numbers'}
            </HapticButton>
            <HapticButton
              onClick={() => setActiveSubTab('emails')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeSubTab === 'emails' 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'text-brand-text-muted hover:text-brand-text-main'
              }`}
            >
              {isRtl ? 'البريد الإلكتروني' : 'Emails'}
            </HapticButton>
            <HapticButton
              onClick={() => setActiveSubTab('locations')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeSubTab === 'locations' 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'text-brand-text-muted hover:text-brand-text-main'
              }`}
            >
              {isRtl ? 'المواقع' : 'Locations'}
            </HapticButton>
          </div>
          
          <HapticButton
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-6 py-3.5 bg-brand-success text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-success/90 transition-all shadow-lg shadow-brand-success/20 group"
          >
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
            {isRtl ? 'تصدير Excel' : 'Export Excel'}
          </HapticButton>
        </div>
      </div>

      <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border bg-brand-background/30">
          <div className="relative max-w-md">
            <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-brand-text-muted`} size={18} />
            <input
              type="text"
              placeholder={isRtl ? 'البحث بالاسم، الشركة، أو البيانات...' : 'Search by name, company, or data...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm font-medium transition-all`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-background/50 border-b border-brand-border">
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'المستخدم' : 'User'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'الشركة' : 'Company'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'الدور' : 'Role'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {activeSubTab === 'locations' ? (isRtl ? 'الموقع' : 'Location') : (activeSubTab === 'phones' ? (isRtl ? 'رقم الهاتف' : 'Phone Number') : (isRtl ? 'البريد الإلكتروني' : 'Email'))}
                </th>
                {activeSubTab !== 'locations' && (
                  <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'الموقع' : 'Location'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-brand-background/30 transition-colors group">
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-sm border border-brand-primary/20 shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-black text-brand-text-main group-hover:text-brand-primary transition-colors">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 text-sm font-bold text-brand-text-muted whitespace-nowrap">
                    {user.companyName || '-'}
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      user.role === 'supplier' 
                        ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' 
                        : 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20'
                    }`}>
                      {user.role === 'supplier' ? (isRtl ? 'مورد' : 'Supplier') : (isRtl ? 'عميل' : 'Customer')}
                    </span>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm font-black text-brand-text-main">
                      {activeSubTab === 'locations' ? (
                        <>
                          <MapPin size={14} className="text-brand-primary shrink-0" />
                          <span>{user.location || '-'}</span>
                        </>
                      ) : activeSubTab === 'phones' ? (
                        <>
                          <Phone size={14} className="text-brand-primary shrink-0" />
                          <span dir="ltr">{user.phone}</span>
                        </>
                      ) : (
                        <>
                          <Mail size={14} className="text-brand-primary shrink-0" />
                          <span>{user.email}</span>
                        </>
                      )}
                    </div>
                  </td>
                  {activeSubTab !== 'locations' && (
                    <td className="px-4 py-3 md:px-8 md:py-5 text-sm font-bold text-brand-text-muted whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-brand-text-muted/50 shrink-0" />
                        {user.location || '-'}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-brand-background rounded-full flex items-center justify-center text-brand-text-muted/30">
                        <Search size={32} />
                      </div>
                      <p className="text-sm font-bold text-brand-text-muted">
                        {isRtl ? 'لم يتم العثور على نتائج تطابق بحثك' : 'No results found matching your search'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MarketingView: React.FC<{
  profile: UserProfile;
  isRtl: boolean;
}> = ({ profile, isRtl }) => {
  const referralUrl = `${window.location.origin}/?ref=${profile.referralCode}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isRtl ? 'انضم إلينا في تطبيق ضيف' : 'Join us on Deif App',
          text: isRtl ? 'استخدم كودي للحصول على مميزات حصرية!' : 'Use my code to get exclusive features!',
          url: referralUrl,
        });
      } catch (error) {
        handleAiError(error, 'Native sharing');
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-brand-primary/5 p-8 rounded-[2.5rem] border border-brand-primary/10 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="p-6 bg-white rounded-[2rem] shadow-xl border border-brand-border">
            <QRCodeCanvas 
              value={referralUrl} 
              size={180}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "/favicon.ico",
                x: undefined,
                y: undefined,
                height: 30,
                width: 30,
                excavate: true,
              }}
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-black text-brand-text-main mb-3 tracking-tight">
              {isRtl ? 'شارك الرمز واجمع النقاط!' : 'Share the code and earn points!'}
            </h3>
            <p className="text-sm text-brand-text-muted font-medium leading-relaxed max-w-md mb-6">
              {isRtl 
                ? 'كل شخص يقوم بتحميل التطبيق عن طريق الرمز الخاص بك، ستحصل على 10 نقاط فورية في رصيدك.'
                : 'Every person who downloads the app using your code, you will get 10 instant points in your balance.'}
            </p>
            
            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
              <div className="flex items-center gap-2 px-4 py-2 bg-brand-secondary/10 text-brand-secondary rounded-xl border border-brand-secondary/20">
                <DollarSign size={16} />
                <span className="text-lg font-black">{profile.referralPoints || 0}</span>
                <span className="text-xs font-bold uppercase tracking-widest">{isRtl ? 'نقطة' : 'Points'}</span>
              </div>
              <div className="px-4 py-2 bg-brand-background border border-brand-border rounded-xl text-sm font-mono font-black text-brand-primary">
                {profile.referralCode}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={handleCopy}
          className="p-6 bg-brand-surface rounded-3xl border border-brand-border hover:border-brand-primary/30 transition-all group flex flex-col items-center gap-4 text-center"
        >
          <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
            {copied ? <Check size={24} /> : <Copy size={24} />}
          </div>
          <div>
            <h4 className="font-black text-brand-text-main mb-1">{isRtl ? 'نسخ الرابط' : 'Copy Link'}</h4>
            <p className="text-xs text-brand-text-muted">{isRtl ? 'انسخ رابط الإحالة الخاص بك وشاركه يدوياً' : 'Copy your referral link and share it manually'}</p>
          </div>
        </button>

        <button
          onClick={handleShare}
          className="p-6 bg-brand-surface rounded-3xl border border-brand-border hover:border-brand-primary/30 transition-all group flex flex-col items-center gap-4 text-center"
        >
          <div className="w-14 h-14 bg-brand-secondary/10 rounded-2xl flex items-center justify-center text-brand-secondary group-hover:scale-110 transition-transform">
            <Share2 size={24} />
          </div>
          <div>
            <h4 className="font-black text-brand-text-main mb-1">{isRtl ? 'مشاركة سريعة' : 'Quick Share'}</h4>
            <p className="text-xs text-brand-text-muted">{isRtl ? 'شارك الرابط مباشرة عبر تطبيقات التواصل' : 'Share the link directly via social apps'}</p>
          </div>
        </button>
      </div>
    </div>
  );
};

const MarketingManager: React.FC<{
  allUsers: UserProfile[];
  isRtl: boolean;
  t: any;
}> = ({ allUsers, isRtl, t }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [resetting, setResetting] = useState<string | null>(null);

  const marketers = allUsers
    .filter(u => u.referralCode)
    .filter(u => {
      const searchLower = searchQuery.toLowerCase();
      return u.name?.toLowerCase().includes(searchLower) || u.referralCode?.toLowerCase().includes(searchLower);
    })
    .sort((a, b) => (b.referralPoints || 0) - (a.referralPoints || 0));

  const handleResetPoints = async (userId: string) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من تصفير نقاط هذا المسوق؟' : 'Are you sure you want to reset this marketer\'s points?')) return;
    
    setResetting(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        referralPoints: 0
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`, false);
    } finally {
      setResetting(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-brand-primary/5 p-8 rounded-[2.5rem] border border-brand-primary/10 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="p-4 bg-brand-primary/10 rounded-2xl text-brand-primary shadow-inner">
            <Megaphone size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-brand-text-main mb-2 tracking-tight">
              {isRtl ? 'نظام التسويق والانتشار' : 'Marketing & Growth System'}
            </h3>
            <p className="text-sm text-brand-text-muted font-medium leading-relaxed max-w-2xl">
              {isRtl 
                ? 'قم بمكافأة المسوقين الذين يساهمون في نشر التطبيق. كل عملية تحميل ناجحة عبر رمز الاستجابة السريعة (QR) تمنح المسوق 10 نقاط تلقائياً.'
                : 'Reward marketers who contribute to spreading the app. Every successful download via QR code automatically grants the marketer 10 points.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border bg-brand-background/30">
          <div className="relative max-w-md">
            <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-brand-text-muted`} size={18} />
            <input
              type="text"
              placeholder={isRtl ? 'البحث عن مسوق (الاسم أو الرمز)...' : 'Search for a marketer (Name or Code)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm font-medium transition-all`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-background/50 border-b border-brand-border">
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'المسوق' : 'Marketer'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'رقم الهاتف' : 'Phone Number'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'رمز الإحالة' : 'Referral Code'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'إجمالي النقاط' : 'Total Points'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {marketers.map((user) => (
                <tr key={user.uid} className="hover:bg-brand-background/30 transition-colors group">
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-sm border border-brand-primary/20 shrink-0">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-black text-brand-text-main group-hover:text-brand-primary transition-colors">{user.name}</div>
                        <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="text-sm font-medium text-brand-text-main">
                      {user.phone ? (
                        <a href={`tel:${user.phone}`} className="hover:text-brand-primary transition-colors" dir="ltr">
                          {user.phone}
                        </a>
                      ) : (
                        <span className="text-brand-text-muted">{isRtl ? 'غير متوفر' : 'N/A'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1 bg-brand-background border border-brand-border rounded-lg text-xs font-mono font-black text-brand-primary shadow-inner">
                        {user.referralCode}
                      </code>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-secondary/10 flex items-center justify-center text-brand-secondary border border-brand-secondary/20 shrink-0">
                        <DollarSign size={14} />
                      </div>
                      <span className="text-sm font-black text-brand-text-main">{user.referralPoints || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <button
                      onClick={() => handleResetPoints(user.uid)}
                      disabled={resetting === user.uid}
                      className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-brand-background text-brand-error rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-error/10 transition-all disabled:opacity-50 border border-brand-border"
                    >
                      <RotateCcw size={14} className={resetting === user.uid ? 'animate-spin' : ''} />
                      {isRtl ? 'تصفير النقاط' : 'Reset Points'}
                    </button>
                  </td>
                </tr>
              ))}
              {marketers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-brand-text-muted font-bold">
                    {isRtl ? 'لا يوجد مسوقون مسجلون حالياً' : 'No marketers registered currently'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  profile, 
  features: initialFeatures,
  onOpenChat, 
  onViewProfile,
  supplierTab = 'dashboard',
  setSupplierTab
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [overviewSections, setOverviewSections] = useState(['stats', 'actions_activity', 'broadcast']);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOverviewSections((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  };
  const handleGlobalDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleGlobalDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeCategory = categories.find(c => c.id === activeId);
    const overCategory = categories.find(c => c.id === overId);

    if (!activeCategory || !overCategory) return;

    // Determine if we are reordering or nesting
    // For a professional feel, we'll check if the overId is a "container" or an "item"
    // In this simplified version, if they have different parents, we move it.
    // If they have same parent, we reorder.
    
    if (activeCategory.parentId !== overCategory.parentId) {
      // Move to new parent (or root)
      try {
        await updateDoc(doc(db, 'categories', activeId), {
          parentId: overCategory.parentId || null,
          order: (overCategory.order || 0) + 0.5
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `categories/${activeId}`, false);
      }
    } else if (activeId !== overId) {
      // If dropped directly ON another category (not just reordering)
      // We can detect this if the collision was very centered
      // For now, let's assume if they are both main categories and we drop one on another, it nests
      if (!activeCategory.parentId && !overCategory.parentId && activeId !== overId) {
        try {
          await updateDoc(doc(db, 'categories', activeId), {
            parentId: overId,
            order: 0
          });
          return;
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `categories/${activeId}`, false);
        }
      }

      // Reorder within same parent
      const sameParentCats = categories
        .filter(c => c.parentId === activeCategory.parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const oldIndex = sameParentCats.findIndex(c => c.id === activeId);
      const newIndex = sameParentCats.findIndex(c => c.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sameParentCats, oldIndex, newIndex);
        
        // Update Firestore orders
        try {
          for (let i = 0; i < newOrder.length; i++) {
            if (newOrder[i].order !== i) {
              await updateDoc(doc(db, 'categories', newOrder[i].id), { order: i });
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'categories', false);
        }
      }
    }
  };

  const resetSections = () => {
    setOverviewSections(['stats', 'actions_activity', 'broadcast']);
  };

  const SortableSection = ({ id, children }: { id: string, children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 50 : 'auto',
    };

    return (
      <div ref={setNodeRef} style={style} className="relative group">
        <div 
          {...attributes} 
          {...listeners}
          className={`absolute top-2 ${isRtl ? 'left-2' : 'right-2'} p-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/90 backdrop-blur-sm rounded-lg border border-brand-border-light shadow-sm`}
          title={isRtl ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
        >
          <GripVertical size={14} className="text-brand-text-muted" />
        </div>
        {children}
      </div>
    );
  };

  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [requestSearch, setRequestSearch] = useState('');
  const [visibleRequestsCount, setVisibleRequestsCount] = useState(10);
  const [visibleUsersCount, setVisibleUsersCount] = useState(10);
  const [translatedRequests, setTranslatedRequests] = useState<Record<string, string>>({});
  const [isTranslatingRequest, setIsTranslatingRequest] = useState<Record<string, boolean>>({});
  const requestsSentinelRef = useRef<HTMLDivElement>(null);
  const usersSentinelRef = useRef<HTMLDivElement>(null);

  const handleTranslateRequest = async (requestId: string, text: string) => {
    if (translatedRequests[requestId]) {
      const newTranslated = { ...translatedRequests };
      delete newTranslated[requestId];
      setTranslatedRequests(newTranslated);
      return;
    }

    setIsTranslatingRequest(prev => ({ ...prev, [requestId]: true }));
    try {
      const targetLang = i18n.language === 'ar' ? 'Arabic' : 'English';
      const translation = await translateText(text, targetLang);
      setTranslatedRequests(prev => ({ ...prev, [requestId]: translation }));
    } catch (error) {
      handleAiError(error, 'Text translation');
    } finally {
      setIsTranslatingRequest(prev => ({ ...prev, [requestId]: false }));
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleRequestsCount(prev => prev + 10);
      }
    }, { threshold: 0.1 });

    if (requestsSentinelRef.current) {
      observer.observe(requestsSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [requestsSentinelRef]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleUsersCount(prev => prev + 10);
      }
    }, { threshold: 0.1 });

    if (usersSentinelRef.current) {
      observer.observe(usersSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [usersSentinelRef]);

  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const [isSemanticSupplierSearching, setIsSemanticSupplierSearching] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<ProductRequest[]>([]);
  const [supplierChats, setSupplierChats] = useState<Chat[]>([]);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<UserProfile[]>([]);
  const [newCategoryAr, setNewCategoryAr] = useState('');
  const [newCategoryEn, setNewCategoryEn] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [semanticSearchResults, setSemanticSearchResults] = useState<string[] | null>(null);
  const [semanticSupplierResults, setSemanticSupplierResults] = useState<string[] | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategoryTab, setActiveCategoryTab] = useState<'product' | 'service'>('product');
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<UserProfile | null>(null);
  const [editSuppName, setEditSuppName] = useState('');
  const [editSuppCompanyName, setEditSuppCompanyName] = useState('');
  const [editSuppEmail, setEditSuppEmail] = useState('');
  const [editSuppPhone, setEditSuppPhone] = useState('');
  const [editSuppLocation, setEditSuppLocation] = useState('');
  const [editSuppWebsite, setEditSuppWebsite] = useState('');
  const [editSuppLogoUrl, setEditSuppLogoUrl] = useState('');
  const [editSuppCategories, setEditSuppCategories] = useState<string[]>([]);
  const [editSuppBio, setEditSuppBio] = useState('');
  const [isSuggestingEditSuppCategories, setIsSuggestingEditSuppCategories] = useState(false);
  const [editSuppCategorySearch, setEditSuppCategorySearch] = useState('');
  const [editSuppKeywords, setEditSuppKeywords] = useState<string[]>([]);
  const [newSuppKeyword, setNewSuppKeyword] = useState('');

  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppCompanyName, setNewSuppCompanyName] = useState('');
  const [newSuppEmail, setNewSuppEmail] = useState('');
  const [newSuppPassword, setNewSuppPassword] = useState('');
  const [newSuppPhone, setNewSuppPhone] = useState('');
  const [newSuppLocation, setNewSuppLocation] = useState('');
  const [newSuppWebsite, setNewSuppWebsite] = useState('');
  const [newSuppLogoUrl, setNewSuppLogoUrl] = useState('');
  const [newSuppCategories, setNewSuppCategories] = useState<string[]>([]);
  const [newSuppBio, setNewSuppBio] = useState('');
  const [isSuggestingNewSuppCategories, setIsSuggestingNewSuppCategories] = useState(false);
  const [newSuppCategorySearch, setNewSuppCategorySearch] = useState('');
  const [newSuppKeywords, setNewSuppKeywords] = useState<string[]>([]);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  const generateRandomSupplierPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewSuppPassword(pass);
  };
  const [newSuppAddKeyword, setNewSuppAddKeyword] = useState('');

  const [selectedSupplier, setSelectedSupplier] = useState<UserProfile | null>(null);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [contactEvents, setContactEvents] = useState<ContactEvent[]>([]);
  const [chatUsers, setChatUsers] = useState<Record<string, UserProfile>>({});

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeRole, setActiveRole] = useState<UserProfile['role'] | null>(null);
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [adminTab, setAdminTab] = useState<'overview' | 'suppliers' | 'users' | 'categories' | 'chats' | 'moderation' | 'settings' | 'market-trends' | 'price-intelligence' | 'user-data' | 'marketing' | 'branding' | 'ai' | 'cost'>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [selectedAdminUser, setSelectedAdminUser] = useState<UserProfile | null>(null);
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [selectedCategoryForKeywords, setSelectedCategoryForKeywords] = useState<Category | null>(null);
  const [similarCategory, setSimilarCategory] = useState<Category | null>(null);

  const checkSimilarity = (name: string, lang: 'ar' | 'en') => {
    if (!name || name.length < 3) {
      setSimilarCategory(null);
      return;
    }

    const normalizedInput = name.trim().toLowerCase();
    const match = categories.find(cat => {
      const catName = (lang === 'ar' ? cat.nameAr : cat.nameEn).trim().toLowerCase();
      // Only suggest if it's in the same parent or if it's a main category
      const sameParent = cat.parentId === selectedParentId;
      return (catName.includes(normalizedInput) || normalizedInput.includes(catName)) && sameParent;
    });

    if (match && (lang === 'ar' ? match.nameAr : match.nameEn).toLowerCase() !== normalizedInput) {
      setSimilarCategory(match);
    } else {
      setSimilarCategory(null);
    }
  };

  const getParentName = (parentId?: string) => {
    if (!parentId) return i18n.language === 'ar' ? 'فئة رئيسية' : 'Main Category';
    const parent = categories.find(c => c.id === parentId);
    return parent ? (i18n.language === 'ar' ? parent.nameAr : parent.nameEn) : '';
  };

  useEffect(() => {
    checkSimilarity(newCategoryAr, 'ar');
  }, [newCategoryAr]);

  useEffect(() => {
    checkSimilarity(newCategoryEn, 'en');
  }, [newCategoryEn]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'user' | 'supplier', uid: string, name: string } | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserCompanyName, setNewUserCompanyName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserProfile['role']>('manager');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [isGeneratingTrends, setIsGeneratingTrends] = useState(false);
  const [isGeneratingPricing, setIsGeneratingPricing] = useState(false);
  const [pricingInsights, setPricingInsights] = useState<PriceInsight[]>([]);

  const handleGeneratePriceInsights = async () => {
    setIsGeneratingPricing(true);
    try {
      // Get some common products or categories to analyze
      const products = ['Steel Rebar', 'Cement Grade 42.5', 'Ceramic Tiles', 'PVC Pipes', 'Electrical Cables'];
      const insights: PriceInsight[] = [];
      
      // Fetch some real historical data if available
      const offersSnap = await getDocs(query(collection(db, 'offers'), where('status', '==', 'accepted'), limit(50)));
      const historicalData = offersSnap.docs.map(d => d.data());

      for (const product of products) {
        const insight = await getPriceIntelligence(product, `Market analysis for ${product}`, historicalData, i18n.language);
        insights.push({
          ...insight,
          productName: product,
          timestamp: Date.now()
        } as any);
        // Delay to avoid rate limits (Gemini 3 Flash free tier is 15 RPM)
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
      
      setPricingInsights(insights);
      
      // Save to Firestore for persistence
      for (const insight of insights) {
        await addDoc(collection(db, 'price_insights'), {
          ...insight,
          createdAt: Date.now()
        });
      }
    } catch (error) {
      handleAiError(error, 'Pricing insights generation');
    } finally {
      setIsGeneratingPricing(false);
    }
  };

  useEffect(() => {
    if (adminTab === 'price-intelligence') {
      const q = query(collection(db, 'price_insights'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const insights = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPricingInsights(insights);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'price_insights', false);
      });
      return () => unsubscribe();
    }
  }, [adminTab]);

  const handleGenerateTrends = async () => {
    setIsGeneratingTrends(true);
    try {
      // Gather some data for analysis
      const recentChatsSnap = await getDocs(query(collection(db, 'chats'), orderBy('updatedAt', 'desc'), limit(20)));
      const chatSummaries = recentChatsSnap.docs.map(d => d.data().lastMessage).filter(Boolean).join('\n');
      
      const searchesSnap = await getDocs(query(collection(db, 'searches'), orderBy('createdAt', 'desc'), limit(50)));
      const searches = searchesSnap.docs.map(d => d.data().query).filter(Boolean);
      
      const analysis = await analyzeMarketTrends(searches, [chatSummaries], i18n.language);
      
      await addDoc(collection(db, 'market_trends'), {
        titleAr: i18n.language === 'ar' ? 'تحليل اتجاهات السوق الجديد' : 'New Market Trends Analysis',
        titleEn: i18n.language === 'ar' ? 'New Market Trends Analysis' : 'New Market Trends Analysis',
        analysis: analysis.analysis,
        suggestions: analysis.suggestions,
        language: i18n.language,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleAiError(error, 'Market trends generation');
    } finally {
      setIsGeneratingTrends(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUserPassword(pass);
  };

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (adminTab === 'overview' && isAdmin(profile)) {
      const fetchActivity = async () => {
        try {
          const suppliersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'supplier'), orderBy('createdAt', 'desc'), limit(5)));
          const customersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'customer'), orderBy('createdAt', 'desc'), limit(5)));
          const chatsSnap = await getDocs(query(collection(db, 'chats'), orderBy('updatedAt', 'desc'), limit(5)));
          const requestsSnap = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(5)));
          
          const activities = [
            ...suppliersSnap.docs.map(d => ({ id: d.id, type: 'supplier', data: d.data(), timestamp: d.data().createdAt })),
            ...customersSnap.docs.map(d => ({ id: d.id, type: 'customer', data: d.data(), timestamp: d.data().createdAt })),
            ...chatsSnap.docs.map(d => ({ id: d.id, type: 'chat', data: d.data(), timestamp: d.data().updatedAt })),
            ...requestsSnap.docs.map(d => ({ id: d.id, type: 'request', data: d.data(), timestamp: d.data().createdAt }))
          ].sort((a, b) => {
            const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp || 0);
            const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp || 0);
            return timeB - timeA;
          }).slice(0, 10);

          setRecentActivity(activities);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'activity', false);
        }
      };
      fetchActivity();
    }
  }, [adminTab, profile?.role]);

  const [selectedAdminCategory, setSelectedAdminCategory] = useState<Category | null>(null);
  const [selectedAdminChat, setSelectedAdminChat] = useState<Chat | null>(null);
  const [selectedAdminSupplier, setSelectedAdminSupplier] = useState<UserProfile | null>(null);

  // Site Settings States
  const [siteLogo, setSiteLogo] = useState('');
  const [watermarkLogo, setWatermarkLogo] = useState('');
  const [isUploadingWatermark, setIsUploadingWatermark] = useState(false);
  const [watermarkUploadError, setWatermarkUploadError] = useState<string | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [siteName, setSiteName] = useState('');
  const [heroTitleAr, setHeroTitleAr] = useState('');
  const [heroTitleEn, setHeroTitleEn] = useState('');
  const [heroDescriptionAr, setHeroDescriptionAr] = useState('');
  const [heroDescriptionEn, setHeroDescriptionEn] = useState('');
  const [logoScale, setLogoScale] = useState(1);
  const [logoAuraColor, setLogoAuraColor] = useState('#1b97a7');
  const [showNeuralLogo, setShowNeuralLogo] = useState(true);
  const [primaryTextColor, setPrimaryTextColor] = useState('#ffffff');
  const [secondaryTextColor, setSecondaryTextColor] = useState('#94a3b8');
  const [enableNeuralPulse, setEnableNeuralPulse] = useState(true);
  const [isHarmonizingColors, setIsHarmonizingColors] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  // Feature Toggles
  const [features, setFeatures] = useState<AppFeatures>(initialFeatures || {
    marketplace: true,
    aiChat: true,
    supplierVerification: true,
    marketTrends: true,
    priceIntelligence: true
  });
  const [isUpdatingFeatures, setIsUpdatingFeatures] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'features'), (snap) => {
      if (snap.exists()) {
        setFeatures(snap.data() as AppFeatures);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/features', false);
    });
    return () => unsub();
  }, []);

  const handleToggleFeature = async (feature: keyof AppFeatures) => {
    setIsUpdatingFeatures(true);
    try {
      const newFeatures = { ...features, [feature]: !features[feature] };
      await setDoc(doc(db, 'settings', 'features'), newFeatures);
      setFeatures(newFeatures);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/features', false);
    } finally {
      setIsUpdatingFeatures(false);
    }
  };

  // Supplier Profile Edit States
  const [editName, setEditName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  // AI Suggestion States
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggestingMerges, setIsSuggestingMerges] = useState(false);
  const [mergeSuggestions, setMergeSuggestions] = useState<any[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const handleSuggestMerges = async () => {
    setIsSuggestingMerges(true);
    try {
      const suggestions = await suggestCategoryMerges(categories, i18n.language);
      const validSuggestions = suggestions.filter(s => s.categoryIds && s.categoryIds.length > 1);
      setMergeSuggestions(validSuggestions);
      setShowMergeModal(true);
    } catch (error) {
      handleAiError(error, 'Category merge suggestions');
      setDashboardError(i18n.language === 'ar' ? 'فشل في توليد اقتراحات الدمج' : 'Failed to generate merge suggestions');
      setTimeout(() => setDashboardError(null), 3000);
    } finally {
      setIsSuggestingMerges(false);
    }
  };

  const handleDeleteAllCategories = async () => {
    // Optimistic UI update
    const previousCategories = categories;
    setCategories([]);

    try {
      let catsToDelete = previousCategories;
      if (catsToDelete.length === 0) {
        // Fallback: fetch categories directly
        const snap = await getDocs(collection(db, 'categories'));
        catsToDelete = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      }
      
      if (catsToDelete.length === 0) {
        setDashboardSuccess(i18n.language === 'ar' ? 'لا توجد فئات للحذف' : 'No categories to delete');
        setTimeout(() => setDashboardSuccess(null), 3000);
        setIsConfirmDeleteAllOpen(false);
        // Revert optimistic update
        setCategories(previousCategories);
        return;
      }

      const batch = writeBatch(db);
      catsToDelete.forEach(cat => {
        // Soft Delete as per AGENTS.md: "NEVER use deleteDoc... ALWAYS use Soft Delete"
        batch.update(doc(db, 'categories', cat.id), { 
          status: 'deleted', 
          deletedAt: new Date().toISOString() 
        });
      });
      await batch.commit();
      setDashboardSuccess(i18n.language === 'ar' ? 'تم حذف جميع الفئات بنجاح' : 'All categories deleted successfully');
      setTimeout(() => setDashboardSuccess(null), 3000);
      setIsConfirmDeleteAllOpen(false);
    } catch (error) {
      // Revert optimistic update
      setCategories(previousCategories);
      handleFirestoreError(error, OperationType.DELETE, 'categories', false);
    }
  };

  const handleApproveMerge = async (suggestion: any) => {
    try {
      const batch = writeBatch(db);
      const targetId = suggestion.categoryIds[0];
      const sourceIds = suggestion.categoryIds.slice(1);

      // 1. Update target category name and merge keywords
      const targetCat = categories.find(c => c.id === targetId);
      const sourceCats = categories.filter(c => sourceIds.includes(c.id));
      
      const allKeywords = new Set(targetCat?.keywords || []);
      sourceCats.forEach(c => {
        (c.keywords || []).forEach(k => allKeywords.add(k));
      });

      const targetRef = doc(db, 'categories', targetId);
      batch.update(targetRef, {
        nameAr: suggestion.suggestedNameAr,
        nameEn: suggestion.suggestedNameEn,
        keywords: Array.from(allKeywords)
      });

      // 2. Update subcategories pointing to sourceIds
      categories.forEach(cat => {
        if (cat.parentId && sourceIds.includes(cat.parentId)) {
          batch.update(doc(db, 'categories', cat.id), { parentId: targetId });
        }
      });

      // 3. Update products/requests pointing to sourceIds or targetId
      requests.forEach(req => {
        if (sourceIds.includes(req.categoryId) || req.categoryId === targetId) {
          batch.update(doc(db, 'requests', req.id), { 
            categoryId: targetId,
            categoryNameAr: suggestion.suggestedNameAr,
            categoryNameEn: suggestion.suggestedNameEn
          });
        }
      });

      // 4. Update suppliers pointing to sourceIds
      suppliers.forEach(supp => {
        if (supp.categories && supp.categories.some((id: string) => sourceIds.includes(id))) {
          const newCategories = [...new Set(supp.categories.map((id: string) => sourceIds.includes(id) ? targetId : id))];
          batch.update(doc(db, 'users', supp.uid), { categories: newCategories });
        }
      });

      // 5. Update chats pointing to sourceIds
      allChats.forEach(chat => {
        if (chat.categoryId && sourceIds.includes(chat.categoryId)) {
          batch.update(doc(db, 'chats', chat.id), { categoryId: targetId });
        }
      });

      // 6. Soft delete source categories
      sourceIds.forEach((id: string) => {
        // Soft Delete as per AGENTS.md: "NEVER use deleteDoc... ALWAYS use Soft Delete"
        batch.update(doc(db, 'categories', id), { 
          status: 'deleted', 
          deletedAt: new Date().toISOString() 
        });
      });

      await batch.commit();
      
      setMergeSuggestions(prev => prev.filter(s => s !== suggestion));
      setDashboardSuccess(i18n.language === 'ar' ? 'تم دمج الفئات بنجاح' : 'Categories merged successfully');
      setTimeout(() => setDashboardSuccess(null), 3000);
      
      if (mergeSuggestions.length <= 1) {
        setShowMergeModal(false);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'categories', false);
    }
  };

  const handleSuggestMainCategories = async () => {
    setIsSuggesting(true);
    try {
      const existingNames = categories
        .filter(c => !c.parentId && c.categoryType === activeCategoryTab)
        .map(c => i18n.language === 'ar' ? c.nameAr : c.nameEn);
      const suggestions = await suggestMainCategories(i18n.language, activeCategoryTab, existingNames);
      setAiSuggestions(suggestions);
    } catch (error: any) {
      handleAiError(error, 'Main category suggestions');
      if (error.message === 'QUOTA_EXHAUSTED') {
        toast.error(i18n.language === 'ar' ? 'عذراً، تم استنفاد حصة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.' : 'AI quota exhausted. Please try again later.');
      } else {
        toast.error(i18n.language === 'ar' ? 'حدث خطأ أثناء توليد الاقتراحات' : 'Failed to generate suggestions');
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSuggestSubcategories = async (parentId?: string) => {
    const targetParentId = parentId || selectedParentId;
    if (parentId) {
      setSelectedParentId(parentId);
    }
    
    let categoryName = i18n.language === 'ar' ? newCategoryAr : newCategoryEn;
    
    // If a parent is selected, use its name for better suggestions
    if (targetParentId) {
      const parent = categories.find(c => c.id === targetParentId);
      if (parent) {
        categoryName = i18n.language === 'ar' ? parent.nameAr : parent.nameEn;
      }
    }

    if (!categoryName) return;

    setIsSuggesting(true);
    try {
      const existingSubNames = categories
        .filter(c => c.parentId === targetParentId)
        .map(c => i18n.language === 'ar' ? c.nameAr : c.nameEn);
      const suggestions = await suggestSubcategories(categoryName, activeCategoryTab, existingSubNames);
      setAiSuggestions(suggestions);
    } catch (error: any) {
      handleAiError(error, 'Subcategory suggestions');
      if (error.message === 'QUOTA_EXHAUSTED') {
        toast.error(i18n.language === 'ar' ? 'عذراً، تم استنفاد حصة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.' : 'AI quota exhausted. Please try again later.');
      } else {
        toast.error(i18n.language === 'ar' ? 'حدث خطأ أثناء توليد الاقتراحات' : 'Failed to generate suggestions');
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleFormatCategory = async () => {
    const name = i18n.language === 'ar' ? newCategoryAr : newCategoryEn;
    if (!name) return;

    setIsFormatting(true);
    try {
      const result = await formatCategoryName(name, i18n.language);
      if (result.nameAr && result.nameEn) {
        setNewCategoryAr(result.nameAr);
        setNewCategoryEn(result.nameEn);
        setDashboardSuccess(i18n.language === 'ar' ? 'تم تنسيق الفئة باحترافية' : 'Category formatted professionally');
        setTimeout(() => setDashboardSuccess(null), 3000);
      }
    } catch (error) {
      handleAiError(error, 'Category name formatting');
    } finally {
      setIsFormatting(false);
    }
  };

  const handleAiSearch = async () => {
    if (!categorySearch.trim()) return;
    setIsSemanticSearching(true);
    try {
      const results = await semanticSearch(categorySearch, categories, i18n.language);
      setSemanticSearchResults(results);
      setDashboardSuccess(i18n.language === 'ar' ? 'تم البحث بالذكاء الاصطناعي' : 'AI search completed');
      setTimeout(() => setDashboardSuccess(null), 3000);
    } catch (error) {
      handleAiError(error, 'Semantic search');
    } finally {
      setIsSemanticSearching(false);
    }
  };

  const handleAiSupplierSearch = async () => {
    if (!supplierSearch.trim()) return;
    setIsSemanticSupplierSearching(true);
    try {
      const results = await semanticSearch(supplierSearch, suppliers, i18n.language);
      setSemanticSupplierResults(results);
      setDashboardSuccess(i18n.language === 'ar' ? 'تم البحث بالذكاء الاصطناعي عن الموردين' : 'AI supplier search completed');
      setTimeout(() => setDashboardSuccess(null), 3000);
    } catch (error) {
      handleAiError(error, 'Supplier semantic search');
    } finally {
      setIsSemanticSupplierSearching(false);
    }
  };

  useEffect(() => {
    if (!requestSearch) {
      setFilteredRequests(requests);
    } else if (!isSemanticSearching) {
      setFilteredRequests(requests.filter(req => 
        req.productName.toLowerCase().includes(requestSearch.toLowerCase()) || 
        req.description.toLowerCase().includes(requestSearch.toLowerCase())
      ));
    }
  }, [requests, requestSearch, isSemanticSearching]);

  const handleSemanticSearch = async () => {
    if (!requestSearch) return;
    setIsSemanticSearching(true);
    try {
      const relevantIds = await semanticSearch(requestSearch, requests, i18n.language);
      setFilteredRequests(requests.filter(req => relevantIds.includes(req.id)));
    } catch (error) {
      handleAiError(error, 'Semantic search');
    } finally {
      setIsSemanticSearching(false);
    }
  };

  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardSuccess, setDashboardSuccess] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState<string | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserRole || (!editingUser && !newUserPassword)) return;

    setIsCreatingUser(true);
    setDashboardError(null);
    setDashboardSuccess(null);
    
    try {
      if (editingUser) {
        const updatedData = {
          name: newUserName,
          companyName: newUserRole === 'supplier' ? newUserCompanyName : (editingUser.companyName || ''),
          role: newUserRole,
        };
        
        // Optimistic UI update
        const previousAllUsers = allUsers;
        setAllUsers(prev => prev.map(user => user.uid === editingUser.uid ? { ...user, ...updatedData } : user));
        
        try {
          // Update existing user in Firestore
          await updateDoc(doc(db, 'users', editingUser.uid), updatedData);
          setDashboardSuccess(i18n.language === 'ar' ? 'تم تحديث المستخدم بنجاح' : 'User updated successfully');
        } catch (error) {
          // Revert optimistic update
          setAllUsers(previousAllUsers);
          throw error;
        }
      } else {
        // Create actual Firebase Auth user using a secondary app instance
        // This prevents the current admin from being logged out
        const secondaryAppName = `SecondaryApp-${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
          const newUid = userCredential.user.uid;
          
          await setDoc(doc(db, 'users', newUid), {
            uid: newUid,
            email: newUserEmail,
            name: newUserName,
            companyName: newUserRole === 'supplier' ? newUserCompanyName : '',
            role: newUserRole,
            createdAt: new Date().toISOString(),
            language: 'ar'
          });
          
          // Sign out the secondary app to clean up
          await secondaryAuth.signOut();
          // Small delay to ensure Auth state is cleaned up before app deletion
          await new Promise(resolve => setTimeout(resolve, 1000));
          await deleteApp(secondaryApp);
          setDashboardSuccess(i18n.language === 'ar' ? 'تم إنشاء المستخدم بنجاح' : 'User created successfully');
        } catch (authError: any) {
          // Clean up secondary app if auth fails
          const appToDelete = getApps().find(a => a.name === secondaryAppName);
          if (appToDelete) {
            await deleteApp(appToDelete);
          }
          
          if (authError.code === 'auth/email-already-in-use' || (authError.message && authError.message.includes('auth/email-already-in-use'))) {
            const usersQuery = query(collection(db, 'users'), where('email', '==', newUserEmail.toLowerCase()));
            const usersSnap = await getDocs(usersQuery);
            if (!usersSnap.empty) {
              const existingDoc = usersSnap.docs[0];
              await updateDoc(doc(db, 'users', existingDoc.id), {
                name: newUserName,
                companyName: newUserRole === 'supplier' ? newUserCompanyName : '',
                role: newUserRole,
              });
              setDashboardSuccess(i18n.language === 'ar' ? 'تم تحديث المستخدم الموجود بنجاح' : 'Existing user updated successfully');
            } else {
              await setDoc(doc(db, 'users', newUserEmail.toLowerCase()), {
                uid: newUserEmail.toLowerCase(),
                email: newUserEmail.toLowerCase(),
                name: newUserName,
                companyName: newUserRole === 'supplier' ? newUserCompanyName : '',
                role: newUserRole,
                createdAt: new Date().toISOString(),
                language: 'ar'
              });
              setDashboardSuccess(i18n.language === 'ar' ? 'تم إنشاء بيانات المستخدم بنجاح' : 'User data created successfully');
            }
            
            setTimeout(() => setDashboardSuccess(null), 3000);
            setIsAddingUser(false);
            setEditingUser(null);
            setNewUserName('');
            setNewUserCompanyName('');
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserRole('manager');
            setIsCreatingUser(false);
            return;
          }
          
          throw authError;
        }
      }
      setTimeout(() => setDashboardSuccess(null), 3000);

      setIsAddingUser(false);
      setEditingUser(null);
      setNewUserName('');
      setNewUserCompanyName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('manager');
      
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser?.uid || 'new'}`, false);
      if (error.code === 'auth/email-already-in-use' || (error.message && error.message.includes('auth/email-already-in-use'))) {
        setDashboardError(i18n.language === 'ar' 
          ? 'هذا البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر.' 
          : 'This email is already in use. Please use a different email address.');
      } else if (error.code === 'auth/operation-not-allowed' || (error.message && error.message.includes('auth/operation-not-allowed'))) {
        setDashboardError(i18n.language === 'ar'
          ? 'يجب تفعيل خاصية "البريد الإلكتروني وكلمة المرور" في لوحة تحكم Firebase (Authentication > Sign-in method).'
          : 'Email/Password authentication must be enabled in the Firebase Console (Authentication > Sign-in method).');
      } else {
        setDashboardError((i18n.language === 'ar' ? 'خطأ في حفظ المستخدم: ' : 'Error saving user: ') + error.message);
      }
      setTimeout(() => setDashboardError(null), 5000);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleAddSuggested = async (suggestion: string) => {
    try {
      // Translate suggestion to both languages
      const nameEn = await translateText(suggestion, 'English');
      const nameAr = await translateText(suggestion, 'Arabic');
      
      await addDoc(collection(db, 'categories'), {
        nameAr,
        nameEn,
        categoryType: activeCategoryTab,
        parentId: selectedParentId || null,
        createdAt: new Date().toISOString()
      });
      
      setAiSuggestions(prev => prev.filter(s => s !== suggestion));
      setDashboardSuccess(i18n.language === 'ar' ? 'تمت إضافة الفئة بنجاح' : 'Category added successfully');
      setTimeout(() => setDashboardSuccess(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories', false);
    }
  };
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogoPreview, setGeneratedLogoPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizingBio, setIsOptimizingBio] = useState(false);
  const [isSuggestingOwnCategories, setIsSuggestingOwnCategories] = useState(false);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [chatSummaries, setChatSummaries] = useState<Record<string, string>>({});
  const [isSummarizing, setIsSummarizing] = useState<Record<string, boolean>>({});
  const [marketInsights, setMarketInsights] = useState<string>('');
  const [marketSuggestions, setMarketSuggestions] = useState<string[]>([]);
  const [isAnalyzingMarket, setIsAnalyzingMarket] = useState(false);
  const [moderationAlerts, setModerationAlerts] = useState<any[]>([]);

  const handleSummarizeChat = async (chatId: string) => {
    setIsSummarizing(prev => ({ ...prev, [chatId]: true }));
    try {
      const messagesSnap = await getDocs(query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc')));
      const messages = messagesSnap.docs.map(d => {
        const data = d.data();
        return `${data.senderName || 'User'}: ${data.text || '[Media]'}`;
      });
      
      const summary = await summarizeChat(messages.join('\n'), i18n.language);
      setChatSummaries(prev => ({ ...prev, [chatId]: summary }));
    } catch (error) {
      handleAiError(error, 'Chat summarization');
    } finally {
      setIsSummarizing(prev => ({ ...prev, [chatId]: false }));
    }
  };

  const handleAnalyzeMarket = async () => {
    setIsAnalyzingMarket(true);
    try {
      // Fetch recent searches and chat summaries
      const searchesSnap = await getDocs(query(collection(db, 'searches'), orderBy('createdAt', 'desc')));
      const searches = searchesSnap.docs.map(d => d.data().query);
      
      const summaries = Object.values(chatSummaries);
      
      const insights = await analyzeMarketTrends(searches, summaries, i18n.language);
      setMarketInsights(insights.analysis);
      setMarketSuggestions(insights.suggestions || []);
      
      // Also save to Firestore so it's persistent and available in the Market Trends tab
      await addDoc(collection(db, 'market_trends'), {
        titleAr: i18n.language === 'ar' ? 'تحليل السوق والتوجهات' : 'Market Insights & Trends',
        titleEn: 'Market Insights & Trends',
        analysis: insights.analysis,
        suggestions: insights.suggestions,
        language: i18n.language,
        createdAt: new Date().toISOString()
      });
      
      toast.success(isRtl ? 'تم تحديث تحليل السوق بنجاح' : 'Market analysis updated successfully');
    } catch (error) {
      handleAiError(error, 'Market analysis');
    } finally {
      setIsAnalyzingMarket(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'moderation_alerts', alertId), { resolved: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `moderation_alerts/${alertId}`, false);
    }
  };

  useEffect(() => {
    if (profile) {
      const isAdminLike = isAdmin(profile);
      setActiveRole(isAdminLike ? 'admin' : profile.role);
      setEditName(profile.name || '');
      setEditCompanyName(profile.companyName || '');
      setEditEmail(profile.email || '');
      setEditPhone(profile.phone || '');
      setEditLocation(profile.location || '');
      setEditWebsite(profile.website || '');
      setEditCategories(profile.categories || []);
      setEditKeywords(profile.keywords || []);
      setEditLogoUrl(profile.logoUrl || '');
      setEditBio(profile.bio || '');
    }
  }, [profile]);

  // Heartbeat to update lastActive
  useEffect(() => {
    if (!profile?.uid) return;
    
    const updateLastActive = async () => {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          lastActive: new Date().toISOString()
        });
      } catch (e) {
        // Silently fail if there's an issue updating lastActive
      }
    };

    updateLastActive();
    const interval = setInterval(updateLastActive, 60000); // every minute
    return () => clearInterval(interval);
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile || !activeRole) return;

    // Fetch Categories
    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      // Sort by type: product before service, then by order
      const sortedCats = cats.sort((a, b) => {
        const typeA = a.categoryType || 'product';
        const typeB = b.categoryType || 'product';
        if (typeA !== typeB) {
          return typeA === 'product' ? -1 : 1;
        }
        return (a.order || 0) - (b.order || 0);
      });
      setCategories(sortedCats);
      setIsLoadingCategories(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories', false);
      setIsLoadingCategories(false);
    });

    // Fetch Suppliers
    const qSuppliers = query(collection(db, 'users'), where('role', '==', 'supplier'));
    const unsubSupps = onSnapshot(qSuppliers, (snap) => {
      const suppList = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      
      // If admin has company info, include them for testing/visibility
      const isAdminLike = isAdmin(profile);
      if (isAdminLike && profile.companyName && !suppList.find(s => s.uid === profile.uid)) {
        suppList.push(profile);
      }
      
      setSuppliers(suppList);
      // No separate loading for suppliers yet, but could add
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users', false);
    });

    // Fetch Requests based on activeRole
    let q;
    if (activeRole === 'customer') {
      q = query(collection(db, 'requests'), where('customerId', '==', profile.uid), orderBy('createdAt', 'desc'));
    } else if (activeRole === 'supplier') {
      q = query(collection(db, 'requests'), where('status', '==', 'open'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    }

    const unsubReqs = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductRequest)));
      setIsLoadingRequests(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests', false);
    });

    let unsubSupplierChats = () => {};
    if (activeRole === 'supplier') {
      const qChats = query(collection(db, 'chats'), where('supplierId', '==', profile.uid), orderBy('updatedAt', 'desc'));
      unsubSupplierChats = onSnapshot(qChats, (snap) => {
        const allChatsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
        // Filter for 24 hours if not admin
        if (profile.role !== 'admin') {
          const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
          setSupplierChats(allChatsData.filter(chat => {
            const updatedAt = chat.updatedAt ? new Date(chat.updatedAt).getTime() : 0;
            return updatedAt >= twentyFourHoursAgo;
          }));
        } else {
          setSupplierChats(allChatsData);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chats', false);
      });
    }

    let unsubAllChats = () => {};
    let unsubAllUsers = () => {};
    let unsubAlerts = () => {};
    if (profile.role === 'admin') {
      const qAllChats = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
      unsubAllChats = onSnapshot(qAllChats, async (snap) => {
        try {
          const chatsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
          setAllChats(chatsData);

          // Fetch user info for archive
          const userIds = new Set<string>();
          chatsData.forEach(c => {
            if (c.customerId && c.customerId !== 'system') userIds.add(c.customerId);
            if (c.supplierId && c.supplierId !== 'everyone') userIds.add(c.supplierId);
          });

          const newUsers = { ...chatUsers };
          let changed = false;
          for (const uid of Array.from(userIds)) {
            if (!newUsers[uid]) {
              try {
                const uSnap = await getDoc(doc(db, 'users', uid));
                if (uSnap.exists()) {
                  newUsers[uid] = uSnap.data() as UserProfile;
                  changed = true;
                }
              } catch (error) {
                handleFirestoreError(error, OperationType.GET, `users/${uid}`, false);
              }
            }
          }
          if (changed) setChatUsers(newUsers);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'chats', false);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chats', false);
      });

      // Fetch All Users for Admin Stats
      unsubAllUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        setIsLoadingUsers(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users', false);
        setIsLoadingUsers(false);
      });

      // Fetch Moderation Alerts
      unsubAlerts = onSnapshot(collection(db, 'moderation_alerts'), (snap) => {
        const alerts = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setModerationAlerts(alerts);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'moderation_alerts', false);
      });

      // Fetch Market Trends
      const unsubTrends = onSnapshot(query(collection(db, 'market_trends'), limit(50)), (snap) => {
        const trends = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as MarketTrend))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMarketTrends(trends);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'market_trends', false);
      });

      // Fetch Contact Events
      const unsubContactEvents = onSnapshot(collection(db, 'contactEvents'), (snap) => {
        setContactEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContactEvent)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'contactEvents', false);
      });

      return () => {
        unsubCats();
        unsubSupps();
        unsubReqs();
        unsubSupplierChats();
        unsubAllChats();
        unsubAllUsers();
        unsubAlerts();
        unsubTrends();
        unsubContactEvents();
      };
    }

    return () => {
      unsubCats();
      unsubSupps();
      unsubReqs();
      unsubSupplierChats();
      unsubAllChats();
      unsubAllUsers();
      unsubAlerts();
    };
  }, [profile, activeRole]);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSiteLogo(data.logoUrl || '');
        setWatermarkLogo(data.watermarkLogoUrl || '');
        setWatermarkOpacity(data.watermarkOpacity ?? 0.5);
        setWatermarkPosition(data.watermarkPosition || 'bottom-right');
        setSiteName(data.siteName || '');
        setHeroTitleAr(data.heroTitleAr || '');
        setHeroTitleEn(data.heroTitleEn || '');
        setHeroDescriptionAr(data.heroDescriptionAr || '');
        setHeroDescriptionEn(data.heroDescriptionEn || '');
        setLogoScale(data.logoScale ?? 1);
        setLogoAuraColor(data.logoAuraColor || '#1b97a7');
        setShowNeuralLogo(data.showNeuralLogo ?? true);
        setPrimaryTextColor(data.primaryTextColor || '#ffffff');
        setSecondaryTextColor(data.secondaryTextColor || '#94a3b8');
        setEnableNeuralPulse(data.enableNeuralPulse ?? true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
    });
    return () => unsubSettings();
  }, []);

  const handleSiteLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError(i18n.language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File size too large (max 2MB)');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      const storageRef = ref(storage, `logos/${profile?.uid || 'admin'}/site_logo_${Date.now()}`);
      const metadata = {
        contentType: compressedFile.type,
      };
      
      const uploadTask = uploadBytesResumable(storageRef, compressedFile, metadata);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          null,
          (error) => reject(error),
          () => resolve(true)
        );
      });

      const url = await getDownloadURL(storageRef);
      
      await setDoc(doc(db, 'settings', 'site'), {
        logoUrl: url,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setSiteLogo(url);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `storage/logos/site`, false);
      
      if (error.code === 'storage/unknown') {
        setLogoUploadError(i18n.language === 'ar' ? 'جاري استخدام وضع التوافق للرفع...' : 'Switching to compatibility mode for upload...');
      }
      
      // Fallback to Base64 if Storage fails
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Url = reader.result as string;
            await setDoc(doc(db, 'settings', 'site'), {
              logoUrl: base64Url,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            setSiteLogo(base64Url);
            setLogoUploadError(i18n.language === 'ar' ? 'تم استخدام وضع التوافق للرفع.' : 'Using compatibility mode for upload.');
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'settings/site', false);
            setLogoUploadError(i18n.language === 'ar' ? 'فشل تحميل الشعار في وضع التوافق' : 'Failed to upload logo in compatibility mode');
          }
        };
        reader.readAsDataURL(file);
      } catch (fallbackErr) {
        handleAiError(fallbackErr, 'Logo upload fallback');
        setLogoUploadError(isRtl ? 'فشل تحميل الشعار' : 'Failed to upload logo');
      }
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleWatermarkLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setWatermarkUploadError(i18n.language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File size too large (max 2MB)');
      return;
    }

    setIsUploadingWatermark(true);
    setWatermarkUploadError(null);

    try {
      const options = {
        maxSizeMB: 0.2, // Compress to max 200KB to safely store in Firestore
        maxWidthOrHeight: 800,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Url = reader.result as string;
          await setDoc(doc(db, 'settings', 'site'), {
            watermarkLogoUrl: base64Url,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          setWatermarkLogo(base64Url);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'settings/site', false);
          setWatermarkUploadError(i18n.language === 'ar' ? 'فشل حفظ الشعار' : 'Failed to save logo');
        } finally {
          setIsUploadingWatermark(false);
        }
      };
      reader.readAsDataURL(compressedFile);
    } catch (error: any) {
      handleAiError(error, 'Watermark logo compression');
      setWatermarkUploadError(i18n.language === 'ar' ? 'فشل معالجة الشعار' : 'Failed to process logo');
      setIsUploadingWatermark(false);
    }
  };

  const handleHarmonizeColors = async () => {
    if (!primaryTextColor) return;
    setIsHarmonizingColors(true);
    try {
      const result = await suggestColorHarmony(primaryTextColor);
      setSecondaryTextColor(result.secondaryColor);
      toast.success(i18n.language === 'ar' ? `تم اقتراح لون متناسق: ${result.reason}` : `Suggested harmonious color: ${result.reason}`);
    } catch (error) {
      toast.error(i18n.language === 'ar' ? 'فشل اقتراح اللون' : 'Failed to suggest color');
    } finally {
      setIsHarmonizingColors(false);
    }
  };

  const handleUpdateSiteName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        siteName,
        heroTitleAr,
        heroTitleEn,
        heroDescriptionAr,
        heroDescriptionEn,
        watermarkOpacity,
        watermarkPosition,
        logoScale,
        logoAuraColor,
        showNeuralLogo,
        primaryTextColor,
        secondaryTextColor,
        enableNeuralPulse,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings', false);
    }
  };

  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslatingHeroTitle, setIsTranslatingHeroTitle] = useState(false);
  const [isTranslatingHeroDesc, setIsTranslatingHeroDesc] = useState(false);

  const handleTranslateHeroTitle = async () => {
    if (!heroTitleAr) return;
    setIsTranslatingHeroTitle(true);
    const translation = await translateText(heroTitleAr, 'English');
    if (translation) {
      setHeroTitleEn(translation);
    }
    setIsTranslatingHeroTitle(false);
  };

  const handleTranslateHeroDesc = async () => {
    if (!heroDescriptionAr) return;
    setIsTranslatingHeroDesc(true);
    const translation = await translateText(heroDescriptionAr, 'English');
    if (translation) {
      setHeroDescriptionEn(translation);
    }
    setIsTranslatingHeroDesc(false);
  };

  const handleTranslate = async () => {
    if (!newCategoryAr) return;
    setIsTranslating(true);
    const translation = await translateText(newCategoryAr, 'English');
    if (translation) {
      setNewCategoryEn(translation);
    }
    setIsTranslating(false);
  };


  /*
  const handleDirectAddSub = (parentId: string) => {
    console.log('Setting addingSubTo:', parentId);
    setAddingSubTo(parentId);
  };

  const submitSubCategory = async () => {
    console.log('Submitting:', { addingSubTo, newSubAr, newSubEn });
    if (!addingSubTo || !newSubAr || !newSubEn) return;

    try {
      await addDoc(collection(db, 'categories'), {
        nameAr: newSubAr.trim(),
        nameEn: newSubEn.trim(),
        parentId: addingSubTo
      });
      setAddingSubTo(null);
      setNewSubAr('');
      setNewSubEn('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories', false);
    }
  };
  */

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteCategory = async (id: string) => {
    // Optimistic UI update
    const previousCategories = categories;
    setCategories(prev => prev.filter(cat => cat.id !== id));
    
    try {
      // Soft delete: Update status instead of hard deleting
      await updateDoc(doc(db, 'categories', id), {
        status: 'deleted',
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      // Revert optimistic update
      setCategories(previousCategories);
      handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`, false);
    }
    setConfirmDeleteId(null);
  };

  const handleCreateOffer = async (requestId: string, price: number, message: string, customerId?: string) => {
    if (!profile) return;
    
    const tempId = `temp-${Date.now()}`;
    const offerData: Offer = {
      id: tempId,
      requestId,
      supplierId: profile.uid,
      customerId: customerId || '', // Ensure customerId is provided
      price,
      message,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Optimistic UI update
    setOffers(prev => [offerData, ...prev]);

    try {
      const { id, ...offerDataWithoutId } = offerData;
      await addDoc(collection(db, 'offers'), offerDataWithoutId);
      
      // Create notification
      await createNotification({
        userId: customerId || '',
        titleAr: 'عرض جديد',
        titleEn: 'New Offer',
        bodyAr: `لديك عرض جديد من ${profile.companyName || profile.name}`,
        bodyEn: `You have a new offer from ${profile.companyName || profile.name}`,
        actionType: 'submit_offer',
        targetId: requestId,
      });
    } catch (error) {
      // Revert optimistic update
      setOffers(prev => prev.filter(offer => offer.id !== tempId));
      handleFirestoreError(error, OperationType.CREATE, 'offers', false);
    }
  };

  const handleStartChat = async (requestId: string, supplierId: string, customerId: string) => {
    setChatLoading(requestId);
    // Check if chat exists
    // Query by the current user's role to satisfy Firestore security rules without needing a composite index
    const queryField = profile?.role === 'customer' ? 'customerId' : 'supplierId';
    const queryValue = profile?.role === 'customer' ? customerId : supplierId;
    
    const q = query(
      collection(db, 'chats'), 
      where(queryField, '==', queryValue)
    );
    
    try {
      const snap = await getDocs(q);
      const existingChat = snap.docs.find(doc => {
        const data = doc.data();
        return data.requestId === requestId && 
               (profile?.role === 'customer' ? data.supplierId === supplierId : data.customerId === customerId);
      });
      
      if (existingChat) {
        onOpenChat(existingChat.id);
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          requestId,
          supplierId,
          customerId,
          lastMessage: '',
          updatedAt: new Date().toISOString()
        });
        onOpenChat(newChat.id);
      }
    } catch (error) {
      setDashboardError(i18n.language === 'ar' ? 'حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' : 'Connection error. Please check your internet connection.');
      setTimeout(() => setDashboardError(null), 5000);
      handleFirestoreError(error, OperationType.WRITE, 'chats', false);
    } finally {
      setChatLoading(null);
    }
  };

  const handlePinSupplier = async (requestId: string, supplierId: string) => {
    // Optimistic UI update
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        const pinned = req.pinnedSupplierIds || [];
        const newPinned = pinned.includes(supplierId) 
          ? pinned.filter(id => id !== supplierId)
          : [...pinned, supplierId];
        return { ...req, pinnedSupplierIds: newPinned };
      }
      return req;
    }));

    const requestRef = doc(db, 'requests', requestId);
    try {
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        const data = requestSnap.data() as ProductRequest;
        const pinned = data.pinnedSupplierIds || [];
        const newPinned = pinned.includes(supplierId) 
          ? pinned.filter(id => id !== supplierId)
          : [...pinned, supplierId];
        
        await updateDoc(requestRef, { pinnedSupplierIds: newPinned });
      }
    } catch (error) {
      // Revert optimistic update by triggering a re-fetch or letting onSnapshot handle it
      // Since onSnapshot is active, it will eventually correct the state, but we can also force it
      handleFirestoreError(error, OperationType.UPDATE, `requests/${requestId}`, false);
    }
  };

  const [isSuggestingMore, setIsSuggestingMore] = useState<Record<string, boolean>>({});

  const handleSuggestMoreSuppliers = async (requestId: string, productName: string, categoryId: string) => {
    setIsSuggestingMore(prev => ({ ...prev, [requestId]: true }));
    try {
      const category = categories.find(c => c.id === categoryId);
      const categoryName = category ? (i18n.language === 'ar' ? category.nameAr : category.nameEn) : '';
      
      // Use semantic search to find suppliers matching the product and category
      const query = `${productName} ${categoryName}`;
      const results = await semanticSearch(query, suppliers, i18n.language);
      
      // Filter out already suggested or pinned suppliers
      const requestRef = doc(db, 'requests', requestId);
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        const data = requestSnap.data() as ProductRequest;
        const currentSuggested = data.suggestedSupplierIds || [];
        const currentPinned = data.pinnedSupplierIds || [];
        
        const newSuggestedIds = results
          .filter(uid => !currentSuggested.includes(uid) && !currentPinned.includes(uid));
        
        if (newSuggestedIds.length > 0) {
          await updateDoc(requestRef, {
            suggestedSupplierIds: Array.from(new Set([...currentSuggested, ...newSuggestedIds]))
          });
        }
      }
    } catch (error) {
      handleAiError(error, 'Suggesting more suppliers');
      setDashboardError(i18n.language === 'ar' ? 'فشل اقتراح موردين جدد. يرجى المحاولة مرة أخرى.' : 'Failed to suggest more suppliers. Please try again.');
      setTimeout(() => setDashboardError(null), 5000);
    } finally {
      setIsSuggestingMore(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const getSuppliersForRequest = (req: ProductRequest) => {
    const displayedSuppliers = new Map<string, UserProfile>();
    
    // 1. Add matchedSuppliers (already UserProfile objects)
    req.matchedSuppliers?.forEach(s => displayedSuppliers.set(s.uid, s));
    
    // 2. Add pinnedSupplierIds
    req.pinnedSupplierIds?.forEach(id => {
      if (!displayedSuppliers.has(id)) {
        const s = suppliers.find(sup => sup.uid === id);
        if (s) displayedSuppliers.set(id, s);
      }
    });
    
    // 3. Add suggestedSupplierIds
    req.suggestedSupplierIds?.forEach(id => {
      if (!displayedSuppliers.has(id)) {
        const s = suppliers.find(sup => sup.uid === id);
        if (s) displayedSuppliers.set(id, s);
      }
    });

    // 4. If still fewer than 4, try to find more from the same category
    if (displayedSuppliers.size < 4) {
      const categorySuppliers = suppliers.filter(s => 
        s.categories?.includes(req.categoryId) && !displayedSuppliers.has(s.uid)
      );
      categorySuppliers.slice(0, 4 - displayedSuppliers.size).forEach(s => displayedSuppliers.set(s.uid, s));
    }

    return Array.from(displayedSuppliers.values());
  };

  const handleArchiveChat = async (chatId: string, archived: boolean) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), { archived });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`, false);
    }
  };

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const handleDetectLocation = () => {
    setDashboardError(null);
    if (!navigator.geolocation) {
      setDashboardError(i18n.language === 'ar' ? 'متصفحك لا يدعم تحديد الموقع' : 'Geolocation is not supported by your browser');
      setTimeout(() => setDashboardError(null), 5000);
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use reverse geocoding to get a readable address (optional, but better)
          // For now, we'll just put the coordinates or try a simple fetch if available
          // Or just set it as "Lat: X, Long: Y"
          setEditLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          
          // If we want a real address, we could use a service, but let's keep it simple for now
          // or just tell the user we got the coordinates.
        } catch (error) {
          handleAiError(error, 'Reverse geocoding');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        handleAiError(error, 'Geolocation detection');
        setIsDetectingLocation(false);
        setDashboardError(i18n.language === 'ar' ? 'فشل تحديد الموقع. يرجى التأكد من تفعيل الصلاحيات.' : 'Failed to get location. Please ensure permissions are enabled.');
        setTimeout(() => setDashboardError(null), 5000);
      }
    );
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    const kw = newKeyword.trim();
    if (!editKeywords.includes(kw)) {
      setEditKeywords([...editKeywords, kw]);
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setEditKeywords(editKeywords.filter(k => k !== kw));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          name: editName,
          companyName: editCompanyName,
          email: editEmail,
          phone: editPhone,
          location: editLocation,
          website: editWebsite,
          categories: editCategories,
          keywords: editKeywords,
          logoUrl: editLogoUrl,
          bio: editBio
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
      }
    } catch (err) {
      handleAiError(err, 'Profile update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAILogo = async () => {
    if (!profile) return;
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let currentUsage = profile.logoGenerationUsage || { count: 0, month: currentMonth };
    
    if (currentUsage.month !== currentMonth) {
      currentUsage = { count: 0, month: currentMonth };
    }

    if (profile.role === 'supplier' && currentUsage.count >= 2) {
      setUploadError(i18n.language === 'ar' ? 'لقد استنفدت الحد الأقصى لتوليد الشعار هذا الشهر (مرتين).' : 'You have reached the maximum logo generations for this month (2 times).');
      return;
    }

    // Determine category to use for prompt
    let categoryName = 'General Business';
    if (profile.categories && profile.categories.length > 0) {
      const cat = categories.find(c => c.id === profile.categories[0]);
      if (cat) {
        categoryName = i18n.language === 'ar' ? cat.nameAr : cat.nameEn;
      }
    }

    const companyName = editCompanyName || profile.companyName || profile.name || 'Company';

    setIsGeneratingLogo(true);
    setUploadError(null);

    try {
      const result = await generateSupplierLogo(companyName, categoryName, i18n.language);
      
      // Convert base64 to blob
      const response = await fetch(result.logoUrl);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `logos/${profile.uid}/ai_${Date.now()}.png`);
      const metadata = {
        contentType: 'image/png',
      };
      
      await uploadBytes(storageRef, blob, metadata);
      const url = await getDownloadURL(storageRef);
      
      setEditLogoUrl(url);
      setGeneratedLogoPreview(url);

      if (profile.role === 'supplier') {
        const newUsage = { count: currentUsage.count + 1, month: currentMonth };
        await updateDoc(doc(db, 'users', profile.uid), {
          logoGenerationUsage: newUsage
        });
      }
    } catch (error) {
      handleAiError(error, 'AI Logo generation');
      setUploadError(i18n.language === 'ar' ? 'فشل توليد الشعار، يرجى المحاولة مرة أخرى' : 'Failed to generate logo, please try again');
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleAdminGenerateAILogo = async () => {
    if (!editingSupplier) return;
    
    // Determine category to use for prompt
    let categoryName = 'General Business';
    if (editSuppCategories && editSuppCategories.length > 0) {
      const cat = categories.find(c => c.id === editSuppCategories[0]);
      if (cat) {
        categoryName = i18n.language === 'ar' ? cat.nameAr : cat.nameEn;
      }
    }

    const companyName = editSuppCompanyName || editSuppName || 'Company';

    setIsGeneratingLogo(true);
    setUploadError(null);

    try {
      const result = await generateSupplierLogo(companyName, categoryName, i18n.language);
      
      // Convert base64 to blob
      const response = await fetch(result.logoUrl);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `logos/${editingSupplier.uid}/ai_${Date.now()}.png`);
      const metadata = {
        contentType: 'image/png',
      };
      
      await uploadBytes(storageRef, blob, metadata);
      const url = await getDownloadURL(storageRef);
      
      setEditSuppLogoUrl(url);
      setGeneratedLogoPreview(url);
    } catch (error) {
      handleAiError(error, 'Admin AI Logo generation');
      setUploadError(i18n.language === 'ar' ? 'فشل توليد الشعار، يرجى المحاولة مرة أخرى' : 'Failed to generate logo, please try again');
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    // Basic validation
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(i18n.language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File too large (max 2MB)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      const storageRef = ref(storage, `logos/${profile.uid}/${Date.now()}`);
      const metadata = {
        contentType: compressedFile.type,
      };
      
      const uploadTask = uploadBytesResumable(storageRef, compressedFile, metadata);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          null,
          (error) => reject(error),
          () => resolve(true)
        );
      });

      const url = await getDownloadURL(storageRef);
      setEditLogoUrl(url);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `storage/logos/${profile.uid}`, false);
      
      // If it's a storage/unknown error, it's likely a CORS issue
      if (err.code === 'storage/unknown') {
        setUploadError(i18n.language === 'ar' ? 'جاري استخدام وضع التوافق للرفع...' : 'Switching to compatibility mode for upload...');
      } else {
        setUploadError(i18n.language === 'ar' ? 'فشل رفع الصورة. يرجى المحاولة مرة أخرى.' : 'Failed to upload image. Please try again.');
      }
      
      // Fallback to Base64 if Storage fails (common in some restricted environments)
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditLogoUrl(reader.result as string);
          setUploadError(i18n.language === 'ar' ? 'تم استخدام وضع التوافق للرفع.' : 'Using compatibility mode for upload.');
        };
        reader.readAsDataURL(file);
      } catch (fallbackErr) {
        handleAiError(fallbackErr, 'Logo upload fallback');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryPath = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '';
    const name = i18n.language === 'ar' ? cat.nameAr : cat.nameEn;
    if (cat.parentId) {
      const parent = categories.find(p => p.id === cat.parentId);
      if (parent) {
        const parentName = i18n.language === 'ar' ? parent.nameAr : parent.nameEn;
        return `${parentName} > ${name}`;
      }
    }
    return name;
  };

  const handleEditSupplier = (supp: UserProfile) => {
    setEditingSupplier(supp);
    setEditSuppName(supp.name);
    setEditSuppCompanyName(supp.companyName || '');
    setEditSuppEmail(supp.email);
    setEditSuppPhone(supp.phone || '');
    setEditSuppLocation(supp.location || '');
    setEditSuppWebsite(supp.website || '');
    setEditSuppLogoUrl(supp.logoUrl || '');
    setEditSuppCategories(supp.categories || []);
    setEditSuppKeywords(supp.keywords || []);
    setEditSuppBio(supp.bio || '');
  };

  const handleSuggestNewSuppCategories = async () => {
    if (!newSuppName && !newSuppCompanyName) return;
    setIsSuggestingNewSuppCategories(true);
    try {
      const suggested = await suggestSupplierCategories(
        { name: newSuppName, companyName: newSuppCompanyName, bio: newSuppBio, keywords: newSuppKeywords },
        categories,
        i18n.language
      );
      if (suggested.length > 0) {
        setNewSuppCategories(prev => [...new Set([...prev, ...suggested])]);
        setDashboardSuccess(i18n.language === 'ar' ? 'تم اقتراح الفئات بنجاح' : 'Categories suggested successfully');
        setTimeout(() => setDashboardSuccess(null), 3000);
      }
    } catch (error) {
      handleAiError(error, 'Supplier category suggestions');
    } finally {
      setIsSuggestingNewSuppCategories(false);
    }
  };

  const handleSuggestEditSuppCategories = async () => {
    if (!editSuppName && !editSuppCompanyName) return;
    setIsSuggestingEditSuppCategories(true);
    try {
      const suggested = await suggestSupplierCategories(
        { name: editSuppName, companyName: editSuppCompanyName, bio: editSuppBio, keywords: editSuppKeywords },
        categories,
        i18n.language
      );
      if (suggested.length > 0) {
        setEditSuppCategories(prev => [...new Set([...prev, ...suggested])]);
        setDashboardSuccess(i18n.language === 'ar' ? 'تم اقتراح الفئات بنجاح' : 'Categories suggested successfully');
        setTimeout(() => setDashboardSuccess(null), 3000);
      }
    } catch (error) {
      handleAiError(error, 'Supplier category suggestions');
    } finally {
      setIsSuggestingEditSuppCategories(false);
    }
  };

  const handleSuggestOwnCategories = async () => {
    if (!editName && !editCompanyName) return;
    setIsSuggestingOwnCategories(true);
    try {
      const suggested = await suggestSupplierCategories(
        { name: editName, companyName: editCompanyName, bio: editBio, keywords: editKeywords },
        categories,
        i18n.language
      );
      if (suggested.length > 0) {
        setEditCategories(prev => [...new Set([...prev, ...suggested])]);
        setDashboardSuccess(i18n.language === 'ar' ? 'تم اقتراح الفئات بنجاح' : 'Categories suggested successfully');
        setTimeout(() => setDashboardSuccess(null), 3000);
      }
    } catch (error) {
      handleAiError(error, 'Supplier category suggestions');
    } finally {
      setIsSuggestingOwnCategories(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setNewUserName(user.name);
    setNewUserCompanyName(user.companyName || '');
    setNewUserEmail(user.email);
    setNewUserRole(user.role);
    setIsAddingUser(true);
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppName || !newSuppEmail || !newSuppPassword) return;
    
    setIsCreatingSupplier(true);
    try {
      // Create actual Firebase Auth user using a secondary app instance
      const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAppSupplier');
      const secondaryAuth = getAuth(secondaryApp);
      
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newSuppEmail, newSuppPassword);
        const newUid = userCredential.user.uid;
        
        const newSuppRef = doc(db, 'users', newUid);
        await setDoc(newSuppRef, {
          uid: newUid,
          name: newSuppName,
          companyName: newSuppCompanyName,
          email: newSuppEmail,
          phone: newSuppPhone,
          location: newSuppLocation,
          website: newSuppWebsite,
          logoUrl: newSuppLogoUrl,
          categories: newSuppCategories,
          keywords: newSuppKeywords,
          bio: newSuppBio,
          role: 'supplier',
          createdAt: new Date().toISOString()
        });
        
        // Sign out and clean up the secondary app
        await secondaryAuth.signOut();
        await deleteApp(secondaryApp);

        // Reset form
        setNewSuppName('');
        setNewSuppCompanyName('');
        setNewSuppEmail('');
        setNewSuppPassword('');
        setNewSuppPhone('');
        setNewSuppLocation('');
        setNewSuppWebsite('');
        setNewSuppLogoUrl('');
        setNewSuppCategories([]);
        setIsAddingSupplier(false);
      } catch (authError: any) {
        await deleteApp(secondaryApp);
        
        if (authError.code === 'auth/email-already-in-use' || (authError.message && authError.message.includes('auth/email-already-in-use'))) {
          const usersQuery = query(collection(db, 'users'), where('email', '==', newSuppEmail.toLowerCase()));
          const usersSnap = await getDocs(usersQuery);
          if (!usersSnap.empty) {
            const existingDoc = usersSnap.docs[0];
            await updateDoc(doc(db, 'users', existingDoc.id), {
              name: newSuppName,
              companyName: newSuppCompanyName,
              phone: newSuppPhone,
              location: newSuppLocation,
              website: newSuppWebsite,
              logoUrl: newSuppLogoUrl,
              categories: newSuppCategories,
              keywords: newSuppKeywords,
              role: 'supplier',
            });
            setDashboardSuccess(i18n.language === 'ar' ? 'تم تحديث المورد الموجود بنجاح' : 'Existing supplier updated successfully');
          } else {
            await setDoc(doc(db, 'users', newSuppEmail.toLowerCase()), {
              uid: newSuppEmail.toLowerCase(),
              email: newSuppEmail.toLowerCase(),
              name: newSuppName,
              companyName: newSuppCompanyName,
              phone: newSuppPhone,
              location: newSuppLocation,
              website: newSuppWebsite,
              logoUrl: newSuppLogoUrl,
              categories: newSuppCategories,
              keywords: newSuppKeywords,
              role: 'supplier',
              createdAt: new Date().toISOString()
            });
            setDashboardSuccess(i18n.language === 'ar' ? 'تم إنشاء بيانات المورد بنجاح' : 'Supplier data created successfully');
          }
          
          setTimeout(() => setDashboardSuccess(null), 3000);
          setNewSuppName('');
          setNewSuppCompanyName('');
          setNewSuppEmail('');
          setNewSuppPassword('');
          setNewSuppPhone('');
          setNewSuppLocation('');
          setNewSuppWebsite('');
          setNewSuppLogoUrl('');
          setNewSuppCategories([]);
          setIsAddingSupplier(false);
          setIsCreatingSupplier(false);
          return;
        }
        
        throw authError;
      }
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'users', false);
      if (error.code === 'auth/email-already-in-use' || (error.message && error.message.includes('auth/email-already-in-use'))) {
        setDashboardError(i18n.language === 'ar' 
          ? 'هذا البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر.' 
          : 'This email is already in use. Please use a different email address.');
        setTimeout(() => setDashboardError(null), 5000);
      } else if (error.code === 'auth/operation-not-allowed' || (error.message && error.message.includes('auth/operation-not-allowed'))) {
        setDashboardError(i18n.language === 'ar'
          ? 'يجب تفعيل خاصية "البريد الإلكتروني وكلمة المرور" في لوحة تحكم Firebase (Authentication > Sign-in method).'
          : 'Email/Password authentication must be enabled in the Firebase Console (Authentication > Sign-in method).');
        setTimeout(() => setDashboardError(null), 5000);
      } else {
        setDashboardError((i18n.language === 'ar' ? 'خطأ في حفظ المورد: ' : 'Error saving supplier: ') + error.message);
        setTimeout(() => setDashboardError(null), 5000);
      }
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const deleteUserData = async (uid: string) => {
    const deletePromises: Promise<void>[] = [];
    
    try {
      // Delete requests and their offers
      const requestsQuery = query(collection(db, 'requests'), where('customerId', '==', uid));
      const requestsSnap = await getDocs(requestsQuery);
      for (const docSnap of requestsSnap.docs) {
        const reqData = docSnap.data();
        if (reqData.imageUrl && reqData.imageUrl.includes('firebasestorage.googleapis.com')) {
          try {
            const url = new URL(reqData.imageUrl);
            const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
            const imgRef = ref(storage, path);
            deletePromises.push(deleteObject(imgRef).catch(e => handleFirestoreError(e, OperationType.DELETE, `storage/${path}`, false)));
          } catch (e) {
            handleAiError(e, 'Parsing request image URL');
          }
        }

        const offersQuery = query(collection(db, 'offers'), where('requestId', '==', docSnap.id));
        const offersSnap = await getDocs(offersQuery);
        offersSnap.forEach(offerSnap => {
          deletePromises.push(updateDoc(doc(db, 'offers', offerSnap.id), { status: 'deleted', deletedAt: new Date().toISOString() }));
        });
        deletePromises.push(updateDoc(doc(db, 'requests', docSnap.id), { status: 'deleted', deletedAt: new Date().toISOString() }));
      }

      // Delete chats as customer
      const chatsQueryCustomer = query(collection(db, 'chats'), where('customerId', '==', uid));
      const chatsSnapCustomer = await getDocs(chatsQueryCustomer);
      for (const docSnap of chatsSnapCustomer.docs) {
        const messagesSnap = await getDocs(collection(db, `chats/${docSnap.id}/messages`));
        messagesSnap.forEach(msgSnap => {
          const msgData = msgSnap.data();
          if (msgData.imageUrl && msgData.imageUrl.includes('firebasestorage.googleapis.com')) {
            try {
              const url = new URL(msgData.imageUrl);
              const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
              deletePromises.push(deleteObject(ref(storage, path)).catch(e => handleFirestoreError(e, OperationType.DELETE, `storage/${path}`, false)));
            } catch (e) {}
          }
          if (msgData.audioUrl && msgData.audioUrl.includes('firebasestorage.googleapis.com')) {
            try {
              const url = new URL(msgData.audioUrl);
              const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
              deletePromises.push(deleteObject(ref(storage, path)).catch(e => handleFirestoreError(e, OperationType.DELETE, `storage/${path}`, false)));
            } catch (e) {}
          }
          deletePromises.push(updateDoc(doc(db, `chats/${docSnap.id}/messages`, msgSnap.id), { status: 'deleted', deletedAt: new Date().toISOString() }));
        });
        deletePromises.push(updateDoc(doc(db, 'chats', docSnap.id), { status: 'deleted', deletedAt: new Date().toISOString() }));
      }

      // Delete chats as supplier
      const chatsQuerySupplier = query(collection(db, 'chats'), where('supplierId', '==', uid));
      const chatsSnapSupplier = await getDocs(chatsQuerySupplier);
      for (const docSnap of chatsSnapSupplier.docs) {
        const messagesSnap = await getDocs(collection(db, `chats/${docSnap.id}/messages`));
        messagesSnap.forEach(msgSnap => {
          const msgData = msgSnap.data();
          if (msgData.imageUrl && msgData.imageUrl.includes('firebasestorage.googleapis.com')) {
            try {
              const url = new URL(msgData.imageUrl);
              const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
              deletePromises.push(deleteObject(ref(storage, path)).catch(e => handleFirestoreError(e, OperationType.DELETE, `storage/${path}`, false)));
            } catch (e) {}
          }
          if (msgData.audioUrl && msgData.audioUrl.includes('firebasestorage.googleapis.com')) {
            try {
              const url = new URL(msgData.audioUrl);
              const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
              deletePromises.push(deleteObject(ref(storage, path)).catch(e => handleFirestoreError(e, OperationType.DELETE, `storage/${path}`, false)));
            } catch (e) {}
          }
          deletePromises.push(updateDoc(doc(db, `chats/${docSnap.id}/messages`, msgSnap.id), { status: 'deleted', deletedAt: new Date().toISOString() }));
        });
        deletePromises.push(updateDoc(doc(db, 'chats', docSnap.id), { status: 'deleted', deletedAt: new Date().toISOString() }));
      }

      // Delete offers as customer
      const offersQueryCustomer = query(collection(db, 'offers'), where('customerId', '==', uid));
      const offersSnapCustomer = await getDocs(offersQueryCustomer);
      offersSnapCustomer.forEach(docSnap => {
        deletePromises.push(updateDoc(doc(db, 'offers', docSnap.id), { status: 'deleted', deletedAt: new Date().toISOString() }));
      });

      // Delete offers as supplier
      const offersQuerySupplier = query(collection(db, 'offers'), where('supplierId', '==', uid));
      const offersSnapSupplier = await getDocs(offersQuerySupplier);
      offersSnapSupplier.forEach(docSnap => {
        deletePromises.push(updateDoc(doc(db, 'offers', docSnap.id), { status: 'deleted', deletedAt: new Date().toISOString() }));
      });

      // Delete user document and logo if exists
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.logoUrl && userData.logoUrl.includes('firebasestorage.googleapis.com')) {
          try {
            // Extract the path from the URL
            const url = new URL(userData.logoUrl);
            const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
            const logoRef = ref(storage, path);
            deletePromises.push(deleteObject(logoRef).catch(e => handleFirestoreError(e, OperationType.DELETE, `storage/${path}`, false)));
          } catch (e) {
            handleAiError(e, 'Parsing logo URL');
          }
        }
      }
      deletePromises.push(updateDoc(doc(db, 'users', uid), { status: 'deleted', deletedAt: new Date().toISOString() }));

      const results = await Promise.allSettled(deletePromises);
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        handleFirestoreError((failures[0] as PromiseRejectedResult).reason, OperationType.DELETE, 'bulk_deletion', false);
        // Throw the first error to be caught by the outer block
        throw (failures[0] as PromiseRejectedResult).reason;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'user_data', false);
      throw error;
    }
  };

  const handleDeleteUser = async (uid: string) => {
    // Optimistic UI update
    const previousAllUsers = allUsers;
    setAllUsers(prev => prev.filter(user => user.uid !== uid));
    
    try {
      await deleteUserData(uid);
      setSelectedAdminUser(null);
      setDeleteConfirmation(null);
    } catch (error) {
      // Revert optimistic update
      setAllUsers(previousAllUsers);
      handleFirestoreError(error, OperationType.DELETE, 'users', false);
    }
  };

  const handleDeleteSupplier = async (uid: string) => {
    // Optimistic UI update
    const previousSuppliers = suppliers;
    const previousAllUsers = allUsers;
    setSuppliers(prev => prev.filter(supp => supp.uid !== uid));
    setAllUsers(prev => prev.filter(user => user.uid !== uid));
    
    try {
      await deleteUserData(uid);
      setSelectedAdminSupplier(null);
      setDeleteConfirmation(null);
    } catch (error) {
      // Revert optimistic update
      setSuppliers(previousSuppliers);
      setAllUsers(previousAllUsers);
      handleFirestoreError(error, OperationType.DELETE, 'users', false);
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    const updatedData = {
      name: editSuppName,
      companyName: editSuppCompanyName,
      email: editSuppEmail,
      phone: editSuppPhone,
      location: editSuppLocation,
      website: editSuppWebsite,
      logoUrl: editSuppLogoUrl,
      categories: editSuppCategories,
      keywords: editSuppKeywords,
      bio: editSuppBio
    };

    // Optimistic UI update
    const previousSuppliers = suppliers;
    const previousAllUsers = allUsers;
    setSuppliers(prev => prev.map(supp => supp.uid === editingSupplier.uid ? { ...supp, ...updatedData } : supp));
    setAllUsers(prev => prev.map(user => user.uid === editingSupplier.uid ? { ...user, ...updatedData } : user));
    
    // Optimistic close
    setEditingSupplier(null);

    try {
      await updateDoc(doc(db, 'users', editingSupplier.uid), updatedData);
    } catch (error) {
      // Revert optimistic update
      setSuppliers(previousSuppliers);
      setAllUsers(previousAllUsers);
      setEditingSupplier(editingSupplier); // Re-open modal
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingSupplier.uid}`, false);
    }
  };

  const handleJoinCategoryChat = async (categoryId: string) => {
    // Check if category chat already exists
    const q = query(
      collection(db, 'chats'),
      where('isCategoryChat', '==', true)
    );
    try {
      const snap = await getDocs(q);
      const existingChat = snap.docs.find(doc => doc.data().requestId === `category_${categoryId}`);
      
      if (existingChat) {
        onOpenChat(existingChat.id);
      } else {
        const cat = categories.find(c => c.id === categoryId);
        const catName = cat ? (i18n.language === 'ar' ? cat.nameAr : cat.nameEn) : 'Category';
        
        const newChat = await addDoc(collection(db, 'chats'), {
          requestId: `category_${categoryId}`,
          customerId: 'system', // Category chats are shared
          supplierId: 'everyone',
          lastMessage: `Welcome to the ${catName} chat room!`,
          updatedAt: new Date().toISOString(),
          isCategoryChat: true,
          categoryId: categoryId
        });
        onOpenChat(newChat.id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chats', false);
    }
  };

  const renderAdmin = () => {

  const handleUpdateCategory = (updated: Category) => {
    setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const mainCategories = categories.filter(c => !c.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
    const filteredSuppliers = suppliers.filter(s => {
      if (semanticSupplierResults) {
        return semanticSupplierResults.includes(s.uid);
      }

      const matchesSearch = (s.name?.toLowerCase() || '').includes(supplierSearch.toLowerCase()) ||
        (s.email?.toLowerCase() || '').includes(supplierSearch.toLowerCase()) ||
        (s.companyName?.toLowerCase() || '').includes(supplierSearch.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (supplierCategoryFilter.length === 0) return true;
      
      // Check if supplier has any of the selected categories or their subcategories
      const allTargetCategoryIds = new Set<string>();
      supplierCategoryFilter.forEach(catId => {
        allTargetCategoryIds.add(catId);
        categories.filter(c => c.parentId === catId).forEach(sub => allTargetCategoryIds.add(sub.id));
      });
      
      return s.categories?.some(catId => allTargetCategoryIds.has(catId));
    });
    
    const totalSuppliers = allUsers.filter(u => u.role === 'supplier').length;
    const totalCustomers = allUsers.filter(u => u.role === 'customer').length;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = allUsers.filter(u => {
      if (!u.lastActive) return false;
      return new Date(u.lastActive) >= fiveMinutesAgo;
    });
    
    const onlineSuppliers = onlineUsers.filter(u => u.role === 'supplier').length;
    const onlineCustomers = onlineUsers.filter(u => u.role === 'customer').length;

    const today = new Date().toISOString().split('T')[0];
    const dailyChats = allChats.filter(chat => chat.updatedAt.startsWith(today)).length;
    const dailyContacts = new Set(
      contactEvents
        .filter(event => event.createdAt.startsWith(today))
        .map(event => event.userId)
    ).size;

    const locationStats = allUsers.reduce((acc: Record<string, number>, user) => {
      const loc = user.location?.trim() || (i18n.language === 'ar' ? 'غير محدد' : 'Unknown');
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});

    const sortedLocations = Object.entries(locationStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    const totalUsersWithLocation = allUsers.length || 1;

    const unresolvedAlerts = moderationAlerts.filter(a => !a.resolved).length;

    return (
      <>
        <AnimatePresence>
          {showHelpCenter && (
            <HelpCenter 
              onClose={() => setShowHelpCenter(false)} 
              isRtl={isRtl} 
            />
          )}
          {dashboardError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-brand-error text-sm font-bold bg-brand-error/10 p-3 rounded-xl border border-brand-error/20 text-center mx-auto max-w-md sticky top-4 z-10 shadow-sm"
            >
              {dashboardError}
            </motion.div>
          )}
          {dashboardSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-brand-success text-sm font-bold bg-brand-success/10 p-3 rounded-xl border border-brand-success/20 text-center mx-auto max-w-md sticky top-4 z-10 shadow-sm"
            >
              {dashboardSuccess}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Admin Navigation Sidebar */}
        <div className={`flex flex-col md:flex-row min-h-screen bg-brand-background ${isRtl ? 'font-arabic' : ''}`}>
          <aside className={`w-full md:w-72 bg-brand-surface border-brand-border border-b md:border-b-0 ${isRtl ? 'md:border-l' : 'md:border-r'} flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10`}>
            <div className="p-8 border-b border-brand-border/50 bg-brand-surface/50 backdrop-blur-sm">
              <h2 className="text-2xl font-black text-brand-text-main tracking-tight flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-primary-hover rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/25">
                  <Shield size={24} />
                </div>
                <div className="flex flex-col">
                  <span>{isRtl ? 'لوحة التحكم' : 'Admin Panel'}</span>
                  <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mt-0.5">
                    {isRtl ? 'الإدارة المركزية' : 'Central Management'}
                  </span>
                </div>
              </h2>
            </div>

            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
              {[
                { id: 'overview', label: isRtl ? 'نظرة عامة' : 'Overview', icon: LayoutGrid },
                { id: 'suppliers', label: isRtl ? 'الموردين' : 'Suppliers', icon: Building2 },
                { id: 'users', label: isRtl ? 'المستخدمين' : 'Users', icon: Users },
                { id: 'user-data', label: isRtl ? 'بيانات المستخدمين' : 'User Data', icon: Database },
                { id: 'marketing', label: isRtl ? 'التسويق' : 'Marketing', icon: Megaphone },
                { id: 'categories', label: isRtl ? 'الفئات' : 'Categories', icon: Tags },
                ...(features.marketTrends ? [{ id: 'market-trends', label: isRtl ? 'اتجاهات السوق' : 'Market Trends', icon: TrendingUp }] : []),
                ...(features.priceIntelligence ? [{ id: 'price-intelligence', label: isRtl ? 'ذكاء الأسعار' : 'Price Intelligence', icon: LineChart }] : []),
                { id: 'moderation', label: isRtl ? 'تنبيهات الإشراف' : 'Moderation Alerts', icon: ShieldAlert, badge: unresolvedAlerts },
                { id: 'chats', label: isRtl ? 'أرشيف المحادثات' : 'Chat Archive', icon: MessageSquare },
                { id: 'ai', label: isRtl ? 'مركز الذكاء الاصطناعي' : 'AI Neural Hub', icon: Cpu },
                { id: 'cost', label: isRtl ? 'تحليل التكاليف' : 'Cost Analysis', icon: TrendingUp },
                { id: 'settings', label: isRtl ? 'إعدادات الموقع' : 'Site Settings', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = adminTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setAdminTab(item.id as any)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20 scale-[1.02]' 
                        : 'text-brand-text-muted hover:bg-brand-background hover:text-brand-text-main hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-brand-text-muted group-hover:text-brand-primary'}`} />
                      <span className="font-bold text-sm">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black shadow-sm ${isActive ? 'bg-white text-brand-primary' : 'bg-brand-error text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-6 border-t border-brand-border/50 bg-brand-surface/50 backdrop-blur-sm">
              <div className="bg-brand-background rounded-2xl p-4 border border-brand-border shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                    <UserIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-text-main truncate">{profile?.name || 'Admin'}</p>
                    <p className="text-[10px] font-medium text-brand-text-muted truncate">{profile?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => auth.signOut().catch(err => handleFirestoreError(err, OperationType.GET, 'auth', false))}
                  className="w-full py-2.5 bg-brand-surface text-brand-error text-xs font-bold rounded-xl border border-brand-border hover:bg-brand-error hover:text-white transition-all duration-200 flex items-center justify-center gap-2 group shadow-sm"
                >
                  <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                  {isRtl ? 'تسجيل الخروج' : 'Sign Out'}
                </button>
              </div>
            </div>
          </aside>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
            {/* Section Header */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">
                  <span>{isRtl ? 'لوحة التحكم' : 'Dashboard'}</span>
                  <ChevronRight size={10} className={isRtl ? 'rotate-180' : ''} />
                  <span>{adminTab}</span>
                </div>
                <h1 className="text-3xl font-black text-brand-text-main tracking-tight">
                  {adminTab === 'overview' && (isRtl ? 'نظرة عامة' : 'Overview')}
                  {adminTab === 'suppliers' && (isRtl ? 'إدارة الموردين' : 'Manage Suppliers')}
                  {adminTab === 'users' && (isRtl ? 'إدارة المستخدمين' : 'Manage Users')}
                  {adminTab === 'categories' && (isRtl ? 'إدارة الفئات' : 'Manage Categories')}
                  {adminTab === 'chats' && (isRtl ? 'أرشيف المحادثات' : 'Chat Archive')}
                  {adminTab === 'moderation' && (isRtl ? 'تنبيهات الإشراف' : 'Moderation Alerts')}
                  {adminTab === 'market-trends' && (isRtl ? 'اتجاهات السوق' : 'Market Trends')}
                  {adminTab === 'price-intelligence' && (isRtl ? 'ذكاء الأسعار' : 'Price Intelligence')}
                  {adminTab === 'user-data' && (isRtl ? 'بيانات المستخدمين' : 'User Data')}
                  {adminTab === 'marketing' && (isRtl ? 'التسويق والانتشار' : 'Marketing & Growth')}
                  {adminTab === 'ai' && (isRtl ? 'مركز الذكاء الاصطناعي' : 'AI Neural Hub')}
                  {adminTab === 'cost' && (isRtl ? 'تحليل التكاليف' : 'Cost Analysis')}
                  {adminTab === 'settings' && (isRtl ? 'إعدادات الموقع' : 'Site Settings')}
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-brand-surface px-4 py-2 rounded-2xl border border-brand-border flex items-center gap-3 shadow-sm">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-brand-text-muted uppercase">{isRtl ? 'تاريخ اليوم' : 'Today'}</span>
                    <span className="text-xs font-black text-brand-text-main">{new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className="w-px h-8 bg-brand-border" />
                  <Calendar size={20} className="text-brand-primary" />
                </div>
              </div>
            </header>

        {/* Overview Section */}
        {adminTab === 'overview' && (
          <div className="mb-6">
            <button onClick={resetSections} className="px-4 py-2 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-primary-hover transition-all shadow-md shadow-brand-primary/20">
              {isRtl ? 'إعادة التنسيق الافتراضي' : 'Reset to Default'}
            </button>
          </div>
        )}
        {adminTab === 'overview' && (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={overviewSections} strategy={verticalListSortingStrategy}>
              <div className="space-y-8">
                {overviewSections.map(sectionId => (
                  <SortableSection key={sectionId} id={sectionId}>
                    {sectionId === 'stats' && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                          { label: isRtl ? 'إجمالي الموردين' : 'Total Suppliers', value: totalSuppliers, online: onlineSuppliers, icon: Building2, color: 'text-brand-primary', bg: 'bg-brand-primary/10', border: 'border-brand-primary/20' },
                          { label: isRtl ? 'إجمالي العملاء' : 'Total Customers', value: totalCustomers, online: onlineCustomers, icon: Users, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10', border: 'border-brand-secondary/20' },
                          { label: isRtl ? 'المتواجدون الآن' : 'Active Now', value: onlineUsers.length, subtitle: isRtl ? 'نشط خلال آخر 5 دقائق' : 'Active in last 5 mins', icon: Sparkles, color: 'text-brand-success', bg: 'bg-brand-success/10', border: 'border-brand-success/20' },
                          { label: isRtl ? 'محادثات اليوم' : 'Daily Conversations', value: dailyChats, icon: MessageSquare, color: 'text-brand-warning', bg: 'bg-brand-warning/10', border: 'border-brand-warning/20' },
                          { label: isRtl ? 'مستخدمو زر الاتصال اليوم' : 'Daily Contact Users', value: dailyContacts, icon: Phone, color: 'text-brand-info', bg: 'bg-brand-info/10', border: 'border-brand-info/20' }
                        ].map((stat, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-brand-surface p-6 rounded-[2rem] border border-brand-border shadow-sm flex flex-col gap-4 group hover:shadow-xl hover:shadow-brand-primary/5 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className={`p-3 ${stat.bg} rounded-2xl ${stat.color} border ${stat.border} shadow-sm group-hover:scale-110 transition-transform`}>
                                <stat.icon size={24} />
                              </div>
                              {stat.online !== undefined && (
                                <span className="text-[10px] font-black text-brand-success flex items-center gap-1.5 bg-brand-success/10 px-2 py-1 rounded-lg border border-brand-success/20">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                                  {stat.online}
                                </span>
                              )}
                            </div>
                            <div>
                              <h4 className="text-3xl font-black text-brand-text-main tracking-tight">{stat.value}</h4>
                              <p className="text-brand-text-muted text-[10px] font-black uppercase tracking-widest mt-1">{stat.label}</p>
                              {stat.subtitle && (
                                <p className="text-[9px] text-brand-text-muted/80 font-bold mt-1">{stat.subtitle}</p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    {sectionId === 'broadcast' && <BroadcastBox t={t} i18n={i18n} allUsers={allUsers} size="compact" />}
                    {sectionId === 'actions_activity' && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Quick Actions & Recent Activity */}
                        <div className="lg:col-span-2 space-y-8">
                          {/* Quick Actions */}
                          <section>
                            <h3 className="text-lg font-black text-brand-text-main mb-6 flex items-center gap-2 tracking-tight">
                              <Zap size={20} className="text-brand-warning" />
                              {isRtl ? 'إجراءات سريعة' : 'Quick Actions'}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                              {[
                                { label: isRtl ? 'إضافة مورد' : 'Add Supplier', icon: PlusCircle, action: () => setAdminTab('suppliers'), color: 'text-brand-primary', bg: 'bg-brand-primary/10', border: 'border-brand-primary/20' },
                                { label: isRtl ? 'إدارة الفئات' : 'Categories', icon: Tags, action: () => setAdminTab('categories'), color: 'text-brand-secondary', bg: 'bg-brand-secondary/10', border: 'border-brand-secondary/20' },
                                { label: isRtl ? 'إدارة المستخدمين' : 'Users', icon: Users, action: () => setAdminTab('users'), color: 'text-brand-info', bg: 'bg-brand-info/10', border: 'border-brand-info/20' },
                                { label: isRtl ? 'تنبيهات الإشراف' : 'Moderation', icon: ShieldAlert, action: () => setAdminTab('moderation'), color: 'text-brand-error', bg: 'bg-brand-error/10', border: 'border-brand-error/20', badge: unresolvedAlerts },
                                { label: isRtl ? 'العلامة التجارية' : 'Branding', icon: Palette, action: () => setAdminTab('branding'), color: 'text-brand-primary', bg: 'bg-brand-primary/10', border: 'border-brand-primary/20' },
                                { label: isRtl ? 'تحليل السوق' : 'AI Analysis', icon: Sparkles, action: handleAnalyzeMarket, color: 'text-brand-success', bg: 'bg-brand-success/10', border: 'border-brand-success/20' },
                                { label: isRtl ? 'إعدادات الموقع' : 'Settings', icon: Settings, action: () => setAdminTab('settings'), color: 'text-brand-text-muted', bg: 'bg-brand-background', border: 'border-brand-border' }
                              ].map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={action.action}
                                  className="bg-brand-surface p-5 rounded-[2rem] border border-brand-border shadow-sm hover:shadow-xl hover:shadow-brand-primary/5 hover:border-brand-primary/30 transition-all flex flex-col items-center justify-center text-center gap-4 group relative"
                                >
                                  <div className={`p-3 ${action.bg} rounded-2xl ${action.color} border ${action.border} shadow-sm group-hover:scale-110 transition-transform`}>
                                    <action.icon size={24} />
                                  </div>
                                  <span className="text-[11px] font-black text-brand-text-main uppercase tracking-widest">{action.label}</span>
                                  {action.badge !== undefined && action.badge > 0 && (
                                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-brand-error text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                      {action.badge}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </section>

                          {/* Market Insights */}
                          <section className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-success/10 text-brand-success rounded-2xl border border-brand-success/20 shadow-sm">
                                  <Globe size={24} />
                                </div>
                                <div>
                                  <h3 className="text-xl font-black text-brand-text-main tracking-tight">
                                    {isRtl ? 'تحليل السوق والتوجهات' : 'Market Insights & Trends'}
                                  </h3>
                                  <p className="text-sm text-brand-text-muted mt-1">
                                    {isRtl ? 'اقتراحات مدعومة بالذكاء الاصطناعي بناءً على نشاط المنصة' : 'AI-powered suggestions based on platform activity'}
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={handleAnalyzeMarket}
                                disabled={isAnalyzingMarket}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-success text-white rounded-xl font-bold hover:bg-brand-success/90 transition-all disabled:opacity-50 shadow-lg shadow-brand-success/20 w-full sm:w-auto"
                              >
                                {isAnalyzingMarket ? (
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Sparkles size={18} />
                                )}
                                {isRtl ? 'تحديث التحليل' : 'Refresh Analysis'}
                              </button>
                            </div>

                            {marketInsights || marketTrends.length > 0 ? (
                              <div className="bg-brand-background/50 rounded-3xl p-8 border border-brand-border/50 relative">
                                <div className="absolute -left-1 top-8 bottom-8 w-1 bg-brand-success/20 rounded-r-full"></div>
                                <div className="prose prose-brand max-w-none">
                                  <p className="text-brand-text-main whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                                    {marketInsights || marketTrends[0]?.analysis}
                                  </p>
                                </div>
                                {((marketInsights && marketSuggestions.length > 0) || (!marketInsights && marketTrends[0]?.suggestions && marketTrends[0].suggestions.length > 0)) && (
                                  <div className="mt-6 pt-6 border-t border-brand-border/30">
                                    <h4 className="text-xs font-black text-brand-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                      <Sparkles size={14} className="text-brand-primary" />
                                      {isRtl ? 'الفئات المقترحة' : 'Suggested Categories'}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {(marketInsights ? marketSuggestions : marketTrends[0].suggestions).map((s, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-brand-primary/5 text-brand-primary rounded-xl text-xs font-bold border border-brand-primary/10">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-16 bg-brand-background/50 rounded-3xl border border-dashed border-brand-border">
                                <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center text-brand-text-muted mx-auto mb-4 shadow-sm">
                                  <Globe size={32} className="opacity-50" />
                                </div>
                                <p className="text-brand-text-muted italic text-sm max-w-sm mx-auto">
                                  {isRtl ? 'انقر على "تحديث التحليل" للحصول على رؤى حول توجهات السوق.' : 'Click "Refresh Analysis" to get insights into market trends.'}
                                </p>
                              </div>
                            )}
                          </section>
                        </div>
                        {/* Sidebar: Recent Activity & Location Stats */}
                        <div className="space-y-8">
                          {/* Recent Activity */}
                          <section className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm h-full">
                            <h3 className="text-lg font-black text-brand-text-main mb-8 flex items-center gap-2 tracking-tight">
                              <Clock size={20} className="text-brand-primary" />
                              {isRtl ? 'النشاط الأخير' : 'Recent Activity'}
                            </h3>
                            <div className="space-y-6 relative">
                              <div className="absolute top-4 bottom-4 left-[1.1rem] w-px bg-brand-border/50"></div>
                              {recentActivity.length === 0 ? (
                                <div className="text-center py-12">
                                  <Clock size={32} className="text-brand-text-muted/50 mx-auto mb-4" />
                                  <p className="text-brand-text-muted text-sm italic">
                                    {isRtl ? 'لا يوجد نشاط حديث' : 'No recent activity'}
                                  </p>
                                </div>
                              ) : (
                                recentActivity.map((activity, idx) => (
                                  <div key={idx} className="flex items-start gap-4 relative z-10">
                                    <div className="p-2 bg-brand-background rounded-full text-brand-text-muted border border-brand-border shadow-sm">
                                      <Clock size={16} />
                                    </div>
                                    <div className="pt-1">
                                      <p className="text-sm font-bold text-brand-text-main leading-tight">{activity.description}</p>
                                      <p className="text-[10px] text-brand-text-muted uppercase tracking-widest mt-1 font-bold">{activity.timestamp}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </section>
                        </div>
                      </div>
                    )}
                  </SortableSection>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}


        {/* Site Settings Section */}
        {features.priceIntelligence && adminTab === 'price-intelligence' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center shadow-inner">
                  <Tag size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-brand-text-main tracking-tight">{i18n.language === 'ar' ? 'ذكاء تسعير السوق' : 'Market Price Intelligence'}</h2>
                  <p className="text-sm text-brand-text-muted mt-1">{i18n.language === 'ar' ? 'تحليل الأسعار الموصى بها بناءً على بيانات السوق' : 'Recommended price analysis based on market data'}</p>
                </div>
              </div>
              <button
                onClick={handleGeneratePriceInsights}
                disabled={isGeneratingPricing}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
              >
                {isGeneratingPricing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles size={18} />
                )}
                <span>{i18n.language === 'ar' ? 'تحديث ذكاء الأسعار' : 'Update Price Intelligence'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pricingInsights.length === 0 ? (
                <div className="col-span-full bg-brand-surface rounded-[2rem] p-16 text-center border border-brand-border shadow-sm">
                  <div className="w-24 h-24 bg-brand-background rounded-full flex items-center justify-center text-brand-text-muted mx-auto mb-6 border border-brand-border shadow-inner">
                    <Tag size={48} className="opacity-50" />
                  </div>
                  <h3 className="text-2xl font-black text-brand-text-main mb-3">{i18n.language === 'ar' ? 'لا توجد بيانات تسعير' : 'No pricing data yet'}</h3>
                  <p className="text-brand-text-muted max-w-md mx-auto text-sm leading-relaxed">
                    {i18n.language === 'ar' ? 'اضغط على الزر أعلاه لتوليد رؤى تسعير جديدة باستخدام الذكاء الاصطناعي.' : 'Click the button above to generate new pricing insights using AI.'}
                  </p>
                </div>
              ) : (
                pricingInsights.map((insight: any) => (
                  <div key={insight.id} className="bg-brand-surface rounded-[2rem] p-8 border border-brand-border shadow-sm hover:shadow-xl hover:shadow-brand-primary/5 transition-all group">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-sm group-hover:scale-110 transition-transform">
                          <Tag size={28} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-brand-text-main tracking-tight">{insight.productName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                              {new Date(insight.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 text-center relative overflow-hidden group-hover:bg-brand-primary/10 transition-colors">
                        <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary/20"></div>
                        <p className="text-[10px] text-brand-text-muted uppercase font-black tracking-widest mb-2">{i18n.language === 'ar' ? 'الموصى به' : 'Recommended'}</p>
                        <p className="text-2xl font-black text-brand-primary">{insight.recommendedPrice}</p>
                      </div>
                      <div className="p-5 bg-brand-success/5 rounded-2xl border border-brand-success/10 text-center relative overflow-hidden group-hover:bg-brand-success/10 transition-colors">
                        <div className="absolute top-0 left-0 w-full h-1 bg-brand-success/20"></div>
                        <p className="text-[10px] text-brand-text-muted uppercase font-black tracking-widest mb-2">{i18n.language === 'ar' ? 'الأدنى' : 'Min'}</p>
                        <p className="text-2xl font-black text-brand-success">{insight.minPrice}</p>
                      </div>
                      <div className="p-5 bg-brand-warning/5 rounded-2xl border border-brand-warning/10 text-center relative overflow-hidden group-hover:bg-brand-warning/10 transition-colors">
                        <div className="absolute top-0 left-0 w-full h-1 bg-brand-warning/20"></div>
                        <p className="text-[10px] text-brand-text-muted uppercase font-black tracking-widest mb-2">{i18n.language === 'ar' ? 'الأعلى' : 'Max'}</p>
                        <p className="text-2xl font-black text-brand-warning">{insight.maxPrice}</p>
                      </div>
                    </div>

                    <div className="p-5 bg-brand-background/50 rounded-2xl border border-brand-border/50 text-sm text-brand-text-main leading-relaxed relative">
                      <div className="absolute -left-1 top-5 bottom-5 w-1 bg-brand-primary/20 rounded-r-full"></div>
                      <p className="italic">{insight.analysis}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {features.marketTrends && adminTab === 'market-trends' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center shadow-inner">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-brand-text-main tracking-tight">{i18n.language === 'ar' ? 'تحليل اتجاهات السوق بالذكاء الاصطناعي' : 'AI Market Trends Analysis'}</h2>
                    <p className="text-sm text-brand-text-muted mt-1">{i18n.language === 'ar' ? 'اكتشف الفرص الجديدة بناءً على بيانات المنصة الحقيقية' : 'Discover new opportunities based on real platform data'}</p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateTrends}
                  disabled={isGeneratingTrends}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                >
                  {isGeneratingTrends ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Sparkles size={18} />
                  )}
                  <span>{i18n.language === 'ar' ? 'توليد تحليل جديد' : 'Generate New Analysis'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {marketTrends.length === 0 ? (
                  <div className="bg-brand-surface rounded-[2rem] p-16 text-center border border-brand-border shadow-sm">
                    <div className="w-24 h-24 bg-brand-background rounded-full flex items-center justify-center text-brand-text-muted mx-auto mb-6 border border-brand-border shadow-inner">
                      <Bot size={48} className="opacity-50" />
                    </div>
                    <h3 className="text-2xl font-black text-brand-text-main mb-3">{i18n.language === 'ar' ? 'لا توجد تحليلات بعد' : 'No analyses yet'}</h3>
                    <p className="text-brand-text-muted max-w-md mx-auto text-sm leading-relaxed">
                      {i18n.language === 'ar' ? 'اضغط على الزر أعلاه لتوليد أول تحليل لاتجاهات السوق باستخدام الذكاء الاصطناعي.' : 'Click the button above to generate your first market trends analysis using AI.'}
                    </p>
                  </div>
                ) : (
                  marketTrends.map((trend) => (
                    <div key={trend.id} className="bg-brand-surface rounded-[2rem] p-8 border border-brand-border shadow-sm hover:shadow-xl hover:shadow-brand-primary/5 transition-all group">
                      <div className="flex items-center justify-between mb-8 pb-6 border-b border-brand-border/50">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-sm group-hover:scale-110 transition-transform">
                            <Bot size={28} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-brand-text-main tracking-tight">{i18n.language === 'ar' ? trend.titleAr : trend.titleEn}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                                {new Date(trend.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="prose prose-brand max-w-none mb-8">
                        <div className="p-6 bg-brand-background/50 rounded-2xl border border-brand-border/50 text-brand-text-main whitespace-pre-wrap leading-relaxed text-sm md:text-base relative">
                          <div className="absolute -left-1 top-6 bottom-6 w-1 bg-brand-primary/20 rounded-r-full"></div>
                          {trend.analysis}
                        </div>
                      </div>

                      {trend.suggestions && trend.suggestions.length > 0 && (
                        <div className="bg-brand-background/30 p-6 rounded-2xl border border-brand-border/30">
                          <h4 className="font-black text-brand-text-main mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <PlusCircle size={18} className="text-brand-primary" />
                            {i18n.language === 'ar' ? 'الفئات المقترحة' : 'Suggested Categories'}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {trend.suggestions.map((s, idx) => (
                              <span key={idx} className="px-4 py-2 bg-brand-primary/5 text-brand-primary rounded-xl text-sm font-bold border border-brand-primary/20 shadow-sm hover:bg-brand-primary/10 transition-colors cursor-default">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
            <BroadcastBox t={t} i18n={i18n} allUsers={allUsers} size="compact" />
          </>
        )}

        {adminTab === 'branding' && (
          <BrandingSettings onBack={() => setAdminTab('overview')} />
        )}

        {adminTab === 'settings' && (
        <section className="bg-brand-surface rounded-[2rem] border border-brand-border shadow-sm overflow-hidden">
          <div className="bg-brand-text-main px-8 py-6 flex justify-between items-center border-b border-brand-border/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-primary/20 rounded-2xl text-brand-primary border border-brand-primary/30 shadow-inner">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">{i18n.language === 'ar' ? 'إعدادات الموقع' : 'Site Settings'}</h3>
                <p className="text-brand-text-muted/80 text-xs mt-1">{i18n.language === 'ar' ? 'تغيير شعار واسم الموقع' : 'Change site logo and name'}</p>
              </div>
            </div>
            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-success/20 text-brand-success rounded-xl text-sm font-bold border border-brand-success/30 shadow-sm"
              >
                <Check size={18} />
                {i18n.language === 'ar' ? 'تم الحفظ' : 'Saved'}
              </motion.div>
            )}
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Logo Upload */}
            <div className="space-y-6">
              <label className="text-sm font-black text-brand-text-main uppercase tracking-widest block">
                {i18n.language === 'ar' ? 'شعار الموقع' : 'Site Logo'}
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-32 h-32 bg-brand-background rounded-[2rem] border-2 border-dashed border-brand-border flex items-center justify-center overflow-hidden relative group shadow-inner">
                  {siteLogo ? (
                    <BlurImage src={siteLogo} alt="Site Logo" className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" />
                  ) : (
                    <Building2 size={40} className="text-brand-text-muted/50" />
                  )}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-brand-surface/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <label className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 w-full sm:w-auto">
                    <Upload size={18} />
                    {i18n.language === 'ar' ? 'تحميل شعار جديد' : 'Upload New Logo'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleSiteLogoUpload} disabled={isUploadingLogo} />
                  </label>
                  <p className="text-xs text-brand-text-muted leading-relaxed max-w-xs">
                    {i18n.language === 'ar' 
                      ? 'الحجم الموصى به: 200x50 بكسل (أو نسبة عرض إلى ارتفاع 4:1). الحد الأقصى 2 ميجابايت.' 
                      : 'Recommended size: 200x50 pixels (or 4:1 aspect ratio). Max 2MB.'}
                  </p>
                  {logoUploadError && (
                    <p className="text-xs text-brand-error font-bold bg-brand-error/10 px-3 py-2 rounded-lg border border-brand-error/20 inline-block">{logoUploadError}</p>
                  )}
                </div>
              </div>

              {/* Watermark Logo Upload */}
              <div className="mt-8 space-y-6">
                <label className="text-sm font-black text-brand-text-main uppercase tracking-widest block">
                  {i18n.language === 'ar' ? 'شعار العلامة المائية' : 'Watermark Logo'}
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-32 h-32 bg-brand-background rounded-[2rem] border-2 border-dashed border-brand-border flex items-center justify-center overflow-hidden relative group shadow-inner">
                    {watermarkLogo ? (
                      <BlurImage src={watermarkLogo} alt="Watermark Logo" className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" />
                    ) : (
                      <Building2 size={40} className="text-brand-text-muted/50" />
                    )}
                    {isUploadingWatermark && (
                      <div className="absolute inset-0 bg-brand-surface/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-brand-surface border-2 border-brand-border hover:border-brand-primary text-brand-text-main font-bold rounded-xl cursor-pointer transition-all hover:shadow-md active:scale-95">
                      <Upload size={18} className="text-brand-primary" />
                      {i18n.language === 'ar' ? 'رفع شعار العلامة المائية' : 'Upload Watermark Logo'}
                      <input type="file" className="hidden" accept="image/*" onChange={handleWatermarkLogoUpload} disabled={isUploadingWatermark} />
                    </label>
                    <p className="text-xs text-brand-text-muted leading-relaxed max-w-xs">
                      {i18n.language === 'ar' 
                        ? 'يفضل أن يكون بخلفية شفافة (PNG). سيتم استخدامه كعلامة مائية على الصور في الدردشة.' 
                        : 'Preferably with a transparent background (PNG). Will be used as a watermark on chat images.'}
                    </p>
                    {watermarkUploadError && (
                      <p className="text-xs text-brand-error font-bold bg-brand-error/10 px-3 py-2 rounded-lg border border-brand-error/20 inline-block">{watermarkUploadError}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Logo Scale & Aura Color */}
            <div className="space-y-8 bg-brand-background/30 p-6 rounded-3xl border border-brand-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="font-black text-brand-text-main uppercase tracking-widest text-xs">
                    {i18n.language === 'ar' ? 'تخصيص الشعار العصبي' : 'Neural Logo Customization'}
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">
                    {showNeuralLogo ? (i18n.language === 'ar' ? 'مفعل' : 'Enabled') : (i18n.language === 'ar' ? 'معطل' : 'Disabled')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Toggling showNeuralLogo from', showNeuralLogo, 'to', !showNeuralLogo);
                      setShowNeuralLogo(!showNeuralLogo);
                    }}
                    className={`w-12 h-6 rounded-full transition-all relative ${showNeuralLogo ? 'bg-brand-primary' : 'bg-brand-border'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showNeuralLogo ? (i18n.language === 'ar' ? 'right-7' : 'left-7') : (i18n.language === 'ar' ? 'right-1' : 'left-1')}`} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showNeuralLogo && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-black text-brand-text-main uppercase tracking-widest">
                            {i18n.language === 'ar' ? 'حجم الشعار' : 'Logo Scale'}
                          </label>
                          <span className="text-xs font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-lg">
                            {Math.round(logoScale * 100)}%
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={logoScale}
                          onChange={e => setLogoScale(parseFloat(e.target.value))}
                          className="w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-brand-text-muted uppercase tracking-tighter">
                          <span>{i18n.language === 'ar' ? 'صغير' : 'Small'}</span>
                          <span>{i18n.language === 'ar' ? 'طبيعي' : 'Normal'}</span>
                          <span>{i18n.language === 'ar' ? 'كبير' : 'Large'}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-black text-brand-text-main uppercase tracking-widest block">
                          {i18n.language === 'ar' ? 'لون الهالة (Aura)' : 'Aura Color'}
                        </label>
                        <div className="flex gap-3">
                          <div 
                            className="w-12 h-12 rounded-2xl shadow-inner border-2 border-white relative overflow-hidden ring-1 ring-brand-border"
                            style={{ backgroundColor: logoAuraColor }}
                          >
                            <input 
                              type="color" 
                              value={logoAuraColor}
                              onChange={(e) => setLogoAuraColor(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </div>
                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={logoAuraColor}
                              onChange={(e) => setLogoAuraColor(e.target.value)}
                              className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-brand-text-muted leading-relaxed">
                          {i18n.language === 'ar' 
                            ? 'هذا اللون سيستخدم لإنشاء تأثير التوهج العصبي خلف الشعار في الصفحة الرئيسية.' 
                            : 'This color will be used to create the neural glow effect behind the logo on the home page.'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Neural Pulse Customization */}
            <div className="space-y-8 bg-brand-background/30 p-6 rounded-3xl border border-brand-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                    <BrainCircuit size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-text-main uppercase tracking-widest text-xs">
                      {i18n.language === 'ar' ? 'النبض العصبي (Neural Pulse)' : 'Neural Pulse Intelligence'}
                    </h4>
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-tighter">
                      {i18n.language === 'ar' ? 'تفعيل الذكاء الاصطناعي الاستباقي' : 'Enable Proactive AI Intelligence'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableNeuralPulse(!enableNeuralPulse)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    enableNeuralPulse ? 'bg-brand-primary' : 'bg-brand-border'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enableNeuralPulse ? (i18n.language === 'ar' ? '-translate-x-6' : 'translate-x-6') : (i18n.language === 'ar' ? '-translate-x-1' : 'translate-x-1')
                    }`}
                  />
                </button>
              </div>
              
              <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                <p className="text-[10px] font-bold text-brand-text-muted leading-relaxed flex items-center gap-2">
                  <Zap size={12} className="text-brand-primary" />
                  {i18n.language === 'ar' 
                    ? 'هذه الميزة تتيح للمستخدمين استخدام الكاميرا والموقع والمايك للحصول على اقتراحات توريد ذكية فورية.' 
                    : 'This feature allows users to use camera, location, and mic for instant smart sourcing suggestions.'}
                </p>
              </div>
            </div>

            {/* User Guide & Policies */}
            <div className="space-y-8 bg-brand-primary/5 p-8 rounded-[2.5rem] border-2 border-dashed border-brand-primary/20 hover:border-brand-primary/40 transition-all group">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary shadow-inner group-hover:scale-110 transition-transform">
                    <BookOpen size={32} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-brand-text-main tracking-tight">
                      {i18n.language === 'ar' ? 'دليل المستخدم والسياسات' : 'User Guide & Policies'}
                    </h4>
                    <p className="text-brand-text-muted text-xs font-bold uppercase tracking-widest mt-1">
                      {i18n.language === 'ar' ? 'عرض الدليل الكامل، شروط الاستخدام، وسياسة الخصوصية' : 'View full guide, terms of use, and privacy policy'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpCenter(true)}
                  className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-black hover:bg-brand-primary-hover transition-all shadow-xl shadow-brand-primary/20 flex items-center gap-3 group/btn"
                >
                  <FileText size={20} className="group-hover/btn:rotate-12 transition-transform" />
                  {i18n.language === 'ar' ? 'فتح مركز المساعدة' : 'Open Help Center'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: i18n.language === 'ar' ? 'دليل الميزات' : 'Feature Guide', icon: Sparkles },
                  { label: i18n.language === 'ar' ? 'شروط الاستخدام' : 'Terms of Use', icon: ShieldCheck },
                  { label: i18n.language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy', icon: Lock }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl border border-brand-border/50 text-[10px] font-black uppercase tracking-tighter text-brand-text-muted">
                    <item.icon size={14} className="text-brand-primary/60" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Text Color Customization */}
            <div className="space-y-8 bg-brand-background/30 p-6 rounded-3xl border border-brand-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                  <Palette size={20} />
                </div>
                <h4 className="font-black text-brand-text-main uppercase tracking-widest text-xs">
                  {i18n.language === 'ar' ? 'تخصيص ألوان النصوص' : 'Text Color Customization'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-black text-brand-text-main uppercase tracking-widest block">
                    {i18n.language === 'ar' ? 'اللون الرئيسي للنصوص' : 'Primary Text Color'}
                  </label>
                  <div className="flex gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl shadow-inner border-2 border-white relative overflow-hidden ring-1 ring-brand-border"
                      style={{ backgroundColor: primaryTextColor }}
                    >
                      <input 
                        type="color" 
                        value={primaryTextColor}
                        onChange={(e) => setPrimaryTextColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={primaryTextColor}
                        onChange={(e) => setPrimaryTextColor(e.target.value)}
                        className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-brand-text-main uppercase tracking-widest block">
                      {i18n.language === 'ar' ? 'اللون الثانوي (المساعد)' : 'Secondary Text Color'}
                    </label>
                    <button
                      type="button"
                      onClick={handleHarmonizeColors}
                      disabled={isHarmonizingColors}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:text-brand-primary-hover transition-colors disabled:opacity-50"
                    >
                      {isHarmonizingColors ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      {i18n.language === 'ar' ? 'تناسق ذكي' : 'AI Harmony'}
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl shadow-inner border-2 border-white relative overflow-hidden ring-1 ring-brand-border"
                      style={{ backgroundColor: secondaryTextColor }}
                    >
                      <input 
                        type="color" 
                        value={secondaryTextColor}
                        onChange={(e) => setSecondaryTextColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={secondaryTextColor}
                        onChange={(e) => setSecondaryTextColor(e.target.value)}
                        className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                <p className="text-[10px] font-bold text-brand-text-muted leading-relaxed flex items-center gap-2">
                  <Sparkles size={12} className="text-brand-primary" />
                  {i18n.language === 'ar' 
                    ? 'نصيحة: استخدم ميزة "التناسق الذكي" ليقوم الذكاء الاصطناعي باختيار لون ثانوي يتناسب مع لونك الرئيسي ويضمن وضوح القراءة.' 
                    : 'Tip: Use "AI Harmony" to let the AI pick a secondary color that matches your primary choice while ensuring readability.'}
                </p>
              </div>
            </div>

            {/* Site Settings Form */}
            <form onSubmit={handleUpdateSiteName} className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-brand-text-main uppercase tracking-widest block">
                  {i18n.language === 'ar' ? 'اسم الموقع' : 'Site Name'}
                </label>
                <input 
                  type="text"
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  placeholder={i18n.language === 'ar' ? 'أدخل اسم الموقع' : 'Enter site name'}
                  className="w-full px-5 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-brand-text-main uppercase tracking-widest block">
                    {i18n.language === 'ar' ? 'عنوان الصفحة الرئيسية (عربي)' : 'Hero Title (Arabic)'}
                  </label>
                  <div className="relative group">
                    <input 
                      type="text"
                      value={heroTitleAr}
                      onChange={e => setHeroTitleAr(e.target.value)}
                      placeholder="ابحث عن أي منتج بسهولة"
                      className="w-full px-5 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all pr-12 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleTranslateHeroTitle}
                      disabled={isTranslatingHeroTitle || !heroTitleAr}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-primary hover:text-brand-primary-hover disabled:opacity-50 p-3 hover:bg-brand-primary/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Translate to English"
                    >
                      <Sparkles size={18} className={isTranslatingHeroTitle ? 'animate-pulse' : ''} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-brand-text-main uppercase tracking-widest block">
                    {i18n.language === 'ar' ? 'عنوان الصفحة الرئيسية (إنجليزي)' : 'Hero Title (English)'}
                  </label>
                  <input 
                    type="text"
                    value={heroTitleEn}
                    onChange={e => setHeroTitleEn(e.target.value)}
                    placeholder="Find Any Product with Ease"
                    className="w-full px-5 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-brand-text-main uppercase tracking-widest block">
                    {i18n.language === 'ar' ? 'وصف الصفحة الرئيسية (عربي)' : 'Hero Description (Arabic)'}
                  </label>
                  <div className="relative group">
                    <textarea 
                      value={heroDescriptionAr}
                      onChange={e => setHeroDescriptionAr(e.target.value)}
                      placeholder="أسهل طريقة للعثور على ما تحتاجه من الموردين المحليين."
                      className="w-full px-5 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all resize-none h-32 pr-12 text-sm font-medium leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={handleTranslateHeroDesc}
                      disabled={isTranslatingHeroDesc || !heroDescriptionAr}
                      className="absolute right-2 top-3 text-brand-primary hover:text-brand-primary-hover disabled:opacity-50 p-2 hover:bg-brand-primary/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Translate to English"
                    >
                      <Sparkles size={18} className={isTranslatingHeroDesc ? 'animate-pulse' : ''} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-brand-text-main uppercase tracking-widest block">
                    {i18n.language === 'ar' ? 'وصف الصفحة الرئيسية (إنجليزي)' : 'Hero Description (English)'}
                  </label>
                  <textarea 
                    value={heroDescriptionEn}
                    onChange={e => setHeroDescriptionEn(e.target.value)}
                    placeholder="The easiest way to find what you need from local suppliers."
                    className="w-full px-5 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all resize-none h-32 text-sm font-medium leading-relaxed"
                  />
                </div>
              </div>

              {/* Watermark Settings */}
              <div className="pt-6 border-t border-brand-border/50 space-y-6">
                <h4 className="text-sm font-black text-brand-text-main uppercase tracking-widest">
                  {i18n.language === 'ar' ? 'إعدادات العلامة المائية' : 'Watermark Settings'}
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Opacity Slider */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-brand-text-main uppercase tracking-widest flex justify-between">
                      <span>{i18n.language === 'ar' ? 'الشفافية' : 'Opacity'}</span>
                      <span className="text-brand-primary">{Math.round(watermarkOpacity * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      className="w-full accent-brand-primary h-2 bg-brand-border rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Position Selector */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-brand-text-main uppercase tracking-widest block">
                      {i18n.language === 'ar' ? 'الموقع' : 'Position'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'].map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setWatermarkPosition(pos as any)}
                          className={`p-2 rounded-xl border text-xs flex items-center justify-center transition-all ${
                            watermarkPosition === pos
                              ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-bold shadow-sm'
                              : 'bg-brand-background border-brand-border text-brand-text-muted hover:bg-brand-surface'
                          } ${pos === 'center' ? 'col-span-3' : 'col-span-1'}`}
                        >
                          {pos === 'top-left' && '↖'}
                          {pos === 'top-right' && '↗'}
                          {pos === 'center' && (i18n.language === 'ar' ? 'المنتصف' : 'Center')}
                          {pos === 'bottom-left' && '↙'}
                          {pos === 'bottom-right' && '↘'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-brand-border/50">
                <button 
                  type="submit"
                  className="px-8 py-3 bg-brand-text-main text-white rounded-xl font-bold hover:bg-brand-text-main/90 transition-all flex items-center gap-2 shadow-lg shadow-brand-text-main/20 w-full sm:w-auto justify-center"
                >
                  <Save size={18} />
                  {i18n.language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
                </button>
              </div>
            </form>

            {/* Feature Management */}
            <div className="lg:col-span-2 mt-4 pt-10 border-t border-brand-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary border border-brand-primary/20 shadow-sm">
                    <LayoutGrid size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-brand-text-main tracking-tight">{t('feature_management')}</h3>
                    <p className="text-brand-text-muted text-sm mt-1">{i18n.language === 'ar' ? 'تحكم في ظهور الخدمات في التطبيق والموقع' : 'Control visibility of services in the app and site'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[
                  { id: 'marketplace', label: t('enable_marketplace'), icon: ShoppingBag, color: 'text-brand-primary', bg: 'bg-brand-primary/10', border: 'border-brand-primary/20' },
                  { id: 'aiChat', label: t('enable_ai_chat'), icon: Bot, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10', border: 'border-brand-secondary/20' },
                  { id: 'supplierVerification', label: t('enable_supplier_verification'), icon: ShieldCheck, color: 'text-brand-success', bg: 'bg-brand-success/10', border: 'border-brand-success/20' },
                  { id: 'marketTrends', label: t('enable_market_trends'), icon: Sparkles, color: 'text-brand-warning', bg: 'bg-brand-warning/10', border: 'border-brand-warning/20' },
                  { id: 'priceIntelligence', label: t('enable_price_intelligence'), icon: Tag, color: 'text-brand-error', bg: 'bg-brand-error/10', border: 'border-brand-error/20' },
                ].map((feature) => (
                  <div 
                    key={feature.id}
                    className="flex flex-col justify-between p-6 bg-brand-background rounded-[2rem] border border-brand-border hover:shadow-md transition-all group h-full"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className={`p-3 rounded-2xl border ${feature.bg} ${feature.color} ${feature.border} shadow-sm group-hover:scale-110 transition-transform`}>
                        <feature.icon size={24} />
                      </div>
                      <button
                        onClick={() => handleToggleFeature(feature.id as keyof AppFeatures)}
                        disabled={isUpdatingFeatures}
                        className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${features[feature.id as keyof AppFeatures] ? 'bg-brand-success' : 'bg-brand-text-muted/30'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${isRtl ? (features[feature.id as keyof AppFeatures] ? 'right-8' : 'right-1') : (features[feature.id as keyof AppFeatures] ? 'left-8' : 'left-1')}`} />
                      </button>
                    </div>
                    <span className="text-sm font-black text-brand-text-main leading-tight">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Suppliers Section */}
        {adminTab === 'suppliers' && (
        <section className="h-[calc(100vh-140px)] min-h-[600px] flex flex-col lg:flex-row gap-6">
          {/* Left Pane: List */}
          <div className={`w-full lg:w-1/3 flex flex-col bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-sm overflow-hidden h-full ${selectedAdminSupplier || isAddingSupplier || editingSupplier ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-6 border-b border-brand-border bg-brand-background/50 flex flex-col gap-4 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-brand-text-main flex items-center gap-2 text-lg tracking-tight">
                  <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                    <Users size={20} />
                  </div>
                  {i18n.language === 'ar' ? 'الموردين' : 'Suppliers'}
                  <span className="text-[10px] bg-brand-primary text-white px-2 py-0.5 rounded-full shadow-sm">{suppliers.length}</span>
                </h3>
                <button 
                  onClick={() => {
                    setIsAddingSupplier(true);
                    setEditingSupplier(null);
                    setSelectedAdminSupplier(null);
                    setNewSuppCategorySearch('');
                  }}
                  className="p-2 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover hover:scale-105 transition-all shadow-md shadow-brand-primary/20"
                  title={i18n.language === 'ar' ? 'إضافة مورد' : 'Add Supplier'}
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1 group">
                  <input 
                    type="text"
                    placeholder={i18n.language === 'ar' ? 'بحث...' : 'Search...'}
                    value={supplierSearch}
                    onChange={e => {
                      setSupplierSearch(e.target.value);
                      if (!e.target.value) setSemanticSupplierResults(null);
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm transition-all shadow-sm group-hover:border-brand-primary/30"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted transition-colors group-focus-within:text-brand-primary" size={16} />
                </div>
                <button
                  onClick={handleAiSupplierSearch}
                  disabled={isSemanticSupplierSearching || !supplierSearch.trim()}
                  className="p-3 bg-brand-primary text-white rounded-2xl hover:bg-brand-primary-hover hover:scale-105 transition-all shadow-md shadow-brand-primary/20 disabled:opacity-50"
                  title={i18n.language === 'ar' ? 'بحث ذكي عن الموردين' : 'Smart search for suppliers'}
                >
                  {isSemanticSupplierSearching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Sparkles size={18} />
                  )}
                </button>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
                <button 
                  onClick={() => setSupplierCategoryFilter([])}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    supplierCategoryFilter.length === 0 
                      ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20 scale-105' 
                      : 'bg-brand-surface text-brand-text-muted border-brand-border hover:bg-brand-background hover:text-brand-text-main'
                  }`}
                >
                  {i18n.language === 'ar' ? 'الكل' : 'All'}
                </button>
                {mainCategories.map(cat => {
                  const isSelected = supplierCategoryFilter.includes(cat.id);
                  return (
                    <button 
                      key={cat.id}
                      onClick={() => {
                        if (isSelected) {
                          setSupplierCategoryFilter(prev => prev.filter(id => id !== cat.id));
                        } else {
                          setSupplierCategoryFilter(prev => [...prev, cat.id]);
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                        isSelected 
                          ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20 scale-105' 
                          : 'bg-brand-surface text-brand-text-muted border-brand-border hover:bg-brand-background hover:text-brand-text-main'
                      }`}
                    >
                      {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredSuppliers.map(supp => (
                <div 
                  key={supp.uid}
                  onClick={() => {
                    setSelectedAdminSupplier(supp);
                    setIsAddingSupplier(false);
                    setEditingSupplier(null);
                    setEditSuppCategorySearch('');
                  }}
                  className={`p-4 rounded-2xl cursor-pointer flex items-center gap-4 transition-all border group ${
                    selectedAdminSupplier?.uid === supp.uid 
                      ? 'bg-brand-primary/5 border-brand-primary/30 shadow-sm' 
                      : 'bg-brand-surface border-transparent hover:bg-brand-background hover:border-brand-border'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border shrink-0 transition-all ${selectedAdminSupplier?.uid === supp.uid ? 'bg-white border-brand-primary/20 shadow-sm' : 'bg-brand-background border-brand-border group-hover:border-brand-primary/20 text-brand-text-muted'}`}>
                    {supp.logoUrl ? (
                      <BlurImage src={supp.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={20} className={selectedAdminSupplier?.uid === supp.uid ? 'text-brand-primary' : ''} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className={`text-sm font-black truncate transition-colors ${selectedAdminSupplier?.uid === supp.uid ? 'text-brand-primary' : 'text-brand-text-main group-hover:text-brand-primary'}`}>
                        {supp.companyName || supp.name}
                      </h4>
                      {supp.isVerified && (
                        <ShieldCheck size={14} className="text-brand-success shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-brand-text-muted truncate mb-1.5">{supp.email}</p>
                    {supp.keywords && supp.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {supp.keywords.slice(0, 2).map((kw, idx) => (
                          <span key={`${kw}-${idx}`} className="px-2 py-0.5 bg-brand-success/10 text-brand-success text-[9px] font-bold rounded-md border border-brand-success/20 truncate max-w-[80px]">
                            {kw}
                          </span>
                        ))}
                        {supp.keywords.length > 2 && (
                          <span className="px-2 py-0.5 bg-brand-background text-brand-text-muted text-[9px] font-bold rounded-md border border-brand-border">
                            +{supp.keywords.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredSuppliers.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 bg-brand-background rounded-full flex items-center justify-center text-brand-text-muted mb-4 border border-brand-border">
                    <Search size={24} className="opacity-50" />
                  </div>
                  <p className="text-brand-text-muted text-sm font-bold">
                    {i18n.language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Details / Edit / Add */}
          <div className={`w-full lg:w-2/3 flex flex-col bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-sm overflow-hidden h-full relative ${selectedAdminSupplier || isAddingSupplier || editingSupplier ? 'flex' : 'hidden lg:flex'}`}>
            {isAddingSupplier ? (
              <div className="p-6 overflow-y-auto h-full">
                {/* Add Supplier Form */}
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-bold text-brand-text-main flex items-center gap-2">
                    <Plus size={20} className="text-brand-primary" />
                    {i18n.language === 'ar' ? 'إضافة مورد جديد' : 'Add New Supplier'}
                  </h4>
                  <button onClick={() => {
                    setIsAddingSupplier(false);
                    setNewSuppCategorySearch('');
                  }} className="text-brand-text-muted hover:text-brand-text-muted">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{t('name')}</label>
                    <input type="text" value={newSuppName} onChange={e => setNewSuppName(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'اسم الشركة' : 'Company Name'}</label>
                    <input type="text" value={newSuppCompanyName} onChange={e => setNewSuppCompanyName(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{t('email')}</label>
                    <input type="email" value={newSuppEmail} onChange={e => setNewSuppEmail(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                    <div className="flex gap-2">
                      <input type="text" value={newSuppPassword} onChange={e => setNewSuppPassword(e.target.value)} className="flex-1 px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" required />
                      <button
                        type="button"
                        onClick={generateRandomSupplierPassword}
                        className="px-4 py-3 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-2xl font-bold hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                        title={i18n.language === 'ar' ? 'توليد كلمة مرور عشوائية' : 'Generate random password'}
                      >
                        <Sparkles size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input type="tel" value={newSuppPhone} onChange={e => setNewSuppPhone(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'رابط الشعار' : 'Logo URL'}</label>
                    <input type="text" value={newSuppLogoUrl} onChange={e => setNewSuppLogoUrl(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" placeholder="https://..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'الموقع' : 'Location'}</label>
                    <input type="text" value={newSuppLocation} onChange={e => setNewSuppLocation(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" placeholder={i18n.language === 'ar' ? 'الموقع' : 'Location'} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}</label>
                    <input type="text" value={newSuppWebsite} onChange={e => setNewSuppWebsite(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" placeholder="example.com" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'نبذة عن الشركة' : 'Company Bio'}</label>
                    <textarea 
                      value={newSuppBio} 
                      onChange={e => setNewSuppBio(e.target.value)} 
                      className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary min-h-[120px] resize-none transition-all shadow-sm" 
                      placeholder={i18n.language === 'ar' ? 'اكتب نبذة مختصرة عن الشركة...' : 'Write a brief description of the company...'}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الفئات والفئات الفرعية' : 'Categories & Sub-Categories'}</label>
                      <button
                        type="button"
                        onClick={handleSuggestNewSuppCategories}
                        disabled={isSuggestingNewSuppCategories || (!newSuppName && !newSuppCompanyName)}
                        className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:bg-brand-primary/10 transition-colors px-3 py-2 -mx-3 -my-2 rounded-lg disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSuggestingNewSuppCategories ? (
                          <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                        ) : <Sparkles size={12} />}
                        {i18n.language === 'ar' ? 'اقتراح بالذكاء الاصطناعي' : 'AI Suggestion'}
                      </button>
                    </div>
                    
                    <div className="relative group">
                      <input 
                        type="text"
                        placeholder={i18n.language === 'ar' ? 'بحث عن فئة...' : 'Search for a category...'}
                        value={newSuppCategorySearch}
                        onChange={e => setNewSuppCategorySearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-xs transition-all group-hover:border-brand-primary/30"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-primary" size={14} />
                    </div>

                    <div className="space-y-4 p-5 bg-brand-background/50 rounded-2xl border border-brand-border max-h-80 overflow-y-auto custom-scrollbar">
                      {[...mainCategories].filter(parent => {
                        const search = newSuppCategorySearch.toLowerCase();
                        if (!search) return true;
                        const parentName = (i18n.language === 'ar' ? parent.nameAr : parent.nameEn).toLowerCase();
                        if (parentName.includes(search)) return true;
                        const subs = categories.filter(c => c.parentId === parent.id);
                        return subs.some(sub => (i18n.language === 'ar' ? sub.nameAr : sub.nameEn).toLowerCase().includes(search));
                      }).sort((a, b) => {
                        const aSelected = newSuppCategories.includes(a.id);
                        const bSelected = newSuppCategories.includes(b.id);
                        if (aSelected && !bSelected) return -1;
                        if (!aSelected && bSelected) return 1;
                        return 0;
                      }).map(parent => {
                        const subs = categories.filter(c => c.parentId === parent.id);
                        const isSelected = newSuppCategories.includes(parent.id);
                        
                        return (
                          <div key={parent.id} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-white border-brand-primary/30 shadow-sm' : 'bg-transparent border-transparent hover:bg-brand-surface/50'}`}>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      // Deselect main and all its subs
                                      setNewSuppCategories(newSuppCategories.filter(id => id !== parent.id && !subs.find(s => s.id === id)));
                                    } else {
                                      // Select this main
                                      setNewSuppCategories([...newSuppCategories, parent.id]);
                                    }
                                  }}
                                  className={`flex items-center justify-center w-6 h-6 rounded-md border transition-all ${
                                    isSelected ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-brand-border text-transparent hover:border-brand-primary'
                                  }`}
                                >
                                  <Check size={14} strokeWidth={3} />
                                </button>
                                <span className={`font-bold ${isSelected ? 'text-brand-primary-hover' : 'text-brand-text-main'}`}>
                                  {i18n.language === 'ar' ? parent.nameAr : parent.nameEn}
                                </span>
                              </div>
                              {subs.length > 0 && (
                                <span className="text-xs font-medium text-brand-text-muted bg-brand-surface px-2 py-1 rounded-lg">
                                  {subs.filter(s => newSuppCategories.includes(s.id)).length} / {subs.length}
                                </span>
                              )}
                            </div>
                            
                            {/* Subcategories Grid */}
                            {subs.length > 0 && isSelected && (
                              <div className="mt-4 pt-4 border-t border-brand-border-light">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {subs.filter(sub => {
                                    const search = newSuppCategorySearch.toLowerCase();
                                    if (!search) return true;
                                    const subName = (i18n.language === 'ar' ? sub.nameAr : sub.nameEn).toLowerCase();
                                    const parentName = (i18n.language === 'ar' ? parent.nameAr : parent.nameEn).toLowerCase();
                                    return subName.includes(search) || parentName.includes(search);
                                  }).sort((a, b) => {
                                    const aSelected = newSuppCategories.includes(a.id);
                                    const bSelected = newSuppCategories.includes(b.id);
                                    if (aSelected && !bSelected) return -1;
                                    if (!aSelected && bSelected) return 1;
                                    return 0;
                                  }).map(sub => {
                                    const isSubSelected = newSuppCategories.includes(sub.id);
                                    return (
                                      <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() => {
                                          if (isSubSelected) {
                                            setNewSuppCategories(newSuppCategories.filter(id => id !== sub.id));
                                          } else {
                                            setNewSuppCategories([...newSuppCategories, sub.id]);
                                          }
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                                          isSubSelected
                                            ? 'bg-brand-primary/10 text-brand-primary-hover border border-brand-primary/30 shadow-sm'
                                            : 'bg-brand-background text-brand-text-muted border border-brand-border hover:border-brand-primary/40 hover:bg-white'
                                        }`}
                                      >
                                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${isSubSelected ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-brand-border'}`}>
                                          {isSubSelected && <Check size={8} strokeWidth={4} />}
                                        </div>
                                        <span className="truncate">{i18n.language === 'ar' ? sub.nameAr : sub.nameEn}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الكلمات المفتاحية' : 'Keywords'}</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newSuppAddKeyword}
                        onChange={e => setNewSuppAddKeyword(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newSuppAddKeyword.trim() && !newSuppKeywords.includes(newSuppAddKeyword.trim())) {
                              setNewSuppKeywords([...newSuppKeywords, newSuppAddKeyword.trim()]);
                              setNewSuppAddKeyword('');
                            }
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-brand-background border border-brand-border-light rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder={i18n.language === 'ar' ? 'أضف كلمة مفتاحية...' : 'Add a keyword...'}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSuppAddKeyword.trim() && !newSuppKeywords.includes(newSuppAddKeyword.trim())) {
                            setNewSuppKeywords([...newSuppKeywords, newSuppAddKeyword.trim()]);
                            setNewSuppAddKeyword('');
                          }
                        }}
                        className="px-4 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newSuppKeywords.map((kw, index) => (
                        <span key={`${kw}-${index}`} className="px-2 py-1 bg-brand-primary/10 text-brand-primary-hover rounded-lg text-[10px] font-bold border border-brand-primary/20 flex items-center gap-1">
                          {kw}
                          <button type="button" onClick={() => setNewSuppKeywords(newSuppKeywords.filter(k => k !== kw))} className="text-brand-primary hover:text-brand-primary p-1.5 -m-1.5 rounded-full hover:bg-brand-primary/20 transition-colors">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3 mt-6">
                    <button type="button" onClick={() => {
                      setIsAddingSupplier(false);
                      setNewSuppCategorySearch('');
                    }} className="px-6 py-3 rounded-2xl font-bold text-brand-text-muted hover:bg-brand-background transition-all">
                      {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <HapticButton type="submit" disabled={isCreatingSupplier} className="px-8 py-3 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-primary-hover hover:scale-105 transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:hover:scale-100">
                      {isCreatingSupplier ? (i18n.language === 'ar' ? 'جاري الإضافة...' : 'Adding...') : (i18n.language === 'ar' ? 'إضافة المورد' : 'Add Supplier')}
                    </HapticButton>
                  </div>
                </form>
              </div>
            ) : editingSupplier ? (
              <div className="p-6 overflow-y-auto h-full">
                {/* Edit Supplier Form */}
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-bold text-brand-text-main flex items-center gap-2">
                    <Edit2 size={20} className="text-brand-primary" />
                    {i18n.language === 'ar' ? 'تعديل بيانات المورد' : 'Edit Supplier Details'}
                  </h4>
                  <button onClick={() => {
                    setEditingSupplier(null);
                    setEditSuppCategorySearch('');
                  }} className="text-brand-text-muted hover:text-brand-text-muted">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleUpdateSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Logo Section - Full Width */}
                  <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-6 p-4 bg-brand-background/50 border border-brand-border-light rounded-2xl mb-2">
                    <div className="w-24 h-24 bg-white rounded-2xl border border-brand-border-light flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {editSuppLogoUrl ? (
                        <BlurImage src={editSuppLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 size={32} className="text-brand-text-muted" />
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'رابط الشعار' : 'Logo URL'}</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input type="text" value={editSuppLogoUrl} onChange={e => setEditSuppLogoUrl(e.target.value)} className="flex-1 px-4 py-2 bg-white border border-brand-border-light rounded-xl outline-none focus:ring-2 focus:ring-brand-primary" placeholder="https://..." />
                        <button
                          type="button"
                          onClick={handleAdminGenerateAILogo}
                          disabled={isGeneratingLogo || (!editSuppName && !editSuppCompanyName)}
                          className="px-4 py-2 bg-zinc-900 hover:bg-black text-amber-400 border border-amber-500/30 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                          title={i18n.language === 'ar' ? 'توليد شعار بالذكاء الاصطناعي' : 'Generate AI Logo'}
                        >
                          <Sparkles size={16} className={isGeneratingLogo ? "animate-pulse text-amber-200" : ""} />
                          {isGeneratingLogo ? (i18n.language === 'ar' ? 'جاري التوليد...' : 'Generating...') : (i18n.language === 'ar' ? 'توليد بالذكاء الاصطناعي' : 'Generate with AI')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{t('name')}</label>
                    <input type="text" value={editSuppName} onChange={e => setEditSuppName(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'اسم الشركة' : 'Company Name'}</label>
                    <input type="text" value={editSuppCompanyName} onChange={e => setEditSuppCompanyName(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{t('email')}</label>
                    <input type="email" value={editSuppEmail} onChange={e => setEditSuppEmail(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input type="tel" value={editSuppPhone} onChange={e => setEditSuppPhone(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'الموقع' : 'Location'}</label>
                    <input type="text" value={editSuppLocation} onChange={e => setEditSuppLocation(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" placeholder={i18n.language === 'ar' ? 'الموقع' : 'Location'} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}</label>
                    <input type="text" value={editSuppWebsite} onChange={e => setEditSuppWebsite(e.target.value)} className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm" placeholder="example.com" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'نبذة عن الشركة' : 'Company Bio'}</label>
                    <textarea 
                      value={editSuppBio} 
                      onChange={e => setEditSuppBio(e.target.value)} 
                      className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary min-h-[120px] resize-none transition-all shadow-sm" 
                      placeholder={i18n.language === 'ar' ? 'اكتب نبذة مختصرة عن الشركة...' : 'Write a brief description of the company...'}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الفئات والفئات الفرعية' : 'Categories & Sub-Categories'}</label>
                      <button
                        type="button"
                        onClick={handleSuggestEditSuppCategories}
                        disabled={isSuggestingEditSuppCategories || (!editSuppName && !editSuppCompanyName)}
                        className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:bg-brand-primary/10 transition-colors px-3 py-2 -mx-3 -my-2 rounded-lg disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSuggestingEditSuppCategories ? (
                          <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                        ) : <Sparkles size={12} />}
                        {i18n.language === 'ar' ? 'اقتراح بالذكاء الاصطناعي' : 'AI Suggestion'}
                      </button>
                    </div>

                    <div className="relative group">
                      <input 
                        type="text"
                        placeholder={i18n.language === 'ar' ? 'بحث عن فئة...' : 'Search for a category...'}
                        value={editSuppCategorySearch}
                        onChange={e => setEditSuppCategorySearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-xs transition-all group-hover:border-brand-primary/30"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-primary" size={14} />
                    </div>

                    <div className="space-y-4 p-5 bg-brand-background/50 rounded-2xl border border-brand-border max-h-80 overflow-y-auto custom-scrollbar">
                      {[...mainCategories].filter(parent => {
                        const search = editSuppCategorySearch.toLowerCase();
                        if (!search) return true;
                        const parentName = (i18n.language === 'ar' ? parent.nameAr : parent.nameEn).toLowerCase();
                        if (parentName.includes(search)) return true;
                        const subs = categories.filter(c => c.parentId === parent.id);
                        return subs.some(sub => (i18n.language === 'ar' ? sub.nameAr : sub.nameEn).toLowerCase().includes(search));
                      }).sort((a, b) => {
                        const aSelected = editSuppCategories.includes(a.id);
                        const bSelected = editSuppCategories.includes(b.id);
                        if (aSelected && !bSelected) return -1;
                        if (!aSelected && bSelected) return 1;
                        return 0;
                      }).map(parent => {
                        const subs = categories.filter(c => c.parentId === parent.id);
                        const isSelected = editSuppCategories.includes(parent.id);
                        
                        return (
                          <div key={parent.id} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-brand-surface border-brand-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-brand-background/50'}`}>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      // Deselect main and all its subs
                                      setEditSuppCategories(editSuppCategories.filter(id => id !== parent.id && !subs.find(s => s.id === id)));
                                    } else {
                                      // Select this main
                                      setEditSuppCategories([...editSuppCategories, parent.id]);
                                    }
                                  }}
                                  className={`flex items-center justify-center w-6 h-6 rounded-md border transition-all ${
                                    isSelected ? 'bg-brand-primary border-brand-primary text-white' : 'bg-brand-surface border-brand-border text-transparent hover:border-brand-primary/40'
                                  }`}
                                >
                                  <Check size={14} strokeWidth={3} />
                                </button>
                                <span className={`font-bold ${isSelected ? 'text-brand-primary' : 'text-brand-text-main'}`}>
                                  {i18n.language === 'ar' ? parent.nameAr : parent.nameEn}
                                </span>
                              </div>
                              {subs.length > 0 && (
                                <span className="text-xs font-medium text-brand-text-muted bg-brand-background px-2 py-1 rounded-lg">
                                  {subs.filter(s => editSuppCategories.includes(s.id)).length} / {subs.length}
                                </span>
                              )}
                            </div>
                            
                            {/* Subcategories Grid */}
                            {subs.length > 0 && isSelected && (
                                <div className="mt-4 pt-4 border-t border-brand-border">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {subs.filter(sub => {
                                    const search = editSuppCategorySearch.toLowerCase();
                                    if (!search) return true;
                                    const subName = (i18n.language === 'ar' ? sub.nameAr : sub.nameEn).toLowerCase();
                                    const parentName = (i18n.language === 'ar' ? parent.nameAr : parent.nameEn).toLowerCase();
                                    return subName.includes(search) || parentName.includes(search);
                                  }).sort((a, b) => {
                                    const aSelected = editSuppCategories.includes(a.id);
                                    const bSelected = editSuppCategories.includes(b.id);
                                    if (aSelected && !bSelected) return -1;
                                    if (!aSelected && bSelected) return 1;
                                    return 0;
                                  }).map(sub => {
                                    const isSubSelected = editSuppCategories.includes(sub.id);
                                    return (
                                      <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() => {
                                          if (isSubSelected) {
                                            setEditSuppCategories(editSuppCategories.filter(id => id !== sub.id));
                                          } else {
                                            setEditSuppCategories([...editSuppCategories, sub.id]);
                                          }
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                                          isSubSelected
                                            ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-sm'
                                            : 'bg-brand-background text-brand-text-muted border border-brand-border hover:border-brand-primary/30 hover:bg-brand-surface'
                                        }`}
                                      >
                                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${isSubSelected ? 'bg-brand-primary border-brand-primary text-white' : 'bg-brand-surface border-brand-border'}`}>
                                          {isSubSelected && <Check size={8} strokeWidth={4} />}
                                        </div>
                                        <span className="truncate">{i18n.language === 'ar' ? sub.nameAr : sub.nameEn}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الكلمات المفتاحية' : 'Keywords'}</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newSuppKeyword}
                        onChange={e => setNewSuppKeyword(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newSuppKeyword.trim() && !editSuppKeywords.includes(newSuppKeyword.trim())) {
                              setEditSuppKeywords([...editSuppKeywords, newSuppKeyword.trim()]);
                              setNewSuppKeyword('');
                            }
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-brand-background border border-brand-border-light rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder={i18n.language === 'ar' ? 'أضف كلمة مفتاحية...' : 'Add a keyword...'}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSuppKeyword.trim() && !editSuppKeywords.includes(newSuppKeyword.trim())) {
                            setEditSuppKeywords([...editSuppKeywords, newSuppKeyword.trim()]);
                            setNewSuppKeyword('');
                          }
                        }}
                        className="px-4 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editSuppKeywords.map((kw, index) => (
                        <span key={`${kw}-${index}`} className="px-2 py-1 bg-brand-primary/10 text-brand-primary-hover rounded-lg text-[10px] font-bold border border-brand-primary/20 flex items-center gap-1">
                          {kw}
                          <button type="button" onClick={() => setEditSuppKeywords(editSuppKeywords.filter(k => k !== kw))} className="text-brand-primary hover:text-brand-primary p-1.5 -m-1.5 rounded-full hover:bg-brand-primary/20 transition-colors">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => {
                      setEditingSupplier(null);
                      setEditSuppCategorySearch('');
                    }} className="px-6 py-2 rounded-xl font-bold text-brand-text-muted hover:bg-brand-surface transition-all">
                      {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <HapticButton type="submit" className="px-6 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20">
                      {i18n.language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                    </HapticButton>
                  </div>
                </form>
              </div>
            ) : selectedAdminSupplier ? (
              <div className="p-4 md:p-8 overflow-y-auto h-full flex flex-col">
                <button 
                  onClick={() => setSelectedAdminSupplier(null)}
                  className="lg:hidden flex items-center gap-2 text-brand-text-muted mb-4 hover:text-brand-primary transition-colors"
                >
                  <ArrowLeft size={20} />
                  <span className="text-sm font-bold">{i18n.language === 'ar' ? 'العودة للقائمة' : 'Back to List'}</span>
                </button>
                <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-6">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6 w-full">
                    <div className="w-24 h-24 bg-brand-background rounded-3xl border border-brand-border-light flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                      {selectedAdminSupplier.logoUrl ? (
                        <BlurImage src={selectedAdminSupplier.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 size={40} className="text-brand-text-muted" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-brand-text-main mb-1">{selectedAdminSupplier.companyName || selectedAdminSupplier.name}</h2>
                      <p className="text-sm text-brand-text-muted font-medium">{selectedAdminSupplier.email}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="px-3 py-1 bg-brand-success/10 text-brand-success text-[10px] font-bold rounded-lg uppercase tracking-wider">
                          {selectedAdminSupplier.role}
                        </span>
                        {selectedAdminSupplier.rating && selectedAdminSupplier.reviewCount ? (
                          <span className="flex items-center gap-1 px-3 py-1 bg-brand-warning/10 text-brand-warning text-[10px] font-bold rounded-lg">
                            <Star size={12} className="fill-brand-warning" />
                            {selectedAdminSupplier.rating.toFixed(1)} ({selectedAdminSupplier.reviewCount})
                          </span>
                        ) : null}
                        <span className="text-[10px] text-brand-text-muted font-medium">
                          Joined {new Date(selectedAdminSupplier.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditSupplier(selectedAdminSupplier)}
                      className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary/20 transition-colors"
                      title={t('edit')}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => onViewProfile?.(selectedAdminSupplier.uid)}
                      className="p-2 bg-brand-background text-brand-text-muted rounded-xl hover:bg-brand-surface transition-colors"
                      title={t('profile')}
                    >
                      <UserIcon size={18} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmation({ type: 'supplier', uid: selectedAdminSupplier.uid, name: selectedAdminSupplier.companyName || selectedAdminSupplier.name || '' })}
                      className="p-2 bg-brand-error/10 text-brand-error rounded-xl hover:bg-brand-error/20 transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-brand-background rounded-2xl border border-brand-border-light">
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase mb-1">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone'}</p>
                    <p className="text-sm font-medium text-brand-text-main">{selectedAdminSupplier.phone || '-'}</p>
                  </div>
                  <div className="p-4 bg-brand-background rounded-2xl border border-brand-border-light">
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase mb-1">{i18n.language === 'ar' ? 'الموقع' : 'Location'}</p>
                    <p className="text-sm font-medium text-brand-text-main">{selectedAdminSupplier.location || '-'}</p>
                  </div>
                  <div className="p-4 bg-brand-background rounded-2xl border border-brand-border-light col-span-2">
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase mb-1">{i18n.language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}</p>
                    <p className="text-sm font-medium text-brand-text-main">{selectedAdminSupplier.website || '-'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-brand-text-main mb-4 flex items-center gap-2">
                    <Tag size={16} className="text-brand-primary" />
                    {i18n.language === 'ar' ? 'الفئات' : 'Categories'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAdminSupplier.categories?.map(catId => {
                      const cat = categories.find(c => c.id === catId);
                      return cat ? (
                        <span key={catId} className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-xl border border-brand-primary/20">
                          {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                        </span>
                      ) : null;
                    })}
                    {(!selectedAdminSupplier.categories || selectedAdminSupplier.categories.length === 0) && (
                      <p className="text-xs text-brand-text-muted italic">No categories assigned.</p>
                    )}
                  </div>
                </div>

                {selectedAdminSupplier.keywords && selectedAdminSupplier.keywords.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-sm font-bold text-brand-text-main mb-4 flex items-center gap-2">
                      <Tag size={16} className="text-brand-success" />
                      {i18n.language === 'ar' ? 'الكلمات المفتاحية' : 'Keywords'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAdminSupplier.keywords.map((kw, idx) => (
                        <span key={`${kw}-${idx}`} className="px-3 py-1.5 bg-brand-success/10 text-brand-success text-xs font-bold rounded-xl border border-brand-success/20">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <h4 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-3">
                    {i18n.language === 'ar' ? 'المحادثات الأخيرة' : 'Recent Chats'}
                  </h4>
                  <div className="bg-brand-background rounded-2xl border border-brand-border overflow-hidden">
                    {allChats.filter(c => c.supplierId === selectedAdminSupplier.uid).length > 0 ? (
                      <div className="divide-y divide-brand-border">
                        {allChats.filter(c => c.supplierId === selectedAdminSupplier.uid).slice(0, 5).map(chat => {
                          const otherUser = chatUsers[chat.customerId];
                          return (
                            <div key={chat.id} className="p-4 flex items-center justify-between hover:bg-brand-surface transition-colors cursor-pointer" onClick={() => onOpenChat(chat.id)}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary font-bold text-xs">
                                  {otherUser?.name?.[0] || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-brand-text-main">{otherUser?.name || 'Unknown'}</p>
                                  <p className="text-xs text-brand-text-muted truncate max-w-[200px]">{chat.lastMessage || 'No messages yet'}</p>
                                </div>
                              </div>
                              <span className="text-[10px] text-brand-text-muted">{chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString() : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-brand-text-muted text-sm">
                        {i18n.language === 'ar' ? 'لا توجد محادثات' : 'No chats found'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-brand-text-muted p-8 text-center">
                <div className="w-20 h-20 bg-brand-background rounded-full flex items-center justify-center mb-4 border border-brand-border">
                  <Users size={32} className="text-brand-text-muted/50" />
                </div>
                <h3 className="text-lg font-bold text-brand-text-main mb-2">
                  {i18n.language === 'ar' ? 'اختر مورداً' : 'Select a Supplier'}
                </h3>
                <p className="text-sm max-w-xs">
                  {i18n.language === 'ar' 
                    ? 'اختر مورداً من القائمة لعرض تفاصيله أو تعديل بياناته.' 
                    : 'Select a supplier from the list to view their details or edit their information.'}
                </p>
              </div>
            )}
          </div>
        </section>
        )}

        {/* Users Section */}
        {adminTab === 'users' && (
        <section className="h-[calc(100vh-140px)] min-h-[600px] flex flex-col lg:flex-row gap-6">
          {/* Left Pane: List */}
          <div className={`w-full lg:w-1/3 flex flex-col bg-brand-surface rounded-[2rem] border border-brand-border shadow-sm overflow-hidden h-full ${selectedAdminUser ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-6 border-b border-brand-border bg-brand-background/50 flex flex-col gap-4 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-brand-text-main flex items-center gap-3 text-lg">
                  <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                    <Users size={20} />
                  </div>
                  {i18n.language === 'ar' ? 'المستخدمين' : 'Users'}
                  <span className="text-xs bg-brand-surface border border-brand-border text-brand-text-main px-2.5 py-1 rounded-lg font-bold">{allUsers.filter(u => u.role !== 'supplier').length}</span>
                </h3>
                <button 
                  onClick={() => setIsAddingUser(true)}
                  className="p-2.5 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover transition-all shadow-sm hover:shadow-md hover:shadow-brand-primary/20"
                  title={i18n.language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="relative">
                <input 
                  type="text"
                  placeholder={i18n.language === 'ar' ? 'بحث عن مستخدم...' : 'Search users...'}
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-brand-surface border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all text-sm text-brand-text-main placeholder:text-brand-text-muted/50"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted/50" size={16} />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {isLoadingUsers ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="p-4 h-20 bg-brand-background/50 rounded-2xl animate-pulse border border-brand-border" />
                ))
              ) : (
                allUsers.filter(u => u.role !== 'supplier' && (u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))).slice(0, visibleUsersCount).map(u => (
                  <div 
                    key={u.uid}
                    onClick={() => setSelectedAdminUser(u)}
                    className={`p-4 rounded-2xl cursor-pointer flex items-center gap-4 transition-all border group ${
                      selectedAdminUser?.uid === u.uid 
                        ? 'bg-brand-primary/5 border-brand-primary/20 shadow-sm' 
                        : 'bg-brand-surface border-brand-border hover:bg-brand-background hover:border-brand-primary/20'
                    }`}
                  >
                    <div className="w-12 h-12 bg-brand-background rounded-xl flex items-center justify-center text-brand-text-muted overflow-hidden border border-brand-border shrink-0 group-hover:scale-105 transition-transform">
                      {u.logoUrl ? (
                        <BlurImage src={u.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={20} className="text-brand-text-muted/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-bold truncate transition-colors ${selectedAdminUser?.uid === u.uid ? 'text-brand-primary' : 'text-brand-text-main group-hover:text-brand-primary'}`}>
                        {u.name}
                      </h4>
                      <p className="text-xs text-brand-text-muted truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>
                ))
              )}
              {!isLoadingUsers && allUsers.filter(u => u.role !== 'supplier').length === 0 && (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-brand-background rounded-2xl flex items-center justify-center mb-3 border border-brand-border">
                    <Search size={20} className="text-brand-text-muted/50" />
                  </div>
                  <p className="text-sm font-bold text-brand-text-muted">
                    {i18n.language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                  </p>
                </div>
              )}
              {allUsers.filter(u => u.role !== 'supplier' && (u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))).length > visibleUsersCount && (
                <div ref={usersSentinelRef} className="h-12 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Details */}
          <div className={`w-full lg:w-2/3 flex flex-col bg-brand-surface rounded-[2rem] border border-brand-border shadow-sm overflow-hidden h-full relative ${selectedAdminUser ? 'flex' : 'hidden lg:flex'}`}>
            {selectedAdminUser ? (
              <div className="p-6 md:p-8 overflow-y-auto h-full flex flex-col custom-scrollbar">
                <button 
                  onClick={() => setSelectedAdminUser(null)}
                  className="lg:hidden flex items-center gap-2 text-brand-text-muted mb-6 hover:text-brand-primary transition-colors w-fit"
                >
                  <div className="p-2 bg-brand-background rounded-xl border border-brand-border">
                    <ArrowLeft size={18} />
                  </div>
                  <span className="text-sm font-bold">{i18n.language === 'ar' ? 'العودة للقائمة' : 'Back to List'}</span>
                </button>
                
                <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-6 bg-brand-background/50 p-6 rounded-3xl border border-brand-border">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6 w-full">
                    <div className="w-24 h-24 bg-brand-surface rounded-3xl border border-brand-border flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                      {selectedAdminUser.logoUrl ? (
                        <BlurImage src={selectedAdminUser.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={40} className="text-brand-text-muted/50" />
                      )}
                    </div>
                    <div className="text-center md:text-start">
                      <h2 className="text-2xl font-black text-brand-text-main mb-1">{selectedAdminUser.name}</h2>
                      <p className="text-sm text-brand-text-muted font-medium">{selectedAdminUser.email}</p>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                        <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-bold rounded-xl uppercase tracking-wider border border-brand-primary/20">
                          {selectedAdminUser.role}
                        </span>
                        {selectedAdminUser.rating && selectedAdminUser.reviewCount ? (
                          <span className="flex items-center gap-1 px-3 py-1 bg-brand-warning/10 text-brand-warning text-[10px] font-bold rounded-xl border border-brand-warning/20">
                            <Star size={12} className="fill-brand-warning" />
                            {selectedAdminUser.rating.toFixed(1)} ({selectedAdminUser.reviewCount})
                          </span>
                        ) : null}
                        {selectedAdminUser.lastActive && (
                          <span className="px-3 py-1 bg-brand-surface text-brand-text-muted text-[10px] font-bold rounded-xl border border-brand-border">
                            {i18n.language === 'ar' ? 'آخر نشاط: ' : 'Last active: '}
                            {new Date(selectedAdminUser.lastActive).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto justify-center md:justify-end shrink-0">
                    <button 
                      onClick={() => handleEditUser(selectedAdminUser)}
                      className="p-3 bg-brand-surface text-brand-primary rounded-xl border border-brand-border hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all shadow-sm"
                      title={t('edit')}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmation({ type: 'user', uid: selectedAdminUser.uid, name: selectedAdminUser.name || '' })}
                      className="p-3 bg-brand-surface text-brand-error rounded-xl border border-brand-border hover:bg-brand-error hover:text-white hover:border-brand-error transition-all shadow-sm"
                      title={t('delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-brand-background/50 p-6 rounded-3xl border border-brand-border h-full">
                      <h4 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                        {i18n.language === 'ar' ? 'معلومات التواصل' : 'Contact Information'}
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-brand-text-main bg-brand-surface p-3 rounded-2xl border border-brand-border">
                          <div className="p-2 bg-brand-background rounded-xl text-brand-primary shrink-0"><Mail size={16} /></div>
                          <span className="truncate font-medium">{selectedAdminUser.email}</span>
                        </div>
                        {selectedAdminUser.phone && (
                          <div className="flex items-center gap-4 text-sm text-brand-text-main bg-brand-surface p-3 rounded-2xl border border-brand-border">
                            <div className="p-2 bg-brand-background rounded-xl text-brand-primary shrink-0"><Phone size={16} /></div>
                            <span className="truncate font-medium">{selectedAdminUser.phone}</span>
                          </div>
                        )}
                        {selectedAdminUser.location && (
                          <div className="flex items-center gap-4 text-sm text-brand-text-main bg-brand-surface p-3 rounded-2xl border border-brand-border">
                            <div className="p-2 bg-brand-background rounded-xl text-brand-primary shrink-0"><MapPin size={16} /></div>
                            <span className="truncate font-medium">{selectedAdminUser.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-brand-background/50 p-6 rounded-3xl border border-brand-border h-full">
                      <h4 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                        {i18n.language === 'ar' ? 'إحصائيات الحساب' : 'Account Stats'}
                      </h4>
                      <div className="space-y-4">
                        <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border flex justify-between items-center">
                          <span className="text-xs font-bold text-brand-text-muted">{i18n.language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</span>
                          <span className="text-sm font-black text-brand-text-main font-mono">
                            {selectedAdminUser.createdAt ? new Date(selectedAdminUser.createdAt).toLocaleDateString() : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="bg-brand-background/50 p-6 rounded-3xl border border-brand-border">
                    <h4 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                      {i18n.language === 'ar' ? 'المحادثات الأخيرة' : 'Recent Chats'}
                    </h4>
                    <div className="bg-brand-surface rounded-2xl border border-brand-border overflow-hidden">
                      {allChats.filter(c => c.customerId === selectedAdminUser.uid || c.supplierId === selectedAdminUser.uid).length > 0 ? (
                        <div className="divide-y divide-brand-border">
                          {allChats.filter(c => c.customerId === selectedAdminUser.uid || c.supplierId === selectedAdminUser.uid).slice(0, 5).map(chat => {
                            const otherUserId = chat.customerId === selectedAdminUser.uid ? chat.supplierId : chat.customerId;
                            const otherUser = chatUsers[otherUserId];
                            return (
                              <div key={chat.id} className="p-4 flex items-center justify-between hover:bg-brand-background transition-colors cursor-pointer group" onClick={() => onOpenChat(chat.id)}>
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary font-black text-sm border border-brand-primary/20 group-hover:scale-105 transition-transform">
                                    {otherUser?.name?.[0] || '?'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-brand-text-main group-hover:text-brand-primary transition-colors">{otherUser?.name || 'Unknown'}</p>
                                    <p className="text-xs text-brand-text-muted truncate max-w-[200px] mt-0.5">{chat.lastMessage || 'No messages yet'}</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-brand-text-muted bg-brand-background px-2 py-1 rounded-lg border border-brand-border">{chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString() : ''}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-brand-background rounded-2xl flex items-center justify-center mb-3 border border-brand-border">
                            <MessageSquare size={20} className="text-brand-text-muted/50" />
                          </div>
                          <p className="text-sm font-bold text-brand-text-muted">
                            {i18n.language === 'ar' ? 'لا توجد محادثات' : 'No chats found'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-brand-text-muted p-8 text-center bg-brand-background/30">
                <div className="w-24 h-24 bg-brand-surface rounded-3xl flex items-center justify-center mb-6 border border-brand-border shadow-sm">
                  <Users size={40} className="text-brand-text-muted/30" />
                </div>
                <h3 className="text-xl font-black text-brand-text-main mb-2">
                  {i18n.language === 'ar' ? 'اختر مستخدماً' : 'Select a User'}
                </h3>
                <p className="text-sm max-w-sm text-brand-text-muted/80 leading-relaxed">
                  {i18n.language === 'ar' 
                    ? 'اختر مستخدماً من القائمة لعرض تفاصيله وإدارة حسابه.' 
                    : 'Select a user from the list to view their details and manage their account.'}
                </p>
              </div>
            )}
          </div>
        </section>
        )}

        {/* Categories Section */}
        {adminTab === 'categories' && (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleGlobalDragStart}
            onDragEnd={handleGlobalDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <section className="space-y-8">
          {/* Keyword Management Modal */}
          <AnimatePresence>
            {selectedCategoryForKeywords && (
              <KeywordManagerModal 
                category={selectedCategoryForKeywords}
                onClose={() => setSelectedCategoryForKeywords(null)}
                onUpdate={handleUpdateCategory}
                t={t}
                i18n={i18n}
              />
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-8">
            {isLoadingCategories ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-brand-surface rounded-[2rem] animate-pulse border border-brand-border" />
              ))
            ) : (
              <CategoryManagement 
                allCategories={categories}
                onReorder={(newCategories) => setCategories(newCategories)}
                onManageKeywords={setSelectedCategoryForKeywords}
                onSuggestMerges={handleSuggestMerges}
                isSuggestingMerges={isSuggestingMerges}
                activeCategoryTab={activeCategoryTab}
                setActiveCategoryTab={setActiveCategoryTab}
                aiSuggestions={aiSuggestions}
                isSuggesting={isSuggesting}
                onSuggestMainCategories={handleSuggestMainCategories}
                onSuggestSubcategories={handleSuggestSubcategories}
                onAddSuggested={handleAddSuggested}
                selectedParentId={selectedParentId}
                onClearParentSelection={() => setSelectedParentId(null)}
                t={t}
                i18n={i18n}
              />
            )}
          </div>

          {/* Maintenance: Orphaned Subcategories */}
          {categories.filter(c => c.parentId && !categories.find(p => p.id === c.parentId)).length > 0 && (
            <div className="mt-12 bg-brand-error/10 rounded-[2rem] border border-brand-error/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-error/10 text-brand-error rounded-xl">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="text-brand-error font-black dark:text-brand-error">{i18n.language === 'ar' ? 'فئات فرعية يتيمة' : 'Orphaned Subcategories'}</h4>
                  <p className="text-brand-error/70 text-xs dark:text-brand-error/70">{i18n.language === 'ar' ? 'هذه الفئات مرتبطة بفئات رئيسية تم حذفها' : 'These categories are linked to parent categories that no longer exist'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.filter(c => c.parentId && !categories.find(p => p.id === c.parentId)).map(c => (
                  <div key={c.id} className="bg-brand-surface p-4 rounded-2xl border border-brand-error/20 flex justify-between items-center shadow-sm group">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-brand-text-main">{i18n.language === 'ar' ? c.nameAr : c.nameEn}</span>
                      <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{i18n.language === 'ar' ? c.nameEn : c.nameAr}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteCategory(c.id)} 
                      className="text-brand-error/70 hover:text-brand-error p-2 hover:bg-brand-error/10 rounded-xl transition-all"
                      title="Delete Orphan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeId ? (
              <div className="bg-brand-surface p-4 rounded-2xl border-2 border-brand-primary shadow-2xl opacity-90 scale-105 transition-transform cursor-grabbing">
                <div className="flex items-center gap-3">
                  <Layers className="text-brand-primary" size={20} />
                  <div className="flex flex-col">
                    <span className="font-bold text-brand-text-main">
                      {categories.find(c => c.id === activeId)?.nameAr}
                    </span>
                    <span className="text-[10px] text-brand-text-muted uppercase font-bold tracking-widest">
                      {categories.find(c => c.id === activeId)?.nameEn}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </section>
        </DndContext>
      )}

        {/* Moderation Alerts Section */}
        {adminTab === 'moderation' && (
          <section className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-error/10 text-brand-error rounded-2xl flex items-center justify-center shadow-inner">
                  <Filter size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-text-main tracking-tight">
                    {i18n.language === 'ar' ? 'تنبيهات الرقابة التلقائية' : 'Auto-Moderation Alerts'}
                  </h3>
                  <p className="text-sm text-brand-text-muted mt-1">
                    {i18n.language === 'ar' ? 'مراجعة وإدارة المحتوى المخالف' : 'Review and manage flagged content'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-brand-surface rounded-[2rem] border border-brand-border shadow-xl shadow-brand-primary/5 overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-background/50 border-b border-brand-border">
                      <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">
                        {i18n.language === 'ar' ? 'التاريخ' : 'Date'}
                      </th>
                      <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">
                        {i18n.language === 'ar' ? 'المستخدم' : 'User'}
                      </th>
                      <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest">
                        {i18n.language === 'ar' ? 'المحتوى' : 'Content'}
                      </th>
                      <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">
                        {i18n.language === 'ar' ? 'السبب' : 'Reason'}
                      </th>
                      <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest text-center whitespace-nowrap">
                        {i18n.language === 'ar' ? 'الإجراء' : 'Action'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {moderationAlerts.map((alert) => {
                      const user = allUsers.find(u => u.uid === alert.senderId);
                      return (
                        <tr key={alert.id} className={`hover:bg-brand-background/50 transition-colors group ${alert.resolved ? 'opacity-60 bg-brand-background/30' : ''}`}>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-brand-text-main">
                                {new Date(alert.createdAt).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-brand-text-muted">
                                {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-brand-background rounded-xl flex items-center justify-center text-brand-text-muted overflow-hidden border border-brand-border shadow-sm shrink-0">
                                {user?.logoUrl ? (
                                  <BlurImage src={user.logoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <UserIcon size={18} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-brand-text-main truncate">{user?.name || '...'}</p>
                                <p className="text-xs text-brand-text-muted truncate">{user?.email || '...'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-sm text-brand-text-main line-clamp-2 max-w-md bg-brand-background/50 p-3 rounded-xl border border-brand-border/50">
                              {alert.text}
                            </p>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1.5 bg-brand-error/10 text-brand-error text-xs font-bold rounded-xl border border-brand-error/20">
                              {alert.reason}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-center whitespace-nowrap">
                            {!alert.resolved ? (
                              <button 
                                onClick={() => handleResolveAlert(alert.id)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-success/10 text-brand-success text-xs font-bold rounded-xl hover:bg-brand-success hover:text-white transition-all border border-brand-success/20 hover:shadow-lg hover:shadow-brand-success/20"
                              >
                                <Check size={16} />
                                {i18n.language === 'ar' ? 'حل التنبيه' : 'Resolve'}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-xs text-brand-text-muted font-bold uppercase tracking-wider bg-brand-background px-4 py-2 rounded-xl border border-brand-border">
                                <Check size={16} className="text-brand-success" />
                                {i18n.language === 'ar' ? 'تم الحل' : 'Resolved'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {moderationAlerts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-brand-text-muted">
                            <Filter size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">{i18n.language === 'ar' ? 'لا توجد تنبيهات حالياً' : 'No alerts at the moment'}</p>
                            <p className="text-sm opacity-70 mt-1">{i18n.language === 'ar' ? 'النظام خالي من المخالفات' : 'System is clear of violations'}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-brand-border">
                {moderationAlerts.map((alert) => {
                  const user = allUsers.find(u => u.uid === alert.senderId);
                  return (
                    <div key={alert.id} className={`p-5 space-y-4 transition-colors ${alert.resolved ? 'opacity-60 bg-brand-background/30' : 'hover:bg-brand-background/50'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 bg-brand-background rounded-xl flex items-center justify-center text-brand-text-muted overflow-hidden border border-brand-border shrink-0">
                            {user?.logoUrl ? (
                              <BlurImage src={user.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon size={20} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-brand-text-main truncate">{user?.name || '...'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-brand-text-muted font-medium">
                                {new Date(alert.createdAt).toLocaleDateString()}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-brand-border"></span>
                              <span className="text-[10px] text-brand-text-muted font-medium">
                                {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 inline-flex items-center px-2.5 py-1 bg-brand-error/10 text-brand-error text-[10px] font-bold rounded-lg border border-brand-error/20">
                          {alert.reason}
                        </span>
                      </div>
                      <div className="bg-brand-background/50 p-4 rounded-2xl border border-brand-border/50">
                        <p className="text-sm text-brand-text-main leading-relaxed">{alert.text}</p>
                      </div>
                      <div className="flex justify-end pt-2">
                        {!alert.resolved ? (
                          <button 
                            onClick={() => handleResolveAlert(alert.id)}
                            className="w-full sm:w-auto px-6 py-3 bg-brand-success text-white text-sm font-bold rounded-xl hover:bg-brand-success/90 transition-all shadow-lg shadow-brand-success/20 flex items-center justify-center gap-2"
                          >
                            <Check size={18} />
                            {i18n.language === 'ar' ? 'حل التنبيه' : 'Resolve Alert'}
                          </button>
                        ) : (
                          <span className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs text-brand-text-muted font-bold uppercase tracking-wider bg-brand-background px-6 py-3 rounded-xl border border-brand-border">
                            <Check size={16} className="text-brand-success" />
                            {i18n.language === 'ar' ? 'تم الحل' : 'Resolved'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {moderationAlerts.length === 0 && (
                  <div className="p-12 text-center">
                    <Filter size={40} className="mx-auto mb-4 text-brand-text-muted opacity-20" />
                    <p className="text-brand-text-muted font-medium">{i18n.language === 'ar' ? 'لا توجد تنبيهات حالياً' : 'No alerts at the moment'}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
        {adminTab === 'chats' && (
        <section className="space-y-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center shadow-inner">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-text-main tracking-tight">
                  {i18n.language === 'ar' ? 'سجل المحادثات' : 'Chat History'}
                </h3>
                <p className="text-sm text-brand-text-muted mt-1">
                  {i18n.language === 'ar' ? 'مراجعة وتلخيص المحادثات بين الموردين والعملاء' : 'Review and summarize chats between suppliers and customers'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-surface rounded-[2rem] border border-brand-border shadow-xl shadow-brand-primary/5 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-background/50 border-b border-brand-border">
                    <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">
                      {i18n.language === 'ar' ? 'المورد' : 'Supplier'}
                    </th>
                    <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">
                      {i18n.language === 'ar' ? 'العميل' : 'Customer'}
                    </th>
                    <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest">
                      {i18n.language === 'ar' ? 'آخر رسالة' : 'Last Message'}
                    </th>
                    <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">
                      {i18n.language === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="px-8 py-5 text-xs font-black text-brand-text-muted uppercase tracking-widest text-center whitespace-nowrap">
                      {i18n.language === 'ar' ? 'الإجراء' : 'Action'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {allChats.filter(c => !c.isCategoryChat).map(chat => {
                    const supplier = chatUsers[chat.supplierId];
                    const customer = chatUsers[chat.customerId];
                    const isExpired = chat.updatedAt && (Date.now() - new Date(chat.updatedAt).getTime() > 24 * 60 * 60 * 1000);

                    return (
                      <tr key={chat.id} className="hover:bg-brand-background/50 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20 shadow-sm">
                              {supplier?.logoUrl ? (
                                <BlurImage src={supplier.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <Building2 size={18} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-brand-text-main truncate">
                                {supplier?.companyName || supplier?.name || '...'}
                              </p>
                              <p className="text-xs text-brand-text-muted truncate">
                                {supplier?.email || '...'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-brand-background rounded-xl flex items-center justify-center text-brand-text-muted shrink-0 border border-brand-border shadow-sm">
                              <UserIcon size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-brand-text-main truncate">
                                {customer?.name || '...'}
                              </p>
                              <p className="text-xs text-brand-text-muted truncate">
                                {customer?.email || '...'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm text-brand-text-muted line-clamp-2 max-w-xs bg-brand-background/50 p-3 rounded-xl border border-brand-border/50">
                            {chat.lastMessage || '...'}
                          </p>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-brand-text-main">
                              {new Date(chat.updatedAt).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-brand-text-muted">
                              {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex items-center justify-center gap-3">
                            {isExpired && (
                              <span className="px-3 py-1.5 bg-brand-warning/10 text-brand-warning text-[10px] font-bold rounded-xl uppercase tracking-wider border border-brand-warning/20">
                                {i18n.language === 'ar' ? 'منتهي' : 'Expired'}
                              </span>
                            )}
                            <button 
                              onClick={() => onOpenChat(chat.id)}
                              className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all border border-brand-primary/20 hover:shadow-lg hover:shadow-brand-primary/20"
                              title={i18n.language === 'ar' ? 'فتح المحادثة' : 'Open Chat'}
                            >
                              <MessageSquare size={18} />
                            </button>
                            <button 
                              onClick={() => handleSummarizeChat(chat.id)}
                              disabled={isSummarizing[chat.id]}
                              className="p-2.5 bg-brand-success/10 text-brand-success rounded-xl hover:bg-brand-success hover:text-white transition-all border border-brand-success/20 hover:shadow-lg hover:shadow-brand-success/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={i18n.language === 'ar' ? 'تلخيص بالذكاء الاصطناعي' : 'AI Summarize'}
                            >
                              {isSummarizing[chat.id] ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Sparkles size={18} />
                              )}
                            </button>
                          </div>
                          {chatSummaries[chat.id] && (
                            <div className="mt-4 p-4 bg-brand-success/5 rounded-xl text-xs text-brand-text-main border border-brand-success/20 text-left relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-brand-success"></div>
                              <div className="flex items-start gap-2">
                                <Sparkles size={14} className="text-brand-success shrink-0 mt-0.5" />
                                <p className="leading-relaxed">{chatSummaries[chat.id]}</p>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {allChats.filter(c => !c.isCategoryChat).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-brand-text-muted">
                          <MessageSquare size={48} className="mb-4 opacity-20" />
                          <p className="text-lg font-medium">{i18n.language === 'ar' ? 'لا توجد محادثات مؤرشفة بعد' : 'No archived chats yet'}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-brand-border">
              {allChats.filter(c => !c.isCategoryChat).map(chat => {
                const supplier = chatUsers[chat.supplierId];
                const customer = chatUsers[chat.customerId];
                const isExpired = chat.updatedAt && (Date.now() - new Date(chat.updatedAt).getTime() > 24 * 60 * 60 * 1000);

                return (
                  <div key={chat.id} className="p-5 space-y-5 hover:bg-brand-background/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-4 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                            {supplier?.logoUrl ? (
                              <BlurImage src={supplier.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <Building2 size={16} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider block mb-0.5">{i18n.language === 'ar' ? 'المورد' : 'Supplier'}</span>
                            <span className="text-sm font-bold text-brand-text-main truncate block">{supplier?.companyName || supplier?.name || '...'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-background rounded-xl flex items-center justify-center text-brand-text-muted shrink-0 border border-brand-border">
                            <UserIcon size={16} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider block mb-0.5">{i18n.language === 'ar' ? 'العميل' : 'Customer'}</span>
                            <span className="text-sm font-bold text-brand-text-main truncate block">{customer?.name || '...'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-brand-text-main">{new Date(chat.updatedAt).toLocaleDateString()}</p>
                        <p className="text-[10px] text-brand-text-muted mt-0.5">{new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        {isExpired && (
                          <span className="inline-block mt-2 px-2.5 py-1 bg-brand-warning/10 text-brand-warning text-[9px] font-bold rounded-lg border border-brand-warning/20 uppercase tracking-wider">
                            {i18n.language === 'ar' ? 'منتهي' : 'Expired'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-brand-background/50 p-4 rounded-2xl border border-brand-border/50">
                      <p className="text-sm text-brand-text-main line-clamp-2">
                        {chat.lastMessage || '...'}
                      </p>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => onOpenChat(chat.id)}
                        className="flex-1 py-3 bg-brand-primary text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20"
                      >
                        <MessageSquare size={18} />
                        {i18n.language === 'ar' ? 'فتح المحادثة' : 'Open Chat'}
                      </button>
                      <button 
                        onClick={() => handleSummarizeChat(chat.id)}
                        disabled={isSummarizing[chat.id]}
                        className="px-5 py-3 bg-brand-success/10 text-brand-success rounded-xl hover:bg-brand-success hover:text-white transition-all border border-brand-success/20 hover:shadow-lg hover:shadow-brand-success/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title={i18n.language === 'ar' ? 'تلخيص بالذكاء الاصطناعي' : 'AI Summarize'}
                      >
                        {isSummarizing[chat.id] ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles size={18} />
                        )}
                      </button>
                    </div>
                    
                    {chatSummaries[chat.id] && (
                      <div className="mt-4 p-4 bg-brand-success/5 rounded-xl text-xs text-brand-text-main border border-brand-success/20 text-left relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-success"></div>
                        <div className="flex items-start gap-2">
                          <Sparkles size={14} className="text-brand-success shrink-0 mt-0.5" />
                          <p className="leading-relaxed">{chatSummaries[chat.id]}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {allChats.filter(c => !c.isCategoryChat).length === 0 && (
                <div className="p-12 text-center">
                  <MessageSquare size={40} className="mx-auto mb-4 text-brand-text-muted opacity-20" />
                  <p className="text-brand-text-muted font-medium">{i18n.language === 'ar' ? 'لا توجد محادثات مؤرشفة بعد' : 'No archived chats yet'}</p>
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {adminTab === 'user-data' && (
          <UserDataManager 
            allUsers={allUsers} 
            isRtl={isRtl} 
            t={t} 
          />
        )}

        {adminTab === 'marketing' && (
          <MarketingManager 
            allUsers={allUsers} 
            isRtl={isRtl} 
            t={t} 
          />
        )}

        {adminTab === 'ai' && (
          <div className="animate-fade-in">
            <AdminNeuralHub />
          </div>
        )}

        {adminTab === 'cost' && (
          <div className="animate-fade-in">
            <CostAnalysisDashboard />
          </div>
        )}

        {/* Merge Categories Modal */}
        <AnimatePresence>
          {showMergeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-brand-surface w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden border border-brand-border"
              >
                <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-background/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                      <Combine size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-brand-text-main">
                        {i18n.language === 'ar' ? 'اقتراحات الدمج الذكية' : 'Smart Merge Suggestions'}
                      </h3>
                      <p className="text-sm text-brand-text-muted mt-1">
                        {i18n.language === 'ar' ? 'تم تحليل الفئات واقتراح الدمج لتقليل التكرار' : 'Categories analyzed and merges suggested to reduce duplication'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMergeModal(false)}
                    className="p-2 text-brand-text-muted hover:bg-brand-background rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                  {mergeSuggestions.length === 0 ? (
                    <div className="text-center py-8 text-brand-text-muted">
                      <Sparkles size={32} className="mx-auto mb-3 opacity-20" />
                      <p>{i18n.language === 'ar' ? 'لا توجد اقتراحات دمج حالياً' : 'No merge suggestions currently'}</p>
                    </div>
                  ) : (
                    mergeSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-5 bg-brand-background/50 rounded-2xl border border-brand-border hover:border-brand-primary/30 transition-all">
                        <div className="flex flex-col md:flex-row gap-6 justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-brand-text-main mb-3 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-brand-primary" />
                              {i18n.language === 'ar' ? 'الفئات المقترح دمجها:' : 'Categories to merge:'}
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {suggestion.categoryIds.map((id: string) => {
                                const cat = categories.find(c => c.id === id);
                                return cat ? (
                                  <span key={id} className="px-3 py-1.5 bg-brand-surface text-brand-text-main text-sm font-medium rounded-xl border border-brand-border flex items-center gap-2">
                                    {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                                    <Trash2 size={12} className="text-brand-error/50" />
                                  </span>
                                ) : null;
                              })}
                            </div>
                            
                            <div className="bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/10">
                              <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-2">
                                {i18n.language === 'ar' ? 'الاسم الجديد المقترح' : 'Suggested New Name'}
                              </h4>
                              <div className="flex items-center gap-4">
                                <span className="font-black text-brand-text-main text-lg">
                                  {i18n.language === 'ar' ? suggestion.suggestedNameAr : suggestion.suggestedNameEn}
                                </span>
                                <span className="text-xs text-brand-text-muted bg-brand-surface px-2 py-1 rounded-md border border-brand-border">
                                  {i18n.language === 'ar' ? suggestion.suggestedNameEn : suggestion.suggestedNameAr}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-brand-text-muted mt-4 italic border-l-2 border-brand-primary/30 pl-3">
                              {suggestion.reason}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-end shrink-0">
                            <button
                              onClick={() => handleApproveMerge(suggestion)}
                              className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-md shadow-brand-primary/20 flex items-center gap-2"
                            >
                              <Check size={18} />
                              {i18n.language === 'ar' ? 'تأكيد الدمج' : 'Approve Merge'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {(isAddingUser || editingUser) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddingUser(false); setEditingUser(null); }}
              className="absolute inset-0 bg-brand-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-brand-surface rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-brand-border"
            >
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-background/50">
                <h3 className="text-xl font-black text-brand-text-main flex items-center gap-2">
                  <Users size={24} className="text-brand-primary" />
                  {editingUser 
                    ? (i18n.language === 'ar' ? 'تعديل مستخدم' : 'Edit User')
                    : (i18n.language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User')}
                </h3>
                <button onClick={() => { setIsAddingUser(false); setEditingUser(null); }} className="p-2 hover:bg-brand-background rounded-full text-brand-text-muted transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-text-muted mb-1">{i18n.language === 'ar' ? 'الاسم' : 'Name'}</label>
                    <input 
                      type="text" 
                      required
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                      className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                    />
                  </div>
                  {newUserRole === 'supplier' && (
                    <div>
                      <label className="block text-xs font-bold text-brand-text-muted mb-1">{i18n.language === 'ar' ? 'اسم الشركة' : 'Company Name'}</label>
                      <input 
                        type="text" 
                        required
                        value={newUserCompanyName}
                        onChange={e => setNewUserCompanyName(e.target.value)}
                        className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-brand-text-muted mb-1">{i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input 
                      type="email" 
                      required
                      disabled={!!editingUser}
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                      className={`w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main ${editingUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  {!editingUser && (
                    <div>
                      <label className="block text-xs font-bold text-brand-text-muted mb-1">{i18n.language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          required
                          value={newUserPassword}
                          onChange={e => setNewUserPassword(e.target.value)}
                          className="flex-1 px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                        />
                        <button
                          type="button"
                          onClick={generateRandomPassword}
                          className="px-4 py-3 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl font-bold hover:bg-brand-primary/20 transition-colors"
                          title={i18n.language === 'ar' ? 'توليد كلمة مرور عشوائية' : 'Generate random password'}
                        >
                          <Sparkles size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-brand-text-muted mb-1">{i18n.language === 'ar' ? 'الصلاحية' : 'Role'}</label>
                    <select 
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value as any)}
                      className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                    >
                      <option value="manager">{i18n.language === 'ar' ? 'مدير' : 'Manager'}</option>
                      <option value="admin">{i18n.language === 'ar' ? 'أدمن' : 'Admin'}</option>
                      <option value="supervisor">{i18n.language === 'ar' ? 'مشرف' : 'Supervisor'}</option>
                      <option value="customer">{i18n.language === 'ar' ? 'عميل' : 'Customer'}</option>
                      <option value="supplier">{i18n.language === 'ar' ? 'مورد' : 'Supplier'}</option>
                    </select>
                  </div>
                  
                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button 
                      type="button"
                      onClick={() => { setIsAddingUser(false); setEditingUser(null); }}
                      className="px-6 py-2.5 text-brand-text-muted font-bold hover:bg-brand-background rounded-xl transition-colors"
                    >
                      {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button 
                      type="submit"
                      disabled={isCreatingUser}
                      className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isCreatingUser ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check size={18} />
                      )}
                      {i18n.language === 'ar' ? 'إضافة المستخدم' : 'Add User'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmation(null)}
              className="absolute inset-0 bg-brand-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-brand-surface rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-brand-border max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-brand-primary/20 scrollbar-track-brand-surface"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-brand-error/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-error">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-brand-text-main mb-2">
                  {i18n.language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
                </h3>
                <p className="text-brand-text-muted text-sm mb-6">
                  {i18n.language === 'ar' 
                    ? `هل أنت متأكد من أنك تريد حذف "${deleteConfirmation.name}"؟ لا يمكن التراجع عن هذا الإجراء. ملاحظة: سيتم حذف بيانات المستخدم من التطبيق فقط، ولحذفه نهائياً يجب حذفه من لوحة تحكم Firebase Authentication.`
                    : `Are you sure you want to delete "${deleteConfirmation.name}"? This action cannot be undone. Note: The user's data will be deleted from the app, but to completely remove their account, you must delete them from the Firebase Authentication console.`}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirmation(null)}
                    className="flex-1 px-4 py-3 bg-brand-background text-brand-text-main font-bold rounded-xl hover:bg-brand-surface transition-colors border border-brand-border"
                  >
                    {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => {
                      if (deleteConfirmation.type === 'user') {
                        handleDeleteUser(deleteConfirmation.uid);
                      } else {
                        handleDeleteSupplier(deleteConfirmation.uid);
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-brand-error text-white font-bold rounded-xl hover:bg-brand-error transition-colors shadow-lg shadow-brand-error/50/20"
                  >
                    {i18n.language === 'ar' ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
    );
  };

  const renderCustomer = () => (
    <div className="p-6 space-y-6">
      {/* Switch back to Supplier Mode */}
      {profile?.role === 'supplier' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-text-main tracking-tight">
                {i18n.language === 'ar' ? 'واجهة العملاء' : 'Customer View'}
              </h1>
              <p className="text-sm text-brand-text-muted mt-1">
                {i18n.language === 'ar' ? 'تصفح الطلبات والمنتجات كعميل' : 'Browse requests and products as a customer'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsCustomerMode(false)}
            className="px-6 py-3 bg-brand-background border border-brand-border text-brand-text-main rounded-xl font-bold hover:bg-brand-surface hover:border-brand-primary/30 transition-all shadow-sm flex items-center justify-center gap-2 group"
          >
            <Building2 size={18} className="text-brand-primary group-hover:scale-110 transition-transform" />
            {i18n.language === 'ar' ? 'العودة لواجهة الموردين' : 'Back to Supplier View'}
          </button>
        </div>
      )}
      {/* Profile Settings Section for Customer */}
      {(supplierTab === 'personal' || supplierTab === 'marketing') && (
        <section className="bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-xl shadow-brand-primary/5 overflow-hidden mb-8">
          <div className="bg-brand-primary px-8 py-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl text-white">
                {supplierTab === 'personal' ? <UserIcon size={24} /> : <Megaphone size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {supplierTab === 'personal' 
                    ? (i18n.language === 'ar' ? 'الملف الشخصي' : 'Personal Profile')
                    : (i18n.language === 'ar' ? 'التسويق والنمو' : 'Marketing & Growth')}
                </h3>
                <p className="text-white/70 text-xs">
                  {supplierTab === 'personal'
                    ? (i18n.language === 'ar' ? 'قم بتحديث بياناتك الشخصية وصورتك' : 'Update your personal details and photo')
                    : (i18n.language === 'ar' ? 'شارك كود الإحالة الخاص بك واجمع النقاط' : 'Share your referral code and earn points')}
                </p>
              </div>
            </div>
            {saveSuccess && supplierTab === 'personal' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-white text-sm font-bold"
              >
                <Check size={18} />
                {i18n.language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved Successfully'}
              </motion.div>
            )}
          </div>

          {supplierTab === 'personal' ? (
            <form onSubmit={handleUpdateProfile} className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Photo Upload */}
            <div className="flex flex-col items-center justify-center p-6 bg-brand-background rounded-3xl border-2 border-dashed border-brand-border group hover:border-brand-primary transition-all">
              <div className="relative w-32 h-32 mb-4">
                <div className="w-full h-full bg-brand-surface rounded-2xl border border-brand-border flex items-center justify-center text-brand-text-muted overflow-hidden shadow-sm">
                  {editLogoUrl ? (
                    <BlurImage src={editLogoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={48} />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2 bg-brand-primary text-white rounded-xl cursor-pointer shadow-lg hover:bg-brand-primary-hover transition-all">
                  <Upload size={18} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading || isGeneratingLogo} />
                </label>
                {(isUploading || isGeneratingLogo) && (
                  <div className="absolute inset-0 bg-brand-surface/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                  {i18n.language === 'ar' ? 'الصورة الشخصية' : 'Personal Photo'}
                </span>
                <button
                  type="button"
                  onClick={handleGenerateAILogo}
                  disabled={isGeneratingLogo || isUploading}
                  className="mt-2 w-full max-w-[220px] flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-black text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  title={i18n.language === 'ar' ? 'ابتكر صورة شخصية فخمة باستخدام الذكاء الاصطناعي' : 'Create a luxurious profile picture using AI'}
                >
                  <Sparkles size={14} className={isGeneratingLogo ? "animate-pulse text-amber-200" : ""} />
                  {i18n.language === 'ar' ? (isGeneratingLogo ? 'جاري الابتكار...' : 'تصميم حصري بالذكاء الاصطناعي') : (isGeneratingLogo ? 'Generating...' : 'Exclusive AI Design')}
                </button>
              </div>
              {uploadError && (
                <p className="text-[10px] text-brand-error mt-2 text-center font-bold">{uploadError}</p>
              )}
            </div>

            {/* Basic Info */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الاسم' : 'Name'}</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                  <input 
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                    placeholder={t('name')}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{t('email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                    placeholder={t('email')}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'رقم التواصل' : 'Contact Number'}</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
                  <input 
                    type="tel" 
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                    placeholder={i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الموقع' : 'Location'}</label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                    <input 
                      type="text" 
                      value={editLocation}
                      onChange={e => setEditLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                      placeholder={i18n.language === 'ar' ? 'الموقع' : 'Location'}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-brand-primary hover:bg-brand-primary/10 transition-all shadow-sm flex items-center justify-center min-w-[44px]"
                    title={i18n.language === 'ar' ? 'تحديد موقعي تلقائياً' : 'Detect my location'}
                  >
                    {isDetectingLocation ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
                    ) : (
                      <MapPin size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

              <div className="mt-8 flex justify-end">
                <HapticButton
                  type="submit"
                  disabled={isSaving}
                  className="bg-brand-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-brand-primary-hover transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save size={20} />
                      {i18n.language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                    </>
                  )}
                </HapticButton>
              </div>
            </form>
          ) : (
            <div className="p-8">
              {profile && <MarketingView profile={profile} isRtl={isRtl} />}
            </div>
          )}
        </section>
      )}

      {/* Requests Section */}
      {supplierTab === 'dashboard' && (!profile || profile.role === 'customer' || isCustomerMode) && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-2xl font-bold text-brand-text-main">{t('my_requests')}</h3>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                <input 
                  type="text" 
                  value={requestSearch}
                  onChange={e => {
                    setRequestSearch(e.target.value);
                    if (isSemanticSearching) setIsSemanticSearching(false);
                  }}
                  placeholder={i18n.language === 'ar' ? 'ابحث في طلباتك...' : 'Search your requests...'}
                  className="w-full pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm text-brand-text-main"
                />
              </div>
              <button
                onClick={handleSemanticSearch}
                disabled={isSemanticSearching || !requestSearch}
                className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary/20 transition-colors disabled:opacity-50"
                title={i18n.language === 'ar' ? 'بحث ذكي بالذكاء الاصطناعي' : 'Smart AI Search'}
              >
                {isSemanticSearching ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary"></div>
                ) : (
                  <Bot size={20} />
                )}
              </button>
            </div>
          </div>

          <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {isLoadingRequests ? (
            [1, 2, 3].map(i => <RequestSkeleton key={i} />)
          ) : filteredRequests.length === 0 ? (
            <p className="text-center text-brand-text-muted py-12">{t('no_requests')}</p>
          ) : (
            filteredRequests
              .slice(0, showAllRequests ? visibleRequestsCount : 3)
              .map(req => (
                <motion.div 
                  key={req.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className="bg-brand-surface p-6 rounded-2xl border border-brand-border shadow-sm"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-2">
                      <h4 className="text-2xl font-black text-brand-text-main tracking-tight">{req.productName}</h4>
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-lg border border-brand-primary/20">
                          {getCategoryPath(req.categoryId)}
                        </span>
                        <div className="flex items-center gap-1.5 text-brand-text-muted text-[11px] font-bold">
                          <Clock size={14} className="text-brand-primary/40" />
                          {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-brand-text-muted text-[11px] font-bold">
                          <MapPin size={14} className="text-brand-primary/40" />
                          {req.location || (i18n.language === 'ar' ? 'غير محدد' : 'Not specified')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        req.status === 'open' 
                          ? 'bg-brand-success text-white shadow-brand-success/20' 
                          : 'bg-brand-background text-brand-text-muted border border-brand-border'
                      }`}>
                        {req.status === 'open' ? (i18n.language === 'ar' ? 'مفتوح' : 'Open') : (i18n.language === 'ar' ? 'مغلق' : 'Closed')}
                      </span>
                    </div>
                  </div>

                  {/* Integrated Suppliers Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-brand-primary rounded-full" />
                        <h5 className="text-sm font-black text-brand-text-main uppercase tracking-wider">
                          {i18n.language === 'ar' ? 'الموردون المقترحون' : 'Suggested Suppliers'}
                        </h5>
                      </div>
                      <button 
                        onClick={() => handleSuggestMoreSuppliers(req.id, req.productName, req.categoryId)}
                        disabled={isSuggestingMore[req.id]}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-primary-hover transition-all duration-300 disabled:opacity-50 shadow-lg shadow-brand-primary/20 group"
                      >
                        {isSuggestingMore[req.id] ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                        )}
                        {i18n.language === 'ar' ? 'مسح للمزيد' : 'Scan for More'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {getSuppliersForRequest(req).map(supp => (
                        <div 
                          key={supp.uid}
                          className="bg-brand-background p-5 rounded-[2rem] border border-brand-border hover:border-brand-primary/40 transition-all duration-500 group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                          
                          <div className="relative">
                            <div className="flex items-center gap-4 mb-5">
                              <div 
                                className="w-14 h-14 bg-white rounded-2xl border border-brand-border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-all duration-300 cursor-pointer hover:opacity-80"
                                onClick={() => onViewProfile?.(supp.uid)}
                              >
                                {supp.logoUrl ? (
                                  <BlurImage src={supp.logoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Building2 size={24} className="text-brand-text-muted/30" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h6 className="text-sm font-black text-brand-text-main truncate group-hover:text-brand-primary transition-colors cursor-pointer" onClick={() => onViewProfile?.(supp.uid)}>
                                  {supp.companyName || supp.name}
                                </h6>
                                <div className="flex items-center gap-1.5 text-[10px] text-brand-text-muted font-bold">
                                  <MapPin size={12} className="text-brand-primary/40" />
                                  <span className="truncate">{supp.location || (i18n.language === 'ar' ? 'غير محدد' : 'Not set')}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button 
                                onClick={() => onViewProfile?.(supp.uid)}
                                className="flex-1 py-2.5 bg-white text-brand-text-main text-[10px] font-black uppercase tracking-widest rounded-xl border border-brand-border hover:bg-brand-surface transition-all"
                              >
                                {i18n.language === 'ar' ? 'الملف' : 'Profile'}
                              </button>
                              <button 
                                onClick={() => handleStartChat(req.id, supp.uid, profile!.uid)}
                                disabled={!!chatLoading}
                                className="flex-1 py-2.5 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-primary-hover transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-primary/10"
                              >
                                <MessageSquare size={12} />
                                {i18n.language === 'ar' ? 'دردشة' : 'Chat'}
                              </button>
                              <button 
                                onClick={() => handlePinSupplier(req.id, supp.uid)}
                                className={`p-2.5 rounded-xl border transition-all duration-300 ${
                                  req.pinnedSupplierIds?.includes(supp.uid)
                                    ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20'
                                    : 'bg-white border-brand-border text-brand-text-muted hover:text-brand-primary'
                                }`}
                                title={req.pinnedSupplierIds?.includes(supp.uid) ? t('unpin') : t('pin')}
                              >
                                <Star size={14} fill={req.pinnedSupplierIds?.includes(supp.uid) ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <OffersList 
                    requestId={req.id} 
                    customerId={profile!.uid}
                    isAdmin={isAdmin(profile)}
                    onChat={(suppId) => handleStartChat(req.id, suppId, profile!.uid)} 
                    onOpenProfile={setSelectedSupplier}
                    chatLoading={chatLoading}
                  />
                </motion.div>
              ))
          )}
        </AnimatePresence>
        {!isLoadingRequests && filteredRequests.length === 0 && <p className="text-center text-brand-text-muted py-12">{t('no_requests')}</p>}
        {filteredRequests.length > 3 && (
          <button
            onClick={() => setShowAllRequests(!showAllRequests)}
            className="mt-2 flex items-center gap-2 text-brand-primary font-bold hover:text-brand-primary-hover transition-colors mx-auto bg-brand-primary/10 px-4 py-2 rounded-xl text-sm"
          >
            {showAllRequests 
              ? (i18n.language === 'ar' ? 'عرض أقل' : 'Show Less') 
              : (i18n.language === 'ar' ? `عرض المزيد (${filteredRequests.length - 3}+)` : `Show More (${filteredRequests.length - 3}+)`)}
            {showAllRequests ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        {showAllRequests && filteredRequests.length > visibleRequestsCount && (
          <div ref={requestsSentinelRef} className="h-20 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin opacity-50"></div>
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );

  const renderSupplier = () => (
    <div className="p-6 space-y-8">
      <AnimatePresence>
        {dashboardError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-brand-error text-sm font-bold bg-brand-error/10 p-3 rounded-xl border border-brand-error/20 text-center mx-auto max-w-md sticky top-4 z-10 shadow-sm"
          >
            {dashboardError}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Switch to Customer Mode & Header */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/40 dark:border-gray-700/50 shadow-2xl shadow-brand-primary/5 mb-8 group">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-teal/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl group-hover:bg-brand-primary/20 transition-colors duration-700" />
        
        <div className="relative flex items-center gap-5 z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-teal rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-brand-primary/20 transform group-hover:scale-105 transition-transform duration-500">
            {supplierTab === 'dashboard' ? <LayoutGrid size={28} /> : 
             supplierTab === 'personal' ? <UserIcon size={28} /> : 
             supplierTab === 'marketing' ? <Megaphone size={28} /> : <Building2 size={28} />}
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-text-main to-brand-primary tracking-tight">
              {supplierTab === 'dashboard' ? (i18n.language === 'ar' ? 'لوحة تحكم المورد' : 'Supplier Dashboard') : 
               supplierTab === 'personal' ? (i18n.language === 'ar' ? 'الملف الشخصي' : 'Personal Profile') :
               supplierTab === 'marketing' ? (i18n.language === 'ar' ? 'التسويق والنمو' : 'Marketing & Growth') :
               (i18n.language === 'ar' ? 'ملف الشركة' : 'Company Profile')}
            </h1>
            <p className="text-sm text-brand-text-muted mt-1 font-medium">
              {supplierTab === 'marketing' 
                ? (i18n.language === 'ar' ? 'شارك كود الإحالة الخاص بك واجمع النقاط' : 'Share your referral code and earn points')
                : (i18n.language === 'ar' ? 'إدارة أعمالك وعروضك بكل احترافية' : 'Manage your business and offers professionally')}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsCustomerMode(true)}
          className="relative z-10 px-8 py-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/40 dark:border-gray-700/50 text-brand-text-main rounded-2xl font-bold hover:bg-white dark:hover:bg-gray-800 hover:border-brand-primary/30 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/0 via-brand-primary/5 to-brand-primary/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
          <Users size={20} className="text-brand-primary" />
          {i18n.language === 'ar' ? 'التبديل إلى واجهة العملاء' : 'Switch to Customer View'}
        </button>
      </div>

      {/* Profile Settings Section */}
      {(supplierTab === 'personal' || supplierTab === 'company') && (
        <section className="bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-xl shadow-brand-primary/5 overflow-hidden">
          <div className="bg-brand-primary px-8 py-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl text-white">
                {supplierTab === 'personal' ? <UserIcon size={24} /> : <Building2 size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {supplierTab === 'personal' 
                    ? (i18n.language === 'ar' ? 'الملف الشخصي' : 'Personal Profile')
                    : (i18n.language === 'ar' ? 'ملف الشركة' : 'Company Profile')}
                </h3>
                <p className="text-white/70 text-xs">
                  {supplierTab === 'personal'
                    ? (i18n.language === 'ar' ? 'قم بتحديث بياناتك الشخصية وصورتك' : 'Update your personal details and photo')
                    : (i18n.language === 'ar' ? 'قم بتحديث بيانات شركتك وفئات العمل' : 'Update your company details and business categories')}
                </p>
              </div>
            </div>
            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-white text-sm font-bold"
              >
                <Check size={18} />
                {i18n.language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved Successfully'}
              </motion.div>
            )}
          </div>

          <form onSubmit={handleUpdateProfile} className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Logo Upload */}
              <div className="flex flex-col items-center justify-center p-6 bg-brand-background rounded-3xl border-2 border-dashed border-brand-border group hover:border-brand-primary transition-all">
                <div className="relative w-32 h-32 mb-4">
                  <div className="w-full h-full bg-brand-surface rounded-2xl border border-brand-border flex items-center justify-center text-brand-text-muted overflow-hidden shadow-sm">
                    {editLogoUrl ? (
                      <BlurImage src={editLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      supplierTab === 'personal' ? <UserIcon size={48} /> : <Building2 size={48} />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 p-2 bg-brand-primary text-white rounded-xl cursor-pointer shadow-lg hover:bg-brand-primary-hover transition-all">
                    <Upload size={18} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading || isGeneratingLogo} />
                  </label>
                  {(isUploading || isGeneratingLogo) && (
                    <div className="absolute inset-0 bg-brand-surface/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2 w-full">
                  <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                    {supplierTab === 'personal'
                      ? (i18n.language === 'ar' ? 'الصورة الشخصية' : 'Personal Photo')
                      : (i18n.language === 'ar' ? 'شعار الشركة' : 'Company Logo')}
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateAILogo}
                    disabled={isGeneratingLogo || isUploading}
                    className="mt-2 w-full max-w-[220px] flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-black text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                    title={i18n.language === 'ar' ? 'ابتكر شعاراً فخماً يعكس هوية علامتك التجارية باستخدام الذكاء الاصطناعي' : 'Create a luxurious logo that reflects your brand identity using AI'}
                  >
                    <Sparkles size={14} className={isGeneratingLogo ? "animate-pulse text-amber-200" : ""} />
                    {i18n.language === 'ar' ? (isGeneratingLogo ? 'جاري الابتكار...' : 'تصميم حصري بالذكاء الاصطناعي') : (isGeneratingLogo ? 'Generating...' : 'Exclusive AI Design')}
                  </button>
                </div>
                {uploadError && (
                  <p className="text-[10px] text-brand-error mt-2 text-center font-bold">{uploadError}</p>
                )}
              </div>

              {/* Basic Info */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {supplierTab === 'personal' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الاسم الشخصي' : 'Personal Name'}</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                        <input 
                          type="text" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                          placeholder={t('name')}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{t('email')}</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                        <input 
                          type="email" 
                          value={editEmail}
                          onChange={e => setEditEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                          placeholder={t('email')}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'رقم التواصل' : 'Contact Number'}</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                        <input 
                          type="tel" 
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                          placeholder={i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'اسم الشركة' : 'Company Name'}</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                        <input 
                          type="text" 
                          value={editCompanyName}
                          onChange={e => setEditCompanyName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                          placeholder={i18n.language === 'ar' ? 'اسم الشركة' : 'Company Name'}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                        <input 
                          type="text" 
                          value={editWebsite}
                          onChange={e => setEditWebsite(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                          placeholder="example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الموقع' : 'Location'}</label>
                      <div className="relative flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                          <input 
                            type="text" 
                            value={editLocation}
                            onChange={e => setEditLocation(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                            placeholder={i18n.language === 'ar' ? 'الموقع' : 'Location'}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          disabled={isDetectingLocation}
                          className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-brand-primary hover:bg-brand-background transition-all shadow-sm flex items-center justify-center min-w-[44px]"
                          title={i18n.language === 'ar' ? 'تحديد موقعي تلقائياً' : 'Detect my location'}
                        >
                          {isDetectingLocation ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
                          ) : (
                            <MapPin size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {supplierTab === 'company' && (
              <>
                {/* Bio / Description */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">
                      {i18n.language === 'ar' ? 'نبذة عن الشركة' : 'Company Bio'}
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsOptimizingBio(true);
                        try {
                          const selectedCategoryNames = categories
                            .filter(c => editCategories.includes(c.id))
                            .map(c => i18n.language === 'ar' ? c.nameAr : c.nameEn);
                          
                          const optimized = await optimizeSupplierProfile(
                            editBio,
                            editCompanyName || editName,
                            selectedCategoryNames,
                            i18n.language
                          );
                          setEditBio(optimized.suggestedBio);
                        } catch (error) {
                          handleAiError(error, 'bio_optimization');
                        } finally {
                          setIsOptimizingBio(false);
                        }
                      }}
                      disabled={isOptimizingBio || (!editCompanyName && !editName)}
                      className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-primary-hover bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isOptimizingBio ? (
                        <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {i18n.language === 'ar' ? 'تحسين بالذكاء الاصطناعي' : 'Optimize with AI'}
                    </button>
                  </div>
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    className="w-full p-4 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary transition-all resize-none h-32 text-brand-text-main"
                    placeholder={i18n.language === 'ar' ? 'اكتب نبذة مختصرة عن شركتك وخدماتك...' : 'Write a brief description of your company and services...'}
                  />
                </div>

                <div className="mt-10 pt-8 border-t border-brand-border">
                  <div className="mb-8">
                    <h4 className="text-xl font-bold text-brand-text-main flex items-center gap-3">
                      <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                        <Package size={20} />
                      </div>
                      {i18n.language === 'ar' ? 'فئات العمل والتخصصات' : 'Business Categories & Specialties'}
                    </h4>
                    <button
                      type="button"
                      onClick={handleSuggestOwnCategories}
                      disabled={isSuggestingOwnCategories || (!editName && !editCompanyName)}
                      className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-primary-hover bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 mt-2"
                    >
                      {isSuggestingOwnCategories ? (
                        <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {i18n.language === 'ar' ? 'اقتراح بالذكاء الاصطناعي' : 'AI Suggestion'}
                    </button>
                    <p className="text-sm text-brand-text-muted mt-2 max-w-2xl">
                      {i18n.language === 'ar' 
                        ? 'اختر الفئات التي تعمل بها لتلقي الطلبات المناسبة لتخصصك. يمكنك اختيار الفئات الرئيسية أو التخصصات الفرعية.' 
                        : 'Select the categories you work in to receive relevant requests. You can choose main categories or specific subcategories.'}
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={e => {
                            setCategorySearch(e.target.value);
                            if (!e.target.value) setSemanticSearchResults(null);
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                          placeholder={i18n.language === 'ar' ? 'بحث عن فئة...' : 'Search for a category...'}
                        />
                      </div>
                      <button
                        onClick={handleAiSearch}
                        disabled={isSemanticSearching || !categorySearch.trim()}
                        className="px-4 py-3 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-primary-hover transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                        title={i18n.language === 'ar' ? 'بحث ذكي باستخدام الذكاء الاصطناعي' : 'Smart search using AI'}
                      >
                        {isSemanticSearching ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Sparkles size={18} />
                        )}
                        <span className="hidden md:inline text-sm">
                          {i18n.language === 'ar' ? 'بحث ذكي' : 'AI Search'}
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...categories.filter(c => {
                      if (!c.parentId) {
                        if (semanticSearchResults) {
                          return semanticSearchResults.includes(c.id) || categories.some(sub => sub.parentId === c.id && semanticSearchResults.includes(sub.id));
                        }
                        return (i18n.language === 'ar' ? c.nameAr : c.nameEn).toLowerCase().includes(categorySearch.toLowerCase());
                      }
                      return false;
                    })].sort((a, b) => {
                      const aSelected = editCategories.includes(a.id);
                      const bSelected = editCategories.includes(b.id);
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      return 0;
                    }).map(parent => {
                      const subs = categories.filter(c => {
                        if (c.parentId === parent.id) {
                          if (semanticSearchResults) {
                            return semanticSearchResults.includes(c.id);
                          }
                          return (i18n.language === 'ar' ? c.nameAr : c.nameEn).toLowerCase().includes(categorySearch.toLowerCase());
                        }
                        return false;
                      });
                      const isParentSelected = editCategories.includes(parent.id);
                      
                      return (
                        <div 
                          key={parent.id} 
                          className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                            isParentSelected 
                              ? 'border-brand-primary bg-brand-primary/5 shadow-md shadow-brand-primary/10' 
                              : 'border-brand-border bg-brand-surface hover:border-brand-primary/30 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h5 className={`font-bold text-base ${isParentSelected ? 'text-brand-primary' : 'text-brand-text-main'}`}>
                              {i18n.language === 'ar' ? parent.nameAr : parent.nameEn}
                            </h5>
                            <button
                              type="button"
                              onClick={() => {
                                if (isParentSelected) {
                                  // Deselect main and all its subs
                                  setEditCategories(editCategories.filter(id => id !== parent.id && !subs.find(s => s.id === id)));
                                } else {
                                  // Select this main
                                  setEditCategories([...editCategories, parent.id]);
                                }
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                isParentSelected 
                                  ? 'bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover' 
                                  : 'bg-brand-background text-brand-text-muted hover:bg-brand-surface hover:text-brand-text-main'
                              }`}
                            >
                              {isParentSelected ? <Check size={16} /> : <Plus size={16} />}
                            </button>
                          </div>
                          
                          {subs.length > 0 && isParentSelected && (
                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-brand-border">
                              {[...subs].sort((a, b) => {
                                const aSelected = editCategories.includes(a.id);
                                const bSelected = editCategories.includes(b.id);
                                if (aSelected && !bSelected) return -1;
                                if (!aSelected && bSelected) return 1;
                                return 0;
                              }).map(sub => {
                                const isSubSelected = editCategories.includes(sub.id);
                                return (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => {
                                      if (isSubSelected) {
                                        setEditCategories(editCategories.filter(id => id !== sub.id));
                                      } else {
                                        setEditCategories([...editCategories, sub.id]);
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                      isSubSelected
                                        ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-sm'
                                        : 'bg-brand-background text-brand-text-muted border border-brand-border hover:bg-brand-surface hover:border-brand-primary/30 hover:text-brand-text-main'
                                    }`}
                                  >
                                    {isSubSelected && <Check size={12} className="text-brand-primary" />}
                                    {i18n.language === 'ar' ? sub.nameAr : sub.nameEn}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-brand-border">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-brand-text-main flex items-center gap-3">
                        <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                          <Tag size={20} />
                        </div>
                        {i18n.language === 'ar' ? 'الكلمات المفتاحية' : 'Keywords'}
                      </h4>
                      <p className="text-sm text-brand-text-muted mt-2 max-w-2xl">
                        {i18n.language === 'ar'
                          ? 'أضف كلمات مفتاحية لوصف منتجاتك أو خدماتك لتسهيل عثور العملاء عليك.'
                          : 'Add keywords to describe your products or services to help customers find you.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsGeneratingKeywords(true);
                        try {
                          const { generateKeywords } = await import('../../../core/services/geminiService');
                          const selectedCategoryNames = categories
                            .filter(c => editCategories.includes(c.id))
                            .map(c => i18n.language === 'ar' ? c.nameAr : c.nameEn);
                          
                          const aiKeywords = await generateKeywords(
                            editCompanyName || editName,
                            editBio,
                            selectedCategoryNames,
                            i18n.language
                          );
                          
                          // Merge with existing keywords, avoiding duplicates
                          const merged = Array.from(new Set([...editKeywords, ...aiKeywords]));
                          setEditKeywords(merged);
                        } catch (error) {
                          handleAiError(error, 'keyword_generation');
                        } finally {
                          setIsGeneratingKeywords(false);
                        }
                      }}
                      disabled={isGeneratingKeywords || (!editCompanyName && !editName)}
                      className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-primary-hover bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isGeneratingKeywords ? (
                        <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {i18n.language === 'ar' ? 'توليد بالذكاء الاصطناعي' : 'Generate with AI'}
                    </button>
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={e => setNewKeyword(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddKeyword();
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                        placeholder={i18n.language === 'ar' ? 'أدخل كلمة مفتاحية...' : 'Enter a keyword...'}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-sm flex items-center gap-2"
                    >
                      <Plus size={18} />
                      {i18n.language === 'ar' ? 'إضافة' : 'Add'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {editKeywords.map((kw, index) => (
                      <span 
                        key={`${kw}-${index}`}
                        className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-xl text-sm font-bold border border-brand-primary/20 flex items-center gap-2"
                      >
                        {kw}
                        <button 
                          type="button"
                          onClick={() => handleRemoveKeyword(kw)}
                          className="text-brand-primary/60 hover:text-brand-primary transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    {editKeywords.length === 0 && (
                      <p className="text-sm text-brand-text-muted italic">
                        {i18n.language === 'ar' ? 'لا توجد كلمات مفتاحية مضافة بعد.' : 'No keywords added yet.'}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="mt-8 flex justify-end">
              <HapticButton
                type="submit"
                disabled={isSaving}
                className="bg-brand-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-brand-primary-hover transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-primary/20"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save size={20} />
                    {i18n.language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                  </>
                )}
              </HapticButton>
            </div>
          </form>
        </section>
      )}

      {/* Marketing Section */}
      {supplierTab === 'marketing' && profile && (
        <MarketingView profile={profile} isRtl={isRtl} />
      )}

      {/* Requests Section */}
      {supplierTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Supplier Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/40 dark:border-gray-700/50 shadow-xl shadow-brand-primary/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl group-hover:bg-brand-primary/10 transition-colors duration-500" />
              <div className="p-5 bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 rounded-[1.5rem] text-brand-primary border border-brand-primary/10 shadow-inner relative z-10">
                <MessageSquare size={28} />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-1">
                  {i18n.language === 'ar' ? 'المحادثات النشطة' : 'Active Chats'}
                </p>
                <h4 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-text-main to-brand-primary">{allChats.length}</h4>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/40 dark:border-gray-700/50 shadow-xl shadow-brand-teal/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/5 rounded-full blur-2xl group-hover:bg-brand-teal/10 transition-colors duration-500" />
              <div className="p-5 bg-gradient-to-br from-brand-teal/10 to-brand-teal/5 rounded-[1.5rem] text-brand-teal border border-brand-teal/10 shadow-inner relative z-10">
                <Check size={28} />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-1">
                  {i18n.language === 'ar' ? 'العروض المقدمة' : 'Offers Sent'}
                </p>
                <h4 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-text-main to-brand-teal">
                  {requests.filter(req => req.matchedSuppliers?.some(s => s.uid === profile?.uid)).length}
                </h4>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/40 dark:border-gray-700/50 shadow-xl shadow-amber-500/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors duration-500" />
              <div className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-[1.5rem] text-amber-500 border border-amber-500/10 shadow-inner relative z-10">
                <Star size={28} />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-1">
                  {i18n.language === 'ar' ? 'التقييم العام' : 'Overall Rating'}
                </p>
                <h4 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-text-main to-amber-500">{profile?.rating?.toFixed(1) || '0.0'}</h4>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="space-y-1">
              <h3 className="text-3xl font-black text-brand-text-main flex items-center gap-4 tracking-tight">
                <div className="p-3 bg-gradient-to-br from-brand-primary to-brand-teal rounded-[1.25rem] text-white shadow-lg shadow-brand-primary/30">
                  <Sparkles size={24} />
                </div>
                {t('available_requests')}
              </h3>
              <p className="text-brand-text-muted text-sm font-medium ml-16">
                {i18n.language === 'ar' ? 'اكتشف أحدث الطلبات التي تناسب تخصصك' : 'Discover the latest requests that match your specialty'}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-96 group">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-teal/20 rounded-[1.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 rounded-[1.5rem] shadow-lg flex items-center p-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-primary transition-colors" size={20} />
                  <input 
                    type="text" 
                    value={requestSearch}
                    onChange={e => {
                      setRequestSearch(e.target.value);
                      if (isSemanticSearching) setIsSemanticSearching(false);
                    }}
                    placeholder={i18n.language === 'ar' ? 'ابحث عن منتجات، فئات...' : 'Search for products, categories...'}
                    className="w-full pl-14 pr-4 py-3.5 bg-transparent outline-none text-sm font-medium text-brand-text-main placeholder-brand-text-muted/70"
                  />
                  <button
                    onClick={handleSemanticSearch}
                    disabled={isSemanticSearching || !requestSearch}
                    className="p-3 bg-gradient-to-r from-brand-primary to-brand-teal text-white rounded-xl hover:shadow-lg hover:shadow-brand-primary/30 transition-all disabled:opacity-50 flex items-center justify-center group/btn ml-1"
                    title={i18n.language === 'ar' ? 'بحث ذكي بالذكاء الاصطناعي' : 'Smart AI Search'}
                  >
                    {isSemanticSearching ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                    ) : (
                      <Bot size={20} className="group-hover/btn:scale-110 transition-transform" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {isLoadingRequests ? (
                [1, 2, 3].map(i => <RequestSkeleton key={i} />)
              ) : (
                filteredRequests
                  .filter(req => {
                    const isAdminLike = ['admin', 'manager', 'supervisor'].includes(profile?.role || '');
                    return profile?.categories?.includes(req.categoryId) || isAdminLike;
                  })
                  .slice(0, showAllRequests ? visibleRequestsCount : 3)
                  .map(req => {
                    const isNew = Date.now() - new Date(req.createdAt).getTime() < 24 * 60 * 60 * 1000;
                    return (
                      <motion.div 
                        key={req.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/40 dark:border-gray-700/50 shadow-xl shadow-brand-primary/5 hover:shadow-2xl hover:shadow-brand-primary/10 hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-primary/5 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                          <div className="flex-1 space-y-5">
                            <div className="flex justify-between items-start">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <h4 className="text-2xl font-black text-brand-text-main group-hover:text-brand-primary transition-colors">{req.productName}</h4>
                                  {isNew && (
                                    <span className="px-3 py-1 bg-gradient-to-r from-brand-primary to-brand-teal text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-md shadow-brand-primary/20 animate-pulse-slow">
                                      {i18n.language === 'ar' ? 'جديد' : 'New'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary text-[11px] font-bold rounded-xl uppercase tracking-wider border border-brand-primary/20 shadow-sm">
                                    {getCategoryPath(req.categoryId)}
                                  </span>
                                  <span className="flex items-center gap-1.5 text-brand-text-muted text-xs font-bold bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/40 dark:border-gray-700/50">
                                    <Clock size={14} /> {new Date(req.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 py-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-brand-text-main bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/40 dark:border-gray-700/50 shadow-sm">
                                <MapPin size={16} className="text-brand-primary" />
                                {req.location || (i18n.language === 'ar' ? 'الموقع غير محدد' : 'Location not specified')}
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-brand-text-main bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/40 dark:border-gray-700/50 shadow-sm">
                                <Package size={16} className="text-brand-primary" />
                                {req.quantity || (i18n.language === 'ar' ? 'الكمية غير محددة' : 'Quantity not specified')}
                              </div>
                            </div>
                          </div>

                          <div className="lg:w-[400px]">
                            <SupplierOfferAction 
                              requestId={req.id} 
                              supplierId={profile!.uid} 
                              customerId={req.customerId} 
                              requestDescription={req.description}
                              onChat={() => handleStartChat(req.id, profile!.uid, req.customerId)}
                              isConfirmDeleteAllOpen={isConfirmDeleteAllOpen}
                              setIsConfirmDeleteAllOpen={setIsConfirmDeleteAllOpen}
                              handleDeleteAllCategories={handleDeleteAllCategories}
                              isRtl={isRtl}
                              t={t}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </AnimatePresence>
            {filteredRequests.filter(req => {
              const isAdminLike = ['admin', 'manager', 'supervisor'].includes(profile?.role || '');
              return profile?.categories?.includes(req.categoryId) || isAdminLike;
            }).length === 0 && (
              <div className="text-center py-20 bg-brand-surface rounded-[2.5rem] border border-brand-border border-dashed">
                <p className="text-brand-text-muted font-medium">
                  {profile?.categories?.length === 0 
                    ? (i18n.language === 'ar' ? 'يرجى اختيار فئات العمل الخاصة بك لرؤية الطلبات المتاحة.' : 'Please select your business categories to see available requests.')
                    : t('no_requests')}
                </p>
              </div>
            )}
            {filteredRequests.filter(req => {
              const isAdminLike = ['admin', 'manager', 'supervisor'].includes(profile?.role || '');
              return profile?.categories?.includes(req.categoryId) || isAdminLike;
            }).length > 3 && (
              <button
                onClick={() => setShowAllRequests(!showAllRequests)}
                className="mt-2 flex items-center gap-2 text-brand-primary font-bold hover:text-brand-primary-hover transition-colors mx-auto bg-brand-primary/10 px-4 py-2 rounded-xl text-sm"
              >
                {showAllRequests 
                  ? (i18n.language === 'ar' ? 'عرض أقل' : 'Show Less') 
                  : (i18n.language === 'ar' ? `عرض المزيد (${filteredRequests.filter(req => {
                    const isAdminLike = ['admin', 'manager', 'supervisor'].includes(profile?.role || '');
                    return profile?.categories?.includes(req.categoryId) || isAdminLike;
                  }).length - 3}+)` : `Show More (${filteredRequests.filter(req => {
                    const isAdminLike = ['admin', 'manager', 'supervisor'].includes(profile?.role || '');
                    return profile?.categories?.includes(req.categoryId) || isAdminLike;
                  }).length - 3}+)`)}
                {showAllRequests ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            {showAllRequests && filteredRequests.filter(req => {
              const isAdminLike = ['admin', 'manager', 'supervisor'].includes(profile?.role || '');
              return profile?.categories?.includes(req.categoryId) || isAdminLike;
            }).length > visibleRequestsCount && (
              <div ref={requestsSentinelRef} className="h-20 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin opacity-50"></div>
              </div>
            )}
          </div>

          {/* Active Chats Section for Supplier */}
          {supplierChats.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-black text-brand-text-main flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                  <MessageSquare size={20} />
                </div>
                {i18n.language === 'ar' ? 'المحادثات النشطة' : 'Active Chats'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplierChats.map(chat => (
                  <SupplierChatCard 
                    key={chat.id} 
                    chat={chat} 
                    onOpen={() => handleStartChat(chat.requestId, profile!.uid, chat.customerId)} 
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {generatedLogoPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-surface rounded-3xl p-6 max-w-lg w-full border border-brand-border shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-brand-primary/20 scrollbar-track-brand-surface"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-brand-text-main">
                {i18n.language === 'ar' ? 'تم تصميم شعارك بنجاح!' : 'Logo Generated Successfully!'}
              </h3>
              <button onClick={() => setGeneratedLogoPreview(null)} className="p-2 hover:bg-brand-background rounded-full transition-colors">
                <X size={20} className="text-brand-text-muted" />
              </button>
            </div>
            <div className="aspect-square w-full rounded-2xl overflow-hidden mb-6 border border-brand-border shadow-inner bg-white">
              <BlurImage src={generatedLogoPreview} alt="Generated Logo" className="w-full h-full object-contain" />
            </div>
            <button 
              onClick={() => setGeneratedLogoPreview(null)}
              className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-colors"
            >
              {i18n.language === 'ar' ? 'رائع، اعتمده' : 'Awesome, keep it'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );

  if (isAdmin(profile)) {
    return renderAdmin();
  }

  if (isCustomerMode || profile?.role === 'customer') {
    return renderCustomer();
  }

  if (profile?.role === 'supplier') {
    return renderSupplier();
  }

  return (
    <div className="p-6 text-center text-brand-text-muted">
      {i18n.language === 'ar' ? 'صلاحيات غير كافية للوصول إلى لوحة التحكم.' : 'Insufficient permissions to access the dashboard.'}
    </div>
  );
};

const OffersList: React.FC<{ 
  requestId: string; 
  customerId: string;
  isAdmin: boolean;
  onChat: (suppId: string) => void;
  onOpenProfile: (supp: UserProfile) => void;
  chatLoading?: string | null;
}> = ({ requestId, customerId, isAdmin, onChat, onOpenProfile, chatLoading }) => {
  const { t, i18n } = useTranslation();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [suppliersInfo, setSuppliersInfo] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    // Fetch offers
    const qOffers = isAdmin 
      ? query(collection(db, 'offers'), where('requestId', '==', requestId))
      : query(collection(db, 'offers'), where('customerId', '==', customerId));
      
    const unsubOffers = onSnapshot(qOffers, async (snap) => {
      try {
        const offersData = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Offer))
          .filter(o => o.requestId === requestId);
        setOffers(offersData);

        // Fetch supplier info for each offer
        const newInfo = { ...suppliersInfo };
        let changed = false;
        for (const offer of offersData) {
          if (!newInfo[offer.supplierId]) {
            try {
              const sSnap = await getDoc(doc(db, 'users', offer.supplierId));
              if (sSnap.exists()) {
                newInfo[offer.supplierId] = sSnap.data() as UserProfile;
                changed = true;
              }
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, `users/${offer.supplierId}`, false);
            }
          }
        }
        if (changed) setSuppliersInfo(newInfo);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'offers', false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'offers', false);
    });

    // Fetch chats for this request
    const qChats = isAdmin
      ? query(collection(db, 'chats'), where('requestId', '==', requestId))
      : query(collection(db, 'chats'), where('customerId', '==', customerId));
      
    const unsubChats = onSnapshot(qChats, async (snap) => {
      try {
        const allChatsData = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Chat))
          .filter(c => c.requestId === requestId);
        
        // Filter for 24 hours if not admin
        let chatsData = allChatsData;
        // We need to know if the current user is admin. Since profile is not directly in OffersList props, 
        // we might need to pass it or check if we can access it. 
        // Actually, we can check the profile from the parent context if we pass it.
        // Let's assume we'll pass 'isAdmin' prop to OffersList.
        if (!isAdmin) {
          const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
          chatsData = allChatsData.filter(chat => {
            const updatedAt = chat.updatedAt ? new Date(chat.updatedAt).getTime() : 0;
            return updatedAt >= twentyFourHoursAgo;
          });
        }
        
        setChats(chatsData);

        // Also fetch supplier info for chats that might not have offers
        const newInfo = { ...suppliersInfo };
        let changed = false;
        for (const chat of chatsData) {
          if (chat.supplierId !== 'everyone' && !newInfo[chat.supplierId]) {
            try {
              const sSnap = await getDoc(doc(db, 'users', chat.supplierId));
              if (sSnap.exists()) {
                newInfo[chat.supplierId] = sSnap.data() as UserProfile;
                changed = true;
              }
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, `users/${chat.supplierId}`, false);
            }
          }
        }
        if (changed) setSuppliersInfo(newInfo);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'chats', false);
        }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats', false);
    });

    return () => {
      unsubOffers();
      unsubChats();
    };
  }, [requestId]);

  const handleNegotiate = async (offer: Offer) => {
    try {
      // 1. Mark as interested (optional, just to show visual feedback)
      await updateDoc(doc(db, 'offers', offer.id), { status: 'negotiating' });
      
      // 2. Open chat immediately
      onChat(offer.supplierId);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'offers', false);
    }
  };

  // Combine offers and chats by supplier
  const supplierIds = Array.from(new Set([
    ...offers.map(o => o.supplierId),
    ...chats.filter(c => c.supplierId !== 'everyone').map(c => c.supplierId)
  ]));

  if (supplierIds.length === 0) return <p className="text-sm text-brand-text-muted italic">{t('no_offers')}</p>;

  return (
    <div className="mt-4 space-y-4">
      <h5 className="text-sm font-bold text-brand-text-main flex items-center gap-2">
        <MessageSquare size={16} className="text-brand-primary" />
        {i18n.language === 'ar' ? 'محادثات وعروض الموردين' : 'Supplier Chats & Offers'}:
      </h5>
      {supplierIds.map(suppId => {
        const supp = suppliersInfo[suppId];
        const offer = offers.find(o => o.supplierId === suppId);
        const chat = chats.find(c => c.supplierId === suppId);
        
        return (
          <div key={suppId} className="bg-brand-surface p-5 rounded-3xl border border-brand-border shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => supp && onOpenProfile(supp)}
                  className="w-14 h-14 bg-brand-background rounded-2xl border border-brand-border flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand-primary transition-all shrink-0"
                >
                  {supp?.logoUrl ? (
                    <BlurImage src={supp.logoUrl} alt={supp.companyName} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={24} className="text-brand-text-muted" />
                  )}
                </div>
                <div 
                  onClick={() => supp && onOpenProfile(supp)}
                  className="cursor-pointer group flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <h6 className="font-bold text-brand-text-main group-hover:text-brand-primary transition-colors truncate">{supp?.companyName || supp?.name || '...'}</h6>
                    {offer?.status === 'negotiating' && (
                      <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[9px] font-bold rounded-md uppercase shrink-0">
                        {i18n.language === 'ar' ? 'قيد التفاوض' : 'Negotiating'}
                      </span>
                    )}
                  </div>
                  {offer && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-black text-brand-primary">{offer.price} {t('currency')}</span>
                      <span className="text-[10px] text-brand-text-muted italic truncate">"{offer.message}"</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 self-end md:self-center">
                <button 
                  onClick={() => offer ? handleNegotiate(offer) : onChat(suppId)}
                  disabled={chatLoading === requestId}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 ${
                    chat 
                      ? 'bg-brand-text-main text-brand-surface hover:opacity-90 shadow-brand-primary/10' 
                      : 'bg-brand-primary text-white hover:bg-brand-primary-hover shadow-brand-primary/20'
                  }`}
                >
                  {chatLoading === requestId ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <MessageSquare size={16} />
                  )}
                  {chat 
                    ? (i18n.language === 'ar' ? 'متابعة المحادثة' : 'Continue Chat') 
                    : (i18n.language === 'ar' ? 'بدء المحادثة' : 'Start Chat')}
                </button>
              </div>
            </div>
            
            {chat && chat.lastMessage && (
              <div className="mt-4 p-3 bg-brand-background rounded-2xl border border-brand-border-light flex items-start gap-3">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-brand-text-muted shrink-0 border border-brand-border-light">
                  <MessageSquare size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-brand-text-muted font-medium uppercase tracking-wider mb-1">
                    {i18n.language === 'ar' ? 'آخر رسالة' : 'Last Message'}
                  </p>
                  <p className="text-xs text-brand-text-muted italic line-clamp-1">
                    {chat.lastMessage}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const SupplierChatCard: React.FC<{ chat: Chat; onOpen: () => void }> = ({ chat, onOpen }) => {
  const { i18n } = useTranslation();
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [request, setRequest] = useState<ProductRequest | null>(null);

  useEffect(() => {
    if (chat.customerId && chat.customerId !== 'system') {
      // Try users_public first
      getDoc(doc(db, 'users_public', chat.customerId)).then(snap => {
        if (snap.exists()) {
          setCustomer({ id: snap.id, ...snap.data() } as any as UserProfile);
        } else {
          // Fallback to users
          getDoc(doc(db, 'users', chat.customerId)).then(s => {
            if (s.exists()) setCustomer(s.data() as any as UserProfile);
          }).catch(e => handleFirestoreError(e, OperationType.GET, `users/${chat.customerId}`, false));
        }
      }).catch(error => {
        // If users_public fails, try users
        getDoc(doc(db, 'users', chat.customerId)).then(s => {
          if (s.exists()) setCustomer(s.data() as any as UserProfile);
        }).catch(e => handleFirestoreError(e, OperationType.GET, `users/${chat.customerId}`, false));
      });
    }
    if (chat.requestId && !chat.requestId.startsWith('category_')) {
      getDoc(doc(db, 'requests', chat.requestId)).then(snap => {
        if (snap.exists()) setRequest({ id: snap.id, ...snap.data() } as ProductRequest);
      }).catch(error => handleFirestoreError(error, OperationType.GET, `requests/${chat.requestId}`, false));
    }
  }, [chat]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onOpen}
      className="bg-brand-surface p-4 rounded-[1.5rem] border border-brand-border shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-background rounded-xl border border-brand-border flex items-center justify-center overflow-hidden shrink-0">
          {customer?.logoUrl ? (
            <BlurImage src={customer.logoUrl} alt={customer.name} className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={24} className="text-brand-text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-brand-text-main group-hover:text-brand-primary transition-colors truncate">
              {customer?.name || '...'}
            </h4>
            <span className="text-[10px] text-brand-text-muted font-medium">
              {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-brand-text-muted font-bold truncate mt-0.5">
            {request?.productName || '...'}
          </p>
          <p className="text-[11px] text-brand-text-muted italic truncate mt-1">
            {chat.lastMessage || (i18n.language === 'ar' ? 'بدء المحادثة' : 'Start conversation')}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const SupplierOfferAction: React.FC<{ 
  requestId: string; 
  supplierId: string; 
  customerId: string; 
  requestDescription: string; 
  onChat: () => Promise<void>;
  isConfirmDeleteAllOpen: boolean;
  setIsConfirmDeleteAllOpen: (isOpen: boolean) => void;
  handleDeleteAllCategories: () => Promise<void>;
  isRtl: boolean;
  t: (key: string) => string;
}> = ({ requestId, supplierId, customerId, requestDescription, onChat, isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen, handleDeleteAllCategories, isRtl, t }) => {
  const { i18n } = useTranslation();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleGenerateAiMessage = async () => {
    setIsGeneratingAi(true);
    try {
      const { generateSupplierProposal } = await import('../../../core/services/geminiService');
      const generatedMessage = await generateSupplierProposal(requestDescription, i18n.language);
      if (generatedMessage) {
        setMessage(generatedMessage);
      }
    } catch (err) {
      handleAiError(err, 'proposal_generation');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'offers'), where('supplierId', '==', supplierId));
    return onSnapshot(q, (snap) => {
      const offerDoc = snap.docs.find(doc => doc.data().requestId === requestId);
      if (offerDoc) {
        setOffer({ id: offerDoc.id, ...offerDoc.data() } as Offer);
      } else {
        setOffer(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'offers', false);
    });
  }, [requestId, supplierId]);

  const handleChatClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setChatLoading(true);
    setError(null);
    try {
      await onChat();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'chats', false);
      setError(i18n.language === 'ar' ? 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.' : 'Connection error. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!price || isNaN(Number(price))) {
      setError(i18n.language === 'ar' ? 'يرجى إدخال سعر صحيح' : 'Please enter a valid price');
      return;
    }
    setLoading(true);
    setError(null);
    
    const tempOffer: Offer = {
      id: `temp-${Date.now()}`,
      requestId,
      supplierId,
      customerId,
      price: Number(price),
      message,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Optimistic UI update
    const previousOffer = offer;
    setOffer(tempOffer);
    
    try {
      const { id, ...offerDataWithoutId } = tempOffer;
      await addDoc(collection(db, 'offers'), offerDataWithoutId);

      // Notify the customer
      await addDoc(collection(db, 'notifications'), {
        userId: customerId,
        titleAr: 'عرض جديد',
        titleEn: 'New Offer',
        bodyAr: `تلقيت عرضاً جديداً بقيمة ${price} ${t('currency')}.`,
        bodyEn: `You received a new offer of ${price} ${t('currency')}.`,
        link: 'dashboard',
        actionType: 'submit_offer',
        targetId: requestId,
        read: false,
        createdAt: new Date().toISOString()
      });

      // Start chat automatically
      await onChat();
    } catch (err) {
      // Revert optimistic update
      setOffer(previousOffer);
      handleFirestoreError(err, OperationType.WRITE, 'offers', false);
      setError(i18n.language === 'ar' ? 'فشل تقديم العرض. يرجى التحقق من اتصالك بالإنترنت.' : 'Failed to submit offer. Please check your internet connection.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (offer) {
    return (
      <div className="flex flex-col gap-2">
        {error && (
          <div className="text-brand-error text-xs font-bold bg-brand-error/10 p-2 rounded-lg border border-brand-error/20 text-center">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between bg-brand-primary/10 p-4 rounded-xl border border-brand-primary/20">
          <div>
            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">
              {i18n.language === 'ar' ? 'تم إرسال عرضك' : 'Your Offer Sent'}
            </span>
            <p className="font-bold text-lg text-brand-text-main">{offer.price} {t('currency')}</p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleChatClick(e);
            }}
            disabled={chatLoading}
            className="bg-brand-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
          >
            {chatLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <MessageSquare size={18} />
            )}
            {t('chat')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-background/50 p-8 rounded-[2.5rem] border border-brand-border shadow-inner">
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-brand-error text-xs font-bold bg-brand-error/10 p-4 rounded-2xl border border-brand-error/20 text-center mb-6 flex items-center justify-center gap-2"
        >
          <div className="w-1.5 h-1.5 bg-brand-error rounded-full animate-pulse" />
          {error}
        </motion.div>
      )}
      <DeleteAllCategoriesModal 
        isOpen={isConfirmDeleteAllOpen}
        onClose={() => setIsConfirmDeleteAllOpen(false)}
        onConfirm={handleDeleteAllCategories}
        isRtl={isRtl}
        t={t}
      />
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="space-y-4">
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-brand-primary font-black text-sm">{t('currency')}</span>
              <div className="w-px h-4 bg-brand-border" />
            </div>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={t('price')} 
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full pl-16 pr-4 py-4 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all text-lg font-black text-brand-text-main placeholder:text-brand-text-muted shadow-sm"
            />
          </div>
          
          <div className="relative group">
            <textarea 
              placeholder={t('message')} 
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="w-full px-5 py-4 pr-14 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all text-sm font-medium resize-none placeholder:text-brand-text-muted shadow-sm"
            />
            <HapticButton
              type="button"
              onClick={handleGenerateAiMessage}
              disabled={isGeneratingAi}
              title={i18n.language === 'ar' ? 'اقتراح رسالة بالذكاء الاصطناعي' : 'Suggest message with AI'}
              className="absolute right-3 top-3 p-2.5 text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all disabled:opacity-50 group-hover:scale-110"
            >
              {isGeneratingAi ? (
                <div className="w-5 h-5 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
              ) : (
                <Sparkles size={20} />
              )}
            </HapticButton>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <HapticButton 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleChatClick(e);
            }}
            disabled={chatLoading}
            className="flex-1 bg-brand-surface text-brand-text-main px-6 py-4 rounded-2xl font-black border border-brand-border hover:bg-brand-background hover:border-brand-primary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            {chatLoading ? (
              <div className="w-5 h-5 border-2 border-brand-text-muted border-t-brand-text-main rounded-full animate-spin" />
            ) : (
              <MessageSquare size={20} className="text-brand-primary" />
            )}
            {t('chat')}
          </HapticButton>
          <HapticButton 
            type="submit"
            onClick={(e) => e.stopPropagation()}
            disabled={loading || !price}
            className="flex-[1.5] bg-brand-primary text-white px-6 py-4 rounded-2xl font-black hover:bg-brand-primary-hover active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={20} />
            )}
            {t('submit_offer')}
          </HapticButton>
        </div>
      </form>
    </div>
  );
};

export default Dashboard;
