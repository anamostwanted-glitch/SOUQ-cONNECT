import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  LayoutGrid, 
  Users, 
  ListTree, 
  Settings, 
  LogOut,
  TrendingUp,
  ShoppingBag,
  MessageSquare,
  Activity,
  Building2,
  Globe,
  Cpu
} from 'lucide-react';
import { collection, query, onSnapshot, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { db } from '../../../core/firebase';
import { UserProfile, AppFeatures, ProductRequest, Category } from '../../../core/types';
import { CategoryManagement } from '../../../shared/components/CategoryManagement';
import { KeywordManagerModal } from '../../../shared/components/KeywordManagerModal';
import BrandingSettings from '../../site/components/BrandingSettings';
import { SiteSettingsManager } from './SiteSettingsManager';
import { AdminNeuralHub } from './AdminNeuralHub';
import { toast } from 'sonner';

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryForKeywords, setSelectedCategoryForKeywords] = useState<Category | null>(null);
  const [isSuggestingMerges, setIsSuggestingMerges] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'product' | 'service'>('product');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const handleSuggestMerges = () => {};
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
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubscribeRequests = onSnapshot(collection(db, 'requests'), (snap) => {
      const fetchedRequests: ProductRequest[] = [];
      snap.forEach(doc => fetchedRequests.push({ id: doc.id, ...doc.data() } as ProductRequest));
      setRequests(fetchedRequests);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests');
    });

    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const fetchedCategories: Category[] = [];
      snap.forEach(doc => fetchedCategories.push({ id: doc.id, ...doc.data() } as Category));
      setCategories(fetchedCategories);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeCategories();
    };
  }, []);

  const handleUpdateRole = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleVerifySupplier = async (uid: string, isVerified: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isVerified });
    } catch (error) {
      console.error("Error verifying supplier:", error);
    }
  };

  const tabs = [
    { id: 'overview', label: isRtl ? 'نظرة عامة' : 'Overview', icon: LayoutGrid },
    { id: 'users', label: isRtl ? 'المستخدمين' : 'Users', icon: Users },
    { id: 'categories', label: isRtl ? 'الأقسام' : 'Categories', icon: ListTree },
    { id: 'site', label: isRtl ? 'إعدادات الموقع' : 'Site Settings', icon: Globe },
    { id: 'ai', label: isRtl ? 'مركز الذكاء الاصطناعي' : 'AI Neural Hub', icon: Cpu },
    { id: 'settings', label: isRtl ? 'إعدادات النظام' : 'System Settings', icon: Settings },
  ];

  const totalSuppliers = users.filter(u => u.role === 'supplier').length;
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const openRequests = requests.filter(r => r.status === 'open').length;

  return (
    <div className={`flex flex-col md:flex-row min-h-screen bg-brand-background ${isRtl ? 'font-arabic' : ''}`}>
      {/* Sidebar */}
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
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20 translate-x-1' 
                  : 'text-brand-text-muted hover:bg-brand-background hover:text-brand-text-main hover:translate-x-1'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-brand-text-muted'} />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-brand-background p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 max-w-6xl mx-auto"
            >
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
              <div>
                <h1 className="text-3xl font-black text-brand-text-main">
                  {isRtl ? 'إدارة المستخدمين' : 'User Management'}
                </h1>
                <p className="text-brand-text-muted mt-1">
                  {isRtl ? 'إدارة الصلاحيات وتوثيق الحسابات' : 'Manage roles and verify accounts'}
                </p>
              </div>

              <div className="bg-brand-surface rounded-2xl border border-brand-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-background border-b border-brand-border">
                        <th className="p-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider">{isRtl ? 'المستخدم' : 'User'}</th>
                        <th className="p-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider">{isRtl ? 'الدور' : 'Role'}</th>
                        <th className="p-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider">{isRtl ? 'التوثيق' : 'Verification'}</th>
                        <th className="p-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider text-right">{isRtl ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {users.map(user => (
                        <tr key={user.uid} className="hover:bg-brand-background/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold overflow-hidden">
                                {user.logoUrl ? <img src={user.logoUrl} alt="" className="w-full h-full object-cover" /> : user.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="font-bold text-brand-text-main">{user.name || (isRtl ? 'بدون اسم' : 'Unnamed')}</div>
                                <div className="text-xs text-brand-text-muted">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <select
                              value={user.role || 'customer'}
                              onChange={(e) => handleUpdateRole(user.uid, e.target.value)}
                              className="bg-brand-background border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text-main focus:outline-none focus:border-brand-primary"
                            >
                              <option value="customer">{isRtl ? 'عميل' : 'Customer'}</option>
                              <option value="supplier">{isRtl ? 'مورد' : 'Supplier'}</option>
                              <option value="admin">{isRtl ? 'مدير' : 'Admin'}</option>
                            </select>
                          </td>
                          <td className="p-4">
                            {user.role === 'supplier' ? (
                              <button
                                onClick={() => handleVerifySupplier(user.uid, !user.isVerified)}
                                className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  user.isVerified 
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                }`}
                              >
                                {user.isVerified ? (isRtl ? 'موثق' : 'Verified') : (isRtl ? 'غير موثق' : 'Unverified')}
                              </button>
                            ) : (
                              <span className="text-brand-text-muted text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => onViewProfile(user.uid)}
                              className="text-brand-primary hover:text-brand-primary-hover text-sm font-bold"
                            >
                              {isRtl ? 'عرض الملف' : 'View Profile'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

          {activeTab === 'site' && (
            <motion.div
              key="site"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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
