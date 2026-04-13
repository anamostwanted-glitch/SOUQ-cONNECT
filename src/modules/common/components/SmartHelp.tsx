import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User, Sparkles, X, HelpCircle, MessageSquare, Info } from 'lucide-react';
import { getAiAssistantResponse, handleAiError } from '../../../core/services/geminiService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const PLATFORM_KNOWLEDGE = `
Souq Connect is a smart B2B marketplace connecting customers with verified suppliers.
Key Features:
- Smart Marketplace: AI-driven product discovery and matchmaking.
- Supplier Verification: All suppliers are vetted for quality and reliability.
- Real-time Chat: Direct communication between buyers and sellers with AI pulse insights.
- Smart Pulse: AI-driven market trends and price intelligence.
- Connect Rewards: Loyalty program for active users.
- Concierge Service: Personalized AI shopping assistant that finds the best deals for you.

Roles:
- Customer: Can post requests, search for products, and chat with suppliers.
- Supplier: Can post products, respond to requests with offers, and manage their storefront.
- Admin: Manages site settings, categories, and user verification.
`;

export const SmartHelp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: isRtl 
        ? 'مرحباً! أنا مساعد سوق كونكت الذكي. كيف يمكنني مساعدتك اليوم؟' 
        : 'Hello! I am Souq Connect Smart Assistant. How can I help you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const prompt = `
        You are the Souq Connect Smart Support Assistant. 
        Use the following platform knowledge to answer the user's question.
        If the question is not related to Souq Connect, politely redirect them.
        Answer in the same language as the user's question (${i18n.language}).
        
        Platform Knowledge:
        ${PLATFORM_KNOWLEDGE}
        
        User Question: ${input}
      `;

      const response = await getAiAssistantResponse(prompt, PLATFORM_KNOWLEDGE, i18n.language);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      handleAiError(error, 'SmartHelp');
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: isRtl 
          ? 'عذراً، واجهت مشكلة في الاتصال. يرجى المحاولة مرة أخرى.' 
          : 'Sorry, I encountered a connection issue. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-24 px-4 min-h-screen bg-brand-background flex flex-col max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
            <Bot size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-brand-text-main">
              {isRtl ? 'مركز المساعدة الذكي' : 'Smart Help Center'}
            </h1>
            <p className="text-sm text-brand-text-muted">
              {isRtl ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}
            </p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="p-2 hover:bg-brand-surface rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 bg-brand-surface rounded-3xl shadow-sm border border-brand-border overflow-hidden flex flex-col mb-8">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.sender === 'user' ? 'bg-brand-primary text-white' : 'bg-brand-secondary/10 text-brand-secondary'
                  }`}>
                    {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-brand-primary text-white rounded-tr-none' 
                      : 'bg-brand-background text-brand-text-main border border-brand-border rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 items-center text-brand-text-muted text-sm italic">
                <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                {isRtl ? 'جاري التفكير...' : 'Thinking...'}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-brand-background border-t border-brand-border">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRtl ? 'اسأل أي شيء عن المنصة...' : 'Ask anything about the platform...'}
              className="w-full pl-4 pr-12 py-4 bg-brand-surface border border-brand-border rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`absolute ${isRtl ? 'left-2' : 'right-2'} p-3 rounded-xl transition-all ${
                input.trim() && !isLoading 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'bg-brand-border text-brand-text-muted'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { icon: MessageSquare, title: isRtl ? 'تواصل معنا' : 'Contact Us', desc: isRtl ? 'دعم مباشر 24/7' : '24/7 Live Support' },
          { icon: Info, title: isRtl ? 'دليل الاستخدام' : 'User Guide', desc: isRtl ? 'تعلم كيف تبدأ' : 'Learn how to start' },
          { icon: HelpCircle, title: isRtl ? 'الأسئلة الشائعة' : 'FAQs', desc: isRtl ? 'إجابات سريعة' : 'Quick answers' }
        ].map((item, i) => (
          <div key={i} className="p-4 bg-brand-surface border border-brand-border rounded-2xl flex items-start gap-3 hover:border-brand-primary/50 transition-colors cursor-pointer group">
            <div className="p-2 bg-brand-primary/5 rounded-lg text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
              <item.icon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-brand-text-main">{item.title}</h3>
              <p className="text-xs text-brand-text-muted">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
