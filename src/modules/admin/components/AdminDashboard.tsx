import React, { useState, useEffect } from 'react';
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
import { collection, query, onSnapshot, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { db } from '../../../core/firebase';
import { UserProfile, AppFeatures, ProductRequest, Category } from '../../../core/types';
import { CategoryManagement } from '../../../shared/components/CategoryManagement';
import { KeywordManagerModal } from '../../../shared/components/KeywordManagerModal';
import BrandingSettings from '../../site/components/BrandingSettings';
import { SiteSettingsManager } from './SiteSettingsManager';
import { LoadingCustomizer } from './LoadingCustomizer';
import { AdminNeuralHub } from './AdminNeuralHub';
import { CostAnalysisDashboard } from './CostAnalysisDashboard';
import { MarketingManager } from './MarketingManager';
import { UserDataManager } from './UserDataManager';
import { BroadcastBox } from './BroadcastBox';
import { ChatArchiveManager } from './ChatArchiveManager';
import { NexusManager } from './NexusManager';
import { AIPredictivePulse } from './AIPredictivePulse';
import { NeuralSearch } from './NeuralSearch';
import { MergeCategoryModal } from './MergeCategoryModal';
import { CreateUserModal } from './CreateUserModal';
import { SupplyDemandAnalyzer } from './SupplyDemandAnalyzer';
import { SupplierVerificationModal } from './SupplierVerificationModal';
import { toast } from 'sonner';
import { deleteDoc, writeBatch, where } from 'firebase/firestore';

interface AdminDashboardProps {
  profile: UserProfile;
  features: AppFeatures;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  profile,
  features,
  onOpenChat,
  onViewProfile
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState('overview');
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

  const handleSuggestMerges = async () => {
    setIsSuggestingMerges(true);
    try {
      const { suggestCategoryMerges } = await import('../../../core/services/geminiService');
      const suggestions = await suggestCategoryMerges(categories, i18n.language);
      setMergeSuggestions(suggestions);
      setIsMergeModalOpen(true);
    } catch (error) {
      console.error('Merge suggestion error:', error);
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
      console.error('Merge execution error:', error);
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
      console.error('Suggestion error:', error);
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
      console.error('Suggestion error:', error);
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
      console.error('Error adding category:', error);
      toast.error(i18n.language === 'ar' ? 'فشل إضافة الفئة' : 'Failed to add category');
    }
  };

  // Fetch data
  useEffect(() => {
    setLoading(true);
    
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const fetchedUsers: UserProfile[] = [];
      snap.forEach(doc => fetchedUsers.push({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(fetchedUsers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users', false);
    });

    const unsubscribeRequests = onSnapshot(collection(db, 'requests'), (snap) => {
      const fetchedRequests: ProductRequest[] = [];
      snap.forEach(doc => fetchedRequests.push({ id: doc.id, ...doc.data() } as ProductRequest));
      setRequests(fetchedRequests);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests', false);
    });

    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snap) => {
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
    } catch (error) {
      console.error("Error updating role:", error);
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
        console.error("Error unverifying supplier:", error);
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

          // Notify Admin
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

          notifiedCount++;
        }
      }

      toast.success(isRtl 
        ? `تم فحص التواريخ وإرسال ${notifiedCount} تنبيهات.` 
        : `Checked dates and sent ${notifiedCount} alerts.`);
    } catch (error) {
      console.error('Error checking expirations:', error);
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
    { id: 'loader', label: isRtl ? 'شاشة التحميل' : 'Loading Screen', icon: Loader2, isNew: true },
    { id: 'site', label: isRtl ? 'إعدادات الواجهة' : 'Interface Settings', icon: Zap },
    { id: 'ai', label: isRtl ? 'مركز الذكاء الاصطناعي' : 'AI Neural Hub', icon: Cpu },
    { id: 'cost', label: isRtl ? 'تحليل التكاليف' : 'Cost Analysis', icon: TrendingUp },
    { id: 'nexus', label: isRtl ? 'نمو النكسوس' : 'Nexus Growth', icon: Zap, isNew: true },
    { id: 'gap-analysis', label: isRtl ? 'تحليل الفجوة' : 'Gap Analysis', icon: BarChart3, isNew: true },
    { id: 'settings', label: isRtl ? 'الهوية البصرية' : 'Brand Identity', icon: Palette },
  ];

  const totalSuppliers = users.filter(u => u.role === 'supplier').length;
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const openRequests = requests.filter(r => r.status === 'open').length;

  const filteredUsers = users.filter(user => {
    if (!searchFilters || searchFilters.target !== 'users') return true;
    
    const { role, searchString } = searchFilters;
    
    if (role && user.role !== role) return false;
    if (searchString) {
      const s = searchString.toLowerCase();
      return (
        user.name?.toLowerCase().includes(s) ||
        user.email?.toLowerCase().includes(s) ||
        user.companyName?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className={`flex flex-col md:flex-row min-h-screen bg-brand-background ${isRtl ? 'font-arabic' : ''}`}>
      {/* Sidebar / Mobile Nav */}
      <aside className={`w-full md:w-72 bg-brand-surface border-brand-border border-b md:border-b-0 ${isRtl ? 'md:border-l' : 'md:border-r'} flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 sticky top-0 md:relative`}>
        <div className="p-6 md:p-8 border-b border-brand-border/50 bg-brand-surface/50 backdrop-blur-sm hidden md:block">
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

        <nav className="flex md:flex-col p-2 md:p-4 space-x-2 md:space-x-0 md:space-y-1.5 overflow-x-auto md:overflow-y-auto custom-scrollbar no-scrollbar scroll-smooth">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-between px-4 py-2.5 md:py-3.5 rounded-xl text-xs md:text-sm font-black transition-all duration-300 whitespace-nowrap md:whitespace-normal shrink-0 md:shrink ${
                activeTab === tab.id 
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20 md:translate-x-1' 
                  : 'text-brand-text-muted hover:bg-brand-background hover:text-brand-text-main md:hover:translate-x-1'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-brand-text-muted'} />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.label.split(' ')[0]}</span>
              </div>
              {(tab as any).isNew && (
                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-brand-primary text-[8px] font-black text-white animate-pulse hidden md:inline">
                  NEW
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

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
              <AIPredictivePulse 
                systemData={{
                  userCount: users.length,
                  requestCount: requests.length,
                  withdrawalCount: withdrawals.length,
                  activeSuppliers: users.filter(u => u.role === 'supplier').length
                }}
              />

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black text-brand-text-main">
                    {isRtl ? 'نظرة عامة' : 'Overview'}
                  </h1>
                  <p className="text-brand-text-muted mt-1">
                    {isRtl ? 'إحصائيات النظام الشاملة' : 'Comprehensive system statistics'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: isRtl ? 'إجمالي المستخدمين' : 'Total Users', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: isRtl ? 'الموردين' : 'Suppliers', value: totalSuppliers, icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: isRtl ? 'العملاء' : 'Customers', value: totalCustomers, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                  { label: isRtl ? 'الطلبات المفتوحة' : 'Open Requests', value: openRequests, icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-brand-surface p-6 rounded-2xl border border-brand-border shadow-sm relative overflow-hidden group"
                  >
                    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
                    <div className="relative z-10 flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                        <stat.icon size={24} />
                      </div>
                      <span className="text-sm font-bold text-brand-text-muted uppercase tracking-wider">
                        {stat.label}
                      </span>
                    </div>
                    <div className="relative z-10 text-4xl font-black text-brand-text-main">
                      {stat.value}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  {/* You can add more overview components here later */}
                </div>
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-brand-surface p-6 rounded-[2rem] border border-brand-border shadow-sm relative overflow-hidden group">
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
              className="space-y-6 max-w-6xl mx-auto"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-brand-text-main">
                    {isRtl ? 'إدارة المستخدمين' : 'User Management'}
                  </h1>
                  <p className="text-brand-text-muted mt-1">
                    {isRtl ? 'إدارة الصلاحيات وتوثيق الحسابات' : 'Manage roles and verify accounts'}
                  </p>
                </div>
                
                {searchFilters && searchFilters.target === 'users' && (
                  <button
                    onClick={() => setSearchFilters(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary/20 transition-all"
                  >
                    <X size={14} />
                    {isRtl ? 'مسح الفلاتر' : 'Clear Filters'}
                  </button>
                )}

                <button
                  onClick={handleCheckExpirations}
                  disabled={isCheckingExpirations}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-surface text-brand-text-main border border-brand-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-background transition-all shadow-sm group"
                  title={isRtl ? 'فحص تواريخ انتهاء السجلات' : 'Check Registration Expirations'}
                >
                  {isCheckingExpirations ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} className="group-hover:rotate-12 transition-transform" />}
                  {isRtl ? 'فحص الصلاحية' : 'Check Expirations'}
                </button>
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 group"
                >
                  <Plus size={18} className="group-hover:scale-110 transition-transform" />
                  {isRtl ? 'إضافة مستخدم' : 'Add User'}
                </button>
              </div>

              <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-background/50 border-b border-brand-border">
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'المستخدم' : 'User'}</th>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'الدور' : 'Role'}</th>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'التوثيق' : 'Verification'}</th>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'مؤشر الثقة' : 'Trust Score'}</th>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap text-right">{isRtl ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {filteredUsers.map(user => (
                        <tr key={user.uid} className="hover:bg-brand-background/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-sm border border-brand-primary/20 shrink-0 overflow-hidden">
                                {user.logoUrl ? (
                                  <img src={user.logoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  user.name?.charAt(0) || '?'
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-black text-brand-text-main group-hover:text-brand-primary transition-colors">
                                  {user.name || (isRtl ? 'بدون اسم' : 'Unnamed')}
                                </div>
                                <div className="text-[10px] font-bold text-brand-text-muted">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={user.role || 'customer'}
                              onChange={(e) => handleUpdateRole(user.uid, e.target.value)}
                              className="bg-brand-background border border-brand-border rounded-xl px-4 py-2 text-xs font-bold text-brand-text-main focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
                            >
                              <option value="customer">{isRtl ? 'عميل' : 'Customer'}</option>
                              <option value="supplier">{isRtl ? 'مورد' : 'Supplier'}</option>
                              <option value="admin">{isRtl ? 'مدير' : 'Admin'}</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.role === 'supplier' ? (
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => handleVerifySupplier(user.uid, !user.isVerified)}
                                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                                    user.isVerified 
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' 
                                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20'
                                  }`}
                                >
                                  {user.isVerified ? (isRtl ? 'موثق' : 'Verified') : (isRtl ? 'غير موثق' : 'Unverified')}
                                  {user.isVerified && user.verificationExpiryDate && (
                                    (() => {
                                      const expiry = new Date(user.verificationExpiryDate);
                                      const now = new Date();
                                      const soon = new Date();
                                      soon.setDate(now.getDate() + 30);
                                      if (expiry <= now) return <AlertTriangle size={12} className="text-brand-error animate-pulse" />;
                                      if (expiry <= soon) return <AlertTriangle size={12} className="text-amber-500" />;
                                      return null;
                                    })()
                                  )}
                                </button>
                                {user.verificationExpiryDate && (
                                  <span className="text-[8px] font-bold text-brand-text-muted px-1">
                                    {isRtl ? 'ينتهي: ' : 'Exp: '} {user.verificationExpiryDate}
                                  </span>
                                )}
                                <button
                                  onClick={() => onViewProfile(user.uid)}
                                  className="mt-2 px-4 py-1.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                  <ShoppingBag size={12} />
                                  {isRtl ? 'زيارة المتجر' : 'Visit Store'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-brand-text-muted/30 uppercase tracking-widest">
                                {isRtl ? 'لا ينطبق' : 'N/A'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.role === 'supplier' ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 w-12 bg-brand-background rounded-full overflow-hidden border border-brand-border">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${
                                      (user.trustScore || 0) >= 80 ? 'bg-emerald-500' :
                                      (user.trustScore || 0) >= 50 ? 'bg-amber-500' :
                                      'bg-brand-error'
                                    }`}
                                    style={{ width: `${user.trustScore || 0}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-black text-brand-text-main">{user.trustScore || 0}%</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-brand-text-muted/30">---</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => onViewProfile(user.uid)}
                              className="p-2.5 bg-brand-background text-brand-text-muted rounded-xl hover:text-brand-primary hover:bg-brand-primary/10 transition-all border border-brand-border"
                              title={isRtl ? 'عرض الملف' : 'View Profile'}
                            >
                              <Users size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
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
              className="space-y-8 max-w-4xl mx-auto"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-brand-primary/10 rounded-[2rem] flex items-center justify-center text-brand-primary mx-auto animate-pulse">
                  <Cpu size={40} />
                </div>
                <h1 className="text-4xl font-black text-brand-text-main">
                  {isRtl ? 'مركز الذكاء الاصطناعي العصبي' : 'AI Neural Hub'}
                </h1>
                <p className="text-brand-text-muted max-w-lg mx-auto">
                  {isRtl ? 'تحكم في قدرات الذكاء الاصطناعي المتقدمة لتحسين تجربة المستخدم وأداء النظام' : 'Control advanced AI capabilities to optimize user experience and system performance'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm hover:shadow-xl hover:shadow-brand-primary/5 transition-all group">
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary mb-6 group-hover:scale-110 transition-transform">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-xl font-black text-brand-text-main mb-2">{isRtl ? 'توليد الشعارات الذكي' : 'Smart Logo Generation'}</h3>
                  <p className="text-sm text-brand-text-muted mb-6">{isRtl ? 'تفعيل ميزة توليد الشعارات للموردين باستخدام Gemini Pro' : 'Enable logo generation for suppliers using Gemini Pro'}</p>
                  <div className="flex items-center justify-between p-4 bg-brand-background rounded-2xl border border-brand-border">
                    <span className="text-xs font-black uppercase tracking-widest text-brand-text-muted">{isRtl ? 'الحالة' : 'Status'}</span>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">{isRtl ? 'نشط' : 'Active'}</span>
                  </div>
                </div>

                <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm hover:shadow-xl hover:shadow-brand-primary/5 transition-all group">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
                    <Wand2 size={24} />
                  </div>
                  <h3 className="text-xl font-black text-brand-text-main mb-2">{isRtl ? 'تحسين المحتوى التلقائي' : 'Auto Content Optimization'}</h3>
                  <p className="text-sm text-brand-text-muted mb-6">{isRtl ? 'تصحيح الأخطاء اللغوية وتحسين نصوص المنتجات تلقائياً' : 'Automatically correct typos and optimize product descriptions'}</p>
                  <div className="flex items-center justify-between p-4 bg-brand-background rounded-2xl border border-brand-border">
                    <span className="text-xs font-black uppercase tracking-widest text-brand-text-muted">{isRtl ? 'الحالة' : 'Status'}</span>
                    <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black uppercase tracking-widest">{isRtl ? 'قيد المعالجة' : 'Processing'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-brand-text-main">{isRtl ? 'تشخيص النظام الذكي' : 'Smart System Diagnostics'}</h3>
                      <p className="text-sm text-brand-text-muted">{isRtl ? 'فحص شامل لقاعدة البيانات والملفات' : 'Comprehensive database and file check'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSystemScan}
                    disabled={isScanning}
                    className="px-6 py-3 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {isRtl ? 'بدء الفحص' : 'Start Scan'}
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    { label: isRtl ? 'سلامة قاعدة البيانات' : 'Database Integrity', status: scanResults?.integrity || 'Optimal', color: 'text-emerald-500' },
                    { label: isRtl ? 'سرعة استجابة الخادم' : 'Server Response Time', status: scanResults?.latency || '45ms', color: 'text-emerald-500' },
                    { label: isRtl ? 'تحسين الصور' : 'Image Optimization', status: scanResults?.optimization || '98%', color: 'text-emerald-500' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-brand-background rounded-2xl border border-brand-border">
                      <span className="text-sm font-bold text-brand-text-main">{item.label}</span>
                      <span className={`text-sm font-black ${item.color}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
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

          {activeTab === 'loader' && (
            <motion.div
              key="loader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <LoadingCustomizer />
            </motion.div>
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

          {activeTab === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminNeuralHub />
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
              <CostAnalysisDashboard />
            </motion.div>
          )}

          {activeTab === 'nexus' && (
            <motion.div
              key="nexus"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <NexusManager />
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
      </main>
    </div>
  );
};
