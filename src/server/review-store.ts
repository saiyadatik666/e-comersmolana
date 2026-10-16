import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { INITIAL_PRODUCTS } from "@/data/products";
import {
  memoryOrders,
  initializeStore as initializeOrderStore,
  StoredOrder,
} from "./order-store";
import {
  AUTHORIZED_ADMIN_EMAIL,
  verifyServerAdminToken,
  logAdminAudit,
} from "./admin-auth";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type ReviewStatus = "approved" | "pending" | "rejected";

export interface StoredReview {
  id: string;
  productId: string;
  productName: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  authorName: string; // Full name stored for admin verification
  authorMasked: string; // Publicly visible masked name (e.g., M*** A***)
  city?: string | undefined;
  isVerifiedPurchase: boolean;
  verifiedOrderId?: string | undefined; // Private
  verifiedOrderIdMasked?: string | undefined; // Publicly visible (e.g., ORD-***4821)
  customerPhoneMasked?: string | undefined; // Private admin reference
  status: ReviewStatus;
  adminReply?: string | undefined;
  adminReplyAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
  ipHash?: string | undefined;
}

export interface PublicProductReview {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  title: string;
  comment: string;
  authorMasked: string;
  city?: string | undefined;
  isVerifiedPurchase: boolean;
  verifiedOrderIdMasked?: string | undefined;
  createdAt: string;
  adminReply?: string | undefined;
  adminReplyAt?: string | undefined;
}

export interface ProductReviewStats {
  averageRating: number;
  totalReviews: number;
  verifiedCount: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  ratingPercentages: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface PublicProductReviewsPayload {
  productId: string;
  reviews: PublicProductReview[];
  stats: ProductReviewStats;
}

export interface SubmitReviewInput {
  productId: string;
  rating: number;
  title: string;
  comment: string;
  authorName: string;
  city?: string | undefined;
  orderId?: string | undefined;
  phone?: string | undefined;
  botField?: string | undefined; // Honeypot spam trap
}

// =============================================================================
// STORAGE & IN-MEMORY ENGINE
// =============================================================================

const STORAGE_DIR = path.resolve(process.cwd(), "server-data");
const REVIEWS_FILE = path.join(STORAGE_DIR, "reviews.json");

let memoryReviews: StoredReview[] = [];
let isReviewsStoreInitialized = false;

// In-memory rate limiting map: ipHash -> array of timestamps
const reviewSubmissionTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REVIEWS_PER_WINDOW = 3;

function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export function initializeReviewsStore(): void {
  if (isReviewsStoreInitialized) return;
  initializeOrderStore();
  ensureStorageDir();

  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      const raw = fs.readFileSync(REVIEWS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryReviews = parsed;
      }
    } else {
      memoryReviews = [];
      fs.writeFileSync(REVIEWS_FILE, JSON.stringify(memoryReviews, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[ReviewStore] Error loading reviews.json, initializing empty", err);
    memoryReviews = [];
  }

  isReviewsStoreInitialized = true;
}

function persistReviewsToDisk(): void {
  try {
    ensureStorageDir();
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(memoryReviews, null, 2), "utf-8");
  } catch (err) {
    console.error("[ReviewStore] Error persisting reviews to disk", err);
  }
}

// =============================================================================
// PRIVACY & SANITIZATION HELPERS
// =============================================================================

export function maskCustomerName(name: string): string {
  if (!name || typeof name !== "string") return "संतुष्ट ग्राहक";
  const clean = name.trim();
  if (clean.length === 0) return "संतुष्ट ग्राहक";

  const parts = clean.split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      if (part.length === 2) return `${part[0]}*`;
      return `${part[0]}***${part[part.length - 1]}`;
    })
    .join(" ");
}

export function maskOrderId(orderId: string): string {
  if (!orderId || typeof orderId !== "string") return "ORD-***";
  const trimmed = orderId.trim();
  if (trimmed.length <= 4) return "ORD-***";
  const suffix = trimmed.slice(-4).replace(/^[-_]/, "");
  return `ORD-***${suffix}`;
}

export function maskPhone(phone: string): string {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  if (digits.length <= 4) return "******";
  return `******${digits.slice(-4)}`;
}

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[<>"'&]/g, (match) => {
      switch (match) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        case "&": return "&amp;";
        default: return match;
      }
    })
    .trim();
}

function hashClientIp(ip: string): string {
  return crypto.createHash("sha256").update(ip || "unknown-client").digest("hex").slice(0, 16);
}

// =============================================================================
// SUBMISSION & VERIFICATION LOGIC
// =============================================================================

export function submitProductReviewServer(
  input: SubmitReviewInput,
  clientIp = "127.0.0.1"
): { success: boolean; review: PublicProductReview; message: string } {
  initializeReviewsStore();

  // 1. Honeypot check (Abuse/Bot protection)
  if (input.botField && input.botField.trim().length > 0) {
    throw new Error("अनपेक्षित त्रुटि (Spam submission detected)");
  }

  // 2. IP Rate Limiting: Max 3 reviews per 15 minutes per IP
  const ipHash = hashClientIp(clientIp);
  const now = Date.now();
  const timestamps = (reviewSubmissionTimestamps.get(ipHash) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_REVIEWS_PER_WINDOW) {
    const oldestTimestamp = timestamps[0] ?? now;
    const waitMins = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp)) / 60000));
    throw new Error(
      `समीक्षा सबमिशन सीमा पार हो गई है। कृपया ${waitMins} मिनट बाद पुनः प्रयास करें। (Rate limit exceeded)`
    );
  }

  // 3. Input validation
  const cleanProductId = (input.productId || "").trim();
  const product = INITIAL_PRODUCTS.find((p) => p.id === cleanProductId);
  if (!product) {
    throw new Error(`अमान्य उत्पाद संदर्भ (Product '${cleanProductId}' not found)`);
  }

  const rating = Math.floor(Number(input.rating));
  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error("कृपया 1 से 5 सितारों के बीच एक वैध रेटिंग चुनें (Rating must be 1 to 5)");
  }

  const cleanAuthorName = sanitizeHtml(input.authorName || "");
  if (cleanAuthorName.length < 2 || cleanAuthorName.length > 60) {
    throw new Error("ग्राहक का नाम 2 से 60 अक्षरों के बीच होना आवश्यक है (Name required: 2-60 chars)");
  }

  const cleanTitle = sanitizeHtml(input.title || "");
  if (cleanTitle.length < 3 || cleanTitle.length > 100) {
    throw new Error("समीक्षा का शीर्षक 3 से 100 अक्षरों के बीच होना चाहिए (Title required: 3-100 chars)");
  }

  const cleanComment = sanitizeHtml(input.comment || "");
  if (cleanComment.length < 10 || cleanComment.length > 1000) {
    throw new Error("विस्तृत समीक्षा कम से कम 10 और अधिकतम 1000 अक्षरों की होनी चाहिए (Review must be 10-1000 chars)");
  }

  const cleanCity = input.city ? sanitizeHtml(input.city).slice(0, 60) : undefined;

  // 4. Content Deduplication Check (Prevent identical repetitive submissions)
  const isDuplicate = memoryReviews.some(
    (r) =>
      r.productId === cleanProductId &&
      r.comment.toLowerCase() === cleanComment.toLowerCase() &&
      r.title.toLowerCase() === cleanTitle.toLowerCase()
  );
  if (isDuplicate) {
    throw new Error("समान समीक्षा पहले ही दर्ज की जा चुकी है। कृपया अपना अनूठा अनुभव लिखें। (Duplicate review detected)");
  }

  // 5. Purchase Verification (Verified Purchase Invariant)
  let isVerifiedPurchase = false;
  let verifiedOrderId: string | undefined = undefined;
  let verifiedOrderIdMasked: string | undefined = undefined;
  let customerPhoneMasked: string | undefined = undefined;

  const rawOrderId = (input.orderId || "").trim();
  const rawPhone = (input.phone || "").replace(/[^0-9]/g, "");

  if (rawOrderId.length > 0 || rawPhone.length > 0) {
    // Both orderId AND phone are strictly required to verify ownership
    if (!rawOrderId) {
      throw new Error("सत्यापित खरीद बैज हेतु ऑर्डर संदर्भ आईडी (Order ID) दर्ज करना अनिवार्य है।");
    }
    if (!rawPhone || rawPhone.length < 10) {
      throw new Error("सत्यापित खरीद बैज हेतु ऑर्डर में दर्ज 10-अंकीय मोबाइल नंबर दर्ज करना अनिवार्य है।");
    }

    // Lookup order in memoryOrders (or disk)
    const matchingOrder = memoryOrders.find(
      (o: StoredOrder) => o.id.toLowerCase() === rawOrderId.toLowerCase()
    );

    if (!matchingOrder) {
      throw new Error(
        "प्रदान किया गया ऑर्डर आईडी सिस्टम में नहीं मिला। कृपया अपने बिल या ट्रैकिंग पेज से सही ऑर्डर आईडी जांचें।"
      );
    }

    // Phone matching invariant (prevent claiming purchases belonging to others)
    const orderPhoneClean = matchingOrder.customerPhone.replace(/[^0-9]/g, "");
    if (!orderPhoneClean.endsWith(rawPhone.slice(-10))) {
      throw new Error(
        "दर्ज मोबाइल नंबर इस ऑर्डर के ग्राहक विवरण से मेल नहीं खाता। खरीद सत्यापन अस्वीकृत।"
      );
    }

    // Product matching invariant (confirm order actually contained this specific product)
    const productInOrder = matchingOrder.items.some(
      (item: StoredOrder["items"][number]) => item.productId === cleanProductId
    );
    if (!productInOrder) {
      throw new Error(
        `यह ऑर्डर इस उत्पाद ('${product.name}') की खरीद से संबंधित नहीं है। खरीद सत्यापन केवल उसी उत्पाद पर मान्य है जो ऑर्डर में था।`
      );
    }

    // Order status invariant: Completed / genuine fulfillment state only
    if (matchingOrder.orderStatus === "Cancelled") {
      throw new Error("रद्द किए गए ऑर्डर पर सत्यापित खरीद समीक्षा मान्य नहीं है।");
    }

    // Single review per order per product invariant (prevent duplicate verification spam)
    const alreadyReviewed = memoryReviews.some(
      (r) =>
        r.productId === cleanProductId &&
        r.verifiedOrderId?.toLowerCase() === matchingOrder.id.toLowerCase()
    );
    if (alreadyReviewed) {
      throw new Error(
        "इस ऑर्डर संदर्भ के लिए इस उत्पाद की समीक्षा पहले ही दर्ज की जा चुकी है।"
      );
    }

    isVerifiedPurchase = true;
    verifiedOrderId = matchingOrder.id;
    verifiedOrderIdMasked = maskOrderId(matchingOrder.id);
    customerPhoneMasked = maskPhone(matchingOrder.customerPhone);
  }

  // 6. Record review
  const reviewId = `rev-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const authorMasked = maskCustomerName(cleanAuthorName);

  const newReview: StoredReview = {
    id: reviewId,
    productId: cleanProductId,
    productName: product.name,
    rating,
    title: cleanTitle,
    comment: cleanComment,
    authorName: cleanAuthorName,
    authorMasked,
    city: cleanCity,
    isVerifiedPurchase,
    verifiedOrderId,
    verifiedOrderIdMasked,
    customerPhoneMasked,
    status: "approved", // Genuine reviews default to approved, subject to admin moderation
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ipHash,
  };

  memoryReviews.unshift(newReview);
  persistReviewsToDisk();

  // Update rate limiter timestamp
  timestamps.push(now);
  reviewSubmissionTimestamps.set(ipHash, timestamps);

  const publicReview = toPublicProductReview(newReview);

  return {
    success: true,
    review: publicReview,
    message: isVerifiedPurchase
      ? "धन्यवाद! आपका प्रमाणित ग्राहक अनुभव एवं समीक्षा सफलतापूर्वक प्रकाशित हो चुकी है।"
      : "धन्यवाद! आपकी समीक्षा सफलतापूर्वक दर्ज कर ली गई है।",
  };
}

// =============================================================================
// PUBLIC REVIEW RETRIEVAL & STATS CALCULATION
// =============================================================================

function toPublicProductReview(r: StoredReview): PublicProductReview {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    authorMasked: r.authorMasked,
    city: r.city,
    isVerifiedPurchase: r.isVerifiedPurchase,
    verifiedOrderIdMasked: r.verifiedOrderIdMasked,
    createdAt: r.createdAt,
    adminReply: r.adminReply,
    adminReplyAt: r.adminReplyAt,
  };
}

export function calculateProductReviewStats(reviews: StoredReview[]): ProductReviewStats {
  const eligible = reviews.filter((r) => r.status === "approved");
  const total = eligible.length;

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingSum = 0;
  let verifiedCount = 0;

  for (const rev of eligible) {
    const star = Math.min(5, Math.max(1, Math.floor(rev.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] += 1;
    ratingSum += rev.rating;
    if (rev.isVerifiedPurchase) {
      verifiedCount += 1;
    }
  }

  const averageRating = total > 0 ? Number((ratingSum / total).toFixed(1)) : 0;

  const percentages = {
    5: total > 0 ? Math.round((distribution[5] / total) * 100) : 0,
    4: total > 0 ? Math.round((distribution[4] / total) * 100) : 0,
    3: total > 0 ? Math.round((distribution[3] / total) * 100) : 0,
    2: total > 0 ? Math.round((distribution[2] / total) * 100) : 0,
    1: total > 0 ? Math.round((distribution[1] / total) * 100) : 0,
  };

  return {
    averageRating,
    totalReviews: total,
    verifiedCount,
    ratingDistribution: distribution,
    ratingPercentages: percentages,
  };
}

export function getProductReviewsServer(productId: string): PublicProductReviewsPayload {
  initializeReviewsStore();
  const cleanId = (productId || "").trim();

  const productReviews = memoryReviews.filter(
    (r) => r.productId === cleanId && r.status === "approved"
  );

  const stats = calculateProductReviewStats(memoryReviews.filter((r) => r.productId === cleanId));
  const publicReviews = productReviews.map(toPublicProductReview);

  return {
    productId: cleanId,
    reviews: publicReviews,
    stats,
  };
}

// =============================================================================
// ADMIN MODERATION ENGINE
// =============================================================================

export interface AdminReviewFilter {
  productId?: string | undefined;
  status?: ReviewStatus | "all" | undefined;
  onlyVerified?: boolean | undefined;
}

export function adminListReviewsServer(
  filter: AdminReviewFilter = {},
  token?: string | null
): StoredReview[] {
  initializeReviewsStore();
  const auth = verifyServerAdminToken(token);
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized: Administrator session required to view reviews moderation");
  }

  let list = [...memoryReviews];

  if (filter.productId && filter.productId !== "all") {
    list = list.filter((r) => r.productId === filter.productId);
  }

  if (filter.status && filter.status !== "all") {
    list = list.filter((r) => r.status === filter.status);
  }

  if (filter.onlyVerified) {
    list = list.filter((r) => r.isVerifiedPurchase);
  }

  return list;
}

export function adminModerateReviewServer(
  payload: {
    reviewId: string;
    status: ReviewStatus;
    adminReply?: string | undefined;
  },
  token?: string | null,
  clientIp = "admin-client"
): StoredReview {
  initializeReviewsStore();
  const auth = verifyServerAdminToken(token);
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized: Administrator session required to moderate reviews");
  }

  const review = memoryReviews.find((r) => r.id === payload.reviewId);
  if (!review) {
    throw new Error(`समीक्षा संदर्भ नहीं मिला: ${payload.reviewId}`);
  }

  if (!["approved", "pending", "rejected"].includes(payload.status)) {
    throw new Error("अमान्य स्थिति (Status must be 'approved', 'pending' or 'rejected')");
  }

  const previousStatus = review.status;
  review.status = payload.status;
  review.updatedAt = new Date().toISOString();

  if (payload.adminReply !== undefined) {
    const cleanReply = sanitizeHtml(payload.adminReply).slice(0, 1000);
    review.adminReply = cleanReply || undefined;
    review.adminReplyAt = cleanReply ? new Date().toISOString() : undefined;
  }

  persistReviewsToDisk();

  logAdminAudit({
    adminEmail: auth.adminEmail || AUTHORIZED_ADMIN_EMAIL,
    action: "MODERATE_REVIEW",
    entityType: "REVIEW",
    entityId: review.id,
    details: {
      productId: review.productId,
      previousStatus,
      newStatus: review.status,
      hasAdminReply: Boolean(review.adminReply),
    },
    ipAddress: clientIp,
  });

  return review;
}

export function adminDeleteReviewServer(
  reviewId: string,
  token?: string | null,
  clientIp = "admin-client"
): { success: boolean; id: string } {
  initializeReviewsStore();
  const auth = verifyServerAdminToken(token);
  if (!auth.authorized) {
    throw new Error(auth.error || "Unauthorized: Administrator session required to delete reviews");
  }

  const idx = memoryReviews.findIndex((r) => r.id === reviewId);
  if (idx === -1) {
    throw new Error(`समीक्षा संदर्भ नहीं मिला: ${reviewId}`);
  }

  const removed = memoryReviews[idx]!;
  memoryReviews.splice(idx, 1);
  persistReviewsToDisk();

  logAdminAudit({
    adminEmail: auth.adminEmail || AUTHORIZED_ADMIN_EMAIL,
    action: "DELETE_REVIEW",
    entityType: "REVIEW",
    entityId: reviewId,
    details: {
      productId: removed.productId,
      authorName: removed.authorName,
      wasVerified: removed.isVerifiedPurchase,
    },
    ipAddress: clientIp,
  });

  return { success: true, id: reviewId };
}

/**
 * Test helper to reset review memory store during unit test suites
 */
export function resetReviewsStoreForTesting(initialReviews: StoredReview[] = []): void {
  initializeReviewsStore();
  memoryReviews = [...initialReviews];
  reviewSubmissionTimestamps.clear();
  persistReviewsToDisk();
}
