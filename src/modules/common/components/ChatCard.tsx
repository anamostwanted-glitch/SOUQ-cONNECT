import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { Chat, UserProfile, ProductRequest } from '../../../core/types';
import { motion } from 'motion/react';
import { User as UserIcon, Building2, Star } from 'lucide-react';

interface ChatCardProps {
  chat: Chat;
  onOpen: () => void;
  activeRole: string;
  otherUser?: UserProfile | null;
  request?: ProductRequest | null;
}

const ChatCard: React.FC<ChatCardProps> = ({ chat, onOpen, activeRole, otherUser: initialOtherUser, request: initialRequest }) => {
  const { i18n } = useTranslation();
  const [otherUser, setOtherUser] = useState<UserProfile | null>(initialOtherUser || null);
  const [request, setRequest] = useState<ProductRequest | null>(initialRequest || null);

  useEffect(() => {
    if (initialOtherUser) setOtherUser(initialOtherUser);
  }, [initialOtherUser]);

  useEffect(() => {
    if (initialRequest) setRequest(initialRequest);
  }, [initialRequest]);

  useEffect(() => {
    const otherUserId = activeRole === 'supplier' ? chat.customerId : chat.supplierId;
    if (!otherUser && otherUserId && otherUserId !== 'system' && otherUserId !== 'everyone') {
      // Try users_public first
      getDoc(doc(db, 'users_public', otherUserId)).then(snap => {
        if (snap.exists()) {
          setOtherUser({ id: snap.id, ...snap.data() } as any as UserProfile);
        } else {
          // Fallback to users
          getDoc(doc(db, 'users', otherUserId)).then(snap => {
            if (snap.exists()) setOtherUser(snap.data() as UserProfile);
          }).catch(error => handleFirestoreError(error, OperationType.GET, `users/${otherUserId}`, false));
        }
      }).catch(error => {
        // If users_public fails, try users
        getDoc(doc(db, 'users', otherUserId)).then(snap => {
          if (snap.exists()) setOtherUser(snap.data() as UserProfile);
        }).catch(err => handleFirestoreError(err, OperationType.GET, `users/${otherUserId}`, false));
      });
    }
    if (!request && chat.requestId && !chat.requestId.startsWith('category_')) {
      getDoc(doc(db, 'requests', chat.requestId)).then(snap => {
        if (snap.exists()) setRequest({ id: snap.id, ...snap.data() } as ProductRequest);
      }).catch(error => handleFirestoreError(error, OperationType.GET, `requests/${chat.requestId}`, false));
    }
  }, [chat, activeRole, otherUser, request]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onOpen}
      className="bg-brand-surface p-3 md:p-4 rounded-2xl md:rounded-[1.5rem] border border-brand-border-light shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-background rounded-xl border border-brand-border-light flex items-center justify-center overflow-hidden shrink-0 relative z-10">
          {otherUser?.logoUrl ? (
            <img src={otherUser.logoUrl} alt={otherUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            activeRole === 'supplier' ? <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-brand-text-muted" /> : <Building2 className="w-5 h-5 md:w-6 md:h-6 text-brand-text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1.5 truncate">
              <h4 className="font-black text-brand-text-main group-hover:text-brand-primary transition-colors truncate text-sm md:text-base">
                {otherUser?.companyName || otherUser?.name || '...'}
              </h4>
              {chat.status === 'closed' && chat.rating && (
                <span className="flex items-center gap-0.5 text-[9px] md:text-[10px] font-bold text-brand-warning bg-brand-warning/10 px-1.5 py-0.5 rounded-md shrink-0">
                  <Star className="w-2 h-2 md:w-2.5 md:h-2.5 fill-brand-warning" />
                  {chat.rating.toFixed(1)}
                </span>
              )}
            </div>
            <span className="text-[9px] md:text-[10px] text-brand-text-muted font-bold shrink-0 ml-1.5 md:ml-2">
              {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
          <p className="text-[11px] md:text-xs text-brand-primary font-black truncate mt-0.5">
            {request?.productName || '...'}
          </p>
          <p className="text-[10px] md:text-[11px] text-brand-text-muted italic truncate mt-0.5 opacity-80">
            {chat.lastMessage || (i18n.language === 'ar' ? 'بدء المحادثة' : 'Start conversation')}
          </p>
        </div>
      </div>
      {/* Subtle AI Glow */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-brand-primary/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-brand-primary/10 transition-colors" />
    </motion.div>
  );
};

export default ChatCard;
