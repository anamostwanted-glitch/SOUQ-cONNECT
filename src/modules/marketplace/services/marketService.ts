import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
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
      where('status', '==', 'active'),
      // where('expiryDate', '>', now), // تحتاج إلى تحديث البيانات الموجودة أولاً
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
      user.bio?.toLowerCase().includes(term)
    );
    
  return { products, suppliers };
};

export const fetchPredictiveMatches = async (interests: string[], recentItems: string[]): Promise<{ supplierId: string, reason: string }[]> => {
  try {
    const result = await callAiJson(
      `Analyze user interests: ${JSON.stringify(interests)} and recent items: ${JSON.stringify(recentItems)}. Suggest 3 matching suppliers from the marketplace. Return ONLY a JSON object with 'matches' array, where each match has 'supplierId' and 'reason'.`,
      {
        type: Type.OBJECT,
        properties: {
          matches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                supplierId: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["supplierId", "reason"]
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
