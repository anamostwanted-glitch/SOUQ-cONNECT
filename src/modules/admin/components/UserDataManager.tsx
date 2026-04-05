import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UserProfile } from '../../../core/types';
import { Search, Download, MapPin, Phone, Mail } from 'lucide-react';

interface UserDataManagerProps {
  allUsers: UserProfile[];
  isRtl: boolean;
  t: any;
}

export const UserDataManager: React.FC<UserDataManagerProps> = ({ allUsers, isRtl, t }) => {
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
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-6 py-3.5 bg-brand-success text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-success/90 transition-all shadow-lg shadow-brand-success/20 group"
          >
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
            {isRtl ? 'تصدير Excel' : 'Export Excel'}
          </button>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
