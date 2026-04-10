import React, { useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../core/firebase';
import { UserProfile } from '../../../core/types';
import { toast } from 'sonner';
import { HapticButton } from '../../../shared/components/HapticButton';

import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface BroadcastBoxProps {
  i18n: any;
  allUsers: UserProfile[];
  size?: 'default' | 'compact';
}

export const BroadcastBox: React.FC<BroadcastBoxProps> = ({ 
  i18n, 
  allUsers, 
  size = 'default' 
}) => {
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSend = async () => {
    if (!message.trim() || !title.trim()) return;
    setIsSending(true);
    try {
      let fileUrl = '';
      if (file) {
        const storageRef = ref(storage, `broadcasts/${Date.now()}_${file.name}`);
        const uploadTask = await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(uploadTask.ref);
      }

      const batch = writeBatch(db);
      allUsers.forEach(user => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: user.uid,
          titleAr: title,
          titleEn: title,
          bodyAr: message,
          bodyEn: message,
          link: fileUrl || '',
          actionType: 'general',
          read: false,
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
      setMessage('');
      setTitle('');
      setFile(null);
      toast.success(i18n.language === 'ar' ? 'تم إرسال الإشعار بنجاح' : 'Notification sent successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'broadcast_notification', false);
      toast.error(i18n.language === 'ar' ? 'حدث خطأ أثناء الإرسال' : 'Error sending notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 ${size === 'compact' ? 'p-4' : 'p-6'} rounded-[2rem] border border-brand-border shadow-sm`}>
      <h3 className={`${size === 'compact' ? 'text-md' : 'text-lg'} font-black text-brand-text-main mb-4`}>
        {i18n.language === 'ar' ? 'إرسال إشعار جماعي' : 'Broadcast Notification'}
      </h3>
      <input 
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={i18n.language === 'ar' ? 'العنوان' : 'Title'}
        className={`w-full px-4 ${size === 'compact' ? 'py-2' : 'py-2.5'} bg-brand-surface border border-brand-border rounded-xl mb-3 text-sm`}
      />
      <textarea 
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={i18n.language === 'ar' ? 'الرسالة' : 'Message'}
        className={`w-full px-4 ${size === 'compact' ? 'py-2' : 'py-2.5'} bg-brand-surface border border-brand-border rounded-xl mb-3 text-sm`}
        rows={size === 'compact' ? 2 : 3}
      />
      <div className="mb-3">
        <input 
          type="file"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="w-full text-xs text-brand-text-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"
        />
      </div>
      <HapticButton
        onClick={handleSend}
        disabled={isSending}
        className={`w-full bg-brand-primary text-white ${size === 'compact' ? 'py-2' : 'py-2.5'} rounded-xl font-bold text-sm hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50`}
      >
        {isSending ? (i18n.language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (i18n.language === 'ar' ? 'إرسال' : 'Send')}
      </HapticButton>
    </div>
  );
};
