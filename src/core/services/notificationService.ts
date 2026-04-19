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
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      createdAt: new Date().toISOString(),
      read: false,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications', false);
  }
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
    console.log('[CoreTeam] Initiating resilient notification strategy for:', productName);
    
    // 1. Fetch Candidates (Primary Category)
    const suppliersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'supplier'),
      where('categories', 'array-contains', categoryId)
    );
    const snap = await getDocs(suppliersQuery);
    let candidates: UserProfile[] = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

    // 2. Hierarchy Fallback (Solution Architect Recommendation)
    if (candidates.length === 0) {
      const currentCat = categories.find(c => c.id === categoryId);
      if (currentCat?.parentId) {
        const parentQuery = query(
          collection(db, 'users'),
          where('role', '==', 'supplier'),
          where('categories', 'array-contains', currentCat.parentId)
        );
        const parentSnap = await getDocs(parentQuery);
        candidates = parentSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      }
    }

    // 3. Geo-Awareness & Scoring (UX & Growth Hacker Recommendation)
    const scoredSuppliers = candidates
      .filter(s => !s.isDeleted && s.onboardingCompleted)
      .map(supplier => {
        let score = 80; // Base score for category match
        let reasonAr = 'مطابقة دقيقة للفئة';
        let reasonEn = 'Direct category match';

        // Geo Match (+15)
        if (requestLocation && supplier.location === requestLocation) {
          score += 15;
          reasonAr = 'مورد محلي في منطقتك';
          reasonEn = 'Local supplier in your area';
        }

        // Trust Score (+5 for verified)
        if (supplier.isVerified) score += 5;

        return { supplier, score, reasonAr, reasonEn };
      })
      .sort((a, b) => b.score - a.score);

    const finalists = scoredSuppliers.slice(0, 15); // Limit noise (UX Researcher recommendation)
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
