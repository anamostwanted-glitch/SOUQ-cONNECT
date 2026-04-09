import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { UserProfile } from '../../../core/types';
import { Search, Download, MapPin, Phone, Mail, Users, AlertTriangle, CheckCircle2, Building2, UserCheck } from 'lucide-react';

interface UserDataManagerProps {
  allUsers: UserProfile[];
  isRtl: boolean;
  t: any;
}

export const UserDataManager: React.FC<UserDataManagerProps> = ({ allUsers, isRtl, t }) => {
  const [activeSubTab, setActiveSubTab] = useState<'phones' | 'emails' | 'locations'>('phones');
  const [roleFilter, setRoleFilter] = useState<'all' | 'supplier' | 'customer'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserProfile; direction: 'asc' | 'desc' } | null>(null);

  const filteredUsers = useMemo(() => {
    let users = allUsers.filter(user => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchLower) || 
        user.companyName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower) ||
        user.location?.toLowerCase().includes(searchLower);
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      if (activeSubTab === 'phones') return matchesSearch && matchesRole && user.phone;
      if (activeSubTab === 'emails') return matchesSearch && matchesRole && user.email;
      return matchesSearch && matchesRole && user.location;
    });

    if (sortConfig) {
      users.sort((a, b) => {
        const aValue = a[sortConfig.key] as any;
        const bValue = b[sortConfig.key] as any;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return users;
  }, [allUsers, activeSubTab, searchQuery, sortConfig]);

  const stats = useMemo(() => {
    const total = allUsers.length;
    const missingPhone = allUsers.filter(u => !u.phone).length;
    const missingEmail = allUsers.filter(u => !u.email).length;
    return { total, missingPhone, missingEmail };
  }, [allUsers]);

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.uid)));
    }
  };

  const toggleSelectUser = (uid: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(uid)) newSelected.delete(uid);
    else newSelected.add(uid);
    setSelectedUsers(newSelected);
  };

  const handleExportExcel = (usersToExport: UserProfile[]) => {
    const dataToExport = usersToExport.map(user => {
      const baseData = {
        [isRtl ? 'الاسم' : 'Name']: user.name || '',
        [isRtl ? 'الشركة' : 'Company']: user.companyName || '',
        [isRtl ? 'الدور' : 'Role']: user.role === 'supplier' ? (isRtl ? 'مورد' : 'Supplier') : (isRtl ? 'عميل' : 'Customer'),
      };

      return {
        ...baseData,
        [isRtl ? 'رقم الهاتف' : 'Phone Number']: user.phone || '',
        [isRtl ? 'البريد الإلكتروني' : 'Email']: user.email || '',
        [isRtl ? 'الموقع' : 'Location']: user.location || '',
        [isRtl ? 'تاريخ التسجيل' : 'Joined At']: user.createdAt ? new Date(user.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US') : ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isRtl ? 'بيانات المستخدمين' : 'User Data');
    
    const fileName = `user_data_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: isRtl ? 'إجمالي المستخدمين' : 'Total Users', value: stats.total, icon: Users, color: 'text-brand-primary' },
          { label: isRtl ? 'مفقود رقم الهاتف' : 'Missing Phone', value: stats.missingPhone, icon: AlertTriangle, color: 'text-brand-error' },
          { label: isRtl ? 'مفقود البريد' : 'Missing Email', value: stats.missingEmail, icon: AlertTriangle, color: 'text-brand-error' },
        ].map((stat, i) => (
          <div key={i} className="bg-brand-surface p-6 rounded-3xl border border-brand-border flex items-center gap-4 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl bg-brand-background flex items-center justify-center ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-brand-text-main">{stat.value}</div>
              <div className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

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
            {(['phones', 'emails', 'locations'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeSubTab === tab 
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                    : 'text-brand-text-muted hover:text-brand-text-main'
                }`}
              >
                {tab === 'phones' ? (isRtl ? 'أرقام الجوال' : 'Phone Numbers') : 
                 tab === 'emails' ? (isRtl ? 'البريد الإلكتروني' : 'Emails') : 
                 (isRtl ? 'المواقع' : 'Locations')}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handleExportExcel(selectedUsers.size > 0 ? allUsers.filter(u => selectedUsers.has(u.uid)) : filteredUsers)}
            className="flex items-center gap-2 px-6 py-3.5 bg-brand-success text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-success/90 transition-all shadow-lg shadow-brand-success/20"
          >
            <Download size={18} />
            {isRtl ? 'تصدير المحدد' : 'Export Selected'}
          </button>
        </div>
      </div>

      <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border bg-brand-background/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex p-1 bg-brand-background rounded-2xl border border-brand-border w-fit">
            {[
              { id: 'all', label: isRtl ? 'الكل' : 'All', icon: Users },
              { id: 'supplier', label: isRtl ? 'الموردين' : 'Suppliers', icon: Building2 },
              { id: 'customer', label: isRtl ? 'العملاء' : 'Customers', icon: UserCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  roleFilter === tab.id 
                    ? 'bg-brand-surface text-brand-primary shadow-sm border border-brand-border' 
                    : 'text-brand-text-muted hover:text-brand-text-main'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative max-w-md flex-1">
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
                <th className="px-4 py-3 md:px-8 md:py-5">
                  <input type="checkbox" checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0} onChange={toggleSelectAll} className="rounded border-brand-border text-brand-primary focus:ring-brand-primary" />
                </th>
                {[
                  { key: 'name', label: isRtl ? 'المستخدم' : 'User' },
                  { key: 'companyName', label: isRtl ? 'الشركة' : 'Company' },
                  { key: 'role', label: isRtl ? 'الدور' : 'Role' },
                  { key: 'phone', label: isRtl ? 'رقم الهاتف' : 'Phone' },
                ].map(header => (
                  <th 
                    key={header.key}
                    onClick={() => setSortConfig({ key: header.key as keyof UserProfile, direction: sortConfig?.key === header.key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-brand-primary transition-colors ${isRtl ? 'text-right' : 'text-left'}`}
                  >
                    {header.label}
                  </th>
                ))}
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {activeSubTab === 'locations' ? (isRtl ? 'الموقع' : 'Location') : (activeSubTab === 'phones' ? (isRtl ? 'رقم الهاتف' : 'Phone Number') : (isRtl ? 'البريد الإلكتروني' : 'Email'))}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-brand-background/30 transition-colors group">
                  <td className="px-4 py-3 md:px-8 md:py-5">
                    <input type="checkbox" checked={selectedUsers.has(user.uid)} onChange={() => toggleSelectUser(user.uid)} className="rounded border-brand-border text-brand-primary focus:ring-brand-primary" />
                  </td>
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
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap text-sm font-black text-brand-text-main" dir="ltr">
                    {user.phone || '-'}
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
                          <span>{user.phone || '-'}</span>
                        </>
                      ) : (
                        <>
                          <Mail size={14} className="text-brand-primary shrink-0" />
                          <span>{user.email}</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
