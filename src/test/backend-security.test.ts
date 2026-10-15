import { describe, it, expect, beforeEach } from "vitest";
import {
  validateAndCalculateOrder,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  STORE_WHATSAPP_NUMBER,
} from "@/server/order-validator";
import {
  adminRateLimiter,
  verifyServerAdminToken,
  logAdminAudit,
  getAdminAuditLogs,
  sanitizeServerError,
} from "@/server/admin-auth";
import { INITIAL_PRODUCTS } from "@/data/products";

describe("Part 13 — Secure Backend Architecture & Security Suite", () => {
  const validCustomer = {
    fullName: "Arif Khan",
    phone: "9825144210",
    addressLine: "Flat 204, Al-Madina Heights, Station Road",
    cityVillage: "Palanpur",
    state: "Gujarat",
    pincode: "385001",
    country: "India",
    email: "arif@example.com",
  };

  beforeEach(() => {
    adminRateLimiter.reset("test-client-ip");
    adminRateLimiter.reset("admin-client");
  });

  // =========================================================================
  // 1. PRICE TAMPERING DEFENSE & CATALOG VERIFICATION
  // =========================================================================
  describe("Price Tampering Defense", () => {
    it("strictly recalculates prices from authentic catalog and ignores client tampering", () => {
      const arq = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat")!;
      expect(arq.price).toBe(250);

      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 2 }],
        clientClaimedSubtotal: 20, // Attacker claiming 2 * ₹10 instead of 2 * ₹250
        clientClaimedTotal: 20,
      });

      expect(result.isValid).toBe(true);
      expect(result.items[0]?.price).toBe(250);
      expect(result.items[0]?.lineTotal).toBe(500);
      expect(result.subtotal).toBe(500);
      expect(result.wasPriceTampered).toBe(true);
      expect(result.tamperingDetails).toContain("Client claimed subtotal ₹20");
    });

    it("verifies accurate catalog prices across multiple authentic products", () => {
      const tanavai = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel")!;
      const dimagi = INITIAL_PRODUCTS.find((p) => p.id === "shifa-dimagi-tonic")!;
      expect(tanavai.price).toBe(200);
      expect(dimagi.price).toBe(420);

      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [
          { productId: "shifa-tanavai-tel", quantity: 1 },
          { productId: "shifa-dimagi-tonic", quantity: 1 },
        ],
      });

      expect(result.isValid).toBe(true);
      expect(result.subtotal).toBe(620);
      // Subtotal >= 499 triggers free shipping
      expect(result.shippingCharge).toBe(0);
      expect(result.total).toBe(620);
    });

    it("rejects non-existent product IDs not found in authentic catalog", () => {
      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "fake-unauthentic-product", quantity: 1 }],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("कैटलॉग में नहीं मिला"))).toBe(true);
    });
  });

  // =========================================================================
  // 2. COUPON CODE VERIFICATION (SHIFA10, AYURVEDA50, FREECOD)
  // =========================================================================
  describe("Server-Side Coupon Calculations", () => {
    it("calculates 10% discount accurately with SHIFA10", () => {
      // 2 * Arq Abe Hayat (₹250) = ₹500
      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 2 }],
        couponCode: "shifa10",
      });

      expect(result.appliedCoupon).toBe("SHIFA10");
      expect(result.subtotal).toBe(500);
      expect(result.discount).toBe(50); // 10% of 500
      expect(result.total).toBe(450);
    });

    it("calculates flat ₹50 discount accurately with AYURVEDA50", () => {
      // 1 * Zafrani Gold = ₹1450
      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-zafrani-gold", quantity: 1 }],
        couponCode: "AYURVEDA50",
      });

      expect(result.appliedCoupon).toBe("AYURVEDA50");
      expect(result.subtotal).toBe(1450);
      expect(result.discount).toBe(50);
      expect(result.total).toBe(1400);
    });

    it("unlocks free delivery with FREECOD when subtotal is below ₹499", () => {
      // 1 * Tanavai Tel = ₹200 (normally +₹50 shipping)
      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-tanavai-tel", quantity: 1 }],
        couponCode: "FREECOD",
      });

      expect(result.appliedCoupon).toBe("FREECOD");
      expect(result.subtotal).toBe(200);
      expect(result.shippingCharge).toBe(50);
      expect(result.discount).toBe(50); // Shipping waived
      expect(result.total).toBe(200);
    });

    it("rejects invalid or unauthorized coupon codes", () => {
      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
        couponCode: "HACK99",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("HACK99"))).toBe(true);
      expect(result.discount).toBe(0);
    });
  });

  // =========================================================================
  // 3. SHIPPING THRESHOLD (₹499 RULE)
  // =========================================================================
  describe("Shipping Calculation Thresholds", () => {
    it("charges ₹50 standard shipping fee when subtotal is below ₹499", () => {
      // 1 * Tanavai Tel = ₹200
      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-tanavai-tel", quantity: 1 }],
      });

      expect(result.subtotal).toBe(200);
      expect(result.shippingCharge).toBe(STANDARD_SHIPPING_FEE);
      expect(result.total).toBe(250);
    });

    it("applies free delivery when subtotal is exactly ₹499 or higher", () => {
      expect(FREE_SHIPPING_THRESHOLD).toBe(499);

      // 2 * Arq Abe Hayat = ₹500 (>= ₹499)
      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 2 }],
      });

      expect(result.subtotal).toBe(500);
      expect(result.shippingCharge).toBe(0);
      expect(result.total).toBe(500);
    });
  });

  // =========================================================================
  // 4. CUSTOMER INPUT VALIDATION & SANITIZATION
  // =========================================================================
  describe("Customer Input Validation", () => {
    it("rejects phone numbers with fewer than 10 digits", () => {
      const result = validateAndCalculateOrder({
        customer: { ...validCustomer, phone: "12345" },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("10 अंकों का मोबाइल नंबर"))).toBe(true);
    });

    it("rejects PIN codes with invalid lengths", () => {
      const result = validateAndCalculateOrder({
        customer: { ...validCustomer, pincode: "123" },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("6 अंकों का सही पिनकोड"))).toBe(true);
    });

    it("rejects addresses shorter than 5 characters", () => {
      const result = validateAndCalculateOrder({
        customer: { ...validCustomer, addressLine: "abc" },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("डिलीवरी पता"))).toBe(true);
    });

    it("rejects malformed email addresses", () => {
      const result = validateAndCalculateOrder({
        customer: { ...validCustomer, email: "invalid-email-address" },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("मान्य ईमेल पता"))).toBe(true);
    });
  });

  // =========================================================================
  // 5. INVENTORY & QUANTITY CONSISTENCY
  // =========================================================================
  describe("Quantity & Inventory Bounds", () => {
    it("clamps negative or zero quantity to 1", () => {
      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-arq-abe-hayat", quantity: -5 }],
      });

      expect(result.items[0]?.quantity).toBe(1);
      expect(result.items[0]?.lineTotal).toBe(250);
    });

    it("clamps excessive quantity to 99 maximum items per order", () => {
      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 500 }],
      });

      expect(result.items[0]?.quantity).toBe(99);
      expect(result.items[0]?.lineTotal).toBe(250 * 99);
    });
  });

  // =========================================================================
  // 6. SERVER-SIDE ADMIN AUTHENTICATION & RBAC
  // =========================================================================
  describe("Server Admin Authentication & Authorization", () => {
    it("rejects missing or empty tokens", () => {
      const result = verifyServerAdminToken(null);
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("Missing authentication token");
    });

    it("rejects short or invalid tokens", () => {
      const result = verifyServerAdminToken("12");
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("Invalid token format");
    });

    it("validates legitimate admin bearer tokens", () => {
      const result = verifyServerAdminToken("Bearer valid-admin-session-token-xyz");
      expect(result.authorized).toBe(true);
      expect(result.adminEmail).toBe("admin@shifa-a-hayat.com");
    });
  });

  // =========================================================================
  // 7. RATE LIMITING PROTECTION
  // =========================================================================
  describe("Rate Limiting Protection", () => {
    it("allows standard requests within threshold and enforces lockout after 5 failures", () => {
      const ip = "test-client-ip";

      // 4 failures allowed
      for (let i = 1; i <= 4; i++) {
        const res = adminRateLimiter.recordFailure(ip);
        expect(res.allowed).toBe(true);
        expect(res.remainingAttempts).toBe(5 - i);
      }

      // 5th failure triggers lockout
      const fifth = adminRateLimiter.recordFailure(ip);
      expect(fifth.allowed).toBe(false);
      expect(fifth.remainingAttempts).toBe(0);
      expect(fifth.lockoutRemainingSeconds).toBeGreaterThan(0);

      // Subsequent check also blocked
      const check = adminRateLimiter.check(ip);
      expect(check.allowed).toBe(false);
    });

    it("resets rate limiter upon successful authentication", () => {
      const ip = "test-client-ip";
      adminRateLimiter.recordFailure(ip);
      adminRateLimiter.recordFailure(ip);
      adminRateLimiter.reset(ip);

      const check = adminRateLimiter.check(ip);
      expect(check.allowed).toBe(true);
      expect(check.remainingAttempts).toBe(5);
    });
  });

  // =========================================================================
  // 8. AUDIT LOGGING & SAFE ERROR HANDLING
  // =========================================================================
  describe("Audit Trail & Safe Error Sanitization", () => {
    it("records admin audit logs with timestamp and entity details", () => {
      const log = logAdminAudit({
        adminEmail: "admin@shifa-a-hayat.com",
        action: "UPDATE_STOCK",
        entityType: "PRODUCT",
        entityId: "shifa-arq-abe-hayat",
        details: { newStockCount: 95 },
      });

      expect(log.id).toBeDefined();
      expect(log.action).toBe("UPDATE_STOCK");

      const logs = getAdminAuditLogs();
      expect(logs.some((l) => l.entityId === "shifa-arq-abe-hayat")).toBe(true);
    });

    it("masks sensitive database errors to protect infrastructure credentials", () => {
      const rawError = new Error("Connection failed: postgres://postgres:SecretPassword123@db.supabase.co:5432");
      const sanitized = sanitizeServerError(rawError);

      expect(sanitized).not.toContain("SecretPassword123");
      expect(sanitized).not.toContain("postgres://");
      expect(sanitized).toContain("सुरक्षा नीति के तहत सर्वर विवरण छुपाया गया है।");
    });

    it("preserves safe non-sensitive validation messages", () => {
      const safeError = new Error("Product ID not found in catalog");
      const sanitized = sanitizeServerError(safeError);

      expect(sanitized).toBe("Product ID not found in catalog");
    });
  });

  // =========================================================================
  // 9. WHATSAPP CHECKOUT VERIFICATION
  // =========================================================================
  describe("WhatsApp Order URL & Message Construction", () => {
    it("generates WhatsApp message with authentic telephone number +91 95860 37331", () => {
      expect(STORE_WHATSAPP_NUMBER).toBe("+91 95860 37331");

      const result = validateAndCalculateOrder({
        customer: validCustomer,
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(result.whatsAppUrl).toContain("919586037331");
      expect(result.whatsAppMessage).toContain("SHIFA A HAYAT — NEW ORDER REQUEST");
      expect(result.whatsAppMessage).toContain("Arif Khan");
      expect(result.whatsAppMessage).toContain("Arq Abe Hayat Drops");
      expect(result.whatsAppMessage).toContain("₹250");
    });
  });
});
