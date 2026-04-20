import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MarketplaceItem, ProductRequest, Notification } from '../types';

/**
 * Reconciliation Service (Core Team - Solution Architect & Full-Stack)
 * Automatically matches new supply with unmet user demand.
 */
export class ReconciliationService {
  /**
   * Called whenever a new item is added to the marketplace.
   * Scans for open requests that match the new supply.
   */
  static async reconcileSupplyWithDemand(itemId: string): Promise<number> {
    try {
      const itemSnap = await getDoc(doc(db, 'marketplace', itemId));
      if (!itemSnap.exists()) return 0;
      
      const item = { id: itemSnap.id, ...itemSnap.data() } as MarketplaceItem;
      if (item.status !== 'active') return 0;

      // 1. Fetch pending requests in the same category
      // Optimization: We could use more categories if the item belongs to multiple
      const categoryId = item.categories?.[0];
      if (!categoryId) return 0;

      const requestsQ = query(
        collection(db, 'requests'),
        where('categoryId', '==', categoryId),
        where('status', '==', 'open')
      );

      const requestsSnap = await getDocs(requestsQ);
      let matchCount = 0;

      for (const reqDoc of requestsSnap.docs) {
        const request = { id: reqDoc.id, ...reqDoc.data() } as ProductRequest;
        
        // Skip if it's the seller's own request
        if (request.customerId === item.sellerId) continue;

        // 2. Fuzzy match title/productName (Simple version)
        const itemTitle = (item.titleEn || item.title || '').toLowerCase();
        const requestTitle = (request.productName || '').toLowerCase();
        
        const isMatch = itemTitle.includes(requestTitle) || requestTitle.includes(itemTitle);

        if (isMatch) {
          await this.notifyMatch(request, item);
          matchCount++;
        }
      }

      return matchCount;
    } catch (error) {
      console.error('[ReconciliationService] Matching Error:', error);
      return 0;
    }
  }

  /**
   * Sends a targeted notification to the customer.
   */
  private static async notifyMatch(request: ProductRequest, item: MarketplaceItem) {
    const notification: Partial<Notification> = {
      userId: request.customerId,
      titleAr: 'جاسوس السوق: تم توفير طلبك! 🕵️‍♂️',
      titleEn: 'Market Sentinel: Your request is now available! 🕵️‍♂️',
      bodyAr: `بشرى سارة! تم إضافة "${item.titleAr || item.title}" بواسطة ${item.sellerName}، وهو يطابق طلبك السابق: "${request.productName}".`,
      bodyEn: `Good news! "${item.titleEn || item.title}" has been added by ${item.sellerName}, matching your previous request: "${request.productName}".`,
      actionType: 'general',
      targetId: item.id,
      link: `?view=product&id=${item.id}`,
      read: false,
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, 'notifications'), {
      ...notification,
      serverCreatedAt: serverTimestamp()
    });
  }
}
