import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Check, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../../core/firebase';
import { handleFirestoreError, OperationType } from '../../../../core/utils/errorHandling';
import { Chat, Message, UserProfile } from '../../../../core/types';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message;
  profile: UserProfile | null;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ isOpen, onClose, message, profile }) => {
  const { t, i18n } = useTranslation();
  const [chats, setChats] = useState<(Chat & { otherUser?: UserProfile })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      loadChats();
    }
  }, [isOpen, profile]);

  const loadChats = async () => {
    if (!profile) return;
    try {
      const q1 = query(
        collection(db, 'chats'),
        where('customerId', '==', profile.uid)
      );
      const q2 = query(
        collection(db, 'chats'),
        where('supplierId', '==', profile.uid)
      );
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const chatsData = [...snap1.docs, ...snap2.docs].map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      
      // Remove duplicates
      const uniqueChats = Array.from(new Map(chatsData.map(c => [c.id, c])).values());
      
      // Fetch other user profiles
      const chatsWithUsers = await Promise.all(uniqueChats.map(async (chat) => {
        try {
          if (chat.isCategoryChat) return chat;
          const otherUserId = chat.customerId === profile.uid ? chat.supplierId : chat.customerId;
          if (otherUserId) {
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', otherUserId)));
            if (!userDoc.empty) {
              return { ...chat, otherUser: userDoc.docs[0].data() as UserProfile };
            }
          }
          return chat;
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users', false);
          return chat;
        }
      }));
      
      setChats(chatsWithUsers);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'chats', false);
    }
  };

  const handleForward = async () => {
    if (!profile || selectedChats.length === 0) return;
    setIsForwarding(true);
    try {
      const forwardPromises = selectedChats.map(chatId => 
        addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          senderId: profile.uid,
          text: message.text || null,
          imageUrl: message.imageUrl || null,
          audioUrl: message.audioUrl || null,
          location: message.location || null,
          quoteData: message.quoteData || null,
          type: message.type,
          createdAt: new Date().toISOString(),
          read: false,
          isForwarded: true
        })
      );
      await Promise.all(forwardPromises);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats/messages/forward', false);
    } finally {
      setIsForwarding(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const name = chat.isCategoryChat ? (chat as any).categoryName || 'Category Chat' : (chat.otherUser?.companyName || chat.otherUser?.name || '');
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-brand-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-4 border-b border-brand-border-light flex justify-between items-center">
            <h2 className="text-lg font-bold text-brand-text-main">
              {i18n.language === 'ar' ? 'إعادة توجيه إلى...' : 'Forward to...'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-brand-background rounded-full text-brand-text-muted transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 border-b border-brand-border-light">
            <div className="relative">
              <Search size={18} className="absolute top-1/2 -translate-y-1/2 left-3 text-brand-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={i18n.language === 'ar' ? 'بحث...' : 'Search...'}
                className="w-full bg-brand-background border border-brand-border-light rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredChats.map(chat => {
              const isSelected = selectedChats.includes(chat.id);
              const name = chat.isCategoryChat ? (chat as any).categoryName || 'Category Chat' : (chat.otherUser?.companyName || chat.otherUser?.name || 'Unknown');
              const avatar = chat.isCategoryChat ? null : chat.otherUser?.logoUrl;

              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedChats(prev => prev.filter(id => id !== chat.id));
                    } else {
                      setSelectedChats(prev => [...prev, chat.id]);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-brand-primary/10' : 'hover:bg-brand-background'}`}
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-brand-primary/20 flex items-center justify-center shrink-0">
                    {avatar ? (
                      <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-brand-primary font-bold">{name?.charAt(0)}</span>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-brand-primary/80 flex items-center justify-center">
                        <Check size={20} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-brand-text-main truncate">{name}</h3>
                  </div>
                </div>
              );
            })}
            {filteredChats.length === 0 && (
              <div className="text-center p-8 text-brand-text-muted">
                {i18n.language === 'ar' ? 'لا توجد محادثات' : 'No chats found'}
              </div>
            )}
          </div>

          {selectedChats.length > 0 && (
            <div className="p-4 border-t border-brand-border-light bg-brand-background">
              <button
                onClick={handleForward}
                disabled={isForwarding}
                className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
              >
                {isForwarding ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <>
                    <Send size={18} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
                    {i18n.language === 'ar' ? `إرسال (${selectedChats.length})` : `Send (${selectedChats.length})`}
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
