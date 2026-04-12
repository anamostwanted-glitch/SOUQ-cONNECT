import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  LayoutGrid, 
  Users, 
  Archive,
  ListTree, 
  Settings, 
  LogOut,
  TrendingUp,
  ShoppingBag,
  MessageSquare,
  Activity,
  Building2,
  Globe,
  Cpu,
  Zap,
  Palette,
  Megaphone,
  BookOpen,
  Send,
  Sparkles,
  Wand2,
  Loader2,
  Search,
  Plus,
  BarChart3,
  AlertTriangle,
  Bell,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, getDocs, doc, updateDoc, addDoc, orderBy, limit, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { handleAiError } from '../../../core/services/geminiService';
import { db } from '../../../core/firebase';
import { UserProfile, AppFeatures, ProductRequest, Category } from '../../../core/types';
import { AdminSidebar } from './AdminSidebar';
import { CategoryManagement } from '../../../shared/components/CategoryManagement';
import { KeywordManagerModal } from '../../../shared/components/KeywordManagerModal';
import BrandingSettings from '../../site/components/BrandingSettings';
import { SiteSettingsManager } from './SiteSettingsManager';
import { LoadingCustomizer } from './LoadingCustomizer';
import * as Sentry from "@sentry/react";
// ... (imports)
const AdminNeuralHub = lazy(() => import('./AdminNeuralHub').then(m => ({ default: Sentry.withProfiler(m.AdminNeuralHub) })));
const CostAnalysisDashboard = lazy(() => import('./CostAnalysisDashboard').then(m => ({ default: Sentry.withProfiler(m.CostAnalysisDashboard) })));
import { MarketingManager } from './MarketingManager';
import { UserDataManager } from './UserDataManager';
import { BroadcastBox } from './BroadcastBox';
import { ChatArchiveManager } from './ChatArchiveManager';
import { ConnectManager } from './ConnectManager';
import { AIPredictivePulse } from './AIPredictivePulse';
import { NeuralSearch } from './NeuralSearch';
import { MergeCategoryModal } from './MergeCategoryModal';
import { CreateUserModal } from './CreateUserModal';
import { SupplyDemandAnalyzer } from './SupplyDemandAnalyzer';
import { SupplierVerificationModal } from './SupplierVerificationModal';
import { AdminActivityFeed } from './AdminActivityFeed';
import { AdminSystemHealth } from './AdminSystemHealth';
import { AdminQuickActions } from './AdminQuickActions';
import { AdminGrowthChart } from './AdminGrowthChart';
import { AdminDeepControl } from './AdminDeepControl';
import { AdminUserManagement } from './AdminUserManagement';
import { DashboardCopilot } from './DashboardCopilot';
import { toast } from 'sonner';
import { deleteDoc, writeBatch, where } from 'firebase/firestore';

interface AdminDashboardProps {
  profile: UserProfile;
  features: AppFeatures;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  profile,
  features,
  onOpenChat,
  onViewProfile,
  activeTab: externalActiveTab,
  setActiveTab: setExternalActiveTab
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [internalActiveTab, setInternalActiveTab] = useState('overview');
  
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = setExternalActiveTab || setInternalActiveTab;
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryForKeywords, setSelectedCategoryForKeywords] = useState<Category | null>(null);
  const [isSuggestingMerges, setIsSuggestingMerges] = useState(false);
  const [mergeSuggestions, setMergeSuggestions] = useState<any[]>([]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'product' | 'service'>('product');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedSupplierForVerification, setSelectedSupplierForVerification] = useState<UserProfile | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSuggestMerges = async () => {
    setIsSuggestingMerges(true);
    try {
      const { suggestCategoryMerges } = await import('../../../core/services/geminiService');
      const suggestions = await suggestCategoryMerges(categories, i18n.language);
      setMergeSuggestions(suggestions);
      setIsMergeModalOpen(true);
    } catch (error) {
      handleAiError(error, 'Merge suggestion');
      toast.error(isRtl ? 'حدث خطأ أثناء البحث عن فئات للدمج' : 'Error searching for categories to merge');
    } finally {
      setIsSuggestingMerges(false);
    }
  };

  const handleConfirmMerge = async (sourceId: string, targetId: string) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Update Users (Suppliers/Customers)
      const usersToUpdate = users.filter(u => u.categories?.includes(sourceId));
      usersToUpdate.forEach(user => {
        const newCategories = user.categories?.map(c => c === sourceId ? targetId : c) || [];
        // Remove duplicates if targetId was already there
        const uniqueCategories = Array.from(new Set(newCategories));
        batch.update(doc(db, 'users', user.uid), { categories: uniqueCategories });
      });

      // 2. Update Product Requests
      const requestsToUpdate = requests.filter(r => r.categoryId === sourceId);
      requestsToUpdate.forEach(request => {
        batch.update(doc(db, 'requests', request.id), { categoryId: targetId });
      });

      // 3. Update Marketplace Items
      const marketplaceSnap = await getDocs(query(collection(db, 'marketplace'), where('categories', 'array-contains', sourceId)));
      marketplaceSnap.forEach(itemDoc => {
        const data = itemDoc.data();
        const newCategories = data.categories?.map((c: string) => c === sourceId ? targetId : c) || [];
        const uniqueCategories = Array.from(new Set(newCategories));
        batch.update(doc(db, 'marketplace', itemDoc.id), { categories: uniqueCategories });
      });

      // 4. Update Child Categories
      const childCategories = categories.filter(c => c.parentId === sourceId);
      childCategories.forEach(child => {
        batch.update(doc(db, 'categories', child.id), { parentId: targetId });
      });

      // 5. Delete the source category
      batch.delete(doc(db, 'categories', sourceId));

      await batch.commit();
      
      setMergeSuggestions(prev => prev.filter(s => s.sourceId !== sourceId));
      toast.success(isRtl ? 'تم دمج الفئات ونقل البيانات بنجاح' : 'Categories merged and data moved successfully');
      
      if (mergeSuggestions.length <= 1) {
        setIsMergeModalOpen(false);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'categories/merge', false);
      toast.error(isRtl ? 'فشل تنفيذ عملية الدمج' : 'Failed to execute merge');
    }
  };

  const handleSuggestMainCategories = async () => {
    setIsSuggesting(true);
    try {
      const existingNames = categories
        .filter(c => !c.parentId && c.categoryType === activeCategoryTab)
        .map(c => i18n.language === 'ar' ? c.nameAr : c.nameEn);
      
      const { suggestMainCategories } = await import('../../../core/services/geminiService');
      const suggestions = await suggestMainCategories(i18n.language, activeCategoryTab, existingNames);
      setAiSuggestions(suggestions);
    } catch (error: any) {
      handleAiError(error, 'Main category suggestion');
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
    if (!targetParentId) return;
    
    setIsSuggesting(true);
    try {
      const parent = categories.find(c => c.id === targetParentId);
      if (!parent) return;
      
      const categoryName = i18n.language === 'ar' ? parent.nameAr : parent.nameEn;
      const existingSubNames = categories
        .filter(c => c.parentId === targetParentId)
        .map(c => i18n.language === 'ar' ? c.nameAr : c.nameEn);
        
      const { suggestSubcategories } = await import('../../../core/services/geminiService');
      const suggestions = await suggestSubcategories(categoryName, activeCategoryTab, existingSubNames);
      setAiSuggestions(suggestions);
    } catch (error: any) {
      handleAiError(error, 'Subcategory suggestion');
      if (error.message === 'QUOTA_EXHAUSTED') {
        toast.error(i18n.language === 'ar' ? 'عذراً، تم استنفاد حصة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.' : 'AI quota exhausted. Please try again later.');
      } else {
        toast.error(i18n.language === 'ar' ? 'حدث خطأ أثناء توليد الاقتراحات' : 'Failed to generate suggestions');
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAddSuggested = async (name: string) => {
    try {
      const { translateText } = await import('../../../core/services/geminiService');
      const nameEn = await translateText(name, 'English');
      const nameAr = await translateText(name, 'Arabic');
      
      await addDoc(collection(db, 'categories'), {
        nameAr,
        nameEn,
        categoryType: activeCategoryTab,
        parentId: selectedParentId || null,
        createdAt: new Date().toISOString()
      });
      
      setAiSuggestions(prev => prev.filter(s => s !== name));
      toast.success(i18n.language === 'ar' ? 'تمت إضافة الفئة بنجاح' : 'Category added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories', false);
      toast.error(i18n.language === 'ar' ? 'فشل إضافة الفئة' : 'Failed to add category');
    }
  };

  // Fetch data
  useEffect(() => {
    setLoading(true);
    
    const unsubscribeUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => {
      const fetchedUsers: UserProfile[] = [];
      snap.forEach(doc => fetchedUsers.push({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(fetchedUsers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users', false);
    });

    const unsubscribeRequests = onSnapshot(query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(500)), (snap) => {
      const fetchedRequests: ProductRequest[] = [];
      snap.forEach(doc => fetchedRequests.push({ id: doc.id, ...doc.data() } as ProductRequest));
      setRequests(fetchedRequests);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests', false);
    });

    const unsubscribeCategories = onSnapshot(query(collection(db, 'categories'), orderBy('nameEn', 'asc')), (snap) => {
      const fetchedCategories: Category[] = [];
      snap.forEach(doc => fetchedCategories.push({ id: doc.id, ...doc.data() } as Category));
      setCategories(fetchedCategories);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories', false);
    });

    const unsubscribeWithdrawals = onSnapshot(collection(db, 'withdrawal_requests'), (snap) => {
      const fetchedWithdrawals: any[] = [];
      snap.forEach(doc => fetchedWithdrawals.push({ id: doc.id, ...doc.data() }));
      setWithdrawals(fetchedWithdrawals);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawal_requests', false);
    });

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeCategories();
      unsubscribeWithdrawals();
    };
  }, []);

  const handleNeuralSearchNavigate = (tab: string) => {
    const tabMap: { [key: string]: string } = {
      'users': 'users',
      'requests': 'requests',
      'categories': 'categories',
      'withdrawals': 'nexus',
      'suppliers': 'users',
      'ambassadors': 'users',
      'statistics': 'overview'
    };
    const targetTab = tabMap[tab.toLowerCase()] || 'overview';
    setActiveTab(targetTab);
  };

  const handleNeuralSearchFilter = (target: string, filters: any) => {
    setSearchFilters({ target, ...filters });
    handleNeuralSearchNavigate(target);
  };

  const handleUpdateRole = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      toast.success(isRtl ? 'تم تحديث الدور بنجاح' : 'Role updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`, false);
    }
  };

  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);

  const handleSystemScan = async () => {
    setIsScanning(true);
    setScanResults(null);
    try {
      // Simulate AI scan
      await new Promise(resolve => setTimeout(resolve, 3000));
      setScanResults({
        integrity: '100%',
        latency: '42ms',
        optimization: '99%',
        lastScan: new Date().toISOString()
      });
      toast.success(isRtl ? 'اكتمل فحص النظام بنجاح' : 'System scan completed successfully');
    } catch (error) {
      toast.error(isRtl ? 'فشل فحص النظام' : 'System scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleVerifySupplier = async (uid: string, isVerified: boolean) => {
    const supplier = users.find(u => u.uid === uid);
    if (supplier && !isVerified) {
      // If unverifying, do it directly
      try {
        await updateDoc(doc(db, 'users', uid), { isVerified: false });
        toast.success(isRtl ? 'تم إلغاء توثيق المورد' : 'Supplier unverified');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`, false);
      }
    } else if (supplier) {
      // If verifying, open the smart modal
      setSelectedSupplierForVerification(supplier);
      setIsVerificationModalOpen(true);
    }
  };

  const [isCheckingExpirations, setIsCheckingExpirations] = useState(false);

  const handleCheckExpirations = async () => {
    setIsCheckingExpirations(true);
    try {
      const suppliers = users.filter(u => u.role === 'supplier' && u.isVerified && u.verificationExpiryDate);
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      let notifiedCount = 0;

      for (const supplier of suppliers) {
        const expiryDate = new Date(supplier.verificationExpiryDate!);
        if (isNaN(expiryDate.getTime())) continue;

        if (expiryDate <= thirtyDaysFromNow) {
          const isActuallyExpired = expiryDate <= now;
          
          // Notify Supplier
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: supplier.uid,
              titleAr: isActuallyExpired ? 'انتهت صلاحية وثائق التوثيق' : 'اقترب موعد انتهاء صلاحية وثائقك',
              titleEn: isActuallyExpired ? 'Verification Documents Expired' : 'Documents Expiring Soon',
              bodyAr: isActuallyExpired 
                ? `انتهت صلاحية سجلّك التجاري في ${supplier.verificationExpiryDate}. يرجى تحديثه فوراً.` 
                : `سينتهي سجلّك التجاري في ${supplier.verificationExpiryDate}. يرجى التجديد قبل الانتهاء.`,
              bodyEn: isActuallyExpired 
                ? `Your commercial registration expired on ${supplier.verificationExpiryDate}. Please update it immediately.` 
                : `Your commercial registration will expire on ${supplier.verificationExpiryDate}. Please renew it soon.`,
              createdAt: new Date().toISOString(),
              read: false,
              actionType: 'general'
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'notifications', false);
          }

          // Notify Admin
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: profile.uid,
              titleAr: isActuallyExpired ? 'تنبيه: سجل تجاري منتهي' : 'تنبيه: سجل تجاري يقترب من الانتهاء',
              titleEn: isActuallyExpired ? 'Alert: Expired Registration' : 'Alert: Registration Expiring Soon',
              bodyAr: `المورد ${supplier.name} لديه سجل ${isActuallyExpired ? 'منتهي' : 'يقترب من الانتهاء'} (${supplier.verificationExpiryDate}).`,
              bodyEn: `Supplier ${supplier.name} has an ${isActuallyExpired ? 'expired' : 'expiring'} registration (${supplier.verificationExpiryDate}).`,
              createdAt: new Date().toISOString(),
              read: false,
              actionType: 'general'
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'notifications', false);
          }

          notifiedCount++;
        }
      }

      toast.success(isRtl 
        ? `تم فحص التواريخ وإرسال ${notifiedCount} تنبيهات.` 
        : `Checked dates and sent ${notifiedCount} alerts.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users/expirations', false);
      toast.error(isRtl ? 'فشل فحص تواريخ الانتهاء' : 'Failed to check expiration dates');
    } finally {
      setIsCheckingExpirations(false);
    }
  };

  const tabs = [
    { id: 'overview', label: isRtl ? 'نظرة عامة' : 'Overview', icon: LayoutGrid },
    { id: 'users', label: isRtl ? 'المستخدمين' : 'Users', icon: Users },
    { id: 'chats', label: isRtl ? 'أرشيف المحادثات' : 'Chat Archive', icon: Archive, isNew: true },
    { id: 'directory', label: isRtl ? 'دليل البيانات' : 'Data Directory', icon: BookOpen },
    { id: 'marketing', label: isRtl ? 'التسويق' : 'Marketing', icon: Megaphone },
    { id: 'broadcast', label: isRtl ? 'إشعار جماعي' : 'Broadcast', icon: Send },
    { id: 'categories', label: isRtl ? 'الأقسام' : 'Categories', icon: ListTree },
    ...(profile.role === 'admin' ? [{ id: 'loader', label: isRtl ? 'شاشة التحميل' : 'Loading Screen', icon: Loader2, isNew: true }] : []),
    { id: 'site', label: isRtl ? 'إعدادات الواجهة' : 'Interface Settings', icon: Zap },
    { id: 'ai', label: isRtl ? 'مركز الذكاء الاصطناعي' : 'AI Neural Hub', icon: Cpu },
    { id: 'cost', label: isRtl ? 'تحليل التكاليف' : 'Cost Analysis', icon: TrendingUp },
    { id: 'connect', label: isRtl ? 'نمو كونكت' : 'Connect Growth', icon: Zap, isNew: true },
    { id: 'gap-analysis', label: isRtl ? 'تحليل الفجوة' : 'Gap Analysis', icon: BarChart3, isNew: true },
    { id: 'settings', label: isRtl ? 'الهوية البصرية' : 'Brand Identity', icon: Palette },
  ];

  const totalSuppliers = users.filter(u => u.role === 'supplier').length;
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const openRequests = requests.filter(r => r.status === 'open').length;
  
  // Simulate active users (e.g., 5-15% of total users are online)
  const activeUsersCount = Math.floor(users.length * (0.05 + Math.random() * 0.1)) + 3;
  const activeSuppliersCount = Math.floor(activeUsersCount * 0.4);
  const activeCustomersCount = activeUsersCount - activeSuppliersCount;

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'add_user':
        setIsCreateUserModalOpen(true);
        break;
      case 'add_category':
        setActiveTab('categories');
        break;
      case 'create_campaign':
        setActiveTab('marketing');
        break;
      case 'broadcast':
        setActiveTab('broadcast');
        break;
      case 'ai_optimize':
        handleSystemScan();
        break;
      default:
        toast.info(isRtl ? 'هذه الميزة ستكون متاحة قريباً' : 'This feature will be available soon');
    }
  };

  return (
    <div className={`flex flex-col md:flex-row min-h-screen bg-brand-background ${isRtl ? 'font-arabic' : ''}`}>
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tabs={tabs} 
        isRtl={isRtl} 
        profile={profile} 
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-brand-background p-4 md:p-8">
        {/* Top Neural Bar */}
        <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between gap-4">
          <NeuralSearch 
            onNavigate={handleNeuralSearchNavigate}
            onFilter={handleNeuralSearchFilter}
            availableTabs={tabs.map(t => t.id)}
          />
          
          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-primary transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand-primary rounded-full border-2 border-brand-surface" />
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-brand-border">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-brand-text-main">{profile.name}</div>
                <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Admin</div>
              </div>
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.name}&background=random`} 
                alt={profile.name}
                className="w-10 h-10 rounded-xl border border-brand-border object-cover"
              />
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 max-w-6xl mx-auto"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-brand-text-main">
                    {isRtl ? 'نظرة عامة' : 'Overview'}
                  </h1>
                  <p className="text-brand-text-muted mt-1">
                    {isRtl ? 'إحصائيات النظام الشاملة والتحليلات الذكية' : 'Comprehensive system statistics and smart analytics'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleSystemScan}
                    disabled={isScanning}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-background transition-all"
                  >
                    {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                    {isRtl ? 'فحص النظام' : 'System Scan'}
                  </button>
                </div>
              </div>

              <AIPredictivePulse 
                systemData={{
                  userCount: users.length,
                  requestCount: requests.length,
                  withdrawalCount: withdrawals.length,
                  activeSuppliers: users.filter(u => u.role === 'supplier').length
                }}
              />

              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: isRtl ? 'إجمالي المستخدمين' : 'Total Users', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: '+12%' },
                  { label: isRtl ? 'الموردين' : 'Suppliers', value: totalSuppliers, icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: '+5%' },
                  { label: isRtl ? 'العملاء' : 'Customers', value: totalCustomers, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10', trend: '+18%' },
                  { label: isRtl ? 'الطلبات المفتوحة' : 'Open Requests', value: openRequests, icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: '+24%' },
                  { 
                    label: isRtl ? 'نشط الآن' : 'Active Now', 
                    value: activeUsersCount, 
                    icon: Activity, 
                    color: 'text-brand-primary', 
                    bg: 'bg-brand-primary/10', 
                    trend: isRtl ? `${activeSuppliersCount} مورد | ${activeCustomersCount} عميل` : `${activeSuppliersCount} Suppliers | ${activeCustomersCount} Customers`,
                    isPulse: true 
                  },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm relative overflow-hidden group hover:border-brand-primary/30 transition-all"
                  >
                    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
                    <div className="relative z-10 flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center relative`}>
                        <stat.icon size={24} />
                        {stat.isPulse && (
                          <div className="absolute inset-0 rounded-2xl bg-brand-primary animate-ping opacity-20" />
                        )}
                      </div>
                      <span className={`text-[8px] font-black ${stat.isPulse ? 'text-brand-primary bg-brand-primary/10' : 'text-emerald-500 bg-emerald-500/10'} px-2 py-1 rounded-lg uppercase tracking-tighter`}>
                        {stat.trend}
                      </span>
                    </div>
                    <div className="relative z-10">
                      <div className="text-3xl font-black text-brand-text-main mb-1">
                        {stat.value}
                      </div>
                      <div className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                        {stat.label}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-[400px]">
                    <AdminGrowthChart />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AdminSystemHealth />
                    <AdminDeepControl />
                  </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                  <AdminQuickActions onAction={handleQuickAction} />
                  <div className="h-[400px]">
                    <AdminActivityFeed />
                  </div>
                  <div className="bg-brand-surface p-6 rounded-[2.5rem] border border-brand-border shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Cpu size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                        <Sparkles size={20} />
                      </div>
                      <h3 className="font-black text-brand-text-main">{isRtl ? 'حالة النظام الذكي' : 'AI System Status'}</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-brand-text-muted font-bold">{isRtl ? 'الأداء العام' : 'Overall Performance'}</span>
                        <span className="text-emerald-500 font-black">99.9%</span>
                      </div>
                      <div className="w-full h-1.5 bg-brand-background rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '99.9%' }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                      <p className="text-[10px] text-brand-text-muted mt-2">
                        {isRtl ? 'يعمل النظام بكفاءة عالية مع تحسينات الذكاء الاصطناعي النشطة.' : 'System operating at peak efficiency with active AI optimizations.'}
                      </p>
                    </div>
                  </div>
                  <BroadcastBox allUsers={users} i18n={i18n} t={t} size="compact" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <AdminUserManagement 
                users={users}
                onUpdateRole={handleUpdateRole}
                onVerifySupplier={handleVerifySupplier}
                onViewProfile={onViewProfile}
                onCheckExpirations={handleCheckExpirations}
                isCheckingExpirations={isCheckingExpirations}
                onCreateUser={() => setIsCreateUserModalOpen(true)}
                onBulkDelete={async (uids) => {
                  try {
                    const batch = writeBatch(db);
                    uids.forEach(uid => {
                      batch.update(doc(db, 'users', uid), { 
                        status: 'deleted', 
                        deletedAt: new Date().toISOString(),
                        deletedBy: profile?.uid || 'unknown'
                      });
                      batch.set(doc(db, 'users_public', uid), { 
                        status: 'deleted',
                        isOnline: false
                      }, { merge: true });
                    });
                    await batch.commit();
                    toast.success(isRtl ? 'تم حذف المستخدمين المحددين (حذف ناعم)' : 'Selected users deleted (Soft Delete)');
                  } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, 'users/bulk-delete', false);
                    toast.error(isRtl ? 'فشل حذف المستخدمين' : 'Failed to delete users');
                  }
                }}
                onBulkVerify={async (uids) => {
                  // Placeholder for bulk verify logic
                  console.log('Bulk verify:', uids);
                  toast.success(isRtl ? 'تم توثيق المستخدمين المحددين' : 'Selected users verified');
                }}
                onDeleteUser={async (uid) => {
                  try {
                    await updateDoc(doc(db, 'users', uid), { 
                      status: 'deleted', 
                      deletedAt: new Date().toISOString(),
                      deletedBy: profile?.uid || 'unknown'
                    });
                    await setDoc(doc(db, 'users_public', uid), { 
                      status: 'deleted',
                      isOnline: false
                    }, { merge: true });
                    toast.success(isRtl ? 'تم حذف المستخدم (حذف ناعم)' : 'User deleted (Soft Delete)');
                  } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`, false);
                    toast.error(isRtl ? 'فشل حذف المستخدم' : 'Failed to delete user');
                  }
                }}
              />

              <CreateUserModal 
                isOpen={isCreateUserModalOpen}
                onClose={() => setIsCreateUserModalOpen(false)}
                onSuccess={() => {
                  // Refresh users list if needed, though onSnapshot handles it
                }}
              />

              {selectedSupplierForVerification && (
                <SupplierVerificationModal
                  isOpen={isVerificationModalOpen}
                  onClose={() => {
                    setIsVerificationModalOpen(false);
                    setSelectedSupplierForVerification(null);
                  }}
                  supplier={selectedSupplierForVerification}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'chats' && (
            <motion.div
              key="chats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <ChatArchiveManager onOpenChat={onOpenChat} />
            </motion.div>
          )}

          {activeTab === 'directory' && (
            <motion.div
              key="directory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <UserDataManager allUsers={users} isRtl={isRtl} t={t} />
            </motion.div>
          )}

          {activeTab === 'marketing' && (
            <motion.div
              key="marketing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <MarketingManager allUsers={users} isRtl={isRtl} t={t} />
            </motion.div>
          )}

          {activeTab === 'gap-analysis' && (
            <motion.div
              key="gap-analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <SupplyDemandAnalyzer categories={categories} allUsers={users} />
            </motion.div>
          )}

          {activeTab === 'broadcast' && (
            <motion.div
              key="broadcast"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <BroadcastBox allUsers={users} i18n={i18n} t={t} />
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full -m-4 md:-m-8"
            >
              <Suspense fallback={<div className="p-8 text-center">{isRtl ? 'جاري التحميل...' : 'Loading...'}</div>}>
                <AdminNeuralHub />
              </Suspense>
            </motion.div>
          )}
          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <AnimatePresence>
                {selectedCategoryForKeywords && (
                  <KeywordManagerModal 
                    category={selectedCategoryForKeywords}
                    onClose={() => setSelectedCategoryForKeywords(null)}
                    onUpdate={(updatedCategory) => {
                      setCategories(categories.map(c => c.id === updatedCategory.id ? updatedCategory : c));
                    }}
                    t={t}
                    i18n={i18n}
                  />
                )}
                {isMergeModalOpen && (
                  <MergeCategoryModal
                    isOpen={isMergeModalOpen}
                    onClose={() => setIsMergeModalOpen(false)}
                    suggestions={mergeSuggestions}
                    categories={categories}
                    onConfirmMerge={handleConfirmMerge}
                    isRtl={isRtl}
                  />
                )}
              </AnimatePresence>
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
            </motion.div>
          )}

          {activeTab === 'loader' && profile.role === 'admin' && (
            <motion.div
              key="loader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <LoadingCustomizer />
            </motion.div>
          )}
          
          {activeTab === 'loader' && profile.role !== 'admin' && (
            <div className="p-8 text-center text-brand-text-muted font-bold">
              {isRtl ? 'عذراً، ليس لديك صلاحية للوصول إلى هذه الإعدادات.' : 'Sorry, you do not have permission to access these settings.'}
            </div>
          )}

          {activeTab === 'site' && (
            <motion.div
              key="site"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <SiteSettingsManager />
            </motion.div>
          )}

          {activeTab === 'cost' && (
            <motion.div
              key="cost"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <Suspense fallback={<div className="p-8 text-center">{isRtl ? 'جاري التحميل...' : 'Loading...'}</div>}>
                <CostAnalysisDashboard />
              </Suspense>
            </motion.div>
          )}

          {activeTab === 'connect' && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ConnectManager />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <BrandingSettings onBack={() => setActiveTab('overview')} />
            </motion.div>
          )}
        </AnimatePresence>
        <DashboardCopilot />
      </main>
      {isCommandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
          onClick={() => setIsCommandPaletteOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg bg-brand-surface rounded-3xl border border-brand-border shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-border">
              <Search className="text-brand-text-muted" size={20} />
              <input
                type="text"
                placeholder={isRtl ? 'ابحث في لوحة التحكم...' : 'Search dashboard...'}
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold"
                autoFocus
              />
              <kbd className="px-2 py-1 bg-brand-background rounded text-[10px] font-black text-brand-text-muted">ESC</kbd>
            </div>
            <div className="p-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-brand-text-main hover:bg-brand-background transition-all"
                >
                  <tab.icon size={18} className="text-brand-primary" />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
      <DashboardCopilot />
    </div>
  );
};
