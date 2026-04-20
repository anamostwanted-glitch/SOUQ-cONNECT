import React from 'react';
import { motion } from 'motion/react';
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
    <aside className={`fixed inset-y-0 left-0 w-72 bg-brand-surface border-brand-border border-r transform ${isRtl ? 'translate-x-[200%] sm:translate-x-full' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-[100] md:relative md:sticky md:top-0`}>
      {/* Mobile Close Button would be here if managed by parent, but for now we fix the scroll sidebar to be better */}
      <div className="p-6 md:p-8 border-b border-brand-border/50 bg-brand-surface/50 backdrop-blur-sm">
        <h2 className="text-xl md:text-2xl font-black text-brand-text-main tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-brand-primary to-brand-primary-hover rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/25">
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

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar no-scrollbar scroll-smooth">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-black transition-all duration-300 relative group overflow-hidden ${
              activeTab === tab.id 
                ? 'bg-brand-surface text-brand-text-main shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-brand-border' 
                : 'text-brand-text-muted hover:bg-brand-background'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabGlow"
                className={`absolute left-0 top-0 bottom-0 w-1 ${tab.color || 'bg-brand-primary'}`}
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
              />
            )}
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl transition-all duration-300 ${
                activeTab === tab.id 
                  ? `${tab.color || 'text-brand-primary'} bg-brand-background shadow-inner` 
                  : 'text-brand-text-muted group-hover:text-brand-text-main'
              }`}>
                <tab.icon size={20} />
              </div>
              <span className={activeTab === tab.id ? 'font-black' : 'font-bold'}>{tab.label}</span>
            </div>
            {tab.isNew && (
              <span className="ml-2 px-2 py-0.5 rounded-lg bg-red-500 text-[8px] font-black text-white animate-pulse shadow-lg shadow-red-500/20">
                AI
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};
