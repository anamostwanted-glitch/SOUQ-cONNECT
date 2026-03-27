export type UserRole = 'admin' | 'supplier' | 'customer' | 'manager' | 'supervisor';

export interface NotificationPreferences {
  newMessages: boolean;
  newOffers: boolean;
  requestUpdates: boolean;
  verificationStatus: boolean;
}

export interface BrandingPreferences {
  primaryColor: string;
  secondaryColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  fontFamily: 'Inter' | 'Roboto' | 'Poppins' | 'Montserrat' | 'System';
  enableGlassmorphism: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  companyName?: string;
  phone?: string;
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  website?: string;
  logoUrl?: string;
  categories?: string[];
  bio?: string;
  keywords?: string[];
  language?: 'ar' | 'en';
  createdAt: string;
  lastActive?: string;
  rating?: number;
  reviewCount?: number;
  verificationDocUrl?: string;
  isVerified?: boolean;
  verificationDetails?: string;
  logoGenerationUsage?: { count: number; month: string };
  following?: string[];
  isOnline?: boolean;
  averageResponseTime?: number;
  notificationPreferences?: NotificationPreferences;
  branding?: BrandingPreferences;
  referralPoints?: number;
  referralCode?: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
  defaultSupplierId?: string;
  order?: number;
  keywords?: string[];
  suggestedKeywords?: string[];
  autoKeywords?: string[];
  categoryType?: 'product' | 'service';
}

export interface ProductRequest {
  id: string;
  customerId: string;
  customerName?: string;
  productName: string;
  description?: string;
  imageUrl?: string;
  categoryId: string;
  categoryNameAr?: string;
  categoryNameEn?: string;
  status: 'open' | 'closed';
  createdAt: string;
  location?: string;
  quantity?: string;
  approvedSuppliers?: string[];
  matchedSuppliers?: UserProfile[];
  suggestedSupplierIds?: string[];
  pinnedSupplierIds?: string[];
}

export interface Offer {
  id: string;
  requestId: string;
  supplierId: string;
  customerId?: string;
  price: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  createdAt: string;
  minPrice?: number;
  autoNegotiate?: boolean;
}

export interface Chat {
  id: string;
  requestId: string;
  customerId: string;
  supplierId: string;
  lastMessage: string;
  updatedAt: string;
  isCategoryChat?: boolean;
  categoryId?: string;
  status?: 'active' | 'closed';
  rating?: number;
  review?: string;
  archived?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  audioUrl?: string;
  imageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  quoteData?: Quote;
  type: 'text' | 'audio' | 'image' | 'quote' | 'location';
  createdAt: string;
  read?: boolean;
  replyTo?: {
    id: string;
    text?: string;
    type: string;
    senderName?: string;
  };
}

export interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  validUntil?: string;
  currency: string;
}

export interface Notification {
  id: string;
  userId: string; // The user receiving the notification
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  imageUrl?: string;
  link?: string;
  actionType?: 'submit_offer' | 'accept_chat' | 'general';
  targetId?: string;
  read: boolean;
  createdAt: string;
}

export interface MarketTrend {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  analysis: string;
  suggestions: string[];
  createdAt: string;
}

export interface PriceInsight {
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  analysis: string;
  createdAt: string;
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerRole: UserRole;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  status: 'active' | 'sold' | 'hidden';
  location?: string;
  createdAt: string;
  updatedAt: string;
  isVerifiedSupplier?: boolean;
  isOnline?: boolean;
  averageResponseTime?: number;
}

export interface ContactEvent {
  id: string;
  userId: string;
  supplierId: string;
  itemId: string;
  createdAt: string;
}

export interface AppFeatures {
  marketplace: boolean;
  aiChat: boolean;
  supplierVerification: boolean;
  marketTrends: boolean;
  priceIntelligence: boolean;
}
