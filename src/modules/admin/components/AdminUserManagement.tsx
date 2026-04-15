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
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserProfile } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { BulkActionToolbar } from './BulkActionToolbar';

interface AdminUserManagementProps {
  users: UserProfile[];
  onUpdateRole: (uid: string, role: string) => void;
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
  onUpdateRole,
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
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [usersToBulkDelete, setUsersToBulkDelete] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteUser(userToDelete);
      setUserToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

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
        user.companyName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'verified' && user.isVerified) || 
        (filterStatus === 'unverified' && !user.isVerified);

      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [users, activeTab, searchQuery, filterStatus]);

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
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full sm:w-auto px-4 py-3 bg-brand-background border border-brand-border rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
              >
                <option value="all">{isRtl ? 'كل حالات التوثيق' : 'All Verification'}</option>
                <option value="verified">{isRtl ? 'موثق فقط' : 'Verified Only'}</option>
                <option value="unverified">{isRtl ? 'غير موثق' : 'Unverified Only'}</option>
              </select>
            )}
          </div>
        </div>
      </div>

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
                    key={user.uid}
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
                          <div className="text-sm font-black text-brand-text-main group-hover:text-brand-primary transition-colors">
                            {user.name || (isRtl ? 'بدون اسم' : 'Unnamed')}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
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
                    disabled={isDeleting}
                    className="flex-1 px-6 py-4 bg-brand-error text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-error/90 transition-all shadow-lg shadow-brand-error/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Clock size={16} className="animate-spin" />
                    ) : (
                      <UserX size={16} />
                    )}
                    {isRtl ? 'حذف نهائي' : 'Delete Permanently'}
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
                    disabled={isDeleting}
                    className="flex-1 px-6 py-4 bg-brand-error text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-error/90 transition-all shadow-lg shadow-brand-error/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Clock size={16} className="animate-spin" />
                    ) : (
                      <UserX size={16} />
                    )}
                    {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
