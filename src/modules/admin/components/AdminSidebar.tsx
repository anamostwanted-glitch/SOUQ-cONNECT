import React from 'react';
import { Shield } from 'lucide-react';
import { UserProfile } from '../../../core/types';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: any[];
  isRtl: boolean;
  profile: UserProfile;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, setActiveTab, tabs, isRtl, profile }) => {
  return (
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
            {tab.isNew && (
              <span className="ml-2 px-1.5 py-0.5 rounded-md bg-brand-primary text-[8px] font-black text-white animate-pulse hidden md:inline">
                NEW
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};
