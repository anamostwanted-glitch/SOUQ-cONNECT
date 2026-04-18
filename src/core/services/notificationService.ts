import { addDoc, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { UserProfile } from '../types';

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
  isRtl: boolean
) => {
  try {
    // 1. Find suppliers who match the category
    const suppliersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'supplier'),
      where('categories', 'array-contains', categoryId)
    );
    
    const snap = await getDocs(suppliersQuery);
    const suppliers = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

    // 2. Filter for verified suppliers or active ones
    const targets = suppliers.filter(s => !s.isDeleted && s.onboardingCompleted);

    // 3. Batch create notifications
    const promises = targets.map(supplier => createNotification({
      userId: supplier.uid,
      titleAr: 'طلب جديد يطابق خبرتك! 🎯',
      titleEn: 'New Request Matches Your Expertise! 🎯',
      bodyAr: `هناك طلب جديد على "${productName}". كن أول من يقدم عرضاً!`,
      bodyEn: `New request for "${productName}". Be the first to submit an offer!`,
      actionType: 'submit_offer',
      targetId: requestId,
      link: `/marketplace?tab=requests&requestId=${requestId}`,
      imageUrl: supplier.logoUrl
    }));

    await Promise.all(promises);

    // 4. Send Email Notifications (Optional/Async)
    targets.forEach(async (supplier) => {
      if (supplier.email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: supplier.email,
              name: supplier.name,
              template: 'new_request_match',
              language: isRtl ? 'ar' : 'en',
              data: { productName }
            })
          });
        } catch (e) {
          console.warn(`Failed to send email to supplier ${supplier.email}`);
        }
      }
    });

    return targets.length;
  } catch (error) {
    console.error("Matching notification failed", error);
    return 0;
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
