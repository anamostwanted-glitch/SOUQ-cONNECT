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
  coverUrl?: string;
  photoURL?: string;
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
  verificationExpiryDate?: string;
  trustScore?: number;
  followersCount?: number;
  followingCount?: number;
  logoGenerationUsage?: { count: number; month: string };
  followers?: string[];
  following?: string[];
  isOnline?: boolean;
  averageResponseTime?: number;
  notificationPreferences?: NotificationPreferences;
  conciergeConsent?: boolean;
  branding?: BrandingPreferences;
  referralPoints?: number;
  neuralCredits?: number;
  loyaltyPoints?: number;
  commercialRegistration?: string;
  subscriptionPlan?: 'basic' | 'pro' | 'enterprise';
  subscriptionExpiry?: string;
  referralCode?: string;
  favoriteProducts?: string[];
  aiInsights?: {
    summaryAr: string;
    summaryEn: string;
    strengthsAr: string[];
    strengthsEn: string[];
    recommendationsAr: string[];
    recommendationsEn: string[];
    lastUpdated: string;
  };
  aiBio?: {
    bioAr: string;
    bioEn: string;
    lastUpdated: string;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
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
  offersCount?: number;
  budget?: string;
  currency?: string;
  titleAr?: string;
  titleEn?: string;
  title?: string;
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
  typing?: Record<string, boolean>;
  pinnedMessageId?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  audioUrl?: string;
  imageUrl?: string;
  pending?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  reactions?: Record<string, string[]>;
  deletedFor?: string[];
  isDeleted?: boolean;
  quoteData?: Quote;
  type: 'text' | 'audio' | 'image' | 'quote' | 'location';
  createdAt: string;
  read?: boolean;
  senderName?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
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
  titleAr?: string;
  titleEn?: string;
  description: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price: number;
  currency: string;
  categories: string[];
  images: string[];
  status: 'active' | 'sold' | 'hidden' | 'deleted' | 'draft';
  location?: string;
  createdAt: string;
  updatedAt: string;
  isVerifiedSupplier?: boolean;
  isOnline?: boolean;
  averageResponseTime?: number;
  sellerPhone?: string;
  isHighQuality?: boolean;
  features?: string[];
  classification?: string;
  views?: number;
}

export interface ContactEvent {
  id: string;
  userId: string;
  supplierId: string;
  itemId: string;
  createdAt: string;
}

export interface UsageLog {
  id: string;
  uid: string;
  email?: string;
  feature: string;
  tokens: number;
  estimatedCost?: number;
  isCached?: boolean;
  createdAt: string;
}

export interface AppFeatures {
  marketplace: boolean;
  aiChat: boolean;
  supplierVerification: boolean;
  marketTrends: boolean;
  priceIntelligence: boolean;
}

export interface SiteSettings {
  logoUrl?: string;
  watermarkUrl?: string;
  siteName?: string;
  heroTitleAr?: string;
  heroTitleEn?: string;
  heroDescriptionAr?: string;
  heroDescriptionEn?: string;
  searchPlaceholderAr?: string;
  searchPlaceholderEn?: string;
  ctaButtonAr?: string;
  ctaButtonEn?: string;
  lastUpdated?: string;
  logoScale?: number;
  logoAuraColor?: string;
  showNeuralLogo?: boolean;
  primaryTextColor?: string;
  secondaryTextColor?: string;
  enableNeuralPulse?: boolean;
  enableOrbitalRings?: boolean;
  enableShimmerEffect?: boolean;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  loaderCenterText?: string;
  loaderStatusTextAr?: string;
  loaderStatusTextEn?: string;
  loaderFooterTextAr?: string;
  loaderFooterTextEn?: string;
  watermarkOpacity?: number;
  watermarkPosition?: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';
  watermarkScale?: number;
  logoAuraBlur?: number;
  logoAuraSpread?: number;
  logoAuraOpacity?: number;
  logoAuraStyle?: 'solid' | 'gradient' | 'pulse' | 'mesh';
  logoAuraSharpness?: number;

  // New Loading Screen Settings
  loaderBackgroundStyle?: 'solid' | 'gradient' | 'mesh' | 'animated';
  loaderBackgroundColor?: string;
  loaderProgressBarColor?: string;
  loaderLogoShape?: 'square' | 'circle' | 'squircle';
  loaderLogoAnimation?: 'none' | 'bounce' | 'rotate' | 'scale' | 'float';
  loaderLogoUrl?: string;

  // Header specific settings
  headerLogoScale?: number;
  headerLogoAuraColor?: string;
  headerShowNeuralLogo?: boolean;
  headerLogoAuraBlur?: number;
  headerLogoAuraSpread?: number;
  headerLogoAuraOpacity?: number;
  headerLogoAuraStyle?: 'solid' | 'gradient' | 'pulse' | 'mesh';
  headerLogoAuraSharpness?: number;

  // Nexus Rewards System
  enableNexusRewards?: boolean;
  pointsPerShare?: number;
  pointsToCashRatio?: number;
  minWithdrawalAmount?: number;
  referralTermsAr?: string;
  referralTermsEn?: string;

  // Adaptive Neural Grid Settings
  gridSettings?: {
    mobileCols: number;
    webCols: number;
    aiAutoPilot: boolean;
  };

  // Neural Navigation Settings
  neuralNav?: {
    enabled: boolean;
    showProfile: boolean;
    showNotifications: boolean;
    showMessages: boolean;
    showAiHub: boolean;
    showVisualSearch: boolean;
    pulseSpeed: 'slow' | 'normal' | 'fast';
    themeColor?: string;
  };
}

export interface GeminiApiKey {
  id: string;
  key: string;
  label: string;
  status: 'active' | 'error' | 'testing' | 'disabled';
  latency?: number;
  modelType?: string;
  isPaid?: boolean;
  lastTested?: string;
  usageCount?: number;
  createdAt: string;
}
