import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  Activity, 
  Sparkles, 
  Target, 
  Zap, 
  RefreshCw,
  Bot,
  Lightbulb
} from 'lucide-react';
import { UserProfile } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { callAiJson, handleAiError } from '../../../core/services/geminiService';
import { neuralCache } from '../../../core/utils/neuralCache';
import { Type } from '@google/genai';

interface UserNeuralHubProps {
  profile: UserProfile;
  isRtl: boolean;
}

export const UserNeuralHub: React.FC<UserNeuralHubProps> = ({ profile, isRtl }) => {
  const { t } = useTranslation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pulseData, setPulseData] = useState<any>(null);

  const analyzeUserPulse = async () => {
    setIsAnalyzing(true);
    try {
      // User context for AI
      const context = {
        role: profile.role,
        name: profile.name,
        joinDate: profile.createdAt,
      };

      const prompt = `Analyze this user's profile and generate a personalized "Smart Pulse" dashboard.
      User Context: ${JSON.stringify(context)}
      Language: ${isRtl ? 'Arabic' : 'English'}
      
      Provide:
      1. status: 'excellent', 'good', 'needs_attention'
      2. headline: A short, encouraging headline about their current status.
      3. growthScore: A number from 0-100 representing their profile strength/activity.
      4. insights: Array of 3 specific, actionable insights or tips based on their role (${profile.role}).
      5. nextBestAction: The single most important thing they should do next.
      
      Return JSON only.`;

      const result = await callAiJson(
        prompt,
        {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            headline: { type: Type.STRING },
            growthScore: { type: Type.NUMBER },
            insights: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextBestAction: { type: Type.STRING }
          },
          required: ["status", "headline", "growthScore", "insights", "nextBestAction"]
        }
      );
      
      setPulseData(result);
    } catch (error) {
      handleAiError(error, "User pulse analysis");
      // Fallback data
      setPulseData({
        status: 'good',
        headline: isRtl ? 'حسابك في حالة جيدة' : 'Your account is in good standing',
        growthScore: 85,
        insights: [
          isRtl ? 'استمر في التفاعل مع المنصة لزيادة فرصك' : 'Keep interacting with the platform to increase your chances',
          isRtl ? 'تأكد من تحديث بياناتك الشخصية باستمرار' : 'Make sure to keep your personal data updated',
          isRtl ? 'استكشف الميزات الذكية الجديدة' : 'Explore the new smart features'
        ],
        nextBestAction: isRtl ? 'تصفح أحدث العروض' : 'Browse latest offers'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const cachedData = neuralCache.get(`pulse_${profile.uid}`);
    if (cachedData) {
      setPulseData({
        ...cachedData,
        headline: isRtl ? cachedData.headlineAr : cachedData.headlineEn,
        insights: cachedData.insights || [
          isRtl ? 'استمر في التفاعل مع المنصة لزيادة فرصك' : 'Keep interacting with the platform to increase your chances',
          isRtl ? 'تأكد من تحديث بياناتك الشخصية باستمرار' : 'Make sure to keep your personal data updated',
          isRtl ? 'استكشف الميزات الذكية الجديدة' : 'Explore the new smart features'
        ],
        nextBestAction: cachedData.nextBestAction || (isRtl ? 'تصفح أحدث العروض' : 'Browse latest offers')
      });
    } else {
      analyzeUserPulse();
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'good': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'needs_attention': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-brand-primary bg-brand-primary/10 border-brand-primary/20';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 md:p-6 rounded-3xl shadow-sm border border-brand-border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-brand-primary to-brand-teal rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Bot size={24} className="md:w-7 md:h-7" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-brand-text-main flex items-center gap-2">
              {isRtl ? 'النبض الذكي' : 'Smart Pulse'}
              <Sparkles size={18} className="text-brand-primary animate-pulse" />
            </h2>
            <p className="text-xs md:text-sm text-brand-text-muted font-medium">
              {isRtl ? 'تحليل مدعوم بالذكاء الاصطناعي لنشاطك' : 'AI-powered analysis of your activity'}
            </p>
          </div>
        </div>
        <HapticButton
          onClick={analyzeUserPulse}
          disabled={isAnalyzing}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all ${
            isAnalyzing 
              ? 'bg-brand-surface text-brand-text-muted cursor-not-allowed' 
              : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white'
          }`}
        >
          <RefreshCw size={18} className={isAnalyzing ? 'animate-spin' : ''} />
        </HapticButton>
      </div>

      {isAnalyzing && !pulseData ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-20 h-20 md:w-24 md:h-24 mb-6">
            <div className="absolute inset-0 border-4 border-brand-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-brand-primary rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Bot size={28} className="text-brand-primary animate-pulse" />
            </div>
          </div>
          <h3 className="text-base md:text-lg font-bold text-brand-text-main animate-pulse">
            {isRtl ? 'جاري تحليل بياناتك...' : 'Analyzing your data...'}
          </h3>
        </div>
      ) : pulseData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Pulse Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl p-5 md:p-6 shadow-sm border border-brand-border relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-gradient-to-br from-brand-primary/5 to-brand-teal/5 rounded-full blur-3xl -mr-24 -mt-24 md:-mr-32 md:-mt-32 pointer-events-none" />
            
            <div className="flex items-start justify-between mb-6 md:mb-8 relative z-10">
              <div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 md:mb-4 ${getStatusColor(pulseData.status)}`}>
                  <Activity size={14} />
                  {pulseData.status}
                </div>
                <h3 className="text-xl md:text-2xl font-black text-brand-text-main mb-2 leading-tight">
                  {pulseData.headline}
                </h3>
              </div>
              <div className="text-center shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-brand-primary flex items-center justify-center mb-2 relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" className="text-brand-surface" />
                    <circle 
                      cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" 
                      className="text-brand-primary"
                      strokeDasharray={`${pulseData.growthScore * 2.89} 289`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-xl md:text-2xl font-black text-brand-text-main">{pulseData.growthScore}</span>
                </div>
                <span className="text-[9px] md:text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                  {isRtl ? 'مؤشر النمو' : 'Growth Score'}
                </span>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 relative z-10">
              <h4 className="text-xs md:text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <Lightbulb size={16} className="text-yellow-500" />
                {isRtl ? 'رؤى مخصصة لك' : 'Personalized Insights'}
              </h4>
              <div className="grid gap-2 md:gap-3">
                {pulseData.insights.map((insight: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 md:p-4 bg-brand-surface rounded-2xl border border-brand-border/50">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] md:text-xs font-bold text-brand-primary">{idx + 1}</span>
                    </div>
                    <p className="text-xs md:text-sm font-medium text-brand-text-main leading-relaxed">
                      {insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Action Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-brand-primary to-brand-teal rounded-3xl p-5 md:p-6 shadow-lg text-white relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4 md:mb-6 relative z-10">
              <Target size={20} className="text-white/80" />
              <h3 className="text-base md:text-lg font-bold">
                {isRtl ? 'الخطوة القادمة' : 'Next Best Action'}
              </h3>
            </div>

            <div className="flex-1 flex flex-col justify-center relative z-10">
              <p className="text-xl md:text-2xl font-black leading-tight mb-6 md:mb-8">
                {pulseData.nextBestAction}
              </p>
              
              <HapticButton className="w-full py-3 md:py-4 bg-white text-brand-primary rounded-2xl font-bold text-xs md:text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-xl">
                <Zap size={16} />
                {isRtl ? 'تنفيذ الآن' : 'Execute Now'}
              </HapticButton>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
};
