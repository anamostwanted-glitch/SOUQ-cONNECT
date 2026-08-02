import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Building2, 
  UserCheck, 
  UserX, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  Star, 
  Clock, 
  Mail,
  Phone,
  ArrowUpRight,
  AlertTriangle,
  Bell,
  Plus,
  X,
  ChevronRight,
  Layers,
  Tag,
  Wand2,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserProfile, Category } from '../../../core/types';
import { getEffectiveSubscription } from '../../../core/utils/subscriptionUtils';
import { HapticButton } from '../../../shared/components/HapticButton';
import { BulkActionToolbar } from './BulkActionToolbar';
import { PasskeyService } from '../../../core/services/PasskeyService';
import { toast } from 'sonner';

interface AdminUserManagementProps {
  users: UserProfile[];
  allCategories?: Category[];
  onUpdateRole: (uid: string, role: string) => void;
  onUpdateCategories?: (uid: string, categories: string[]) => Promise<void>;
  onUpdateTrialDays?: (uid: string, days: number) => Promise<void>;
  onUpdatePlan?: (uid: string, plan: 'basic' | 'pro' | 'enterprise') => Promise<void>;
  onVerifySupplier: (uid: string, isVerified: boolean) => void;
  onViewProfile: (uid: string) => void;
  onCheckExpirations: () => void;
  isCheckingExpirations: boolean;
  onCreateUser: () => void;
  onBulkDelete: (uids: string[]) => void;
  onBulkVerify: (uids: string[]) => void;
  onDeleteUser: (uid: string) => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  users,
  allCategories = [],
  onUpdateRole,
  onUpdateCategories,
  onUpdateTrialDays,
  onUpdatePlan,
  onVerifySupplier,
  onViewProfile,
  onCheckExpirations,
  isCheckingExpirations,
  onCreateUser,
  onBulkDelete,
  onBulkVerify,
  onDeleteUser
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState<'all' | 'suppliers' | 'customers'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'unverified'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showCategoryMatrix, setShowCategoryMatrix] = useState<boolean>(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [usersToBulkDelete, setUsersToBulkDelete] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerifyingBio, setIsVerifyingBio] = useState(false);

  // Admin Custom Trial Modal State
  const [editingTrialUser, setEditingTrialUser] = useState<UserProfile | null>(null);
  const [customDaysInput, setCustomDaysInput] = useState<number>(15);
  const [selectedPlanInput, setSelectedPlanInput] = useState<'basic' | 'pro' | 'enterprise'>('pro');
  const [isSavingTrial, setIsSavingTrial] = useState(false);

  // Admin Manual Category Assignment Modal State
  const [editingCategoriesUser, setEditingCategoriesUser] = useState<UserProfile | null>(null);
  const [selectedUserCategoryIds, setSelectedUserCategoryIds] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [isSavingCategories, setIsSavingCategories] = useState<boolean>(false);
  const [isAiSuggestingCategories, setIsAiSuggestingCategories] = useState<boolean>(false);

  const openCategoryModal = (user: UserProfile) => {
    setEditingCategoriesUser(user);
    const mappedIds = (user.categories || []).map(catIdOrName => {
      const match = allCategories.find(c => c.id === catIdOrName || c.nameEn === catIdOrName || c.nameAr === catIdOrName);
      return match ? match.id : catIdOrName;
    });
    setSelectedUserCategoryIds(mappedIds);
    setCategorySearchQuery('');
  };

  const handleToggleUserCategory = (catId: string) => {
    setSelectedUserCategoryIds(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleAiSuggestCategoriesForUser = async () => {
    if (!editingCategoriesUser || allCategories.length === 0) return;
    setIsAiSuggestingCategories(true);
    try {
      const { suggestSmartCategories } = await import('../../../core/services/geminiService');
      const title = `${editingCategoriesUser.companyName || editingCategoriesUser.name || ''}`;
      const description = `${editingCategoriesUser.bio || ''} ${editingCategoriesUser.keywords?.join(' ') || ''}`;
      
      const suggestedCategoryIds = await suggestSmartCategories({ title, description }, allCategories);
      
      if (suggestedCategoryIds && suggestedCategoryIds.length > 0) {
        setSelectedUserCategoryIds(prev => Array.from(new Set([...prev, ...suggestedCategoryIds])));
        toast.success(isRtl ? `تم اقتراح ${suggestedCategoryIds.length} فئات متطابقة بالذكاء الاصطناعي ✨` : `AI suggested ${suggestedCategoryIds.length} matching categories ✨`);
      } else {
        toast.info(isRtl ? 'لم يجد الذكاء الاصطناعي فئات مطابقة مباشرة، يرجى التحديد يدوياً' : 'No direct matches found, please select manually');
      }
    } catch (err) {
      console.error('AI Suggestion Error:', err);
      toast.error(isRtl ? 'فشل توليد الاقتراحات الذكية' : 'Failed to generate smart suggestions');
    } finally {
      setIsAiSuggestingCategories(false);
    }
  };

  const handleSaveCategories = async () => {
    if (!editingCategoriesUser || !onUpdateCategories) return;
    setIsSavingCategories(true);
    try {
      await onUpdateCategories(editingCategoriesUser.uid, selectedUserCategoryIds);
      toast.success(isRtl ? 'تم تحديث فئات المورد بنجاح 🏷️' : 'Supplier categories updated successfully 🏷️');
      setEditingCategoriesUser(null);
    } catch (err) {
      console.error('Save Categories Error:', err);
      toast.error(isRtl ? 'حدث خطأ أثناء حفظ الفئات' : 'Failed to save categories');
    } finally {
      setIsSavingCategories(false);
    }
  };

  const openTrialModal = (user: UserProfile) => {
    const subInfo = getEffectiveSubscription(user);
    setEditingTrialUser(user);
    setCustomDaysInput(user.customTrialDays || 15);
    setSelectedPlanInput((user.subscriptionPlan as any)?.code || user.subscriptionPlan || (subInfo.isTrialActive ? 'pro' : 'basic'));
  };

  const handleSaveTrialCustomization = async () => {
    if (!editingTrialUser) return;
    setIsSavingTrial(true);
    try {
      if (onUpdateTrialDays) {
        await onUpdateTrialDays(editingTrialUser.uid, Number(customDaysInput));
      }
      if (onUpdatePlan) {
        await onUpdatePlan(editingTrialUser.uid, selectedPlanInput);
      }
      toast.success(isRtl ? 'تم حفظ التعديلات بنجاح' : 'Customization saved successfully');
      setEditingTrialUser(null);
    } catch (err) {
      console.error('Failed to save trial settings:', err);
      toast.error(isRtl ? 'فشل حفظ البيانات' : 'Failed to save trial settings');
    } finally {
      setIsSavingTrial(false);
    }
  };

  const requireBioVerification = async (actionLabel: string): Promise<boolean> => {
    try {
      setIsVerifyingBio(true);
      const isVerified = await PasskeyService.verifyIdentity(actionLabel);
      return isVerified;
    } catch (error) {
      console.error('Bio-verification failed:', error);
      toast.error(isRtl ? 'فشل التحقق الحيوي' : 'Bio-verification failed');
      return false;
    } finally {
      setIsVerifyingBio(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    // Require Bio-verification for permanent deletion
    const verified = await requireBioVerification(isRtl ? 'حذف مستخدم نهائياً' : 'Permanently Delete User');
    if (!verified) return;

    setIsDeleting(true);
    try {
      await onDeleteUser(userToDelete);
      setUserToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute suppliers distribution per category
  const categorySupplierStats = useMemo(() => {
    const suppliers = users.filter(u => u.role === 'supplier' && !u.isDeleted);
    const statsMap: Record<string, UserProfile[]> = {};
    const uncategorizedSuppliers: UserProfile[] = [];

    allCategories.forEach(cat => {
      statsMap[cat.id] = [];
    });

    suppliers.forEach(supplier => {
      const userCats = supplier.categories || [];
      if (userCats.length === 0) {
        uncategorizedSuppliers.push(supplier);
      } else {
        userCats.forEach(catIdOrName => {
          // Find matching category by ID or name
          const cat = allCategories.find(c => c.id === catIdOrName || c.nameEn === catIdOrName || c.nameAr === catIdOrName);
          if (cat) {
            if (!statsMap[cat.id]) statsMap[cat.id] = [];
            if (!statsMap[cat.id].some(s => s.uid === supplier.uid)) {
              statsMap[cat.id].push(supplier);
            }
          }
        });
      }
    });

    return {
      statsMap,
      uncategorizedSuppliers,
      totalActiveSuppliers: suppliers.length
    };
  }, [users, allCategories]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesTab = 
        activeTab === 'all' || 
        (activeTab === 'suppliers' && user.role === 'supplier') || 
        (activeTab === 'customers' && user.role === 'customer');
      
      const matchesSearch = 
        !searchQuery || 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'verified' && user.isVerified) || 
        (filterStatus === 'unverified' && !user.isVerified);

      const matchesCategory = 
        selectedCategoryFilter === 'all' ||
        (selectedCategoryFilter === 'uncategorized' && (!user.categories || user.categories.length === 0)) ||
        (user.categories && user.categories.some(c => {
          if (c === selectedCategoryFilter) return true;
          const targetCat = allCategories.find(cat => cat.id === selectedCategoryFilter);
          return targetCat && (c === targetCat.nameAr || c === targetCat.nameEn);
        }));

      return matchesTab && matchesSearch && matchesStatus && matchesCategory;
    });
  }, [users, activeTab, searchQuery, filterStatus, selectedCategoryFilter, allCategories]);

  const toggleUserSelection = (uid: string) => {
    setSelectedUsers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    setSelectedUsers(prev => 
      prev.length === filteredUsers.length ? [] : filteredUsers.map(u => u.uid)
    );
  };

  const handleBulkDeleteConfirm = async () => {
    if (!usersToBulkDelete) return;

    // Require Bio-verification for bulk deletion
    const verified = await requireBioVerification(isRtl ? 'حذف مجموعة مستخدمين' : 'Bulk Delete Users');
    if (!verified) return;

    setIsDeleting(true);
    try {
      await onBulkDelete(usersToBulkDelete);
      setUsersToBulkDelete(null);
      setSelectedUsers([]);
    } finally {
      setIsDeleting(false);
    }
  };
  const stats = {
    total: users.length,
    suppliers: users.filter(u => u.role === 'supplier').length,
    customers: users.filter(u => u.role === 'customer').length,
    unverified: users.filter(u => u.role === 'supplier' && !u.isVerified).length
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-text-main">
            {isRtl ? 'إدارة المستخدمين' : 'User Management'}
          </h1>
          <p className="text-brand-text-muted mt-1">
            {isRtl ? 'تحكم كامل في قاعدة بيانات المستخدمين والموردين' : 'Complete control over user and supplier database'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HapticButton
            onClick={onCheckExpirations}
            disabled={isCheckingExpirations}
            className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-background transition-all"
          >
            {isCheckingExpirations ? <Clock size={14} className="animate-spin" /> : <Bell size={14} />}
            {isRtl ? 'فحص الصلاحية' : 'Check Expirations'}
          </HapticButton>
          <HapticButton
            onClick={onCreateUser}
            className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-brand-primary/20"
          >
            <Plus size={14} />
            {isRtl ? 'إضافة مستخدم' : 'Add User'}
          </HapticButton>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isRtl ? 'الإجمالي' : 'Total', value: stats.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: isRtl ? 'الموردين' : 'Suppliers', value: stats.suppliers, icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: isRtl ? 'العملاء' : 'Customers', value: stats.customers, icon: UserCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: isRtl ? 'بانتظار التوثيق' : 'Pending Verification', value: stats.unverified, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-brand-surface p-4 rounded-3xl border border-brand-border flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon size={20} />
            </div>
            <div>
              <div className="text-lg font-black text-brand-text-main">{stat.value}</div>
              <div className="text-[8px] font-black text-brand-text-muted uppercase tracking-widest">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Tabs */}
      <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex p-1 bg-brand-background rounded-2xl border border-brand-border w-fit">
            {[
              { id: 'all', label: isRtl ? 'الكل' : 'All', icon: Users },
              { id: 'suppliers', label: isRtl ? 'الموردين' : 'Suppliers', icon: Building2 },
              { id: 'customers', label: isRtl ? 'العملاء' : 'Customers', icon: UserCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === tab.id 
                    ? 'bg-brand-surface text-brand-primary shadow-sm border border-brand-border' 
                    : 'text-brand-text-muted hover:text-brand-text-main'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 lg:max-w-2xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={16} />
              <input
                type="text"
                placeholder={isRtl ? 'بحث بالاسم، البريد، أو الشركة...' : 'Search by name, email, or company...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-brand-background border border-brand-border rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>
            {activeTab !== 'customers' && (
              <>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full sm:w-auto px-4 py-3 bg-brand-background border border-brand-border rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
                >
                  <option value="all">{isRtl ? 'جميع الفئات التصنيفية' : 'All Categories'}</option>
                  <option value="uncategorized">{isRtl ? 'غير مصنف' : 'Uncategorized'}</option>
                  {allCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {isRtl ? cat.nameAr : cat.nameEn} ({categorySupplierStats.statsMap[cat.id]?.length || 0})
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full sm:w-auto px-4 py-3 bg-brand-background border border-brand-border rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
                >
                  <option value="all">{isRtl ? 'كل حالات التوثيق' : 'All Verification'}</option>
                  <option value="verified">{isRtl ? 'موثق فقط' : 'Verified Only'}</option>
                  <option value="unverified">{isRtl ? 'غير موثق' : 'Unverified Only'}</option>
                </select>

                <button
                  onClick={() => setShowCategoryMatrix(!showCategoryMatrix)}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-black border transition-all ${
                    showCategoryMatrix
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-brand-background text-brand-text-muted border-brand-border hover:text-brand-text-main'
                  }`}
                  title={isRtl ? 'عرض خريطة توزيع الموردين على الفئات' : 'Show supplier category distribution'}
                >
                  <Layers size={14} />
                  <span>{isRtl ? 'خريطة الفئات' : 'Category Matrix'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Matrix */}
      {showCategoryMatrix && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-brand-surface rounded-[2.5rem] border border-brand-border p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-brand-text-main flex items-center gap-2">
                <Layers size={18} className="text-brand-primary" />
                {isRtl ? 'خريطة توزيع الموردين ومقدمي الخدمات حسب الفئات' : 'Suppliers Distribution Matrix by Category'}
              </h3>
              <p className="text-xs text-brand-text-muted mt-0.5">
                {isRtl ? 'انقر على أي فئة لتصفية جدول الموردين المباشر واكتشاف التغطية الحالية.' : 'Click any category to filter suppliers list and review coverage.'}
              </p>
            </div>
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className="text-xs font-bold text-brand-primary hover:underline"
            >
              {isRtl ? 'إعادة ضبط الفلاتر' : 'Reset Category Filter'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {allCategories.map(cat => {
              const count = categorySupplierStats.statsMap[cat.id]?.length || 0;
              const isSelected = selectedCategoryFilter === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryFilter(isSelected ? 'all' : cat.id);
                    setActiveTab('suppliers');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20 scale-[1.02]'
                      : 'bg-brand-background border-brand-border hover:border-brand-primary/50 hover:bg-brand-surface'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden pr-2">
                    <div className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-brand-text-main'}`}>
                      {isRtl ? cat.nameAr : cat.nameEn}
                    </div>
                    <div className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-brand-text-muted'}`}>
                      {cat.categoryType === 'service' ? (isRtl ? 'خدمية' : 'Service') : (isRtl ? 'منتجات' : 'Product')}
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                    isSelected 
                      ? 'bg-white/20 text-white' 
                      : count > 0 ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-surface text-brand-text-muted'
                  }`}>
                    {count} {isRtl ? 'مورد' : 'suppliers'}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized Card */}
            <div
              onClick={() => {
                setSelectedCategoryFilter(selectedCategoryFilter === 'uncategorized' ? 'all' : 'uncategorized');
                setActiveTab('suppliers');
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                selectedCategoryFilter === 'uncategorized'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 scale-[1.02]'
                  : 'bg-brand-background border-brand-border hover:border-amber-500/50 hover:bg-brand-surface'
              }`}
            >
              <div className="space-y-1">
                <div className={`text-xs font-black ${selectedCategoryFilter === 'uncategorized' ? 'text-white' : 'text-brand-text-main'}`}>
                  {isRtl ? 'موردون غير مصنفين' : 'Uncategorized Suppliers'}
                </div>
                <div className={`text-[10px] font-bold ${selectedCategoryFilter === 'uncategorized' ? 'text-white/80' : 'text-brand-text-muted'}`}>
                  {isRtl ? 'يحتاجون تحديث تصنيف' : 'Needs category update'}
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                selectedCategoryFilter === 'uncategorized' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-amber-500/10 text-amber-600'
              }`}>
                {categorySupplierStats.uncategorizedSuppliers.length}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Users Table/Grid */}
      <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-background/50 border-b border-brand-border">
                <th className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-brand-primary"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'المستخدم' : 'User'}</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'الدور' : 'Role'}</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'الاشتراك والتجربة' : 'Subscription & Trial'}</th>
                {activeTab !== 'customers' && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'التوثيق' : 'Verification'}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'مؤشر الثقة' : 'Trust Score'}</th>
                  </>
                )}
                {activeTab === 'customers' && (
                  <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap">{isRtl ? 'تاريخ الانضمام' : 'Join Date'}</th>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap text-right">{isRtl ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((user, i) => (
                  <motion.tr 
                    key={`admin-user-${user.uid || `row-${i}`}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-brand-background/30 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(user.uid)}
                        onChange={() => toggleUserSelection(user.uid)}
                        className="accent-brand-primary"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-background border border-brand-border flex items-center justify-center text-brand-primary font-black text-sm shrink-0 overflow-hidden group-hover:scale-110 transition-transform">
                          {user.logoUrl ? (
                            <img src={user.logoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            user.name?.charAt(0) || '?'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black text-brand-text-main group-hover:text-brand-primary transition-colors">
                              {user.name || (isRtl ? 'بدون اسم' : 'Unnamed')}
                            </div>
                            {(user as any).isBeta && (
                              <span className="px-1.5 py-0.5 bg-brand-amber text-white text-[7px] font-black rounded-sm uppercase tracking-tighter">
                                BETA
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-brand-text-muted flex items-center gap-1">
                              <Mail size={10} />
                              {user.email}
                            </span>
                            {user.phone && (
                              <span className="text-[10px] font-bold text-brand-text-muted flex items-center gap-1">
                                <Phone size={10} />
                                {user.phone}
                              </span>
                            )}
                            {(user as any).invitedBy === 'admin' && (
                              <span className="text-[10px] font-bold text-brand-primary flex items-center gap-1">
                                <ShieldCheck size={10} />
                                {isRtl ? 'بدعوة' : 'Invited'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {user.categories && user.categories.length > 0 ? (
                              <>
                                {user.categories.slice(0, 3).map((catIdOrName, cIdx) => {
                                  const matchedCat = allCategories.find(c => c.id === catIdOrName || c.nameEn === catIdOrName || c.nameAr === catIdOrName);
                                  const displayName = matchedCat ? (isRtl ? matchedCat.nameAr : matchedCat.nameEn) : catIdOrName;
                                  return (
                                    <span key={cIdx} className="px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary text-[9px] font-extrabold flex items-center gap-1">
                                      <Tag size={8} />
                                      <span>{displayName}</span>
                                    </span>
                                  );
                                })}
                                {user.categories.length > 3 && (
                                  <span className="text-[8px] font-bold text-brand-text-muted">
                                    +{user.categories.length - 3}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                {isRtl ? 'بدون فئة' : 'Uncategorized'}
                              </span>
                            )}
                            {user.role === 'supplier' && (
                              <button
                                onClick={() => openCategoryModal(user)}
                                className="px-1.5 py-0.5 rounded-md bg-brand-background hover:bg-brand-primary/10 border border-brand-border text-brand-primary text-[9px] font-extrabold flex items-center gap-1 transition-colors"
                                title={isRtl ? 'تعديل الفئات يدوياً' : 'Edit Categories Manually'}
                              >
                                <Tag size={8} />
                                <span>{isRtl ? 'تعديل الفئات' : 'Edit Categories'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role || 'customer'}
                        onChange={(e) => onUpdateRole(user.uid, e.target.value)}
                        className="bg-brand-background border border-brand-border rounded-xl px-4 py-2 text-xs font-bold text-brand-text-main focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
                      >
                        <option value="customer">{isRtl ? 'عميل' : 'Customer'}</option>
                        <option value="supplier">{isRtl ? 'مورد' : 'Supplier'}</option>
                        <option value="admin">{isRtl ? 'مدير' : 'Admin'}</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full w-fit ${
                          user.isDeleted ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                          {user.isDeleted ? (isRtl ? 'محذوف' : 'Deleted') : (isRtl ? 'نشط' : 'Active')}
                        </span>
                        <span className="text-[9px] font-bold text-brand-text-muted mt-1 flex items-center gap-1">
                          <Clock size={10} />
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US') : (isRtl ? 'غير متوفر' : 'N/A')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const subInfo = getEffectiveSubscription(user);
                        return (
                          <div className="flex items-center gap-2">
                            {subInfo.isTrialActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center gap-1">
                                <span>🎁</span>
                                <span>{isRtl ? `تجربة (${subInfo.daysRemaining} يوم)` : `Trial (${subInfo.daysRemaining}d)`}</span>
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                subInfo.effectivePlan === 'pro'
                                  ? 'bg-indigo-600 text-white'
                                  : subInfo.effectivePlan === 'enterprise'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}>
                                {subInfo.effectivePlan.toUpperCase()}
                              </span>
                            )}
                            <button
                              onClick={() => openTrialModal(user)}
                              title={isRtl ? 'تخصيص مدة التجربة والاشتراك' : 'Customize trial duration & plan'}
                              className="p-1.5 rounded-lg bg-brand-background border border-brand-border text-brand-primary hover:bg-brand-primary/10 transition-colors text-[10px] font-bold flex items-center gap-1"
                            >
                              <span>⚙️</span>
                              <span className="hidden sm:inline">{isRtl ? 'تخصيص' : 'Customize'}</span>
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    {activeTab !== 'customers' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.role === 'supplier' ? (
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => onVerifySupplier(user.uid, !user.isVerified)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                                  user.isVerified 
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20'
                                }`}
                              >
                                {user.isVerified ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                                {user.isVerified ? (isRtl ? 'موثق' : 'Verified') : (isRtl ? 'غير موثق' : 'Unverified')}
                              </button>
                              {user.verificationExpiryDate && (
                                <span className="text-[8px] font-bold text-brand-text-muted px-1">
                                  {isRtl ? 'ينتهي: ' : 'Exp: '} {user.verificationExpiryDate}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-brand-text-muted italic">
                              {isRtl ? 'لا ينطبق' : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.role === 'supplier' ? (
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-brand-background rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-brand-primary" 
                                  style={{ width: `${user.trustScore || 0}%` }}
                                />
                              </div>
                              <span className="text-xs font-black text-brand-primary">{user.trustScore || 0}%</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-brand-text-muted italic">
                              {isRtl ? 'لا ينطبق' : 'N/A'}
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    {activeTab === 'customers' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-text-main">
                          <Clock size={14} className="text-brand-text-muted" />
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US') : '-'}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <HapticButton
                          onClick={() => onViewProfile(user.uid)}
                          className="p-2 bg-brand-background border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/30 transition-all"
                        >
                          <ArrowUpRight size={18} />
                        </HapticButton>
                        <HapticButton
                          onClick={() => setUserToDelete(user.uid)}
                          className="p-2 bg-brand-background border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-error hover:border-brand-error/30 transition-all"
                        >
                          <UserX size={18} />
                        </HapticButton>
                        <HapticButton
                          className="p-2 bg-brand-background border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/30 transition-all"
                        >
                          <MoreVertical size={18} />
                        </HapticButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-brand-background rounded-full flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-black text-brand-text-main">
              {isRtl ? 'لا يوجد نتائج' : 'No results found'}
            </h3>
            <p className="text-sm text-brand-text-muted mt-1">
              {isRtl ? 'حاول تغيير معايير البحث أو الفلترة' : 'Try changing your search or filter criteria'}
            </p>
          </div>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      {selectedUsers.length > 0 && (
        <BulkActionToolbar
          selectedCount={selectedUsers.length}
          onClearSelection={() => setSelectedUsers([])}
          onBulkDelete={() => setUsersToBulkDelete(selectedUsers)}
          onBulkVerify={() => {
            onBulkVerify(selectedUsers);
            setSelectedUsers([]);
          }}
          isRtl={isRtl}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-surface w-full max-w-md rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-brand-error/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-error">
                  <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-black text-brand-text-main mb-2">
                  {isRtl ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Deletion'}
                </h2>
                <p className="text-brand-text-muted font-medium mb-8">
                  {isRtl 
                    ? 'هل أنت متأكد من حذف هذا المستخدم؟ سيتم مسح كافة بياناته نهائياً من قاعدة البيانات ولا يمكن التراجع عن هذا الإجراء.' 
                    : 'Are you sure you want to delete this user? All their data will be permanently removed from the database and this action cannot be undone.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setUserToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 px-6 py-4 bg-brand-background border border-brand-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-surface transition-all disabled:opacity-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting || isVerifyingBio}
                    className="flex-1 px-6 py-4 bg-brand-error text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-error/90 transition-all shadow-lg shadow-brand-error/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting || isVerifyingBio ? (
                      <Clock size={16} className="animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        {isRtl ? 'تحقق وحذف' : 'Verify & Delete'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {usersToBulkDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-surface w-full max-w-md rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-brand-error/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-error">
                  <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-black text-brand-text-main mb-2">
                  {isRtl ? 'تأكيد الحذف الجماعي' : 'Confirm Bulk Deletion'}
                </h2>
                <p className="text-brand-text-muted font-medium mb-8">
                  {isRtl 
                    ? `هل أنت متأكد من حذف ${usersToBulkDelete.length} مستخدمين؟ سيتم مسح كافة بياناتهم نهائياً من قاعدة البيانات.` 
                    : `Are you sure you want to delete ${usersToBulkDelete.length} users? All their data will be permanently removed from the database.`}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setUsersToBulkDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 px-6 py-4 bg-brand-background border border-brand-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-surface transition-all disabled:opacity-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleBulkDeleteConfirm}
                    disabled={isDeleting || isVerifyingBio}
                    className="flex-1 px-6 py-4 bg-brand-error text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-error/90 transition-all shadow-lg shadow-brand-error/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting || isVerifyingBio ? (
                      <Clock size={16} className="animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        {isRtl ? 'تأكيد بالبصمة' : 'Verify & Delete'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Trial & Subscription Customization Modal */}
      <AnimatePresence>
        {editingTrialUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-surface w-full max-w-lg rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                      <Star size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-brand-text-main">
                        {isRtl ? 'تخصيص مدة التجربة والاشتراك' : 'Customize Trial & Subscription'}
                      </h2>
                      <p className="text-xs text-brand-text-muted font-bold truncate max-w-[220px] sm:max-w-xs">
                        {editingTrialUser.name} ({editingTrialUser.email})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingTrialUser(null)}
                    className="p-2 text-brand-text-muted hover:text-brand-text-main rounded-xl hover:bg-brand-background transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Plan Selection */}
                  <div>
                    <label className="block text-xs font-black text-brand-text-main uppercase tracking-wider mb-2">
                      {isRtl ? 'باقة الاشتراك' : 'Subscription Plan'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { code: 'basic', labelAr: 'أساسية Basic', labelEn: 'Basic' },
                        { code: 'pro', labelAr: 'احترافية Pro', labelEn: 'Pro' },
                        { code: 'enterprise', labelAr: 'مؤسسات Enterprise', labelEn: 'Enterprise' }
                      ].map(plan => (
                        <button
                          key={plan.code}
                          type="button"
                          onClick={() => setSelectedPlanInput(plan.code as any)}
                          className={`py-3 px-2 rounded-xl text-xs font-black border transition-all ${
                            selectedPlanInput === plan.code
                              ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20'
                              : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/50'
                          }`}
                        >
                          {isRtl ? plan.labelAr : plan.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Trial Days */}
                  <div>
                    <label className="block text-xs font-black text-brand-text-main uppercase tracking-wider mb-2">
                      {isRtl ? 'عدد أيام التجربة المجانية' : 'Custom Free Trial Days'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={customDaysInput}
                      onChange={(e) => setCustomDaysInput(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-brand-background border border-brand-border rounded-xl px-4 py-3 text-sm font-bold text-brand-text-main focus:outline-none focus:border-brand-primary transition-all mb-3"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-2">
                      {[7, 15, 30, 45, 60, 90, 180, 365].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setCustomDaysInput(days)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            customDaysInput === days
                              ? 'bg-brand-primary/20 border-brand-primary text-brand-primary'
                              : 'bg-brand-background border-brand-border text-brand-text-muted hover:border-brand-border'
                          }`}
                        >
                          {days} {isRtl ? 'يوم' : 'days'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current Active Status Preview */}
                  <div className="p-4 rounded-2xl bg-brand-background border border-brand-border text-xs text-brand-text-muted space-y-1">
                    <p className="font-black text-brand-text-main">
                      {isRtl ? 'معاينة النتيجة:' : 'Preview:'}
                    </p>
                    <p>
                      {isRtl ? `سيحصل المستخدم على وصول كامل للباقة الاحترافية لمدة ${customDaysInput} يوم اعتباراً من تاريخ التسجيل.` : `User will receive full Pro feature access for ${customDaysInput} days from registration.`}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingTrialUser(null)}
                      disabled={isSavingTrial}
                      className="flex-1 px-6 py-3.5 bg-brand-background border border-brand-border rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-surface transition-all disabled:opacity-50"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTrialCustomization}
                      disabled={isSavingTrial}
                      className="flex-1 px-6 py-3.5 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingTrial ? (
                        <Clock size={16} className="animate-spin" />
                      ) : (
                        isRtl ? 'حفظ التغييرات' : 'Save Changes'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Selection Modal for Suppliers */}
      <AnimatePresence>
        {editingCategoriesUser && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-brand-surface w-full max-w-2xl rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-brand-border flex items-center justify-between shrink-0 bg-brand-background/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                    <Tag size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-brand-text-main flex items-center gap-2">
                      <span>{isRtl ? 'إدارة فئات المورد يدوياً' : 'Manage Supplier Categories'}</span>
                    </h2>
                    <p className="text-xs text-brand-text-muted font-bold">
                      {editingCategoriesUser.companyName || editingCategoriesUser.name} ({editingCategoriesUser.email})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingCategoriesUser(null)}
                  className="p-2 text-brand-text-muted hover:text-brand-text-main rounded-xl hover:bg-brand-background transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Controls & Search */}
              <div className="p-6 border-b border-brand-border bg-brand-surface space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search size={16} className="absolute text-brand-text-muted rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      placeholder={isRtl ? 'ابحث في الفئات بالاسم أو النوع...' : 'Search categories by name or type...'}
                      className="w-full bg-brand-background border border-brand-border rounded-xl rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2.5 text-xs font-bold text-brand-text-main focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>

                  {/* AI Auto-Suggest Button */}
                  <button
                    type="button"
                    onClick={handleAiSuggestCategoriesForUser}
                    disabled={isAiSuggestingCategories}
                    className="px-4 py-2.5 bg-gradient-to-r from-brand-primary to-indigo-600 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {isAiSuggestingCategories ? (
                      <Clock size={16} className="animate-spin" />
                    ) : (
                      <Wand2 size={16} />
                    )}
                    <span>{isRtl ? 'اقتراح بالذكاء الاصطناعي ✨' : 'AI Auto-Suggest ✨'}</span>
                  </button>
                </div>

                {/* Quick Selection Summary & Clear All */}
                <div className="flex items-center justify-between text-xs font-bold text-brand-text-muted pt-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-primary/10 text-brand-primary font-black px-2.5 py-0.5 rounded-md text-[11px]">
                      {selectedUserCategoryIds.length} {isRtl ? 'فئة محددة' : 'selected'}
                    </span>
                    {selectedUserCategoryIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedUserCategoryIds([])}
                        className="text-brand-error hover:underline text-[11px]"
                      >
                        {isRtl ? 'إلغاء التحديد' : 'Clear all'}
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-brand-text-muted">
                    {isRtl ? `إجمالي الفئات المتاحة: ${allCategories.length}` : `Total available: ${allCategories.length}`}
                  </span>
                </div>
              </div>

              {/* Categories Scrollable Grid */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {allCategories.length === 0 ? (
                  <div className="p-8 text-center text-brand-text-muted font-bold text-xs">
                    {isRtl ? 'لا توجد فئات مضافة في النظام حالياً' : 'No categories available in the system'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {allCategories
                      .filter(cat => {
                        if (!categorySearchQuery.trim()) return true;
                        const queryLower = categorySearchQuery.toLowerCase();
                        return (
                          cat.nameAr?.toLowerCase().includes(queryLower) ||
                          cat.nameEn?.toLowerCase().includes(queryLower) ||
                          cat.id?.toLowerCase().includes(queryLower)
                        );
                      })
                      .map(cat => {
                        const isSelected = selectedUserCategoryIds.includes(cat.id);
                        const displayName = isRtl ? cat.nameAr : cat.nameEn;
                        const catTypeLabel = cat.categoryType === 'service' ? (isRtl ? 'خدمة' : 'Service') : (isRtl ? 'منتج' : 'Product');
                        
                        return (
                          <div
                            key={`cat-select-${cat.id}`}
                            onClick={() => handleToggleUserCategory(cat.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-brand-primary/10 border-brand-primary shadow-sm text-brand-text-main'
                                : 'bg-brand-background/60 hover:bg-brand-background border-brand-border text-brand-text-muted hover:text-brand-text-main'
                            }`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-brand-primary text-white' : 'border border-brand-border bg-brand-surface'
                              }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-black truncate">{displayName}</div>
                                {cat.nameEn && isRtl && (
                                  <div className="text-[10px] text-brand-text-muted truncate">{cat.nameEn}</div>
                                )}
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                              cat.categoryType === 'service'
                                ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            }`}>
                              {catTypeLabel}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-brand-border bg-brand-background/50 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingCategoriesUser(null)}
                  disabled={isSavingCategories}
                  className="flex-1 px-6 py-3.5 bg-brand-surface border border-brand-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-background transition-all disabled:opacity-50"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategories}
                  disabled={isSavingCategories}
                  className="flex-1 px-6 py-3.5 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingCategories ? (
                    <Clock size={16} className="animate-spin" />
                  ) : (
                    isRtl ? 'حفظ فئات المورد' : 'Save Categories'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
