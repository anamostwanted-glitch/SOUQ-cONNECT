import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Archive, 
  Search, 
  Filter, 
  FileText, 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  Trash2,
  Eye,
  MoreVertical,
  Download,
  Calendar,
  User as UserIcon,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { collection, query, onSnapshot, getDocs, doc, updateDoc, deleteDoc, orderBy, where, limit, getDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { Chat, UserProfile, ProductRequest, Message } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { summarizeChat, analyzeChatRisk, analyzeChatSentiment } from '../../../core/services/geminiService';
import { toast } from 'sonner';
import { HapticButton } from '../../../shared/components/HapticButton';

interface ChatArchiveManagerProps {
  onOpenChat: (chatId: string) => void;
}

export const ChatArchiveManager: React.FC<ChatArchiveManagerProps> = ({ onOpenChat }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<any | null>(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<any | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'summary' | 'risk' | 'sentiment'>('summary');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [productRequests, setProductRequests] = useState<Record<string, ProductRequest>>({});

  useEffect(() => {
    setLoading(true);
    let q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'), limit(50));
    
    if (filter === 'archived') {
      q = query(collection(db, 'chats'), where('archived', '==', true), orderBy('updatedAt', 'desc'), limit(50));
    } else if (filter === 'active') {
      q = query(collection(db, 'chats'), where('archived', '==', false), orderBy('updatedAt', 'desc'), limit(50));
    }

    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        const fetchedChats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
        setChats(fetchedChats);
        setLoading(false);

        // Fetch missing profiles and requests
        const missingUserIds = new Set<string>();
        const missingRequestIds = new Set<string>();

        fetchedChats.forEach(chat => {
          if (!userProfiles[chat.customerId]) missingUserIds.add(chat.customerId);
          if (!userProfiles[chat.supplierId]) missingUserIds.add(chat.supplierId);
          if (chat.requestId && !productRequests[chat.requestId]) missingRequestIds.add(chat.requestId);
        });

        if (missingUserIds.size > 0) {
          const userPromises = Array.from(missingUserIds).map(id => getDoc(doc(db, 'users', id)));
          const userSnaps = await Promise.all(userPromises);
          const newUserProfiles = { ...userProfiles };
          userSnaps.forEach(snap => {
            if (snap.exists()) {
              newUserProfiles[snap.id] = snap.data() as UserProfile;
            }
          });
          setUserProfiles(newUserProfiles);
        }

        if (missingRequestIds.size > 0) {
          const requestPromises = Array.from(missingRequestIds).map(id => getDoc(doc(db, 'requests', id)));
          const requestSnaps = await Promise.all(requestPromises);
          const newProductRequests = { ...productRequests };
          requestSnaps.forEach(snap => {
            if (snap.exists()) {
              newProductRequests[snap.id] = { id: snap.id, ...snap.data() } as ProductRequest;
            }
          });
          setProductRequests(newProductRequests);
        }
      } catch (err) {
        console.error("Error in ChatArchiveManager onSnapshot callback:", err);
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats', false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  const handleArchiveChat = async (chatId: string, archived: boolean) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), { archived });
      toast.success(isRtl 
        ? (archived ? 'تمت أرشفة المحادثة' : 'تم إلغاء أرشفة المحادثة') 
        : (archived ? 'Chat archived' : 'Chat unarchived')
      );
    } catch (error) {
      toast.error(isRtl ? 'فشل تحديث حالة الأرشفة' : 'Failed to update archive status');
    }
  };

  const handleGenerateSummary = async (chat: Chat) => {
    setIsSummarizing(true);
    setChatSummary(null);
    try {
      const messagesSnap = await getDocs(query(
        collection(db, 'chats', chat.id, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(100)
      ));
      
      const messages = messagesSnap.docs.map(d => d.data() as Message);
      if (messages.length === 0) {
        toast.error(isRtl ? 'لا توجد رسائل لتلخيصها' : 'No messages to summarize');
        return;
      }

      const transcript = messages.map(m => {
        const sender = userProfiles[m.senderId]?.name || 'User';
        return `${sender}: ${m.text || '[Media]'}`;
      }).join('\n');

      const summary = await summarizeChat(transcript, i18n.language);
      setChatSummary(summary);
      
      // Optionally save summary to chat doc
      await updateDoc(doc(db, 'chats', chat.id), {
        aiSummary: summary,
        summaryGeneratedAt: new Date().toISOString()
      });

      toast.success(isRtl ? 'تم توليد الملخص بنجاح' : 'Summary generated successfully');
    } catch (error) {
      console.error('Summary generation error:', error);
      toast.error(isRtl ? 'فشل توليد الملخص' : 'Failed to generate summary');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAnalyzeRisk = async (chat: Chat) => {
    setIsAnalyzingRisk(true);
    setRiskAnalysis(null);
    try {
      const messagesSnap = await getDocs(query(
        collection(db, 'chats', chat.id, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(100)
      ));
      
      const messages = messagesSnap.docs.map(d => d.data() as Message);
      if (messages.length === 0) {
        toast.error(isRtl ? 'لا توجد رسائل لتحليلها' : 'No messages to analyze');
        return;
      }

      const transcript = messages.map(m => {
        const sender = userProfiles[m.senderId]?.name || 'User';
        return `${sender}: ${m.text || '[Media]'}`;
      }).join('\n');

      const analysis = await analyzeChatRisk(transcript, i18n.language);
      setRiskAnalysis(analysis);
      
      await updateDoc(doc(db, 'chats', chat.id), {
        riskAnalysis: analysis,
        riskAnalyzedAt: new Date().toISOString()
      });

      toast.success(isRtl ? 'تم تحليل المخاطر بنجاح' : 'Risk analysis completed successfully');
    } catch (error) {
      console.error('Risk analysis error:', error);
      toast.error(isRtl ? 'فشل تحليل المخاطر' : 'Failed to analyze risk');
    } finally {
      setIsAnalyzingRisk(false);
    }
  };

  const handleAnalyzeSentiment = async (chat: Chat) => {
    setIsAnalyzingSentiment(true);
    setSentimentAnalysis(null);
    try {
      const messagesSnap = await getDocs(query(
        collection(db, 'chats', chat.id, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(100)
      ));
      
      const messages = messagesSnap.docs.map(d => d.data() as Message);
      if (messages.length === 0) {
        toast.error(isRtl ? 'لا توجد رسائل لتحليلها' : 'No messages to analyze');
        return;
      }

      const transcript = messages.map(m => {
        const sender = userProfiles[m.senderId]?.name || 'User';
        return `${sender}: ${m.text || '[Media]'}`;
      }).join('\n');

      const analysis = await analyzeChatSentiment(transcript, i18n.language);
      setSentimentAnalysis(analysis);
      
      await updateDoc(doc(db, 'chats', chat.id), {
        sentimentAnalysis: analysis,
        sentimentAnalyzedAt: new Date().toISOString()
      });

      toast.success(isRtl ? 'تم تحليل المشاعر بنجاح' : 'Sentiment analysis completed successfully');
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      toast.error(isRtl ? 'فشل تحليل المشاعر' : 'Failed to analyze sentiment');
    } finally {
      setIsAnalyzingSentiment(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const customer = userProfiles[chat.customerId];
    const supplier = userProfiles[chat.supplierId];
    const request = productRequests[chat.requestId];
    
    const searchStr = `${customer?.name} ${supplier?.name} ${request?.productName} ${chat.lastMessage}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-brand-text-main flex items-center gap-3">
            <Archive className="text-brand-primary" />
            {isRtl ? 'أرشيف المحادثات' : 'Chat Archive'}
          </h2>
          <p className="text-brand-text-muted text-sm mt-1">
            {isRtl ? 'إدارة وتلخيص المحادثات المؤرشفة والنشطة' : 'Manage and summarize archived and active chats'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
            <input
              type="text"
              placeholder={isRtl ? 'بحث في المحادثات...' : 'Search chats...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary w-full md:w-64"
            />
          </div>
          <div className="flex bg-brand-surface border border-brand-border rounded-xl p-1">
            {(['all', 'active', 'archived'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  filter === f 
                    ? 'bg-brand-primary text-white shadow-sm' 
                    : 'text-brand-text-muted hover:text-brand-text-main'
                }`}
              >
                {f === 'all' ? (isRtl ? 'الكل' : 'All') : f === 'active' ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'مؤرشف' : 'Archived')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="animate-spin text-brand-primary" size={32} />
              <p className="text-brand-text-muted text-sm font-bold">{isRtl ? 'جاري تحميل المحادثات...' : 'Loading chats...'}</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 bg-brand-surface rounded-[2rem] border border-brand-border border-dashed">
              <MessageSquare className="mx-auto text-brand-text-muted/30 mb-4" size={48} />
              <p className="text-brand-text-muted font-bold">{isRtl ? 'لا توجد محادثات مطابقة' : 'No matching chats found'}</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <motion.div
                key={chat.id}
                layoutId={chat.id}
                onClick={() => {
                  setSelectedChat(chat);
                  setChatSummary((chat as any).aiSummary || null);
                  setRiskAnalysis((chat as any).riskAnalysis || null);
                  setSentimentAnalysis((chat as any).sentimentAnalysis || null);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${
                  selectedChat?.id === chat.id 
                    ? 'bg-brand-primary/5 border-brand-primary shadow-md' 
                    : 'bg-brand-surface border-brand-border hover:border-brand-primary/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-brand-background rounded-xl border border-brand-border flex items-center justify-center overflow-hidden shrink-0">
                      {userProfiles[chat.supplierId]?.logoUrl ? (
                        <img src={userProfiles[chat.supplierId].logoUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <Building2 className="text-brand-text-muted" size={20} />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-surface rounded-lg border border-brand-border flex items-center justify-center overflow-hidden shadow-sm">
                      {userProfiles[chat.customerId]?.photoURL ? (
                        <img src={userProfiles[chat.customerId].photoURL} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <UserIcon className="text-brand-text-muted" size={12} />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-brand-text-main truncate text-sm">
                        {userProfiles[chat.supplierId]?.companyName || userProfiles[chat.supplierId]?.name || '...'}
                      </h4>
                      <span className="text-[10px] text-brand-text-muted font-bold">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-primary font-black truncate">
                      {productRequests[chat.requestId]?.productName || '...'}
                    </p>
                    <p className="text-[10px] text-brand-text-muted truncate mt-1 opacity-70">
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {(chat as any).sentimentAnalysis && (
                    <div className={`w-2 h-2 rounded-full ${(chat as any).sentimentAnalysis.sentiment === 'positive' ? 'bg-emerald-500' : (chat as any).sentimentAnalysis.sentiment === 'negative' ? 'bg-brand-error' : 'bg-amber-500'}`} />
                  )}
                  {chat.archived && (
                    <Archive size={12} className="text-brand-text-muted" />
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedChat ? (
              <motion.div
                key={selectedChat.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-sm overflow-hidden h-full flex flex-col"
              >
                <div className="p-6 border-b border-brand-border bg-brand-background/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-brand-text-main">
                        {isRtl ? 'تفاصيل المحادثة' : 'Chat Details'}
                      </h3>
                      <p className="text-xs text-brand-text-muted font-bold">
                        ID: {selectedChat.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleArchiveChat(selectedChat.id, !selectedChat.archived)}
                      className={`p-2 rounded-xl border transition-all ${
                        selectedChat.archived 
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                          : 'bg-brand-background text-brand-text-muted border-brand-border hover:text-brand-primary'
                      }`}
                      title={selectedChat.archived ? (isRtl ? 'إلغاء الأرشفة' : 'Unarchive') : (isRtl ? 'أرشفة' : 'Archive')}
                    >
                      <Archive size={18} />
                    </button>
                    <button
                      onClick={() => onOpenChat(selectedChat.id)}
                      className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl border border-brand-primary/20 hover:bg-brand-primary/20 transition-all"
                      title={isRtl ? 'فتح المحادثة' : 'Open Chat'}
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                        {isRtl ? 'الأطراف المشاركة' : 'Participants'}
                      </h5>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-brand-background rounded-2xl border border-brand-border">
                          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                            <UserIcon size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-brand-text-main">{userProfiles[selectedChat.customerId]?.name}</p>
                            <p className="text-[10px] text-brand-text-muted">{isRtl ? 'عميل' : 'Customer'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-brand-background rounded-2xl border border-brand-border">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-brand-text-main">{userProfiles[selectedChat.supplierId]?.companyName || userProfiles[selectedChat.supplierId]?.name}</p>
                            <p className="text-[10px] text-brand-text-muted">{isRtl ? 'مورد' : 'Supplier'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                        {isRtl ? 'الطلب المرتبط' : 'Related Request'}
                      </h5>
                      <div className="p-4 bg-brand-background rounded-2xl border border-brand-border space-y-2">
                        <p className="text-sm font-black text-brand-primary">
                          {productRequests[selectedChat.requestId]?.productName}
                        </p>
                        <p className="text-xs text-brand-text-muted line-clamp-2">
                          {productRequests[selectedChat.requestId]?.description}
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            productRequests[selectedChat.requestId]?.status === 'open' 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-brand-text-muted/10 text-brand-text-muted'
                          }`}>
                            {productRequests[selectedChat.requestId]?.status}
                          </span>
                          <span className="text-[9px] text-brand-text-muted font-bold">
                            {new Date(productRequests[selectedChat.requestId]?.createdAt || '').toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-border pb-2">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setActiveDetailTab('summary')}
                          className={`text-[10px] font-black uppercase tracking-widest pb-2 transition-all relative ${
                            activeDetailTab === 'summary' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'
                          }`}
                        >
                          {isRtl ? 'ملخص المحادثة' : 'Chat Summary'}
                          {activeDetailTab === 'summary' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
                        </button>
                        <button
                          onClick={() => setActiveDetailTab('risk')}
                          className={`text-[10px] font-black uppercase tracking-widest pb-2 transition-all relative flex items-center gap-2 ${
                            activeDetailTab === 'risk' ? 'text-brand-error' : 'text-brand-text-muted hover:text-brand-text-main'
                          }`}
                        >
                          <AlertTriangle size={12} />
                          {isRtl ? 'رادار المخاطر' : 'Risk Radar'}
                          {activeDetailTab === 'risk' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-error" />}
                        </button>
                        <button
                          onClick={() => setActiveDetailTab('sentiment')}
                          className={`text-[10px] font-black uppercase tracking-widest pb-2 transition-all relative flex items-center gap-2 ${
                            activeDetailTab === 'sentiment' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'
                          }`}
                        >
                          <Sparkles size={12} />
                          {isRtl ? 'تحليل المشاعر' : 'Sentiment'}
                          {activeDetailTab === 'sentiment' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
                        </button>
                      </div>
                      
                      {activeDetailTab === 'summary' ? (
                        <button
                          onClick={() => handleGenerateSummary(selectedChat)}
                          disabled={isSummarizing}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary-hover transition-all disabled:opacity-50"
                        >
                          {isSummarizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          {isRtl ? 'توليد ملخص جديد' : 'Generate New Summary'}
                        </button>
                      ) : activeDetailTab === 'risk' ? (
                        <button
                          onClick={() => handleAnalyzeRisk(selectedChat)}
                          disabled={isAnalyzingRisk}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-error text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-error/90 transition-all disabled:opacity-50"
                        >
                          {isAnalyzingRisk ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
                          {isRtl ? 'تحليل المخاطر' : 'Analyze Risk'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAnalyzeSentiment(selectedChat)}
                          disabled={isAnalyzingSentiment}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary-hover transition-all disabled:opacity-50"
                        >
                          {isAnalyzingSentiment ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          {isRtl ? 'تحليل المشاعر' : 'Analyze Sentiment'}
                        </button>
                      )}
                    </div>

                    <div className="relative min-h-[250px] bg-brand-background/50 rounded-3xl border border-brand-border p-6 overflow-hidden">
                      <AnimatePresence mode="wait">
                        {activeDetailTab === 'summary' ? (
                          isSummarizing ? (
                            <motion.div
                              key="loading-summary"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-brand-background/80 backdrop-blur-sm z-10"
                            >
                              <div className="relative">
                                <Loader2 className="animate-spin text-brand-primary" size={32} />
                                <Sparkles className="absolute -top-1 -right-1 text-brand-primary animate-pulse" size={12} />
                              </div>
                              <p className="text-xs font-black text-brand-primary animate-pulse">
                                {isRtl ? 'جاري تحليل المحادثة وتوليد الملخص...' : 'Analyzing conversation and generating summary...'}
                              </p>
                            </motion.div>
                          ) : chatSummary ? (
                            <motion.div
                              key="summary"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="prose prose-sm max-w-none dark:prose-invert"
                            >
                              <div className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary shrink-0">
                                  <FileText size={16} />
                                </div>
                                <div className="space-y-4 text-brand-text-main leading-relaxed text-sm">
                                  {chatSummary.split('\n').map((line, i) => (
                                    <p key={i}>{line}</p>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-6 pt-4 border-t border-brand-border flex items-center justify-between">
                                <span className="text-[10px] text-brand-text-muted font-bold flex items-center gap-1">
                                  <Clock size={10} />
                                  {isRtl ? 'تم التوليد في: ' : 'Generated at: '}
                                  {(selectedChat as any).summaryGeneratedAt ? new Date((selectedChat as any).summaryGeneratedAt).toLocaleString() : new Date().toLocaleString()}
                                </span>
                                <button className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                                  <Download size={10} />
                                  {isRtl ? 'تحميل الملخص' : 'Download Summary'}
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full py-8 space-y-4 opacity-50">
                              <FileText size={48} className="text-brand-text-muted" />
                              <p className="text-sm font-bold text-brand-text-muted text-center max-w-xs">
                                {isRtl 
                                  ? 'لا يوجد ملخص متاح لهذه المحادثة حالياً. اضغط على الزر أعلاه لتوليد ملخص ذكي.' 
                                  : 'No summary available for this chat yet. Click the button above to generate an AI summary.'}
                              </p>
                            </div>
                          )
                        ) : activeDetailTab === 'risk' ? (
                          isAnalyzingRisk ? (
                            <motion.div
                              key="loading-risk"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-brand-background/80 backdrop-blur-sm z-10"
                            >
                              <div className="relative">
                                <Loader2 className="animate-spin text-brand-error" size={32} />
                                <AlertTriangle className="absolute -top-1 -right-1 text-brand-error animate-pulse" size={12} />
                              </div>
                              <p className="text-xs font-black text-brand-error animate-pulse">
                                {isRtl ? 'جاري فحص المحادثة بحثاً عن مخاطر...' : 'Scanning conversation for risks...'}
                              </p>
                            </motion.div>
                          ) : riskAnalysis ? (
                            <motion.div
                              key="risk"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-6"
                            >
                              <div className="flex items-center justify-between p-4 bg-brand-background rounded-2xl border border-brand-border">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black ${
                                    riskAnalysis.riskLevel === 'critical' ? 'bg-brand-error' :
                                    riskAnalysis.riskLevel === 'high' ? 'bg-orange-500' :
                                    riskAnalysis.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-brand-success'
                                  }`}>
                                    {riskAnalysis.riskScore}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-brand-text-main uppercase tracking-widest">
                                      {isRtl ? 'مستوى المخاطر' : 'Risk Level'}
                                    </p>
                                    <p className={`text-sm font-black uppercase ${
                                      riskAnalysis.riskLevel === 'critical' ? 'text-brand-error' :
                                      riskAnalysis.riskLevel === 'high' ? 'text-orange-500' :
                                      riskAnalysis.riskLevel === 'medium' ? 'text-amber-500' : 'text-brand-success'
                                    }`}>
                                      {riskAnalysis.riskLevel}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-brand-text-muted font-bold uppercase">
                                    {isRtl ? 'آخر فحص' : 'Last Scan'}
                                  </p>
                                  <p className="text-xs font-bold text-brand-text-main">
                                    {new Date((selectedChat as any).riskAnalyzedAt || new Date()).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h6 className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                                  {isRtl ? 'المؤشرات المكتشفة' : 'Detected Flags'}
                                </h6>
                                {riskAnalysis.flags.length === 0 ? (
                                  <div className="p-4 bg-brand-success/5 border border-brand-success/20 rounded-xl flex items-center gap-3 text-brand-success">
                                    <CheckCircle2 size={16} />
                                    <p className="text-xs font-bold">{isRtl ? 'لم يتم اكتشاف أي مخاطر واضحة' : 'No clear risks detected'}</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 gap-2">
                                    {riskAnalysis.flags.map((flag: any, i: number) => (
                                      <div key={i} className="p-3 bg-brand-background border border-brand-border rounded-xl flex items-start gap-3">
                                        <div className="p-1.5 bg-brand-error/10 text-brand-error rounded-lg">
                                          <AlertTriangle size={14} />
                                        </div>
                                        <div>
                                          <p className="text-xs font-black text-brand-text-main">{flag.type}</p>
                                          <p className="text-[10px] text-brand-text-muted mt-0.5">{isRtl ? flag.descriptionAr : flag.descriptionEn}</p>
                                        </div>
                                        <div className="ml-auto text-[10px] font-black text-brand-text-muted">
                                          {Math.round(flag.confidence * 100)}%
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl space-y-2">
                                <h6 className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2">
                                  <Sparkles size={12} />
                                  {isRtl ? 'توصيات الذكاء الاصطناعي' : 'AI Recommendations'}
                                </h6>
                                <p className="text-xs text-brand-text-main leading-relaxed">
                                  {isRtl ? riskAnalysis.recommendationAr : riskAnalysis.recommendationEn}
                                </p>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full py-8 space-y-4 opacity-50">
                              <AlertTriangle size={48} className="text-brand-text-muted" />
                              <p className="text-sm font-bold text-brand-text-muted text-center max-w-xs">
                                {isRtl 
                                  ? 'لم يتم إجراء تحليل مخاطر لهذه المحادثة بعد. اضغط على الزر أعلاه لبدء الفحص.' 
                                  : 'No risk analysis has been performed for this chat yet. Click the button above to start scanning.'}
                              </p>
                            </div>
                          )
                        ) : (
                          isAnalyzingSentiment ? (
                            <motion.div
                              key="loading-sentiment"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-brand-background/80 backdrop-blur-sm z-10"
                            >
                              <div className="relative">
                                <Loader2 className="animate-spin text-brand-primary" size={32} />
                                <Sparkles className="absolute -top-1 -right-1 text-brand-primary animate-pulse" size={12} />
                              </div>
                              <p className="text-xs font-black text-brand-primary animate-pulse">
                                {isRtl ? 'جاري تحليل مشاعر المحادثة...' : 'Analyzing chat sentiment...'}
                              </p>
                            </motion.div>
                          ) : sentimentAnalysis ? (
                            <motion.div
                              key="sentiment"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-6"
                            >
                              <div className="flex items-center justify-between p-4 bg-brand-background rounded-2xl border border-brand-border">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black ${
                                    sentimentAnalysis.sentiment === 'positive' ? 'bg-emerald-500' :
                                    sentimentAnalysis.sentiment === 'negative' ? 'bg-brand-error' : 'bg-amber-500'
                                  }`}>
                                    {Math.round(sentimentAnalysis.score * 100)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-brand-text-main uppercase tracking-widest">
                                      {isRtl ? 'الحالة العاطفية' : 'Emotional State'}
                                    </p>
                                    <p className={`text-sm font-black uppercase ${
                                      sentimentAnalysis.sentiment === 'positive' ? 'text-emerald-500' :
                                      sentimentAnalysis.sentiment === 'negative' ? 'text-brand-error' : 'text-amber-500'
                                    }`}>
                                      {sentimentAnalysis.sentiment}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-brand-text-muted font-bold uppercase">
                                    {isRtl ? 'آخر تحليل' : 'Last Analysis'}
                                  </p>
                                  <p className="text-xs font-bold text-brand-text-main">
                                    {new Date((selectedChat as any).sentimentAnalyzedAt || new Date()).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h6 className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                                  {isRtl ? 'المشاعر المكتشفة' : 'Detected Emotions'}
                                </h6>
                                <div className="flex flex-wrap gap-2">
                                  {sentimentAnalysis.keyEmotions.map((emotion: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-brand-background border border-brand-border rounded-full text-[10px] font-black text-brand-text-main uppercase">
                                      {emotion}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-2">
                                <h6 className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                                  {isRtl ? 'التحليل النفسي' : 'Psychological Analysis'}
                                </h6>
                                <p className="text-xs text-brand-text-main leading-relaxed">
                                  {isRtl ? sentimentAnalysis.reasoningAr : sentimentAnalysis.reasoningEn}
                                </p>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full py-8 space-y-4 opacity-50">
                              <Sparkles size={48} className="text-brand-text-muted" />
                              <p className="text-sm font-bold text-brand-text-muted text-center max-w-xs">
                                {isRtl 
                                  ? 'لم يتم إجراء تحليل مشاعر لهذه المحادثة بعد. اضغط على الزر أعلاه لبدء التحليل.' 
                                  : 'No sentiment analysis has been performed for this chat yet. Click the button above to start analysis.'}
                              </p>
                            </div>
                          )
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-brand-surface rounded-[2.5rem] border border-brand-border border-dashed p-12 text-center space-y-6">
                <div className="w-24 h-24 bg-brand-background rounded-[2rem] flex items-center justify-center text-brand-text-muted/20">
                  <Archive size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-brand-text-main">
                    {isRtl ? 'اختر محادثة للمراجعة' : 'Select a Chat to Review'}
                  </h3>
                  <p className="text-sm text-brand-text-muted max-w-sm mx-auto">
                    {isRtl 
                      ? 'يمكنك مراجعة تفاصيل المحادثات، أرشفتها، أو توليد ملخصات ذكية باستخدام الذكاء الاصطناعي.' 
                      : 'You can review chat details, archive them, or generate smart summaries using AI.'}
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
