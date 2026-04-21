export type UserRole = 'admin' | 'supplier' | 'customer' | 'manager' | 'supervisor';

export interface NotificationPreferences {
  newMessages: boolean;
  newOffers: boolean;
  newRequests: boolean;
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
  slug?: string;
  metaTitleAr?: string;
  metaTitleEn?: string;
  metaDescriptionAr?: string;
  metaDescriptionEn?: string;
  seoKeywords?: string[];
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
  businessDescription?: string;
  supplierType?: 'merchant' | 'service_provider' | 'both';
  keywords?: string[];
  language?: 'ar' | 'en';
  currency?: string;
  region?: string;
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
  isDeleted?: boolean;
  lastLoginAt?: string;
  walletBalance?: number;
  averageResponseTime?: number;
  notificationPreferences?: NotificationPreferences;
  conciergeConsent?: boolean;
  branding?: BrandingPreferences;
  referralPoints?: number;
  loyaltyPoints?: number;
  sharedViews?: number;
  commercialRegistration?: string;
  subscriptionPlan?: 'basic' | 'pro' | 'enterprise';
  subscriptionExpiry?: string;
  referralCode?: string;
  referredBy?: string;
  onboardingCompleted?: boolean;
  favoriteProducts?: string[];
  performance?: {
    activityScore: number;
    performanceScore: number;
    ratingScore: number;
    totalRank: number;
    responseRate: number;
    avgResponseTimeMinutes: number;
    conversionRate: number;
    lastCalculationDate: string;
  };
  aiInsights?: {
    summaryAr: string;
    summaryEn: string;
    strengthsAr: string[];
    strengthsEn: string[];
    recommendationsAr: string[];
    recommendationsEn: string[];
    lastUpdated: string;
  };
  // Multi-Vendor MarketPlace Expert Trust & Authority Fields
  isMvmVerified?: boolean;
  experienceYears?: number;
  expertiseLevel?: 'Intermediate' | 'Expert' | 'Elite' | 'Master';
  notableClients?: string[];
  certifications?: {
    name: string;
    issuer: string;
    year: string;
    description?: string;
  }[];
  industriesServed?: string[];
  aiBio?: {
    bioAr: string;
    bioEn: string;
    lastUpdated: string;
  };
  visualIntegrityScore?: number;
  authorityLevel?: 'Seed' | 'Root' | 'Growth' | 'Titan';
  verifiedRealPhotosCount?: number;
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
  descriptionAr?: string;
  descriptionEn?: string;
  slug?: string;
  seoKeywords?: string[];
  status?: 'active' | 'deleted' | 'pending';
  deletedAt?: string;
  iconName?: string; // Lucide icon name
  imageUrl?: string;
  tier?: 'hub' | 'sector' | 'niche'; // 3-tier taxonomy
  metaTitleAr?: string;
  metaTitleEn?: string;
  strategyAr?: string;
  strategyEn?: string;
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
  urgency?: 'normal' | 'high' | 'critical';
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
  actionType?: 'submit_offer' | 'accept_chat' | 'general' | 'price_drop' | 'new_request';
  targetId?: string;
  matchScore?: number;
  matchReasonAr?: string;
  matchReasonEn?: string;
  isUrgent?: boolean;
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
  status: 'active' | 'sold' | 'hidden' | 'deleted' | 'draft' | 'expired';
  location?: string;
  createdAt: string;
  updatedAt: string;
  expiryDate?: string;
  isVerifiedSupplier?: boolean;
  isOnline?: boolean;
  averageResponseTime?: number;
  sellerPhone?: string;
  isHighQuality?: boolean;
  isAuthenticPhoto?: boolean;
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
  smartAssistantEnabled?: boolean;
}

export interface SiteSettings {
  logoUrl?: string;
  watermarkUrl?: string;
  watermarkText?: string;
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
  headerLogoScale?: number;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  headerAnimationSpeed?: 'slow' | 'normal' | 'fast';
  primaryTextColor?: string;
  secondaryTextColor?: string;
  loaderCenterText?: string;
  loaderStatusTextAr?: string;
  loaderStatusTextEn?: string;
  loaderFooterTextAr?: string;
  loaderFooterTextEn?: string;
  watermarkOpacity?: number;
  watermarkPosition?: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';
  watermarkScale?: number;

  // Social Proof Settings
  socialProof?: {
    enabled: boolean;
  };

  // New Loading Screen Settings
  loaderBackgroundStyle?: 'solid' | 'gradient' | 'mesh' | 'animated';
  loaderBackgroundColor?: string;
  loaderProgressBarColor?: string;
  loaderLogoShape?: 'square' | 'circle' | 'squircle';
  loaderLogoAnimation?: 'none' | 'bounce' | 'rotate' | 'scale' | 'float';
  loaderLogoUrl?: string;

  // Connect Rewards System
  enableConnectRewards?: boolean;
  pointsPerShare?: number;
  pointsToCashRatio?: number;
  minWithdrawalAmount?: number;
  referralTermsAr?: string;
  referralTermsEn?: string;

  // Grid Settings
  gridSettings?: {
    mobileCols: number;
    webCols: number;
    gap: number;
    aiAutoPilot: boolean;
    fullBleedMobile?: boolean;
    marketplaceLayoutMode?: 'grid' | 'mosaic' | 'feed' | 'compact';
    immersionEffect?: 'none' | 'glass' | 'depth' | 'neural';
    performanceMode?: 'speed' | 'quality' | 'balanced';
  };

  // SEO & Meta Settings
  seoTitleAr?: string;
  seoTitleEn?: string;
  seoDescriptionAr?: string;
  seoDescriptionEn?: string;
  faviconUrl?: string;

  // Footer Settings
  footerAboutAr?: string;
  footerAboutEn?: string;
  footerLogoUrl?: string;
  footerEmail?: string;
  footerPhone?: string;
  footerWebsite?: string;
  footerAddressAr?: string;
  footerAddressEn?: string;
  footerCopyrightAr?: string;
  footerCopyrightEn?: string;
  footerShowSecurityBadge?: boolean;

  // Master AI Controls
  smartAssistantEnabled?: boolean;

  // Maintenance Settings
  maintenanceMode?: boolean;
  maintenanceBypassEmails?: string[];

  // Neural Halo Settings (Futuristic AI UI)
  haloSettings?: {
    enabled: boolean;
    size: number; // 0.5 to 2.0
    speed: number; // 0.1 to 3.0
    sensitivity: number; // 0.1 to 5.0 (for audio reactive)
    primaryColor?: string;
    secondaryColor?: string;
    glowStrength: number; // 0 to 1
    particleCount: number; // 10 to 100
    particleSize: number; // 1 to 10
    pointGlow: number; // 0 to 40
  };

  // Flubber AI Liquid Settings (Futuristic Organic UI)
  flubberSettings?: {
    enabled: boolean;
    color: string;
    opacity: number; // 0 to 1
    blobCount: number; // 2 to 10
    speed: number; // 0.1 to 5.0
    scale: number; // 0.5 to 3.0
    gooeyness: number; // 10 to 50
    interactive: boolean;
  };
}

export interface SliderItem {
  id: string;
  imageUrl: string;
  targetType: 'product' | 'supplier' | 'custom_url';
  targetId?: string;
  customUrl?: string;
  ctaText?: string;
  ctaColor?: string;
}

export interface SliderSettings {
  items: SliderItem[];
  globalSettings: {
    speed: number; // in ms
    transition: 'fade' | 'slide' | 'morph';
    width: string;
    height: string;
  };
}

export interface AdAnalytics {
  id: string;
  adId: string;
  sellerId: string;
  views: number;
  clicks: number;
  lastUpdated: string;
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

export interface PasskeyCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  name: string;
  deviceType: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface SupplierPerformance {
  supplierId: string;
  avgResponseTime: number;
  matchRate: number;
  unmetDemandHits: number;
  suggestions: string[];
  calculatedAt: string;
}
