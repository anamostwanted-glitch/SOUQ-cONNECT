import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, MapPin, ChevronRight, ChevronDown, MessageSquare, 
  Star, Building2, Sparkles, Package, Trash2, ArrowRight
} from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { db, auth } from '../../../core/firebase';
import { ProductRequest, UserProfile } from '../../../core/types';
import { getUserImageUrl } from '../../../core/utils/imageUtils';
import { HapticButton } from '../../../shared/components/HapticButton';
import { OptimizedImage } from '../../../shared/components/OptimizedImage';

interface UserRequestCardProps {
  request: ProductRequest;
  profile: UserProfile;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  onDelete?: (requestId: string, imageUrl?: string) => void;
  variant?: 'home' | 'dashboard';
}

export const UserRequestCard: React.FC<UserRequestCardProps> = ({
  request,
  profile,
  onOpenChat,
  onViewProfile,
  onDelete,
  variant = 'dashboard'
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const isHome = variant === 'home';
  const [isExpanded, setIsExpanded] = useState(false);
  const [suppliers, setSuppliers] = useState<UserProfile[]>([]);
  const [isSuggestingMore, setIsSuggestingMore] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const getAIMatchDetails = (supp: UserProfile, req: ProductRequest) => {
    let matchScore = 85;
    let shortReasonAr = 'متخصص في هذا المجال';
    let shortReasonEn = 'Specialized in this field';
    let longReasonAr = 'مورد متخصص في هذا المجال بأسعار تنافسية.';
    let longReasonEn = 'A specialized supplier in this field with competitive pricing.';

    if (req.suggestedSupplierIds?.includes(supp.uid)) {
      matchScore = 98;
      shortReasonAr = 'تطابق عالي';
      shortReasonEn = 'High match';
      longReasonAr = 'هذا المورد يتطابق بشكل كبير مع متطلبات طلبك بناءً على تحليل الذكاء الاصطناعي.';
      longReasonEn = 'This supplier highly matches your request requirements based on AI analysis.';
    } else if (supp.location && req.location && supp.location === req.location) {
      matchScore = 95;
      shortReasonAr = 'الأقرب لموقعك';
      shortReasonEn = 'Closest to you';
      longReasonAr = 'هذا المورد هو الأقرب لموقعك الجغرافي ولديه تقييمات ممتازة في نفس فئة طلبك.';
      longReasonEn = 'This supplier is closest to your location and has excellent ratings in your request category.';
    } else if (supp.rating && supp.rating >= 4.5) {
      matchScore = 92;
      shortReasonAr = 'الأفضل تقييماً';
      shortReasonEn = 'Highest rated';
      longReasonAr = 'يمتلك هذا المورد خبرة واسعة وتقييمات عالية جداً من عملاء سابقين.';
      longReasonEn = 'This supplier has extensive experience and very high ratings from previous customers.';
    }

    return { matchScore, shortReasonAr, shortReasonEn, longReasonAr, longReasonEn };
  };

  // Fetch suppliers only if needed
  useEffect(() => {
    if (!isHome && suppliers.length === 0) {
      fetchSuppliers().catch(err => handleFirestoreError(err, OperationType.LIST, 'users (suppliers)', false));
    }
  }, [isHome]);

  const fetchSuppliers = async () => {
    try {
      // In a real app, this would query suppliers based on category or location
      // For now, we'll just fetch a few suppliers to show the UI
      const q = query(collection(db, 'users'), where('role', '==', 'supplier'));
      const snap = await getDocs(q);
      const fetchedSuppliers: UserProfile[] = [];
      snap.forEach(doc => {
        fetchedSuppliers.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      
      // Filter based on request's suggested suppliers or category match
      const relevantSuppliers = fetchedSuppliers.filter(s => 
        request.suggestedSupplierIds?.includes(s.uid) || 
        request.pinnedSupplierIds?.includes(s.uid) ||
        (s.categories && s.categories.includes(request.categoryId))
      );
      
      // Ensure uniqueness by UID
      const uniqueSuppliers = Array.from(new Map(relevantSuppliers.map(s => [s.uid, s])).values()).slice(0, 4);
      
      setSuppliers(uniqueSuppliers);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users (suppliers)', false);
    }
  };

  const handleStartChat = async (supplierId: string) => {
    setChatLoading(true);
    try {
      const q = query(
        collection(db, 'chats'), 
        where('customerId', '==', profile.uid)
      );
      
      const snap = await getDocs(q);
      const existingChat = snap.docs.find(doc => {
        const data = doc.data();
        return data.requestId === request.id && data.supplierId === supplierId;
      });
      
      if (existingChat) {
        onOpenChat(existingChat.id);
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          requestId: request.id,
          supplierId,
          customerId: profile.uid,
          lastMessage: '',
          updatedAt: new Date().toISOString()
        });
        onOpenChat(newChat.id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chats', false);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePinSupplier = async (supplierId: string) => {
    try {
      const requestRef = doc(db, 'requests', request.id);
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        const currentPinned = requestSnap.data().pinnedSupplierIds || [];
        const newPinned = currentPinned.includes(supplierId)
          ? currentPinned.filter((id: string) => id !== supplierId)
          : [...currentPinned, supplierId];
        
        await updateDoc(requestRef, { pinnedSupplierIds: newPinned });
        
        // Update local state for immediate feedback
        request.pinnedSupplierIds = newPinned;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${request.id}`, false);
    }
  };

  const handleSuggestMoreSuppliers = async () => {
    setIsSuggestingMore(true);
    try {
      // Call AI service to suggest more suppliers
      // This is a mock implementation based on the legacy dashboard
      await new Promise(resolve => setTimeout(resolve, 1500));
      fetchSuppliers().catch(err => {
        handleFirestoreError(err, OperationType.LIST, 'users (suppliers)', false);
      }); // Refresh the list
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ai/suggestions', false);
    } finally {
      setIsSuggestingMore(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-lg rounded-[2.5rem] p-5 md:p-6 relative overflow-hidden flex flex-col gap-4 group hover:shadow-xl transition-all duration-300 ${isHome ? 'border-brand-primary/20 bg-gradient-to-br from-white/90 to-brand-primary/5' : ''}`}
    >
      {/* Status Bar - High Fidelity */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
          request.status === 'open' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        }`}>
          {request.status === 'open' && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
          )}
          {request.status === 'open' ? (isRtl ? 'نشط' : 'Active Mission') : (isRtl ? 'مكتمل' : 'Completed')}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-brand-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(request.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
          </span>
          {onDelete && (profile?.uid === request.customerId || profile?.role === 'admin') && (
            <HapticButton
              onClick={(e) => {
                e.stopPropagation();
                onDelete(request.id, request.imageUrl);
              }}
              className="p-1.5 text-brand-text-muted hover:text-brand-error transition-colors"
            >
              <Trash2 size={14} />
            </HapticButton>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-4">
        {request.imageUrl && (
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-brand-border shrink-0 shadow-sm">
            <OptimizedImage src={request.imageUrl} alt={request.productName} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-xl md:text-2xl font-black text-brand-text-main truncate leading-tight">
            {request.productName}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 bg-brand-surface/50 px-2 py-0.5 rounded-lg border border-brand-border/30">
              <Package className="w-3 h-3 text-brand-primary" />
              <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                {isRtl ? request.categoryNameAr || request.categoryId : request.categoryNameEn || request.categoryId}
              </span>
            </div>
            {request.quantity && (
              <span className="text-[10px] font-bold text-brand-text-muted bg-brand-primary/5 px-2 py-0.5 rounded-lg">
                {request.quantity}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Context-Aware Section (Supplier Chips vs Quick Stats) */}
      {!isHome && suppliers.length > 0 && auth.currentUser && (
        <div className="bg-gradient-to-br from-brand-primary/5 via-transparent to-transparent rounded-2xl p-4 border border-brand-primary/10">
          <div className="flex items-center justify-between mb-3 text-brand-primary">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isRtl ? 'موردون مقترحون لك' : 'Suggested for you'}
              </span>
            </div>
          </div>
          <div className="flex overflow-x-auto no-scrollbar gap-3 pb-1 -mx-2 px-2 snap-x">
            {suppliers.map((supp, sIdx) => {
              const { matchScore, shortReasonAr, shortReasonEn } = getAIMatchDetails(supp, request);
              return (
                <div 
                  key={`req-chip-${request.id}-supp-${supp.uid}-${sIdx}`}
                  onClick={() => onViewProfile(supp.uid)}
                  className="snap-start flex-shrink-0 flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/40 rounded-2xl p-2 pr-4 cursor-pointer hover:bg-white hover:shadow-md transition-all min-w-[180px]"
                >
                  <div className="relative w-10 h-10 rounded-xl bg-brand-surface overflow-hidden flex-shrink-0 border border-brand-border">
                    <OptimizedImage src={getUserImageUrl(supp)} alt={supp.name} className="w-full h-full object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[8px] font-black px-1 py-0.5 rounded-tl-md">
                      {matchScore}%
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-brand-text-main truncate">{supp.name}</span>
                    <span className="text-[9px] text-brand-text-muted font-bold truncate">{isRtl ? shortReasonAr : shortReasonEn}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation & Action Footer */}
      <div className="flex items-center justify-between gap-3 mt-1">
        <HapticButton 
          onClick={() => isHome ? setIsExpanded(!isExpanded) : setIsExpanded(!isExpanded)}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            isHome ? 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border border-brand-primary/20' : 'bg-transparent text-brand-text-main border-2 border-brand-border hover:bg-brand-surface'
          }`}
        >
          {isExpanded ? (isRtl ? 'أقل' : 'Less') : (isRtl ? 'التفاصيل' : 'Details')}
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className={isRtl ? 'rotate-180' : ''} />}
        </HapticButton>

        {isHome && (
          <HapticButton 
            onClick={() => onOpenChat(request.id)} // Assuming this opens the request management view or similar
            className="px-6 py-3.5 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-primary/20 flex items-center gap-2"
          >
            {isRtl ? 'إدارة المهمة' : 'Manage Mission'}
            <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
          </HapticButton>
        )}

        {!isHome && request.offersCount ? (
          <HapticButton className="px-5 py-3.5 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg">
            <MessageSquare size={14} />
            <span>{request.offersCount} {isRtl ? 'عروض' : 'Offers'}</span>
          </HapticButton>
        ) : null}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-2 border-t border-brand-border/30 space-y-4">
              {request.description && (
                <div>
                  <h5 className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-2">
                    {isRtl ? 'الوصف' : 'Description'}
                  </h5>
                  <p className="text-sm text-brand-text-main leading-relaxed">
                    {request.description}
                  </p>
                </div>
              )}
              
              {request.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-brand-border bg-brand-surface">
                  <OptimizedImage src={request.imageUrl} alt={request.productName} className="w-full h-48 object-cover" />
                </div>
              )}

              {/* AI Match Details Section */}
              {suppliers.length > 0 && auth.currentUser && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-brand-primary rounded-full" />
                    <h5 className="text-xs font-black text-brand-text-main uppercase tracking-widest">
                      {isRtl ? 'تحليل التطابق الذكي' : 'Smart Match Analysis'}
                    </h5>
                  </div>
                  
                  <div className="space-y-3">
                    {suppliers.map((supp, sIdx) => {
                      const { matchScore, longReasonAr, longReasonEn } = getAIMatchDetails(supp, request);

                      return (
                        <div key={`req-analysis-${request.id}-supp-${supp.uid}-${sIdx}`} className="bg-brand-surface/50 border border-brand-border rounded-2xl p-4 hover:border-brand-primary/30 transition-colors">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden border border-brand-border shrink-0">
                                <OptimizedImage 
                                  src={getUserImageUrl(supp)} 
                                  alt={supp.name} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div className="min-w-0">
                                <h6 className="text-sm font-bold text-brand-text-main truncate">{supp.name}</h6>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    {matchScore}% {isRtl ? 'تطابق' : 'Match'}
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                                    <Star size={10} className="fill-current" />
                                    <span>{supp.rating || '4.8'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleStartChat(supp.uid)}
                                disabled={chatLoading}
                                className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-colors"
                                title={isRtl ? 'مراسلة' : 'Chat'}
                              >
                                <MessageSquare size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-xs text-brand-text-muted leading-relaxed flex items-start gap-2">
                            <Sparkles size={14} className="text-brand-primary shrink-0 mt-0.5" />
                            <p>{isRtl ? longReasonAr : longReasonEn}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSuggestMoreSuppliers}
                  disabled={isSuggestingMore}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary/10 text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary/20 transition-all duration-300 disabled:opacity-50 border border-brand-primary/20 hover:border-brand-primary/40 shadow-sm"
                >
                  {isSuggestingMore ? (
                    <div className="w-3.5 h-3.5 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={14} className="animate-pulse" />
                  )}
                  {isRtl ? 'بحث ذكي عن موردين إضافيين' : 'Smart Scan for More Suppliers'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
