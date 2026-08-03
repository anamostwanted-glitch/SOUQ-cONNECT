import { Router, Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

export const mobileApiRouter = Router();

/**
 * Interface extending Express Request with authenticated user info
 */
export interface AuthenticatedMobileRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
    name?: string;
  };
}

/**
 * Authentication Middleware for Mobile Clients
 * Validates Firebase ID Token from Authorization header: "Bearer <token>"
 */
async function requireMobileAuth(req: AuthenticatedMobileRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header. Expected 'Bearer <firebase_id_token>'"
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Fetch full user doc from Firestore for role & profile details
    let userRole = decodedToken.role || 'user';
    let userName = decodedToken.name || '';

    try {
      const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData) {
          userRole = userData.role || userRole;
          userName = userData.name || userData.displayName || userName;
        }
      }
    } catch (e) {
      console.warn('[MobileAPI] Could not fetch user doc:', e);
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userRole,
      name: userName
    };

    next();
  } catch (error: any) {
    console.error("[MobileAPI Auth Error]:", error.message);
    return res.status(401).json({
      success: false,
      error: "INVALID_TOKEN",
      message: "Authentication token is invalid or expired."
    });
  }
}

/**
 * Supplier Role Enforcement Middleware
 */
function requireSupplierRole(req: AuthenticatedMobileRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Authentication required" });
  }

  const allowedRoles = ['supplier', 'vendor', 'admin'];
  if (!allowedRoles.includes(req.user.role || '')) {
    return res.status(403).json({
      success: false,
      error: "FORBIDDEN",
      message: "This endpoint requires a Service Provider / Supplier account."
    });
  }

  next();
}

// ==========================================
// PUBLIC & DOCUMENTATION ENDPOINTS
// ==========================================

/**
 * GET /api/mobile/v1/health
 * Health check & platform meta for mobile app SDKs
 */
mobileApiRouter.get('/v1/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: "online",
    apiVersion: "v1.0.0",
    service: "Connect AI Mobile Gateway",
    timestamp: new Date().toISOString(),
    supportedRoles: ["user", "supplier"]
  });
});

/**
 * GET /api/mobile/v1/docs
 * OpenAPI / JSON documentation describing mobile endpoints
 */
mobileApiRouter.get('/v1/docs', (req: Request, res: Response) => {
  res.json({
    title: "Connect AI Mobile Web API",
    version: "1.0.0",
    description: "RESTful API gateway powering iOS, Android, and Flutter mobile applications for Buyers and Service Providers.",
    authentication: {
      type: "Bearer Token",
      description: "Firebase Auth ID Token passed via 'Authorization: Bearer <token>' header."
    },
    endpoints: {
      public: [
        { path: "GET /api/mobile/v1/health", description: "Health check and api status" },
        { path: "GET /api/mobile/v1/user/categories", description: "Get active categories list" },
        { path: "GET /api/mobile/v1/user/marketplace", description: "Search & filter marketplace listings" },
        { path: "GET /api/mobile/v1/user/marketplace/:id", description: "Get single product/service details" }
      ],
      user: [
        { path: "GET /api/mobile/v1/user/profile", description: "Get buyer profile details" },
        { path: "PUT /api/mobile/v1/user/profile", description: "Update buyer profile details" },
        { path: "POST /api/mobile/v1/user/requests", description: "Submit new service/product request (RFQ)" },
        { path: "GET /api/mobile/v1/user/requests", description: "List customer's submitted requests" },
        { path: "GET /api/mobile/v1/user/requests/:id/offers", description: "Get received offers for a request" },
        { path: "POST /api/mobile/v1/user/offers/:id/accept", description: "Accept a supplier offer" },
        { path: "POST /api/mobile/v1/user/requests/:id/soft-delete", description: "Soft delete a request" }
      ],
      supplier: [
        { path: "GET /api/mobile/v1/supplier/leads", description: "Fetch open client leads matching supplier tags" },
        { path: "POST /api/mobile/v1/supplier/offers", description: "Submit price proposal for a lead" },
        { path: "GET /api/mobile/v1/supplier/offers", description: "List offers submitted by supplier" },
        { path: "GET /api/mobile/v1/supplier/products", description: "List supplier's store items" },
        { path: "POST /api/mobile/v1/supplier/products", description: "Create store product/service listing" },
        { path: "PUT /api/mobile/v1/supplier/products/:id", description: "Update store product/service" },
        { path: "POST /api/mobile/v1/supplier/products/:id/soft-delete", description: "Soft delete store listing" },
        { path: "GET /api/mobile/v1/supplier/stats", description: "Get supplier performance analytics" }
      ]
    }
  });
});

// ==========================================
// BUYER / USER ENDPOINTS
// ==========================================

/**
 * GET /api/mobile/v1/user/categories
 * Get list of marketplace categories
 */
mobileApiRouter.get('/v1/user/categories', async (req: Request, res: Response) => {
  try {
    const snap = await admin.firestore().collection('categories').get();
    const categories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error: any) {
    console.error("[MobileAPI] Categories Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * GET /api/mobile/v1/user/marketplace
 * Search and list marketplace products
 */
mobileApiRouter.get('/v1/user/marketplace', async (req: Request, res: Response) => {
  try {
    const { categoryId, search, limit = 20 } = req.query;
    let queryRef: admin.firestore.Query = admin.firestore().collection('marketplace');

    // Soft delete filter
    queryRef = queryRef.where('status', '!=', 'deleted');

    if (categoryId) {
      queryRef = queryRef.where('categoryId', '==', String(categoryId));
    }

    const snap = await queryRef.limit(Number(limit)).get();
    let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const s = String(search).toLowerCase();
      items = items.filter((item: any) => 
        (item.title && item.title.toLowerCase().includes(s)) ||
        (item.description && item.description.toLowerCase().includes(s)) ||
        (item.category && item.category.toLowerCase().includes(s))
      );
    }

    res.json({ success: true, count: items.length, data: items });
  } catch (error: any) {
    console.error("[MobileAPI] Marketplace Search Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * GET /api/mobile/v1/user/marketplace/:id
 * Get single item details
 */
mobileApiRouter.get('/v1/user/marketplace/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await admin.firestore().collection('marketplace').doc(id).get();

    if (!doc.exists || doc.data()?.status === 'deleted') {
      return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Item not found or deleted" });
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    console.error("[MobileAPI] Product Details Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * GET /api/mobile/v1/user/profile
 */
mobileApiRouter.get('/v1/user/profile', requireMobileAuth, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const doc = await admin.firestore().collection('users').doc(uid).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "USER_NOT_FOUND", message: "User profile does not exist" });
    }

    const data = doc.data();
    // Exclude internal passwords/tokens
    delete data?.password;

    res.json({ success: true, data: { uid, ...data } });
  } catch (error: any) {
    console.error("[MobileAPI] Get Profile Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * PUT /api/mobile/v1/user/profile
 */
mobileApiRouter.put('/v1/user/profile', requireMobileAuth, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { name, phone, city, bio, avatarUrl } = req.body;

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (city !== undefined) updates.city = city;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    await admin.firestore().collection('users').doc(uid).update(updates);

    res.json({ success: true, message: "Profile updated successfully", data: updates });
  } catch (error: any) {
    console.error("[MobileAPI] Update Profile Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * POST /api/mobile/v1/user/requests
 * Submit a new customer Request (RFQ)
 */
mobileApiRouter.post('/v1/user/requests', requireMobileAuth, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { productName, description, budget, categoryId, quantity, location } = req.body;

    if (!productName || !description) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "productName and description are required" });
    }

    const newRequest = {
      userId: uid,
      userName: req.user!.name || "Mobile User",
      userEmail: req.user!.email || "",
      productName,
      description,
      budget: Number(budget) || 0,
      categoryId: categoryId || 'general',
      quantity: Number(quantity) || 1,
      location: location || 'Jordan',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    };

    const docRef = await admin.firestore().collection('requests').add(newRequest);

    res.status(201).json({
      success: true,
      message: "Request created successfully",
      data: { id: docRef.id, ...newRequest }
    });
  } catch (error: any) {
    console.error("[MobileAPI] Create Request Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * GET /api/mobile/v1/user/requests
 * List customer requests
 */
mobileApiRouter.get('/v1/user/requests', requireMobileAuth, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const snap = await admin.firestore()
      .collection('requests')
      .where('userId', '==', uid)
      .get();

    const requests = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((r: any) => r.status !== 'deleted' && !r.isDeleted);

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error: any) {
    console.error("[MobileAPI] User Requests List Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * GET /api/mobile/v1/user/requests/:id/offers
 * List received offers for a specific customer request
 */
mobileApiRouter.get('/v1/user/requests/:id/offers', requireMobileAuth, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const { id } = req.params;
    const uid = req.user!.uid;

    // Verify ownership of the request
    const reqDoc = await admin.firestore().collection('requests').doc(id).get();
    if (!reqDoc.exists || reqDoc.data()?.userId !== uid) {
      return res.status(403).json({ success: false, error: "FORBIDDEN", message: "Request not found or access denied" });
    }

    const offersSnap = await admin.firestore()
      .collection('offers')
      .where('requestId', '==', id)
      .get();

    const offers = offersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((o: any) => o.status !== 'deleted' && !o.isDeleted);

    res.json({ success: true, count: offers.length, data: offers });
  } catch (error: any) {
    console.error("[MobileAPI] Get Request Offers Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * POST /api/mobile/v1/user/offers/:id/accept
 * Accept a price offer from a supplier
 */
mobileApiRouter.post('/v1/user/offers/:id/accept', requireMobileAuth, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const { id } = req.params;
    const uid = req.user!.uid;

    const offerRef = admin.firestore().collection('offers').doc(id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Offer not found" });
    }

    const offerData = offerDoc.data();

    // Verify request ownership
    const requestDoc = await admin.firestore().collection('requests').doc(offerData?.requestId).get();
    if (!requestDoc.exists || requestDoc.data()?.userId !== uid) {
      return res.status(403).json({ success: false, error: "FORBIDDEN", message: "Access denied" });
    }

    // Update offer status
    await offerRef.update({
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Update request status
    await admin.firestore().collection('requests').doc(offerData?.requestId).update({
      status: 'completed',
      acceptedOfferId: id,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "Offer accepted successfully" });
  } catch (error: any) {
    console.error("[MobileAPI] Accept Offer Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * POST /api/mobile/v1/user/requests/:id/soft-delete
 * Soft-delete a user's request
 */
mobileApiRouter.post('/v1/user/requests/:id/soft-delete', requireMobileAuth, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const { id } = req.params;
    const uid = req.user!.uid;

    const reqRef = admin.firestore().collection('requests').doc(id);
    const doc = await reqRef.get();

    if (!doc.exists || doc.data()?.userId !== uid) {
      return res.status(403).json({ success: false, error: "FORBIDDEN", message: "Request not found or access denied" });
    }

    // Soft delete rule enforcement
    await reqRef.update({
      status: 'deleted',
      isDeleted: true,
      deletedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "Request soft deleted successfully" });
  } catch (error: any) {
    console.error("[MobileAPI] Soft Delete Request Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

// ==========================================
// SERVICE PROVIDER / SUPPLIER ENDPOINTS
// ==========================================

/**
 * GET /api/mobile/v1/supplier/leads
 * Get customer requests matching supplier tags or open marketplace requests
 */
mobileApiRouter.get('/v1/supplier/leads', requireMobileAuth, requireSupplierRole, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const { categoryId, limit = 20 } = req.query;
    let queryRef: admin.firestore.Query = admin.firestore().collection('requests')
      .where('status', '==', 'pending');

    if (categoryId) {
      queryRef = queryRef.where('categoryId', '==', String(categoryId));
    }

    const snap = await queryRef.limit(Number(limit)).get();
    const leads = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((r: any) => !r.isDeleted && r.status !== 'deleted');

    res.json({ success: true, count: leads.length, data: leads });
  } catch (error: any) {
    console.error("[MobileAPI] Supplier Leads Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * POST /api/mobile/v1/supplier/offers
 * Submit a price offer / proposal for a customer lead
 */
mobileApiRouter.post('/v1/supplier/offers', requireMobileAuth, requireSupplierRole, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const supplierUid = req.user!.uid;
    const { requestId, price, currency = 'JOD', note, deliveryDays } = req.body;

    if (!requestId || !price) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "requestId and price are required" });
    }

    // Verify request exists
    const reqDoc = await admin.firestore().collection('requests').doc(requestId).get();
    if (!reqDoc.exists || reqDoc.data()?.status === 'deleted') {
      return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Customer request not found" });
    }

    // Fetch supplier info
    const supplierDoc = await admin.firestore().collection('users').doc(supplierUid).get();
    const supplierData = supplierDoc.data() || {};

    const newOffer = {
      requestId,
      supplierId: supplierUid,
      supplierName: supplierData.name || supplierData.displayName || req.user!.name || "Service Provider",
      supplierAvatar: supplierData.avatarUrl || supplierData.photoURL || "",
      price: Number(price),
      currency,
      note: note || "",
      deliveryDays: Number(deliveryDays) || 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    };

    const offerRef = await admin.firestore().collection('offers').add(newOffer);

    res.status(201).json({
      success: true,
      message: "Offer submitted successfully",
      data: { id: offerRef.id, ...newOffer }
    });
  } catch (error: any) {
    console.error("[MobileAPI] Submit Supplier Offer Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * GET /api/mobile/v1/supplier/offers
 * Get list of offers submitted by the supplier
 */
mobileApiRouter.get('/v1/supplier/offers', requireMobileAuth, requireSupplierRole, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const supplierUid = req.user!.uid;
    const snap = await admin.firestore()
      .collection('offers')
      .where('supplierId', '==', supplierUid)
      .get();

    const offers = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((o: any) => o.status !== 'deleted' && !o.isDeleted);

    res.json({ success: true, count: offers.length, data: offers });
  } catch (error: any) {
    console.error("[MobileAPI] List Supplier Offers Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * GET /api/mobile/v1/supplier/products
 * List products/services offered by this supplier
 */
mobileApiRouter.get('/v1/supplier/products', requireMobileAuth, requireSupplierRole, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const supplierUid = req.user!.uid;
    const snap = await admin.firestore()
      .collection('marketplace')
      .where('sellerId', '==', supplierUid)
      .get();

    const products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((p: any) => p.status !== 'deleted' && !p.isDeleted);

    res.json({ success: true, count: products.length, data: products });
  } catch (error: any) {
    console.error("[MobileAPI] List Supplier Products Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * POST /api/mobile/v1/supplier/products
 * Create a new product/service listing in supplier store
 */
mobileApiRouter.post('/v1/supplier/products', requireMobileAuth, requireSupplierRole, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const supplierUid = req.user!.uid;
    const { title, description, price, currency = 'JOD', categoryId, category, images = [] } = req.body;

    if (!title || !price) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "title and price are required" });
    }

    const newProduct = {
      sellerId: supplierUid,
      sellerName: req.user!.name || "Supplier Store",
      title,
      description: description || "",
      price: Number(price),
      currency,
      categoryId: categoryId || 'general',
      category: category || 'General',
      images: Array.isArray(images) ? images : [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    };

    const docRef = await admin.firestore().collection('marketplace').add(newProduct);

    res.status(201).json({
      success: true,
      message: "Product listing created successfully",
      data: { id: docRef.id, ...newProduct }
    });
  } catch (error: any) {
    console.error("[MobileAPI] Create Supplier Product Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * PUT /api/mobile/v1/supplier/products/:id
 * Update an existing product listing
 */
mobileApiRouter.put('/v1/supplier/products/:id', requireMobileAuth, requireSupplierRole, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplierUid = req.user!.uid;

    const prodRef = admin.firestore().collection('marketplace').doc(id);
    const doc = await prodRef.get();

    if (!doc.exists || doc.data()?.sellerId !== supplierUid) {
      return res.status(403).json({ success: false, error: "FORBIDDEN", message: "Product not found or access denied" });
    }

    const { title, description, price, categoryId, category, images, status } = req.body;

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = Number(price);
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (category !== undefined) updates.category = category;
    if (images !== undefined) updates.images = images;
    if (status !== undefined) updates.status = status;

    await prodRef.update(updates);

    res.json({ success: true, message: "Product updated successfully", data: updates });
  } catch (error: any) {
    console.error("[MobileAPI] Update Supplier Product Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * POST /api/mobile/v1/supplier/products/:id/soft-delete
 * Soft-delete a supplier store product
 */
mobileApiRouter.post('/v1/supplier/products/:id/soft-delete', requireMobileAuth, requireSupplierRole, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplierUid = req.user!.uid;

    const prodRef = admin.firestore().collection('marketplace').doc(id);
    const doc = await prodRef.get();

    if (!doc.exists || doc.data()?.sellerId !== supplierUid) {
      return res.status(403).json({ success: false, error: "FORBIDDEN", message: "Product not found or access denied" });
    }

    // Soft delete rule enforcement
    await prodRef.update({
      status: 'deleted',
      isDeleted: true,
      deletedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "Product soft deleted successfully" });
  } catch (error: any) {
    console.error("[MobileAPI] Soft Delete Supplier Product Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});

/**
 * GET /api/mobile/v1/supplier/stats
 * Get performance metrics for supplier mobile dashboard
 */
mobileApiRouter.get('/v1/supplier/stats', requireMobileAuth, requireSupplierRole, async (req: AuthenticatedMobileRequest, res: Response) => {
  try {
    const supplierUid = req.user!.uid;

    const [offersSnap, productsSnap] = await Promise.all([
      admin.firestore().collection('offers').where('supplierId', '==', supplierUid).get(),
      admin.firestore().collection('marketplace').where('sellerId', '==', supplierUid).get()
    ]);

    const offers = offersSnap.docs.map(d => d.data());
    const products = productsSnap.docs.map(d => d.data()).filter(p => p.status !== 'deleted' && !p.isDeleted);

    const totalOffersSent = offers.length;
    const acceptedOffers = offers.filter(o => o.status === 'accepted').length;
    const pendingOffers = offers.filter(o => o.status === 'pending').length;
    const activeProducts = products.length;

    res.json({
      success: true,
      data: {
        totalOffersSent,
        acceptedOffers,
        pendingOffers,
        activeProducts,
        winRatePercent: totalOffersSent > 0 ? Math.round((acceptedOffers / totalOffersSent) * 100) : 0
      }
    });
  } catch (error: any) {
    console.error("[MobileAPI] Supplier Stats Error:", error);
    res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
  }
});
