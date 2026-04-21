import React from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  ShieldCheck, 
  Zap, 
  Search, 
  Smartphone, 
  Globe, 
  Code2, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Cpu,
  Layers
} from 'lucide-react';

interface AuditItem {
  id: string;
  role: string;
  finding: string;
  fix: string;
  status: 'completed' | 'ongoing' | 'proposed';
  icon: React.ReactNode;
}

const auditData: AuditItem[] = [
  {
    id: '1',
    role: 'Solution Architect',
    finding: 'Monolithic MarketInterface.tsx (1200+ lines) creates technical debt.',
    fix: 'Component modularization and logic extraction into custom hooks.',
    status: 'completed',
    icon: <Layers size={18} className="text-brand-primary" />
  },
  {
    id: '2',
    role: 'Full-Stack Developer',
    finding: 'Duplicate SEO identifiers in types.ts causing build warnings.',
    fix: 'Normalization of UserProfile and Category interfaces.',
    status: 'completed',
    icon: <Code2 size={18} className="text-brand-teal" />
  },
  {
    id: '3',
    role: 'DevOps Engineer',
    finding: 'Large image assets slowing down initial category paint.',
    fix: 'Implementation of lazy loading with Blurhash placeholders and non-referrer policies.',
    status: 'completed',
    icon: <Zap size={18} className="text-brand-amber" />
  },
  {
    id: '4',
    role: 'SEO & ASO Specialist',
    finding: 'Suboptimal metadata for Category deep-links.',
    fix: 'AI-Powered SEO Plan integration for Hubs, Sectors, and Niches.',
    status: 'completed',
    icon: <Search size={18} className="text-brand-blue" />
  },
  {
    id: '5',
    role: 'UX Researcher',
    finding: 'Complexity in 3-tier navigation leading to user fatigue.',
    fix: 'Visual breadcrumb highlights and haptic-driven CategoryNavTray.',
    status: 'ongoing',
    icon: <Smartphone size={18} className="text-brand-purple" />
  },
  {
    id: '6',
    role: 'Growth Hacker',
    finding: 'Missing social loop for supplier referrals.',
    fix: 'Connect Rewards: Points-based referral system for Multi-Vendor MarketPlace partners.',
    status: 'completed',
    icon: <TrendingUp size={18} className="text-brand-teal" />
  },
  {
    id: '7',
    role: 'Solution Architect',
    finding: 'Insecure Social Auth profile creation & Role fragmentation.',
    fix: 'Atomic Firestore profile synchronization on Social Login hooks.',
    status: 'completed',
    icon: <ShieldCheck size={18} className="text-brand-primary" />
  },
  {
    id: '8',
    role: 'UX Researcher',
    finding: 'Low performance on mobile registration due to input fatigue.',
    fix: 'Haptic-driven multi-step forms with optimized mobile keyboards.',
    status: 'completed',
    icon: <Smartphone size={18} className="text-brand-purple" />
  },
  {
    id: '9',
    role: 'Full-Stack Developer',
    finding: 'Delayed supplier discovery during high-intent searches.',
    fix: 'Intelligent Demand Indicator with real-time AI supplier mapping.',
    status: 'ongoing',
    icon: <Zap size={18} className="text-brand-amber" />
  }
];

export const CoreTeamNeuralHeartbeat: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Cpu className="animate-pulse" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-brand-text-main tracking-tight uppercase">
              Neural Team Heartbeat
            </h2>
            <p className="text-xs text-brand-text-muted font-bold tracking-widest uppercase opacity-60">
              System Audit & Reliability Stream
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-teal/10 rounded-full border border-brand-teal/20">
          <ShieldCheck size={14} className="text-brand-teal" />
          <span className="text-[10px] font-black text-brand-teal uppercase">Status: Optimal</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {auditData.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative bg-brand-background border border-brand-border rounded-3xl p-5 hover:border-brand-primary/30 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              {item.icon}
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {item.icon}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                    {item.role}
                  </span>
                  {item.status === 'completed' ? (
                    <CheckCircle2 size={14} className="text-brand-teal" />
                  ) : (
                    <AlertCircle size={14} className="text-brand-amber animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-black text-brand-text-main leading-tight">
                  {item.finding}
                </h3>
                <div className="pt-2 flex items-center gap-2">
                  <Terminal size={12} className="text-brand-primary" />
                  <p className="text-xs font-bold text-brand-text-muted italic">
                    Fix: {item.fix}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-[2rem] flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-black text-brand-primary uppercase tracking-[0.2em]">Deployment Readiness</p>
          <p className="text-sm font-bold text-brand-text-main">Neural Engine Cluster: 98.4% Efficiency</p>
        </div>
        <Zap className="text-brand-primary" size={24} />
      </div>
    </div>
  );
};
