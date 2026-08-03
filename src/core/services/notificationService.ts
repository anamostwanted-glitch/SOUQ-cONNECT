import { addDoc, collection, doc, getDoc, getDocs, query, where, limit, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { UserProfile, Category } from '../types';

export const createNotification = async (notification: {
  userId: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  actionType?: string;
  targetId?: string;
  [key: string]: any; // Allow extra fields
}) => {
  try {
    const cleanData = Object.fromEntries(
      Object.entries({
        ...notification,
        createdAt: new Date().toISOString(),
        read: false,
      }).filter(([_, v]) => v !== undefined)
    );
    await addDoc(collection(db, 'notifications'), cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications', false);
  }
};

export const isSupplierMatchedToCategory = (supplierCategories: string[] = [], targetCategoryId: string, categoriesList: Category[] = []): boolean => {
  if (!supplierCategories || supplierCategories.length === 0) return false;
  const targetLower = targetCategoryId.toLowerCase();
  
  const targetCat = categoriesList.find(c => 
    c.id.toLowerCase() === targetLower || 
    c.nameEn?.toLowerCase() === targetLower || 
    c.nameAr?.toLowerCase() === targetLower
  );

  return supplierCategories.some(cat => {
    const catLower = cat.toLowerCase();
    if (catLower === targetLower) return true;
    if (targetCat) {
      if (catLower === targetCat.id.toLowerCase()) return true;
      if (targetCat.nameEn && catLower === targetCat.nameEn.toLowerCase()) return true;
      if (targetCat.nameAr && catLower === targetCat.nameAr.toLowerCase()) return true;
      if (targetCat.parentId && catLower === targetCat.parentId.toLowerCase()) return true;
    }
    const supCatObj = categoriesList.find(c => 
      c.id.toLowerCase() === catLower || 
      c.nameEn?.toLowerCase() === catLower || 
      c.nameAr?.toLowerCase() === catLower
    );
    if (supCatObj) {
      if (supCatObj.id.toLowerCase() === targetLower) return true;
      if (targetCat && supCatObj.parentId === targetCat.id) return true;
      if (targetCat && targetCat.parentId === supCatObj.id) return true;
    }
    return false;
  });
};

export const notifyMatchingSuppliers = async (
  requestId: string,
  categoryId: string,
  productName: string,
  isRtl: boolean,
  categories: Category[],
  requestLocation?: string,
  urgency: 'normal' | 'high' | 'critical' = 'normal'
) => {
  try {
    console.log('[CoreTeam] Initiating resilient and precise notification strategy for:', productName, 'categoryId:', categoryId);
    
    // Fetch all suppliers from users_public and users to ensure robust category, name, and hierarchy matching
    let allSuppliers: UserProfile[] = [];
    try {
      const pubSnap = await getDocs(query(collection(db, 'users_public'), limit(50)));
      allSuppliers = pubSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      
      if (allSuppliers.length === 0) {
        const uSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'supplier'), limit(50)));
        allSuppliers = uSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      }
    } catch (e) {
      console.warn('Error fetching suppliers in notifyMatchingSuppliers:', e);
    }

    // 1. Filter candidates using robust category matching
    let candidates = allSuppliers.filter(supplier => 
      !supplier.isDeleted && 
      supplier.onboardingCompleted !== false && 
      isSupplierMatchedToCategory(supplier.categories, categoryId, categories)
    );

    // 2. Hierarchy / Keyword Fallback if strict category count is low
    if (candidates.length === 0) {
      candidates = allSuppliers.filter(supplier => 
        !supplier.isDeleted && 
        supplier.onboardingCompleted !== false && 
        (supplier.keywords?.some(kw => productName.toLowerCase().includes(kw.toLowerCase())) ||
         supplier.bio?.toLowerCase().includes(productName.toLowerCase()))
      );
    }

    // 3. Strict keyword/bio fallback if strict category count is zero
    if (candidates.length === 0) {
      const queryWords = productName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      candidates = allSuppliers.filter(supplier => 
        !supplier.isDeleted && 
        supplier.onboardingCompleted !== false && 
        queryWords.some(qw => 
          supplier.keywords?.some(kw => kw.toLowerCase().includes(qw)) ||
          supplier.bio?.toLowerCase().includes(qw) ||
          supplier.companyName?.toLowerCase().includes(qw) ||
          supplier.businessName?.toLowerCase().includes(qw) ||
          supplier.displayName?.toLowerCase().includes(qw)
        )
      );
    }

    // 4. Final Fallback: Return all available suppliers if still zero so customer always sees matched options
    if (candidates.length === 0 && allSuppliers.length > 0) {
      candidates = allSuppliers.filter(s => !s.isDeleted);
    }

    if (candidates.length === 0) {
      console.log('[CoreTeam] No matching suppliers found for category or query keywords.');
      return [];
    }

    // 3. Geo-Awareness & Scoring
    const scoredSuppliers = candidates
      .map(supplier => {
        let score = isSupplierMatchedToCategory(supplier.categories, categoryId, categories) ? 90 : 75;
        let reasonAr = 'مطابقة دقيقة لفئة النشاط';
        let reasonEn = 'Exact category match';

        // Geo Match (+15)
        if (requestLocation && supplier.location && requestLocation.trim().toLowerCase() === supplier.location.trim().toLowerCase()) {
          score += 15;
          reasonAr = 'مورد محلي في نفس منطقتك';
          reasonEn = 'Local supplier in your area';
        }

        // Trust Score (+5 for verified)
        if (supplier.isVerified) score += 5;

        return { supplier, score, reasonAr, reasonEn };
      })
      .sort((a, b) => b.score - a.score);

    const finalists = scoredSuppliers.slice(0, 15);
    const scarcityCount = finalists.length;

    // 4. Atomic Dispatch
    const promises = finalists.map(({ supplier, score, reasonAr, reasonEn }) => {
      const prefs = supplier.notificationPreferences || { newRequests: true };
      if (prefs.newRequests === false) return Promise.resolve();

      const urgencyPrefixAr = urgency === 'critical' ? '🔴 عاجل جداً: ' : urgency === 'high' ? '🟠 عاجل: ' : '🎯 ';
      const urgencyPrefixEn = urgency === 'critical' ? '🔴 CRITICAL: ' : urgency === 'high' ? '🟠 URGENT: ' : '🎯 ';

      return createNotification({
        userId: supplier.uid,
        titleAr: `${urgencyPrefixAr}فرصة مطابقة بنسبة ${score}%`,
        titleEn: `${urgencyPrefixEn}${score}% Match Found`,
        bodyAr: `طلب جديد لـ "${productName}". نحن نرشحك لأنك ${reasonAr}. (هناك ${scarcityCount} موردين آخرين ينافسون)`,
        bodyEn: `New request for "${productName}". Recommended because: ${reasonEn}. (${scarcityCount} other suppliers notified)`,
        actionType: 'new_request',
        targetId: requestId,
        link: `/marketplace?tab=requests&requestId=${requestId}`,
        imageUrl: supplier.logoUrl,
        matchScore: score,
        matchReasonAr: reasonAr,
        matchReasonEn: reasonEn,
        isUrgent: urgency !== 'normal'
      });
    });

    await Promise.all(promises);

    // 5. Growth Hack: External Multi-channel
    finalists.slice(0, 5).forEach(async ({ supplier }) => {
      if (supplier.email) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: supplier.email,
            template: 'new_request_match',
            data: { productName, urgency, score: finalists.find(f => f.supplier.uid === supplier.uid)?.score }
          })
        }).catch(() => console.warn('Email resilient failover triggered'));
      }
    });

    return finalists.map(f => f.supplier.uid);
  } catch (error) {
    console.error('[CoreTeam] Notification Resilience Failure:', error);
    return [];
  }
};

export const notifyNewOffer = async (
  customerId: string,
  supplierName: string,
  productName: string,
  requestId: string,
  isRtl: boolean
) => {
  try {
    await createNotification({
      userId: customerId,
      titleAr: 'عرض سعر جديد 💰',
      titleEn: 'New Price Offer 💰',
      bodyAr: `قدم ${supplierName} عرضاً لطلبك: ${productName}`,
      bodyEn: `${supplierName} made an offer for your request: ${productName}`,
      actionType: 'view_offer',
      targetId: requestId,
      link: `/marketplace?tab=requests&requestId=${requestId}`
    });

    // Send Email to Customer
    const customerSnap = await getDoc(doc(db, 'users', customerId));
    if (customerSnap.exists()) {
      const customerData = customerSnap.data();
      if (customerData.email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: customerData.email,
            name: customerData.name,
            template: 'new_offer',
            language: isRtl ? 'ar' : 'en',
            data: { productName, supplierName }
          })
        });
      }
    }
  } catch (error) {
    console.error("Offer notification failed", error);
  }
};

export const notifySupplierApproval = async (
  supplierId: string,
  isApproved: boolean,
  isRtl: boolean
) => {
  try {
    await createNotification({
      userId: supplierId,
      titleAr: isApproved ? 'تهانينا! تم توثيق حسابك ✨' : 'تحديث بخصوص طلب التوثيق 📢',
      titleEn: isApproved ? 'Congratulations! Account Verified ✨' : 'Update on Verification Request 📢',
      bodyAr: isApproved 
        ? 'تم تفعيل درع التوثيق العصبي لحسابك. يمكنك الآن الوصول الكامل لطلبات السوق.' 
        : 'تمت مراجعة طلبك وللأسف لم يتم قبوله حالياً. يرجى مراجعة البيانات والمحاولة مرة أخرى.',
      bodyEn: isApproved
        ? 'Neural Verification Shield activated. You now have full access to marketplace requests.'
        : 'Your request has been reviewed and unfortunately not accepted at this time. Please review details and try again.',
      actionType: 'verification_update',
      link: '/dashboard'
    });

    // Send Email
    const supplierSnap = await getDoc(doc(db, 'users', supplierId));
    if (supplierSnap.exists()) {
      const supplierData = supplierSnap.data();
      if (supplierData.email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: supplierData.email,
            name: supplierData.name,
            template: isApproved ? 'supplier_approved' : 'supplier_rejected',
            language: isRtl ? 'ar' : 'en',
            data: {}
          })
        });
      }
    }
  } catch (error) {
    console.error("Approval notification failed", error);
  }
};

export const resolveNotificationLink = (notif: { link?: string; actionType?: string; targetId?: string }): string => {
  if (notif?.link && typeof notif.link === 'string' && notif.link.trim() !== '') {
    return notif.link;
  }
  const actionType = notif?.actionType || '';
  const targetId = notif?.targetId || '';

  if (actionType === 'chat_message' || actionType === 'accept_chat' || actionType === 'chat') {
    return targetId ? `/chat?id=${targetId}` : '/chat';
  }
  if (actionType === 'new_request' || actionType === 'submit_offer' || actionType === 'view_offer' || actionType === 'request_update') {
    return targetId ? `/marketplace?tab=requests&requestId=${targetId}` : '/marketplace?tab=requests';
  }
  if (actionType === 'new_item' || actionType === 'product' || actionType === 'product_match' || actionType === 'price_drop') {
    return targetId ? `/marketplace?itemId=${targetId}` : '/marketplace';
  }
  if (actionType === 'verification_update' || actionType === 'dashboard') {
    return '/dashboard';
  }
  if (actionType === 'growth_plan') {
    return '/dashboard?tab=growth';
  }

  if (targetId) {
    if (targetId.startsWith('req_') || targetId.startsWith('request_')) {
      return `/marketplace?tab=requests&requestId=${targetId}`;
    }
    if (targetId.startsWith('chat_') || targetId.startsWith('chat-')) {
      return `/chat?id=${targetId}`;
    }
    return `/marketplace?itemId=${targetId}`;
  }

  return '/dashboard';
};
