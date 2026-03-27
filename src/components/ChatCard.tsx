import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Chat, UserProfile, ProductRequest } from '../types';
import { motion } from 'motion/react';
import { User as UserIcon, Building2, Star } from 'lucide-react';

interface ChatCardProps {
  chat: Chat;
  onOpen: () => void;
  activeRole: string;
}

const ChatCard: React.FC<ChatCardProps> = ({ chat, onOpen, activeRole }) => {
  const { i18n } = useTranslation();
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [request, setRequest] = useState<ProductRequest | null>(null);

  useEffect(() => {
    const otherUserId = activeRole === 'supplier' ? chat.customerId : chat.supplierId;
    if (otherUserId && otherUserId !== 'system' && otherUserId !== 'everyone') {
      getDoc(doc(db, 'users', otherUserId)).then(snap => {
        if (snap.exists()) setOtherUser(snap.data() as UserProfile);
      });
    }
    if (chat.requestId && !chat.requestId.startsWith('category_')) {
      getDoc(doc(db, 'requests', chat.requestId)).then(snap => {
        if (snap.exists()) setRequest({ id: snap.id, ...snap.data() } as ProductRequest);
      });
    }
  }, [chat, activeRole]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onOpen}
      className="bg-brand-surface p-4 rounded-[1.5rem] border border-brand-border-light shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-background rounded-xl border border-brand-border-light flex items-center justify-center overflow-hidden shrink-0">
          {otherUser?.logoUrl ? (
            <img src={otherUser.logoUrl} alt={otherUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            activeRole === 'supplier' ? <UserIcon size={24} className="text-brand-text-muted" /> : <Building2 size={24} className="text-brand-text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 truncate">
              <h4 className="font-bold text-brand-text-main group-hover:text-brand-primary transition-colors truncate">
                {otherUser?.companyName || otherUser?.name || '...'}
              </h4>
              {chat.status === 'closed' && chat.rating && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-brand-warning bg-brand-warning/10 px-1.5 py-0.5 rounded-md shrink-0">
                  <Star size={10} className="fill-brand-warning" />
                  {chat.rating.toFixed(1)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-brand-text-muted font-medium shrink-0 ml-2">
              {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
          <p className="text-xs text-brand-text-muted font-bold truncate mt-0.5">
            {request?.productName || '...'}
          </p>
          <p className="text-[11px] text-brand-text-muted italic truncate mt-1">
            {chat.lastMessage || (i18n.language === 'ar' ? 'بدء المحادثة' : 'Start conversation')}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatCard;
