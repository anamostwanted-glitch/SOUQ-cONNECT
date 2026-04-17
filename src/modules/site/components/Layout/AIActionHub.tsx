import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  MessageSquare, 
  Sparkles, 
  Bot,
  Zap,
  Search,
  ArrowRight
} from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { useTranslation } from 'react-i18next';

interface AIActionHubProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'camera' | 'gallery' | 'voice' | 'chat' | 'request') => void;
  isRtl: boolean;
}

export const AIActionHub: React.FC<AIActionHubProps> = ({
  isOpen,
  onClose,
  onAction,
  isRtl
}) => {
  const { t } = useTranslation();

  const actions = [
    {
      id: 'camera',
      icon: <Camera size={24} />,
      title: isRtl ? 'البحث بالكاميرا' : 'Camera Search',
      desc: isRtl ? 'التقط صورة للمنتج وابحث عنه' : 'Snap a photo to find products',
      color: 'from-blue-500 to-indigo-600',
      delay: 0.1
    },
    {
      id: 'gallery',
      icon: <ImageIcon size={24} />,
      title: isRtl ? 'تحليل من المعرض' : 'Analyze Gallery',
      desc: isRtl ? 'اختر صورة من هاتفك للبحث' : 'Pick an image from your phone',
      color: 'from-purple-500 to-pink-600',
      delay: 0.2
    },
    {
      id: 'voice',
      icon: <Mic size={24} />,
      title: isRtl ? 'المساعد الصوتي' : 'Voice Assistant',
      desc: isRtl ? 'اطلب ما تريد بصوتك' : 'Ask anything with your voice',
      color: 'from-orange-500 to-red-600',
      delay: 0.3
    },
    {
      id: 'chat',
      icon: <MessageSquare size={24} />,
      title: isRtl ? 'الدردشة الذكية' : 'Smart AI Chat',
      desc: isRtl ? 'تحدث مع المساعد حول طلباتك' : 'Chat with AI about your needs',
      color: 'from-emerald-500 to-teal-600',
      delay: 0.4
    },
    {
      id: 'request',
      icon: <Zap size={24} />,
      title: isRtl ? 'طلب منتج ذكي' : 'Smart Product Request',
      desc: isRtl ? 'اطلب ما تحتاجه وسنجد لك الموردين' : 'Request what you need, we find suppliers',
      color: 'from-brand-primary to-brand-teal',
      delay: 0.5
    }
  ];

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
      />

      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-lg bg-white dark:bg-gray-900 rounded-t-[2.5rem] z-[9999] shadow-2xl overflow-hidden max-h-[90vh] border-t border-brand-primary/10"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        <div className="px-6 pb-12 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-teal rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                <Bot size={28} />
              </div>
              <div className={isRtl ? 'text-right' : 'text-left'}>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {isRtl ? 'مركز الذكاء الاصطناعي' : 'AI Action Hub'}
                </h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                  {isRtl ? 'اختر كيف يمكنني مساعدتك' : 'Choose how I can help you'}
                </p>
              </div>
            </div>
            <HapticButton
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500"
            >
              <X size={20} />
            </HapticButton>
          </div>

          {/* Actions Grid */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {actions.map((action) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: action.delay }}
                className={action.id === 'request' ? 'col-span-2' : ''}
              >
                <HapticButton
                  onClick={() => {
                    onAction(action.id as any);
                    onClose();
                  }}
                  className={`w-full group flex ${action.id === 'request' ? 'flex-row' : 'flex-col'} items-center gap-3 p-4 bg-brand-surface border border-brand-border/30 rounded-[2rem] transition-all hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-brand-primary/5 active:scale-95`}
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:rotate-6 transition-transform relative shrink-0`}>
                    {action.icon}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-sm">
                      <Zap size={10} className="text-brand-primary fill-brand-primary" />
                    </div>
                  </div>
                  
                  <div className={`flex-1 ${isRtl ? 'text-right' : 'text-left'} ${action.id === 'request' ? '' : 'text-center'}`}>
                    <h3 className="text-sm font-black text-brand-text-main line-clamp-1">
                      {action.title}
                    </h3>
                    <p className={`text-[10px] text-brand-text-muted font-medium mt-0.5 ${action.id === 'request' ? 'line-clamp-1' : 'line-clamp-2'}`}>
                      {action.desc}
                    </p>
                  </div>
                </HapticButton>
              </motion.div>
            ))}
          </div>

          {/* Pro Badge / Footer */}
          <div className="mt-8 p-4 bg-gradient-to-r from-brand-primary/5 to-brand-teal/5 rounded-3xl border border-brand-primary/10 hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-brand-primary shadow-sm">
                <Zap size={18} />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {isRtl ? 'مدعوم بتقنيات Gemini Pro' : 'Powered by Gemini Pro'}
              </span>
            </div>
            <div className="px-2 py-1 bg-brand-primary text-white text-[8px] font-black rounded-md uppercase tracking-tighter">
              PRO
            </div>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
};
