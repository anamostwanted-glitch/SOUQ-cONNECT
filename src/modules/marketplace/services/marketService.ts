import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { MarketplaceItem, Category, MarketTrend, UserProfile } from '../../../core/types';

export const fetchMarketplaceItems = async (activeTab: 'discover' | 'myshop', userId?: string): Promise<MarketplaceItem[]> => {
  const marketplaceRef = collection(db, 'marketplace');
  let q;
  
  if (activeTab === 'myshop' && userId) {
    q = query(
      marketplaceRef,
      where('sellerId', '==', userId),
      where('status', '!=', 'deleted'),
      orderBy('status'),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(
      marketplaceRef,
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
  }
  
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as MarketplaceItem));
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
  const q = query(collection(db, 'users'), where('role', '==', 'supplier'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ uid: doc.id, ...(doc.data() as object) } as UserProfile));
};

export const searchMarketplaceAndSuppliers = async (searchTerm: string): Promise<{ products: MarketplaceItem[], suppliers: UserProfile[] }> => {
  if (!searchTerm) return { products: [], suppliers: [] };
  
  const term = searchTerm.toLowerCase();
  
  // Note: Firestore doesn't support full-text search natively without third-party services.
  // We'll do a simple fetch and filter for this implementation.
  
  const [itemsSnap, suppliersSnap] = await Promise.all([
    getDocs(query(collection(db, 'marketplace'), where('status', '==', 'active'))),
    getDocs(query(collection(db, 'users'), where('role', '==', 'supplier')))
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
