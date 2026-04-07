import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, MapPin, Mail, Phone, Globe, Info, User as UserIcon, Tag, Star } from 'lucide-react';
import { UserProfile, Category } from '../../core/types';
import { db } from '../../core/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../core/utils/errorHandling';
import { translateText } from '../../core/services/geminiService';
import { Sparkles } from 'lucide-react';

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const isRtl = i18n.language === 'ar';
  const [isTranslatingBio, setIsTranslatingBio] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);

  const handleTranslateBio = async () => {
    if (translatedBio) {
      setTranslatedBio(null);
      return;
    }
    if (!user?.bio) return;

    setIsTranslatingBio(true);
    try {
      const targetLang = i18n.language === 'ar' ? 'Arabic' : 'English';
      const translation = await translateText(user.bio, targetLang);
      setTranslatedBio(translation);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslatingBio(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const snap = await getDocs(collection(db, 'categories'));
          setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'categories', false);
        }
      };
      fetchCategories();
    }
  }, [isOpen]);

  if (!user) return null;

  const isSupplier = user.role === 'supplier';
  const userCategories = categories.filter(c => user.categories?.includes(c.id));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Mobile Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-1 md:hidden absolute top-0 z-20">
              <div className="w-12 h-1.5 bg-white/50 rounded-full"></div>
            </div>

            {/* Header / Cover */}
            <div className="h-32 shrink-0 bg-gradient-to-r from-brand-primary to-brand-primary-hover relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors z-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="px-6 md:px-8 pb-8 pb-safe overflow-y-auto -mt-12 relative flex-1">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-brand-surface rounded-3xl shadow-xl p-1 mb-4">
                  <div className="w-full h-full bg-brand-background rounded-[1.25rem] border border-brand-border-light flex items-center justify-center overflow-hidden">
                    {user.logoUrl ? (
                      <img 
                        src={user.logoUrl} 
                        alt={user.companyName || user.name} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        {isSupplier ? <Building2 size={40} /> : <UserIcon size={40} />}
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-brand-text-main mb-1">
                  {user.companyName || user.name}
                </h3>
                <p className="text-sm text-brand-text-muted font-medium mb-2">
                  {user.name} • {isSupplier ? t('supplier') : t('customer')}
                </p>
                
                {user.rating && user.reviewCount ? (
                  <div className="flex items-center gap-1.5 mb-6 bg-brand-warning/10 text-brand-warning px-3 py-1 rounded-full text-sm font-bold">
                    <Star size={16} className="fill-brand-warning" />
                    {user.rating.toFixed(1)} <span className="text-brand-warning/70 text-xs font-medium">({user.reviewCount} {i18n.language === 'ar' ? 'تقييم' : 'reviews'})</span>
                  </div>
                ) : (
                  <div className="mb-6"></div>
                )}

                <div className="w-full space-y-4 text-left">
                  {user.location && (
                    <div className="bg-brand-background p-4 rounded-2xl border border-brand-border-light flex items-start gap-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-brand-primary">
                        <MapPin size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                          {i18n.language === 'ar' ? 'العنوان / الموقع' : 'Address / Location'}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-brand-text-main font-medium">{user.location}</p>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(user.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-primary hover:text-brand-primary-hover p-2 bg-brand-primary/10 rounded-lg transition-colors"
                            title={i18n.language === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                          >
                            <Globe size={16} />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-brand-background p-4 rounded-2xl border border-brand-border-light flex items-start gap-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-brand-primary">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                        {i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                      </p>
                      <a href={`mailto:${user.email}`} className="text-brand-primary font-bold hover:underline">
                        {user.email}
                      </a>
                    </div>
                  </div>

                  {user.phone && (
                    <div className="bg-brand-background p-4 rounded-2xl border border-brand-border-light flex items-start gap-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-brand-primary">
                        <Phone size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                          {i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                        </p>
                        <a href={`tel:${user.phone}`} className="text-brand-primary font-bold hover:underline">
                          {user.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {isSupplier && user.website && (
                    <div className="bg-brand-background p-4 rounded-2xl border border-brand-border-light flex items-start gap-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-brand-primary">
                        <Globe size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                          {i18n.language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}
                        </p>
                        <a 
                          href={user.website.startsWith('http') ? user.website : `https://${user.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-brand-primary font-bold hover:underline"
                        >
                          {user.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {isSupplier && user.bio && (
                    <div className="bg-brand-background p-4 rounded-2xl border border-brand-border-light flex items-start gap-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-brand-primary">
                        <Info size={20} />
                      </div>
                      <div className="flex-1 relative">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                            {i18n.language === 'ar' ? 'نبذة عن الشركة' : 'Company Bio'}
                          </p>
                          <button
                            onClick={handleTranslateBio}
                            disabled={isTranslatingBio}
                            className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all disabled:opacity-50"
                            title={translatedBio ? (isRtl ? 'عرض النص الأصلي' : 'Show Original') : (isRtl ? 'ترجمة' : 'Translate')}
                          >
                            <Sparkles size={14} className={isTranslatingBio ? 'animate-pulse' : ''} />
                          </button>
                        </div>
                        <p className="text-sm text-brand-text-main leading-relaxed whitespace-pre-wrap">
                          {translatedBio || user.bio}
                        </p>
                      </div>
                    </div>
                  )}

                  {isSupplier && userCategories.length > 0 && (
                    <div className="bg-brand-background p-4 rounded-2xl border border-brand-border-light">
                      <div className="flex items-center gap-2 mb-3 text-brand-text-muted">
                        <Tag size={16} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">
                          {t('categories')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {userCategories.map(cat => (
                          <span 
                            key={cat.id}
                            className="px-2 py-1 bg-white text-brand-primary rounded-lg text-[10px] font-bold border border-brand-border-light shadow-sm"
                          >
                            {isRtl ? cat.nameAr : cat.nameEn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSupplier && user.keywords && user.keywords.length > 0 && (
                    <div className="bg-brand-background p-4 rounded-2xl border border-brand-border-light">
                      <div className="flex items-center gap-2 mb-3 text-brand-success">
                        <Tag size={16} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">
                          {i18n.language === 'ar' ? 'الكلمات المفتاحية' : 'Keywords'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.keywords.map((kw) => (
                          <span 
                            key={kw}
                            className="px-2 py-1 bg-white text-brand-success rounded-lg text-[10px] font-bold border border-brand-border-light shadow-sm"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={onClose}
                  className="mt-8 w-full py-4 bg-brand-text-main text-white rounded-2xl font-bold hover:bg-brand-text-main transition-all shadow-lg shadow-brand-border"
                >
                  {i18n.language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UserProfileModal;
