import { createServerFn } from "@tanstack/react-start";
import { getRequest, getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import {
  validateAndCalculateOrder,
  ServerCustomerInput,
  ServerOrderItemInput,
  ValidatedOrderCalculation,
} from "./order-validator";
import {
  AUTHORIZED_ADMIN_EMAIL,
  getAuthorizedAdminEmail,
  adminRateLimiter,
  logAdminAudit,
  getAdminAuditLogs,
  sanitizeServerError,
  verifyServerAdminToken,
  verifyPassword,
  hashPassword,
  getActiveAdminPasswordHash,
  updateActiveAdminPasswordHash,
  validatePasswordStrength,
  createAdminSession,
  revokeAdminSession,
  revokeAllAdminSessions,
} from "./admin-auth";
import {
  createOrderServer,
  listOrdersAdminServer,
  getOrderByIdAdminServer,
  updateOrderStatusAdminServer,
  updateProductStockServer,
  exportOrdersAdminServer,
  trackOrderCustomerServer,
  getInventoryServer,
  getSettingsServer,
  updateSettingsAdminServer,
  getProductsServer,
  updateProductAdminServer,
  ServerOrderStatus,
  StoredOrder,
  CreateOrderPayload,
  ServerStoreSettings,
} from "./order-store";
import {
  submitProductReviewServer,
  getProductReviewsServer,
  adminListReviewsServer,
  adminModerateReviewServer,
  adminDeleteReviewServer,
  SubmitReviewInput,
  AdminReviewFilter,
  PublicProductReviewsPayload,
  ReviewStatus,
  StoredReview,
} from "./review-store";

function safeGetRequest(): Request | null {
  try {
    return getRequest() ?? null;
  } catch {
    return null;
  }
}

function safeGetCookie(name: string): string | null {
  try {
    return getCookie(name) || null;
  } catch {
    return null;
  }
}

function safeSetCookie(name: string, value: string, options?: Record<string, unknown>): void {
  try {
    setCookie(name, value, options as Parameters<typeof setCookie>[2]);
  } catch (err) {
    void err;
  }
}

function safeDeleteCookie(name: string, options?: Record<string, unknown>): void {
  try {
    deleteCookie(name, options as Parameters<typeof deleteCookie>[1]);
  } catch (err) {
    void err;
  }
}

export interface BackendStatusReport {
  supabaseConfigured: boolean;
  projectUrl: string;
  tablesLive: boolean;
  activeAdapter: "supabase" | "local_fallback";
  message: string;
}

/**
 * Public Server Function: Validates order submission and recalculates prices on the server.
 * Never trusts prices or totals sent by the browser.
 */
export const validateOrderServerFn = createServerFn({ method: "POST" })
  .validator((data: {
    customer: ServerCustomerInput;
    items: ServerOrderItemInput[];
    couponCode?: string | null;
    clientClaimedSubtotal?: number;
    clientClaimedTotal?: number;
    origin?: string;
  }) => data)
  .handler(async ({ data }): Promise<ValidatedOrderCalculation> => {
    return validateAndCalculateOrder(data);
  });

/**
 * Diagnostic Server Function: Tests whether the Supabase project has active database tables.
 */
export const checkBackendStatusServerFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<BackendStatusReport> => {
    const supabaseUrl = process.env['SUPABASE_URL'] || "https://ibahpesvwawsarbkthio.supabase.co";
    const publishableKey = process.env['SUPABASE_PUBLISHABLE_KEY'] || "sb_publishable_9LnBsk9E5GcRTid6QY0gGA_ffxCGUeS";

    try {
      const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/products?select=id&limit=1`, {
        headers: {
          apikey: publishableKey,
        },
      });

      if (response.ok) {
        return {
          supabaseConfigured: true,
          projectUrl: supabaseUrl,
          tablesLive: true,
          activeAdapter: "supabase",
          message: "Supabase PostgreSQL tables are active and connected.",
        };
      }

      return {
        supabaseConfigured: true,
        projectUrl: supabaseUrl,
        tablesLive: false,
        activeAdapter: "local_fallback",
        message: "Supabase project reachable, but database schema migration is pending (tables not yet created). Local adapter active.",
      };
    } catch {
      return {
        supabaseConfigured: !!supabaseUrl,
        projectUrl: supabaseUrl || "Not configured",
        tablesLive: false,
        activeAdapter: "local_fallback",
        message: "Unable to reach database server. Local browser storage adapter active.",
      };
    }
  });

/**
 * Core Business Logic: Step 1 Admin Email Identification
 * Validates format and checks if email is the sole authorized administrator.
 * Rejects all other emails and enforces rate limiting.
 */
export function validateAdminEmail(emailInput: string, clientIp = "admin-client") {
  // Rate Limiting Check
  const rateCheck = adminRateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    throw new Error(`अत्यधिक गलत प्रयास। कृपया ${rateCheck.lockoutRemainingSeconds} सेकंड प्रतीक्षा करें। (Security cooldown in effect)`);
  }

  const email = (emailInput || "").toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("कृपया एक मान्य ईमेल पता दर्ज करें। (Please enter a valid email address)");
  }

  if (email !== AUTHORIZED_ADMIN_EMAIL) {
    adminRateLimiter.recordFailure(clientIp);
    throw new Error("यह ईमेल अधिकृत व्यवस्थापक खाते के रूप में पंजीकृत नहीं है। (This email is not authorized for administrator access)");
  }

  return {
    authorized: true,
    email,
  };
}

/**
 * Core Business Logic: Step 2 Admin Password Authentication
 * Verifies email and password on the server against the scrypt password hash.
 * Issues an HMAC-signed session token.
 */
export function authenticateAdminCredentials(
  emailInput: string,
  passwordInput: string,
  clientIp = "admin-client"
) {
  // Rate Limiting Check
  const rateCheck = adminRateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    throw new Error(`अत्यधिक गलत प्रयास। सुरक्षा कूलडाउन: ${rateCheck.lockoutRemainingSeconds} सेकंड शेष।`);
  }

  const email = (emailInput || "").toLowerCase().trim();
  if (email !== AUTHORIZED_ADMIN_EMAIL) {
    adminRateLimiter.recordFailure(clientIp);
    throw new Error("यह ईमेल अधिकृत व्यवस्थापक खाते के रूप में पंजीकृत नहीं है। (Unauthorized email)");
  }

  if (!passwordInput || typeof passwordInput !== "string") {
    throw new Error("कृपया व्यवस्थापक पासवर्ड दर्ज करें। (Password required)");
  }

  // Verify Password against server-side scrypt hash
  const isValid = verifyPassword(passwordInput, getActiveAdminPasswordHash());
  if (!isValid) {
    const fail = adminRateLimiter.recordFailure(clientIp);
    logAdminAudit({
      adminEmail: email,
      action: "ADMIN_LOGIN_FAILED",
      entityType: "AUTH",
      entityId: email,
      details: { remainingAttempts: fail.remainingAttempts, lockedOut: !fail.allowed },
      ipAddress: clientIp,
    });

    if (!fail.allowed) {
      throw new Error(`अत्यधिक गलत प्रयास। सुरक्षा कारणों से ${fail.lockoutRemainingSeconds} सेकंड का कूलडाउन लागू किया गया है।`);
    }
    throw new Error(`अमान्य क्रेडेंशियल्स। कृपया अपना पासवर्ड पुनः जाँचें। (शेष प्रयास: ${fail.remainingAttempts})`);
  }

  // Reset rate limiter on successful authentication
  adminRateLimiter.reset(clientIp);

  // Create secure HMAC-signed session token
  const sessionToken = createAdminSession(email, clientIp);

  logAdminAudit({
    adminEmail: email,
    action: "ADMIN_LOGIN_SUCCESS",
    entityType: "AUTH",
    entityId: email,
    details: { sessionCreated: true },
    ipAddress: clientIp,
  });

  return {
    success: true,
    adminEmail: email,
    sessionToken,
  };
}

/**
 * Core Business Logic: Admin Session Status Verification
 */
export function getAdminSessionStatus(token?: string | null) {
  const check = verifyServerAdminToken(token);
  if (!check.authorized) {
    return {
      authenticated: false,
      adminEmail: null,
    };
  }

  return {
    authenticated: true,
    adminEmail: check.adminEmail || AUTHORIZED_ADMIN_EMAIL,
  };
}

/**
 * Core Business Logic: Admin Logout & Session Invalidation
 */
export function logoutAdminSession(token?: string | null, clientIp = "admin-client") {
  if (token) {
    revokeAdminSession(token);
  }

  logAdminAudit({
    adminEmail: AUTHORIZED_ADMIN_EMAIL,
    action: "ADMIN_LOGOUT",
    entityType: "AUTH",
    entityId: "session-invalidated",
    ipAddress: clientIp,
  });

  return { success: true };
}

/**
 * Core Business Logic: Admin Product Stock Update with Transactional Invariant Protection
 */
export function updateProductStockSecure(
  productId: string,
  newStockCount: number,
  token?: string | null,
  clientIp = "admin-client"
) {
  const rateCheck = adminRateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    throw new Error(`Too many attempts. Cooldown in effect: ${rateCheck.lockoutRemainingSeconds}s`);
  }

  const result = updateProductStockServer(productId, newStockCount, token, clientIp);

  return {
    success: true,
    productId,
    updatedStock: result.item.stockCount,
    inStock: result.item.inStock,
  };
}

/**
 * Core Business Logic: Admin Order Status Update with Audit Trail & Auto-Restoration on Cancellation
 */
export function updateOrderStatusSecure(
  orderId: string,
  status: string,
  token?: string | null,
  clientIp = "admin-client",
  notes?: string | undefined,
  trackingNumber?: string | undefined
) {
  const result = updateOrderStatusAdminServer(
    orderId,
    status as ServerOrderStatus,
    token,
    clientIp,
    notes,
    trackingNumber
  );

  return {
    success: true,
    orderId: result.order.id,
    updatedStatus: result.order.orderStatus,
    updatedAt: result.order.updatedAt,
    trackingNumber: result.order.trackingNumber,
    notes: result.order.notes,
  };
}

/**
 * Core Business Logic: Storefront Order Creation with Server Price Validation & Atomic Inventory Deduction
 */
export function submitStorefrontOrderSecure(payload: CreateOrderPayload) {
  return createOrderServer(payload);
}

/**
 * Core Business Logic: Admin List Orders with Session Verification
 */
export function listOrdersAdminSecure(token?: string | null) {
  return listOrdersAdminServer(token);
}

/**
 * Core Business Logic: Admin Get Order Details
 */
export function getOrderDetailsAdminSecure(orderId: string, token?: string | null) {
  return getOrderByIdAdminServer(orderId, token);
}

/**
 * Core Business Logic: Admin Export Orders (CSV/JSON with formula injection protection)
 */
export function exportOrdersAdminSecure(format: "csv" | "json", token?: string | null) {
  return exportOrdersAdminServer(format, token);
}

/**
 * Core Business Logic: Customer Order Tracking (Requires Order ID + matching 10-digit Phone)
 */
export function trackCustomerOrderSecure(orderId: string, phone: string) {
  return trackOrderCustomerServer(orderId, phone);
}

/**
 * Core Business Logic: Get Server Inventory Status
 */
export function getServerInventoryStatus() {
  return getInventoryServer();
}

/**
 * Core Business Logic: Admin Audit Log Retrieval
 */
export function getAuditLogsSecure(token?: string | null) {
  const authCheck = verifyServerAdminToken(token);
  if (!authCheck.authorized) {
    throw new Error("Unauthorized: Administrator session required");
  }

  return {
    success: true,
    logs: getAdminAuditLogs(),
  };
}

/**
 * Core Business Logic: Get Server Store Settings
 */
export function getStoreSettingsSecure() {
  return getSettingsServer();
}

/**
 * Core Business Logic: Update Server Store Settings with Admin Authorization & Audit Trail
 */
export function updateStoreSettingsSecure(
  newSettings: Partial<ServerStoreSettings>,
  token?: string | null,
  clientIp = "admin-client"
) {
  return updateSettingsAdminServer(newSettings, token, clientIp);
}

/**
 * Core Business Logic: Get Server Products Catalog
 */
export function getStoreProductsSecure() {
  return getProductsServer();
}

/**
 * Core Business Logic: Update Product Price and Catalog Details with Admin Authorization & Audit Trail
 */
export function updateStoreProductSecure(
  product: Partial<import("@/data/products").Product> & { id: string },
  token?: string | null,
  clientIp = "admin-client"
) {
  return updateProductAdminServer(product, token, clientIp);
}

/**
 * Core Business Logic: Secure Admin Password Rotation
 * Verifies active session token, checks current password against scrypt hash,
 * validates new password complexity, updates runtime hash, and revokes other sessions.
 */
export function changeAdminPasswordSecure(
  currentPasswordInput: string,
  newPasswordInput: string,
  token?: string | null,
  clientIp = "admin-client"
) {
  // Rate Limiting Check
  const rateCheck = adminRateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    throw new Error(`अत्यधिक गलत प्रयास। सुरक्षा कूलडाउन: ${rateCheck.lockoutRemainingSeconds} सेकंड शेष।`);
  }

  // Session Token Authorization
  const authCheck = verifyServerAdminToken(token);
  if (!authCheck.authorized) {
    adminRateLimiter.recordFailure(clientIp);
    throw new Error(authCheck.error || "Unauthorized: Administrator session required");
  }

  if (!currentPasswordInput || typeof currentPasswordInput !== "string") {
    throw new Error("वर्तमान पासवर्ड आवश्यक है। (Current password required)");
  }

  // Verify current password against active scrypt hash
  const isCurrentValid = verifyPassword(currentPasswordInput, getActiveAdminPasswordHash());
  if (!isCurrentValid) {
    const fail = adminRateLimiter.recordFailure(clientIp);
    logAdminAudit({
      adminEmail: authCheck.adminEmail || getAuthorizedAdminEmail(),
      action: "ADMIN_PASSWORD_CHANGE_FAILED",
      entityType: "AUTH",
      entityId: "password-mismatch",
      details: { remainingAttempts: fail.remainingAttempts, lockedOut: !fail.allowed },
      ipAddress: clientIp,
    });

    if (!fail.allowed) {
      throw new Error(`अत्यधिक गलत प्रयास। सुरक्षा कारणों से ${fail.lockoutRemainingSeconds} सेकंड का कूलडाउन लागू किया गया है।`);
    }
    throw new Error(`वर्तमान पासवर्ड अमान्य है। कृपया पुनः जाँचें। (शेष प्रयास: ${fail.remainingAttempts})`);
  }

  // Validate new password policy
  const strengthCheck = validatePasswordStrength(newPasswordInput);
  if (!strengthCheck.valid) {
    throw new Error(strengthCheck.reason || "नया पासवर्ड नीति के अनुरूप नहीं है।");
  }

  // Ensure new password differs from current
  if (currentPasswordInput === newPasswordInput) {
    throw new Error("नया पासवर्ड वर्तमान पासवर्ड से भिन्न होना चाहिए। (New password must be different from current password)");
  }

  // Reset rate limiter on successful authentication
  adminRateLimiter.reset(clientIp);

  // Hash new password using salted scrypt
  const newHash = hashPassword(newPasswordInput);

  // Update runtime active hash
  updateActiveAdminPasswordHash(newHash);

  // Invalidate other active sessions to terminate any stale or compromised connections
  const revokedCount = revokeAllAdminSessions(token || undefined);

  logAdminAudit({
    adminEmail: authCheck.adminEmail || getAuthorizedAdminEmail(),
    action: "ADMIN_PASSWORD_ROTATED",
    entityType: "AUTH",
    entityId: authCheck.adminEmail || getAuthorizedAdminEmail(),
    details: { otherSessionsRevoked: revokedCount },
    ipAddress: clientIp,
  });

  return {
    success: true,
    message: "व्यवस्थापक पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है। अन्य सभी सत्र समाप्त कर दिए गए हैं।",
    otherSessionsRevoked: revokedCount,
  };
}

/**
 * Step 1: Admin Email Identification Server Function
 */
export const adminCheckEmailServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const clientIp = req?.headers?.get("x-forwarded-for") || req?.headers?.get("x-real-ip") || "admin-client";
    return validateAdminEmail(data.email, clientIp);
  });

/**
 * Step 2: Admin Password Authentication Server Function
 */
export const adminLoginServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const clientIp = req?.headers?.get("x-forwarded-for") || req?.headers?.get("x-real-ip") || "admin-client";

    const result = authenticateAdminCredentials(data.email, data.password, clientIp);

    // Set secure HttpOnly session cookie
    safeSetCookie("shifa_admin_session", result.sessionToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return result;
  });

/**
 * Validates the current admin session from cookie, Bearer header, or token.
 */
export const adminGetSessionServerFn = createServerFn({ method: "POST" })
  .validator((data: { adminToken?: string | undefined } = {}) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const headerToken = req?.headers?.get("authorization") ?? "";
    const token = data?.adminToken || cookieToken || headerToken;
    return getAdminSessionStatus(token);
  });

/**
 * Logs out the administrator, revokes the session on the server, and deletes the cookie.
 */
export const adminLogoutServerFn = createServerFn({ method: "POST" })
  .validator((data: { adminToken?: string | undefined } = {}) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const headerToken = req?.headers?.get("authorization") ?? "";
    const token = data?.adminToken || cookieToken || headerToken;

    safeDeleteCookie("shifa_admin_session", {
      path: "/",
    });

    const clientIp = req?.headers?.get("x-forwarded-for") || req?.headers?.get("x-real-ip") || "admin-client";
    return logoutAdminSession(token, clientIp);
  });

/**
 * Protected Admin Server Function: Update product inventory with server-side authorization & audit trail.
 */
export const adminUpdateProductStockServerFn = createServerFn({ method: "POST" })
  .validator((data: { productId: string; newStockCount: number; adminToken?: string | undefined }) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    const clientIp = req?.headers?.get("x-forwarded-for") || "admin-client";
    return updateProductStockSecure(data.productId, data.newStockCount, token, clientIp);
  });

/**
 * Protected Admin Server Function: Update order status with server-side authorization & audit trail.
 */
export const adminUpdateOrderStatusServerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      orderId: string;
      status: string;
      adminToken?: string | undefined;
      notes?: string | undefined;
      trackingNumber?: string | undefined;
    }) => data
  )
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    const clientIp = req?.headers?.get("x-forwarded-for") || "admin-client";
    return updateOrderStatusSecure(
      data.orderId,
      data.status,
      token,
      clientIp,
      data.notes,
      data.trackingNumber
    );
  });

/**
 * Protected Admin Server Function: Fetch audit logs.
 */
export const adminGetAuditLogsServerFn = createServerFn({ method: "POST" })
  .validator((data: { adminToken?: string | undefined } = {}) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    return getAuditLogsSecure(token);
  });

/**
 * Protected Admin Server Function: Rotate / Change Admin Password.
 */
export const adminChangePasswordServerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      currentPassword: string;
      newPassword: string;
      adminToken?: string | undefined;
    }) => data
  )
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    const clientIp = req?.headers?.get("x-forwarded-for") || "admin-client";
    return changeAdminPasswordSecure(data.currentPassword, data.newPassword, token, clientIp);
  });

/**
 * Public Server Function: Submit order to backend database/store.
 * Recalculates prices, validates items & stock, executes atomic decrement, and stores order record.
 */
export const createOrderServerFn = createServerFn({ method: "POST" })
  .validator((data: CreateOrderPayload) => data)
  .handler(async ({ data }) => {
    return submitStorefrontOrderSecure(data);
  });

/**
 * Protected Admin Server Function: List all stored orders.
 */
export const adminListOrdersServerFn = createServerFn({ method: "POST" })
  .validator((data: { adminToken?: string | undefined } = {}) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    return listOrdersAdminSecure(token);
  });

/**
 * Protected Admin Server Function: Get full order details.
 */
export const adminGetOrderDetailsServerFn = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; adminToken?: string | undefined }) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    return getOrderDetailsAdminSecure(data.orderId, token);
  });

/**
 * Protected Admin Server Function: Export orders securely (CSV or JSON with formula injection protection).
 */
export const adminExportOrdersServerFn = createServerFn({ method: "POST" })
  .validator((data: { format: "csv" | "json"; adminToken?: string | undefined }) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    return exportOrdersAdminSecure(data.format, token);
  });

/**
 * Public Customer Server Function: Track order status (requires Order ID + phone verification).
 */
export const trackOrderServerFn = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; phone: string }) => data)
  .handler(async ({ data }) => {
    return trackCustomerOrderSecure(data.orderId, data.phone);
  });

/**
 * Public / Store Server Function: Get live inventory status.
 */
export const getInventoryStatusServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return getServerInventoryStatus();
  });

/**
 * Public / Store Server Function: Get store settings.
 */
export const adminGetSettingsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return getStoreSettingsSecure();
  });

/**
 * Protected Admin Server Function: Update store settings.
 */
export const adminUpdateSettingsServerFn = createServerFn({ method: "POST" })
  .validator((data: { settings: Partial<ServerStoreSettings>; adminToken?: string | undefined }) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    const clientIp = req?.headers?.get("x-forwarded-for") || "admin-client";
    return updateStoreSettingsSecure(data.settings, token, clientIp);
  });

/**
 * Public / Store Server Function: Get active products catalog.
 */
export const adminGetProductsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return getStoreProductsSecure();
  });

/**
 * Protected Admin Server Function: Update product price or details.
 */
export const adminUpdateProductServerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      product: Partial<import("@/data/products").Product> & { id: string };
      adminToken?: string | undefined;
    }) => data
  )
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    const clientIp = req?.headers?.get("x-forwarded-for") || "admin-client";
    return updateStoreProductSecure(data.product, token, clientIp);
  });

// =============================================================================
// TRUSTWORTHY PRODUCT REVIEWS SERVER FUNCTIONS
// =============================================================================

/**
 * Public Server Function: Get approved reviews and aggregate stats for a product.
 * Returns honest calculated rating; 0 if no reviews exist.
 */
export const getProductReviewsServerFn = createServerFn({ method: "GET" })
  .validator((data: { productId: string }) => data)
  .handler(async ({ data }): Promise<PublicProductReviewsPayload> => {
    return getProductReviewsServer(data.productId);
  });

/**
 * Public Server Function: Submit a customer review with server-side validation,
 * rate limiting, spam protection and purchase verification.
 */
export const submitProductReviewServerFn = createServerFn({ method: "POST" })
  .validator((data: SubmitReviewInput) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const clientIp =
      req?.headers?.get("cf-connecting-ip") ||
      req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    return submitProductReviewServer(data, clientIp);
  });

/**
 * Protected Admin Server Function: List reviews for moderation.
 */
export const adminListReviewsServerFn = createServerFn({ method: "POST" })
  .validator((data: { filter?: AdminReviewFilter; adminToken?: string }) => data)
  .handler(async ({ data }): Promise<StoredReview[]> => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    return adminListReviewsServer(data.filter || {}, token);
  });

/**
 * Protected Admin Server Function: Moderate review (approve/reject/reply).
 * Preserves genuine customer text without alterations.
 */
export const adminModerateReviewServerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      reviewId: string;
      status: ReviewStatus;
      adminReply?: string;
      adminToken?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    const clientIp = req?.headers?.get("x-forwarded-for") || "admin-client";
    return adminModerateReviewServer(
      {
        reviewId: data.reviewId,
        status: data.status,
        adminReply: data.adminReply,
      },
      token,
      clientIp
    );
  });

/**
 * Protected Admin Server Function: Delete spam or abusive review.
 */
export const adminDeleteReviewServerFn = createServerFn({ method: "POST" })
  .validator((data: { reviewId: string; adminToken?: string }) => data)
  .handler(async ({ data }) => {
    const req = safeGetRequest();
    const cookieToken = safeGetCookie("shifa_admin_session");
    const token = data.adminToken || cookieToken || (req?.headers?.get("authorization") ?? "");
    const clientIp = req?.headers?.get("x-forwarded-for") || "admin-client";
    return adminDeleteReviewServer(data.reviewId, token, clientIp);
  });



