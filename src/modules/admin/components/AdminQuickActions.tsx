import React from 'react';
import { motion } from 'motion/react';
import { 
  UserPlus, 
  PlusCircle, 
  Send, 
  Settings, 
  Download, 
  FileText,
  Wand2,
  Megaphone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HapticButton } from '../../../shared/components/HapticButton';

interface AdminQuickActionsProps {
  onAction: (action: string) => void;
}

export const AdminQuickActions: React.FC<AdminQuickActionsProps> = ({ onAction }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const actions = [
    { id: 'invite_supplier', label: isRtl ? 'دعوة مورد' : 'Invite Supplier', icon: UserPlus, color: 'bg-brand-primary' },
    { id: 'add_user', label: isRtl ? 'إضافة مستخدم' : 'Add User', icon: UserPlus, color: 'bg-blue-500' },
    { id: 'add_category', label: isRtl ? 'إضافة قسم' : 'Add Category', icon: PlusCircle, color: 'bg-emerald-500' },
    { id: 'create_campaign', label: isRtl ? 'حملة إعلانية' : 'New Campaign', icon: Megaphone, color: 'bg-rose-500' },
    { id: 'broadcast', label: isRtl ? 'إشعار جماعي' : 'Broadcast', icon: Send, color: 'bg-purple-500' },
    { id: 'export_data', label: isRtl ? 'تصدير البيانات' : 'Export Data', icon: Download, color: 'bg-amber-500' },
    { id: 'send_weekly_reports', label: isRtl ? 'تقارير أسبوعية' : 'Weekly Reports', icon: FileText, color: 'bg-indigo-500' },
    { id: 'system_report', label: isRtl ? 'تقرير النظام' : 'System Report', icon: FileText, color: 'bg-slate-500' },
    { id: 'ai_optimize', label: isRtl ? 'تحسين ذكي' : 'AI Optimize', icon: Wand2, color: 'bg-brand-primary' },
  ];

  return (
    <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border p-6 shadow-sm">
      <h3 className="font-black text-brand-text-main mb-6 flex items-center gap-2">
        <Settings size={20} className="text-brand-primary" />
        {isRtl ? 'إجراءات سريعة' : 'Quick Actions'}
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action, i) => (
          <HapticButton
            key={action.id}
            onClick={() => onAction(action.id)}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-brand-background border border-brand-border/50 hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl ${action.color} text-white flex items-center justify-center mb-2 shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
              <action.icon size={20} />
            </div>
            <span className="text-[10px] font-black text-brand-text-main text-center leading-tight">
              {action.label}
            </span>
          </HapticButton>
        ))}
      </div>
    </div>
  );
};
