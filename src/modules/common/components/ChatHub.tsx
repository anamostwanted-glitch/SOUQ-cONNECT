import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile, Chat, ProductRequest } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { Search, MessageSquare, User, Clock, ChevronRight, Sparkles, Bot, X } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ChatHubProps {
  profile: UserProfile | null;
  onOpenChat: (chatId: string) => void;
  onBack: () => void;
}

export const ChatHub: React.FC<ChatHubProps> = ({ profile, onOpenChat, onBack }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [otherUsers, setOtherUsers] = useState<Record<string, UserProfile>>({});
  const [requests, setRequests] = useState<Record<string, ProductRequest>>({});
  const [lastChatId, setLastChatId] = useState<string | null>(localStorage.getItem('last_active_chat_id'));

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'chats'),
      where(profile.role === 'supplier' ? 'supplierId' : 'customerId', '==', profile.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        const chatList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
        setChats(chatList);
        setLoading(false);

        // Fetch other users' data in parallel
        const userIds = Array.from(new Set(chatList.map((c: Chat) => 
          profile.uid === c.customerId ? c.supplierId : c.customerId
        ))).filter(id => id && id !== 'system' && id !== 'everyone');

        const missingUserIds = userIds.filter(id => !otherUsers[id]);
        
        if (missingUserIds.length > 0) {
          const userPromises = missingUserIds.map(async (id) => {
            try {
              // Try users_public first
              const upSnap = await getDoc(doc(db, 'users_public', id));
              if (upSnap.exists()) {
                return { id, data: { id: upSnap.id, ...upSnap.data() } as any as UserProfile };
              }
              // Fallback to users
              const uSnap = await getDoc(doc(db, 'users', id));
              if (uSnap.exists()) {
                return { id, data: uSnap.data() as any as UserProfile };
              }
              return { id, data: { uid: id, name: 'User', role: 'customer' } as UserProfile };
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, `users/${id}`, false);
              return { id, data: { uid: id, name: 'User', role: 'customer' } as UserProfile };
            }
          });

          const results = await Promise.all(userPromises);
          
          setOtherUsers(prev => {
            const updated = { ...prev };
            results.forEach(res => {
              updated[res.id] = res.data;
            });
            return updated;
          });
        }

        // Fetch requests data in parallel
        const requestIds = Array.from(new Set(chatList.map(c => c.requestId)))
          .filter(id => id && !id.startsWith('category_') && !requests[id]);

        if (requestIds.length > 0) {
          const requestPromises = requestIds.map(async (id) => {
            try {
              const rSnap = await getDoc(doc(db, 'requests', id!));
              if (rSnap.exists()) {
                return { id, data: { id: rSnap.id, ...rSnap.data() } as ProductRequest };
              }
              return null;
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, `requests/${id}`, false);
              return null;
            }
          });

          const results = await Promise.all(requestPromises);
          
          setRequests(prev => {
            const updated = { ...prev };
            results.forEach(res => {
              if (res) updated[res.id!] = res.data;
            });
            return updated;
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'chats/hub', false);
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats', false);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile]);

  const filteredChats = chats.filter(chat => {
    const otherId = profile?.uid === chat.customerId ? chat.supplierId : chat.customerId;
    const otherUser = otherUsers[otherId];
    const name = otherUser?.companyName || otherUser?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { 
        addSuffix: true,
        locale: isRtl ? ar : enUS 
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-background">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between sticky top-0 bg-brand-background/80 backdrop-blur-xl z-20">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-tight text-brand-text-main">
            {t('chat_hub')}
          </h1>
          <p className="text-xs text-brand-text-muted font-medium mt-1">
            {chats.length} {isRtl ? 'محادثة نشطة' : 'active conversations'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Bot size={20} />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-brand-text-muted group-focus-within:text-brand-primary transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder={isRtl ? 'البحث عن محادثات...' : 'Search conversations...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-surface border border-brand-border/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Resume Last Chat Banner */}
      <AnimatePresence>
        {lastChatId && !searchQuery && (
          <motion.div 
            key="resume-last-chat-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-6 mb-6"
          >
            <HapticButton
              onClick={() => onOpenChat(lastChatId)}
              className="w-full p-4 bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 border border-brand-primary/20 rounded-[2rem] flex items-center justify-between group hover:border-brand-primary/40 transition-all relative"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20">
                  <Clock size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">
                    {isRtl ? 'متابعة المحادثة الأخيرة' : 'Resume Last Chat'}
                  </p>
                  <p className="text-xs font-bold text-brand-text-main">
                    {isRtl ? 'اضغط للعودة لآخر محادثة نشطة' : 'Tap to return to your last active chat'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    localStorage.removeItem('last_active_chat_id');
                    setLastChatId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      localStorage.removeItem('last_active_chat_id');
                      setLastChatId(null);
                    }
                  }}
                  className="p-2 text-brand-text-muted hover:text-brand-error rounded-full hover:bg-brand-error/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </div>
                <div className={`text-brand-primary transform transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180' : ''}`}>
                  <ChevronRight size={20} />
                </div>
              </div>
            </HapticButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div key="loading-skeleton" className="flex flex-col gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-brand-surface/50 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredChats.length > 0 ? (
            <div key="chats-list" className="flex flex-col gap-2">
              {filteredChats.map((chat, index) => {
                const otherId = profile?.uid === chat.customerId ? chat.supplierId : chat.customerId;
                const otherUser = otherUsers[otherId];
                const displayName = otherUser?.companyName || otherUser?.name || '...';
                const photoURL = otherUser?.logoUrl || otherUser?.photoURL;
                const request = chat.requestId ? requests[chat.requestId] : null;

                return (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <HapticButton
                      onClick={() => onOpenChat(chat.id)}
                      className="w-full p-4 bg-white dark:bg-brand-surface border border-brand-border/30 rounded-[2rem] hover:border-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/5 transition-all flex items-center gap-4 group relative overflow-hidden"
                    >
                      {/* Active Indicator */}
                      {otherUser?.isOnline && (
                        <div className="absolute top-4 left-4 w-3 h-3 bg-brand-success rounded-full border-2 border-white dark:border-brand-surface z-10" />
                      )}

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-brand-primary/5 border border-brand-border/50 shadow-sm">
                          {photoURL ? (
                            <img src={photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-primary">
                              <User size={24} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-black text-brand-text-main truncate tracking-tight group-hover:text-brand-primary transition-colors">
                            {displayName}
                          </h3>
                          <span className="text-[10px] font-bold text-brand-text-muted whitespace-nowrap flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(chat.updatedAt)}
                          </span>
                        </div>
                        {request && (
                          <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1 truncate">
                            {request.productName}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-brand-text-muted truncate font-medium">
                            {chat.lastMessage || (isRtl ? 'ابدأ المحادثة...' : 'Start a conversation...')}
                          </p>
                          {chat.unreadCount > 0 && (
                            <div className="bg-brand-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-brand-primary/20">
                              {chat.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`text-brand-text-muted opacity-0 group-hover:opacity-100 transition-all transform ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                        <ChevronRight size={20} />
                      </div>
                    </HapticButton>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div key="empty-chats-state" className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-brand-primary/5 rounded-full flex items-center justify-center text-brand-primary mb-4">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-black text-brand-text-main text-lg">
                {isRtl ? 'لا توجد محادثات' : 'No conversations yet'}
              </h3>
              <p className="text-sm text-brand-text-muted mt-2 max-w-[200px]">
                {isRtl ? 'ابدأ بالتواصل مع الموردين أو العملاء لتظهر محادثاتك هنا.' : 'Start connecting with suppliers or customers to see your chats here.'}
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
