import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings2, 
  ShieldCheck, 
  Database, 
  Cpu, 
  Globe, 
  Lock, 
  RefreshCw,
  Terminal,
  Server,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HapticButton } from '../../../shared/components/HapticButton';
import { toast } from 'sonner';

export const AdminDeepControl: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [aiOptimization, setAiOptimization] = useState(true);

  const controls = [
    { 
      id: 'maintenance', 
      label: isRtl ? 'وضع الصيانة' : 'Maintenance Mode', 
      icon: Lock, 
      active: maintenanceMode,
      onToggle: () => {
        setMaintenanceMode(!maintenanceMode);
        toast.warning(maintenanceMode ? (isRtl ? 'تم إيقاف وضع الصيانة' : 'Maintenance mode disabled') : (isRtl ? 'تم تفعيل وضع الصيانة' : 'Maintenance mode enabled'));
      }
    },
    { 
      id: 'ai_opt', 
      label: isRtl ? 'تحسين الذكاء الاصطناعي' : 'AI Optimization', 
      icon: Cpu, 
      active: aiOptimization,
      onToggle: () => {
        setAiOptimization(!aiOptimization);
        toast.info(aiOptimization ? (isRtl ? 'تم إيقاف تحسين الذكاء الاصطناعي' : 'AI optimization disabled') : (isRtl ? 'تم تفعيل تحسين الذكاء الاصطناعي' : 'AI optimization enabled'));
      }
    },
  ];

  const actions = [
    { id: 'flush_cache', label: isRtl ? 'تفريغ التخزين المؤقت' : 'Flush Cache', icon: RefreshCw },
    { id: 'db_backup', label: isRtl ? 'نسخة احتياطية لقاعدة البيانات' : 'DB Backup', icon: Database },
    { id: 'system_logs', label: isRtl ? 'سجلات النظام' : 'System Logs', icon: Terminal },
    { id: 'api_status', label: isRtl ? 'حالة API' : 'API Status', icon: Server },
  ];

  return (
    <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-black text-brand-text-main flex items-center gap-2">
          <Settings2 size={20} className="text-brand-primary" />
          {isRtl ? 'التحكم العميق' : 'Deep Control'}
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
            {isRtl ? 'النظام آمن' : 'System Secure'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {controls.map((control) => (
            <button
              key={control.id}
              onClick={control.onToggle}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                control.active 
                  ? 'bg-brand-primary/5 border-brand-primary/30' 
                  : 'bg-brand-background border-brand-border/50 hover:border-brand-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${control.active ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-text-muted'}`}>
                  <control.icon size={16} />
                </div>
                <span className="text-xs font-bold text-brand-text-main">{control.label}</span>
              </div>
              {control.active ? <ToggleRight className="text-brand-primary" /> : <ToggleLeft className="text-brand-text-muted" />}
            </button>
          ))}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <HapticButton
              key={action.id}
              onClick={() => toast.success(`${action.label} initiated`)}
              className="flex items-center gap-3 p-3 rounded-xl bg-brand-background border border-brand-border/30 hover:border-brand-primary/20 hover:bg-brand-primary/5 transition-all group"
            >
              <action.icon size={14} className="text-brand-text-muted group-hover:text-brand-primary" />
              <span className="text-[10px] font-bold text-brand-text-main">{action.label}</span>
            </HapticButton>
          ))}
        </div>

        {/* System Load Indicator */}
        <div className="p-4 bg-brand-background rounded-2xl border border-brand-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
              {isRtl ? 'ضغط المعالجة' : 'CPU Load'}
            </span>
            <span className="text-[10px] font-black text-brand-primary">14%</span>
          </div>
          <div className="w-full h-1 bg-brand-surface rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '14%' }}
              className="h-full bg-brand-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
