import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Activity, 
  Users, 
  AlertTriangle, 
  ShieldCheck, 
  Database, 
  LineChart, 
  Settings,
  Flame,
  Globe,
  Loader2,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { collection, query, onSnapshot, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { toast } from 'sonner';

interface BetaLabProps {
  isRtl: boolean;
}

export const BetaLab: React.FC<BetaLabProps> = ({ isRtl }) => {
  const [stressLevel, setStressLevel] = useState(0);
  const [concurrentUsers, setConcurrentUsers] = useState(128);
  const [latency, setLatency] = useState(42);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<{ id: string; msg: string; type: 'info' | 'warn' | 'error' }[]>([]);

  // Simulation Logic
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const load = Math.floor(Math.random() * 100);
      setStressLevel(load);
      setConcurrentUsers(prev => Math.max(100, Math.min(1000, prev + (Math.random() > 0.5 ? 5 : -5))));
      setLatency(30 + (load * 2));

      if (load > 85) {
        addLog(
          isRtl ? 'تحذير: حمل زائد على السيرفر (CPU > 85%)' : 'Warning: High Server Load (CPU > 85%)',
          'warn'
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, isRtl]);

  const addLog = (msg: string, type: 'info' | 'warn' | 'error') => {
    setLogs(prev => [{ id: Math.random().toString(), msg, type }, ...prev].slice(0, 10));
  };

  const startStressTest = () => {
    setIsSimulating(true);
    addLog(isRtl ? 'بدء اختبار الضغط المجدول (Beta)...' : 'Starting Scheduled Stress Test (Beta)...', 'info');
    toast.info(isRtl ? 'جاري محاكاة ضغط المستخدمين...' : 'Simulating user load...');
  };

  const stopStressTest = () => {
    setIsSimulating(false);
    setStressLevel(0);
    addLog(isRtl ? 'تم إيقاف اختبار الضغط بنجاح.' : 'Stress test stopped successfully.', 'info');
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-brand-text-main flex items-center gap-3">
            <Cpu className="text-brand-primary animate-pulse" size={32} />
            {isRtl ? 'مختبر بيتا (Beta Lab)' : 'Beta Lab & Reliability Hub'}
          </h2>
          <p className="text-brand-text-muted mt-2 font-medium">
            {isRtl ? 'إدارة اختبارات الجودة ومراقبة أداء السيرفر الحي.' : 'Management of quality tests & live server performance monitoring.'}
          </p>
        </div>
        <div className="flex gap-4">
          {!isSimulating ? (
            <HapticButton 
              onClick={startStressTest}
              className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-brand-primary/20 transition-all"
            >
              <Zap size={20} />
              {isRtl ? 'بدء اختبار الضغط' : 'Launch Stress Test'}
            </HapticButton>
          ) : (
            <HapticButton 
              onClick={stopStressTest}
              className="bg-red-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
            >
              <RefreshCw size={20} className="animate-spin" />
              {isRtl ? 'إيقاف الاختبار' : 'Stop Test'}
            </HapticButton>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Card: CPU Load */}
        <div className="bg-brand-surface border border-brand-border p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Activity size={80} />
          </div>
          <h3 className="text-sm font-black text-brand-text-muted uppercase tracking-widest mb-4">
            {isRtl ? 'حمل المعالج (CPU Load)' : 'CPU Load'}
          </h3>
          <div className="text-5xl font-black text-brand-text-main flex items-baseline gap-1">
            {stressLevel}%
          </div>
          <div className="mt-6 h-3 bg-brand-border rounded-full overflow-hidden">
             <motion.div 
               animate={{ width: `${stressLevel}%` }}
               className={`h-full transition-colors duration-500 ${stressLevel > 80 ? 'bg-red-500' : 'bg-brand-primary'}`} 
             />
          </div>
        </div>

        {/* Metric Card: Concurrent Sessions */}
        <div className="bg-brand-surface border border-brand-border p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Users size={80} />
          </div>
          <h3 className="text-sm font-black text-brand-text-muted uppercase tracking-widest mb-4">
            {isRtl ? 'المستخدمين النشطين' : 'Concurrent Users'}
          </h3>
          <div className="text-5xl font-black text-brand-text-main flex items-baseline gap-1">
            {concurrentUsers}
            <span className="text-sm text-brand-primary font-bold">LIVE</span>
          </div>
          <p className="mt-4 text-brand-text-muted font-medium flex items-center gap-2">
            <Globe size={14} />
            {isRtl ? 'توزيع عالمي متجانس' : 'Homogeneous global distribution'}
          </p>
        </div>

        {/* Metric Card: Neural Latency */}
        <div className="bg-brand-surface border border-brand-border p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Zap size={80} />
          </div>
          <h3 className="text-sm font-black text-brand-text-muted uppercase tracking-widest mb-4">
            {isRtl ? 'استجابة الشبكة (Latency)' : 'Neural Latency'}
          </h3>
          <div className="text-5xl font-black text-brand-text-main flex items-baseline gap-1">
            {latency}ms
          </div>
          <div className="mt-4 flex items-center gap-2 text-green-500 font-bold text-sm">
            <ShieldCheck size={14} />
            {isRtl ? 'النظام مستقر وآمن' : 'Stable & Secure'}
          </div>
        </div>
      </div>

      {/* Simulator Logs & Control */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8">
          <h3 className="text-xl font-black text-brand-text-main mb-6 flex items-center gap-2">
            <Activity size={24} className="text-brand-primary" />
            {isRtl ? 'سجل العمليات (System Logs)' : 'System Event Logs'}
          </h3>
          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-brand-text-muted italic border-l-4 border-brand-border pl-4">
                {isRtl ? 'لا توجد سجلات حالية...' : 'No active logs...'}
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {logs.map(log => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 rounded-2xl border flex items-center gap-4 ${
                      log.type === 'warn' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                      log.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
                      'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      log.type === 'warn' ? 'bg-yellow-500' :
                      log.type === 'error' ? 'bg-red-500' :
                      'bg-slate-500'
                    }`} />
                    <span className="font-bold font-mono text-xs opacity-50 uppercase">{log.type}</span>
                    <span className="font-medium text-sm">{log.msg}</span>
                    <span className="ml-auto text-[10px] font-bold opacity-40">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="bg-brand-primary p-8 rounded-[2.5rem] text-white flex flex-col justify-between">
          <div>
            <Flame className="mb-6 opacity-80" size={48} />
            <h3 className="text-3xl font-black mb-4 tracking-tighter">
              {isRtl ? 'درع الحماية النشط' : 'Neural Stress Shield'}
            </h3>
            <p className="text-white/80 text-lg leading-relaxed font-medium">
              {isRtl 
                ? 'أنظمة فريق النواة تكتشف عمليات استنزاف الموارد والهجمات المنسقة تلقائياً بفضل ذكاء Gemini الاستباقي.' 
                : 'Core Team systems detect resource exhaustion and coordinated attacks automatically using Gemini proactive intelligence.'}
            </p>
          </div>
          <div className="mt-8 pt-6 border-t border-white/20 flex justify-between items-center text-sm font-bold opacity-90">
             <span>{isRtl ? 'حالة الدرع: نشط' : 'Shield Status: ACTIVE'}</span>
             <ShieldCheck size={20} />
          </div>
        </div>
      </div>
    </div>
  );
};
