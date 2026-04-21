import { collection, query, where, getDocs, orderBy, limit, startAfter, doc, updateDoc, arrayUnion, addDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { MarketplaceItem, Category, MarketTrend, UserProfile } from '../../../core/types';
import { callAiJson, handleAiError } from '../../../core/services/geminiService';
import { Type } from "@google/genai";

export const fetchMarketplaceItems = async (
  activeTab: 'discover' | 'services' | 'myshop' | 'requests', 
  userId?: string, 
  categoryId?: string,
  lastDoc?: any, // For pagination
  pageSize: number = 10
): Promise<{ items: MarketplaceItem[], lastDoc: any }> => {
  const marketplaceRef = collection(db, 'marketplace');
  let q;
  
  const constraints: any[] = [
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const now = new Date().toISOString();
  
  if (activeTab === 'myshop' && userId) {
    q = query(
      marketplaceRef,
      where('sellerId', '==', userId),
      where('status', 'in', ['active', 'sold', 'expired', 'hidden']),
      ...constraints
    );
  } else if (categoryId) {
    q = query(
      marketplaceRef,
      where('status', '==', 'active'),
      where('categoryId', '==', categoryId),
      // where('expiryDate', '>', now),
      ...constraints
    );
  } else {
    q = query(
      marketplaceRef,
      where('status', '==', 'active'),
      // where('expiryDate', '>', now),
      ...constraints
    );
  }
  
  const snap = await getDocs(q);
  const items = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as MarketplaceItem));
  return { items, lastDoc: snap.docs[snap.docs.length - 1] || null };
};

export const fetchCategories = async (): Promise<Category[]> => {
  const snap = await getDocs(collection(db, 'categories'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Category));
};

export const fetchMarketTrends = async (): Promise<MarketTrend[]> => {
  const q = query(collection(db, 'market_trends'), orderBy('createdAt', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as MarketTrend));
};

export const fetchSuppliers = async (): Promise<UserProfile[]> => {
  const q = query(
    collection(db, 'users_public'), 
    where('role', '==', 'supplier'),
    where('status', '!=', 'deleted')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ uid: doc.id, ...(doc.data() as object) } as UserProfile));
};

export const recordCategoryDemand = async (queryTerm: string, categoryIds: string[]) => {
  if (!queryTerm || categoryIds.length === 0) return;
  
  try {
    const term = queryTerm.toLowerCase().trim();
    const batch = categoryIds.map(async (id) => {
      const catRef = doc(db, 'categories', id);
      try {
        await updateDoc(catRef, {
          suggestedKeywords: arrayUnion(term),
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        // Doc might not exist or ID is internal slug
      }
    });
    
    await Promise.all(batch);
  } catch (error) {
    // Silent fail for background analytics
  }
};

export const searchMarketplaceAndSuppliers = async (searchTerm: string): Promise<{ products: MarketplaceItem[], suppliers: UserProfile[] }> => {
  if (!searchTerm) return { products: [], suppliers: [] };
  
  const term = searchTerm.toLowerCase();
  
  // Note: Firestore doesn't support full-text search natively without third-party services.
  // We'll do a simple fetch and filter for this implementation.
  
  const [itemsSnap, suppliersSnap] = await Promise.all([
    getDocs(query(collection(db, 'marketplace'), where('status', '==', 'active'), limit(50))),
    getDocs(query(collection(db, 'users_public'), where('role', '==', 'supplier'), limit(50)))
  ]);
  
  const products = itemsSnap.docs
    .map(doc => ({ id: doc.id, ...(doc.data() as object) } as MarketplaceItem))
    .filter(item => 
      item.title?.toLowerCase().includes(term) || 
      item.description?.toLowerCase().includes(term) ||
      item.titleAr?.toLowerCase().includes(term) ||
      item.titleEn?.toLowerCase().includes(term)
    );
    
  const suppliers = suppliersSnap.docs
    .map(doc => ({ uid: doc.id, ...(doc.data() as object) } as UserProfile))
    .filter(user => 
      user.name?.toLowerCase().includes(term) || 
      user.companyName?.toLowerCase().includes(term) ||
      user.bio?.toLowerCase().includes(term) ||
      user.keywords?.some(k => k.toLowerCase().includes(term)) ||
      user.categories?.some(c => c.toLowerCase().includes(term))
    );
    
  return { products, suppliers };
};

export const trackInteraction = async (userId: string, targetId: string, type: 'view' | 'click' | 'search', metadata?: any) => {
  if (!userId) return;
  try {
    const pulseRef = collection(db, 'neural_pulse');
    await addDoc(pulseRef, {
      userId,
      targetId,
      type,
      metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pulse tracking failed:', error);
  }
};

export const fetchPredictiveMatches = async (interests: string[], recentItems: string[], suppliers?: UserProfile[]): Promise<{ supplierId: string, reason: string, score: number }[]> => {
  try {
    // If suppliers aren't provided, fetch a sample
    const candidates = suppliers || await fetchSuppliers();
    
    // Create a compact representation of suppliers for the AI
    const supplierContext = candidates.slice(0, 20).map(s => ({
      uid: s.uid,
      company: s.companyName || s.name,
      categories: s.categories || [],
      keywords: s.keywords || []
    }));

    const result = await callAiJson(
      `Analyze user interests: ${JSON.stringify(interests)} and recent items: ${JSON.stringify(recentItems)}. 
       These interests represent the "Neural Demand" of the user.
       Match them against these available suppliers: ${JSON.stringify(supplierContext)}.
       Suggest the top 3 matching suppliers.
       Return ONLY a JSON object with 'matches' array, where each match has 'supplierId', 'reason', and 'score' (0-100 indicating match strength).
       The 'reason' should explain why the supplier's categories or keywords match the user's intent.`,
      {
        type: Type.OBJECT,
        properties: {
          matches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                supplierId: { type: Type.STRING },
                reason: { type: Type.STRING },
                score: { type: Type.NUMBER }
              },
              required: ["supplierId", "reason", "score"]
            }
          }
        },
        required: ["matches"]
      }
    );
    return result.matches;
  } catch (e) {
    handleAiError(e, 'predictive_matching');
    return [];
  }
};

export const updateMarketplaceItemStatus = async (itemId: string, status: MarketplaceItem['status']): Promise<void> => {
  const itemRef = doc(db, 'marketplace', itemId);
  await updateDoc(itemRef, { 
    status,
    updatedAt: new Date().toISOString()
  });
};

export const softDeleteMarketplaceItem = async (itemId: string): Promise<void> => {
  const itemRef = doc(db, 'marketplace', itemId);
  await updateDoc(itemRef, { 
    status: 'deleted',
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

export const getStoreShareUrl = (userId: string, source: 'share' | 'social' | 'social_ad' = 'share'): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}?view=profile&uid=${userId}&source=${source}&mode=storefront`;
};

export const fetchStoreAnalytics = async (sellerId: string) => {
  if (!sellerId) return null;
  try {
    const pulseRef = collection(db, 'neural_pulse');
    // Using simple query first to avoid index issues if not yet created
    const q = query(pulseRef, where('targetId', '==', sellerId), limit(500));
    const snap = await getDocs(q);
    const rawData = snap.docs.map(doc => doc.data());
    
    const stats = {
      totalViews: rawData.filter(d => d.type === 'view').length,
      socialViews: rawData.filter(d => d.type === 'view' && (d.metadata?.source === 'share' || d.metadata?.source === 'social' || d.metadata?.source === 'social_ad')).length,
      conversions: rawData.filter(d => d.type === 'chat_init').length,
      sources: {} as Record<string, number>
    };

    rawData.forEach(d => {
      if (d.metadata?.source) {
        stats.sources[d.metadata.source] = (stats.sources[d.metadata.source] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error('Failed to fetch store analytics:', error);
    return null;
  }
};
