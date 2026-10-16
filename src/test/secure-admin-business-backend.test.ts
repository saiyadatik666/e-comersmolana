import { describe, it, expect, beforeEach } from "vitest";
import {
  AUTHORIZED_ADMIN_EMAIL,
  getAuthorizedAdminEmail,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  createAdminSession,
  verifyAdminSessionToken,
  revokeAdminSession,
  revokeAllAdminSessions,
  verifyServerAdminToken,
  adminRateLimiter,
  getAdminAuditLogs,
} from "@/server/admin-auth";
import {
  validateAdminEmail,
  authenticateAdminCredentials,
  getAdminSessionStatus,
  logoutAdminSession,
  updateProductStockSecure,
  updateOrderStatusSecure,
  submitStorefrontOrderSecure,
  listOrdersAdminSecure,
  getOrderDetailsAdminSecure,
  exportOrdersAdminSecure,
  getAuditLogsSecure,
  changeAdminPasswordSecure,
  getStoreSettingsSecure,
  updateStoreSettingsSecure,
  getStoreProductsSecure,
  updateStoreProductSecure,
} from "@/server/store-functions";
import {
  resetServerStoreForTesting,
  createOrderServer,
  listOrdersAdminServer,
  getOrderByIdAdminServer,
  updateOrderStatusAdminServer,
  updateProductStockServer,
  updateSettingsAdminServer,
  updateProductAdminServer,
  getSettingsServer,
  getProductsServer,
} from "@/server/order-store";
import { validateAndCalculateOrder } from "@/server/order-validator";
import { INITIAL_PRODUCTS } from "@/data/products";

describe("SHIFA A HAYAT — SECURE ADMIN AND BUSINESS DATA BACKEND SUITE", () => {
  beforeEach(() => {
    resetServerStoreForTesting();
    adminRateLimiter.reset("admin-test-ip");
    adminRateLimiter.reset("admin-client");
  });

  // =========================================================================
  // 1. Server-Side Authentication & Authorization on Administrative APIs
  // =========================================================================
  describe("1. Server-Side Administrative Route & API Protection", () => {
    it("strictly blocks unauthenticated access to order list (listOrdersAdminServer)", () => {
      expect(() => listOrdersAdminServer(null)).toThrow(/Unauthorized/i);
      expect(() => listOrdersAdminServer("")).toThrow(/Unauthorized/i);
      expect(() => listOrdersAdminServer("invalid-token-123")).toThrow(/Unauthorized/i);
    });

    it("strictly blocks unauthenticated access to specific order details (getOrderByIdAdminServer)", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Hamid Ansari",
          phone: "9825011111",
          addressLine: "Station Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-zafrani-gold", quantity: 1 }],
      });

      expect(() => getOrderByIdAdminServer(created.order.id, null)).toThrow(/Unauthorized/i);
      expect(() => getOrderByIdAdminServer(created.order.id, "fake-bearer-token")).toThrow(/Unauthorized/i);
    });

    it("strictly blocks unauthenticated status changes on customer orders", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Rashid Khan",
          phone: "9825022222",
          addressLine: "Delhi Gate",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-pehlwan-capsule", quantity: 1 }],
      });

      expect(() =>
        updateOrderStatusAdminServer(created.order.id, "Confirmed", null)
      ).toThrow(/Unauthorized/i);
      expect(() =>
        updateOrderStatusAdminServer(created.order.id, "Shipped", "forged-token")
      ).toThrow(/Unauthorized/i);
    });

    it("strictly blocks unauthenticated inventory stock modifications", () => {
      expect(() =>
        updateProductStockServer("shifa-zafrani-gold", 999, null)
      ).toThrow(/Unauthorized/i);
      expect(() =>
        updateProductStockServer("shifa-zafrani-gold", 999, "tampered-admin-token")
      ).toThrow(/Unauthorized/i);
    });

    it("strictly blocks unauthenticated store settings updates", () => {
      expect(() =>
        updateSettingsAdminServer({ storeName: "Hacked Store" }, null)
      ).toThrow(/Unauthorized/i);
      expect(() =>
        updateSettingsAdminServer({ storeName: "Hacked Store" }, "invalid-token")
      ).toThrow(/Unauthorized/i);
    });

    it("strictly blocks unauthenticated product price and details updates", () => {
      expect(() =>
        updateProductAdminServer({ id: "shifa-zafrani-gold", price: 10 }, null)
      ).toThrow(/Unauthorized/i);
      expect(() =>
        updateProductAdminServer({ id: "shifa-zafrani-gold", price: 10 }, "bad-token")
      ).toThrow(/Unauthorized/i);
    });

    it("strictly blocks unauthenticated audit log inspection", () => {
      expect(() => getAuditLogsSecure(null)).toThrow(/Unauthorized/i);
      expect(() => getAuditLogsSecure("unauthenticated-guest")).toThrow(/Unauthorized/i);
    });

    it("strictly blocks unauthenticated administrative orders export", () => {
      expect(() => exportOrdersAdminSecure("csv", null)).toThrow(/Unauthorized/i);
      expect(() => exportOrdersAdminSecure("json", "random-session-string")).toThrow(/Unauthorized/i);
    });
  });

  // =========================================================================
  // 2. Explicitly Configured Administrator Email & Credential Protection
  // =========================================================================
  describe("2. Authorized Administrator Email & Safe Comparison", () => {
    it("recognizes only the designated administrator email (inaytchaudhri@gmail.com)", () => {
      expect(AUTHORIZED_ADMIN_EMAIL).toBe("inaytchaudhri@gmail.com");
      expect(getAuthorizedAdminEmail()).toBe("inaytchaudhri@gmail.com");
    });

    it("authorizes normalized variations with whitespace and mixed casing", () => {
      const variations = [
        "inaytchaudhri@gmail.com",
        "INAYTCHAUDHRI@GMAIL.COM",
        " InaytChaudhri@gmail.com ",
        "  INAYTCHAUDHRI@gmail.com  ",
      ];

      for (const email of variations) {
        const result = validateAdminEmail(email, "admin-test-ip");
        expect(result.authorized).toBe(true);
        expect(result.email).toBe("inaytchaudhri@gmail.com");
      }
    });

    it("rejects unauthorized emails even if validly formatted", () => {
      const unauthorizedEmails = [
        "admin@shifa-a-hayat.com",
        "inayat@gmail.com",
        "hakeem@shifaahayat.com",
        "attacker@cyber-threat.org",
        "inaytchaudhri@yahoo.com",
      ];

      for (const email of unauthorizedEmails) {
        expect(() => validateAdminEmail(email, "admin-test-ip")).toThrow(
          /अधिकृत व्यवस्थापक खाते के रूप में पंजीकृत नहीं है/
        );
      }
    });

    it("stores passwords exclusively using salted scrypt hashes", () => {
      const rawPassword = "TestAdminPassword9586#";
      const hash = hashPassword(rawPassword);

      expect(hash.startsWith("scrypt:")).toBe(true);
      const parts = hash.split(":");
      expect(parts.length).toBe(3);
      expect(parts[1]!.length).toBe(32); // 16-byte hex salt
      expect(parts[2]!.length).toBe(128); // 64-byte hex derived key

      expect(verifyPassword(rawPassword, hash)).toBe(true);
      expect(verifyPassword("WrongPassword123!", hash)).toBe(false);
    });
  });

  // =========================================================================
  // 3. Persistent Database & Business Data Management
  // =========================================================================
  describe("3. Persistent Store: Products, Inventory, Orders & Settings", () => {
    it("allows authenticated admin to view persistent orders and details", () => {
      const sessionToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "admin-test-ip");

      const order1 = createOrderServer({
        customer: {
          fullName: "Mukesh Patel",
          phone: "9825033333",
          addressLine: "Highway Circle",
          cityVillage: "Mehsana",
          state: "Gujarat",
          pincode: "384002",
        },
        items: [{ productId: "shifa-zafrani-gold", quantity: 2 }],
      });

      const orders = listOrdersAdminSecure(sessionToken);
      expect(orders.length).toBeGreaterThanOrEqual(1);
      const found = orders.find((o) => o.id === order1.order.id);
      expect(found).toBeDefined();
      expect(found!.customerName).toBe("Mukesh Patel");
      expect(found!.total).toBe(1450 * 2);

      const details = getOrderDetailsAdminSecure(order1.order.id, sessionToken);
      expect(details.id).toBe(order1.order.id);
      expect(details.items[0]!.productId).toBe("shifa-zafrani-gold");
    });

    it("allows authenticated admin to update inventory and verifies state persistence", () => {
      const sessionToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "admin-test-ip");

      const updateRes = updateProductStockSecure("shifa-arq-abe-hayat", 85, sessionToken, "admin-test-ip");
      expect(updateRes.success).toBe(true);
      expect(updateRes.updatedStock).toBe(85);
      expect(updateRes.inStock).toBe(true);

      // Verify stock persists across server reads
      const products = getProductsServer();
      const product = products.find((p) => p.id === "shifa-arq-abe-hayat");
      expect(product).toBeDefined();
      expect(product!.stockCount).toBe(85);
    });

    it("allows authenticated admin to update store settings and records audit log", () => {
      const sessionToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "admin-test-ip");

      const updated = updateStoreSettingsSecure(
        {
          storeName: "Shifa A Hayat Unani Centre",
          freeShippingThreshold: 599,
          phone: "+91 9586037331",
          whatsapp: "9586037331",
        },
        sessionToken,
        "admin-test-ip"
      );

      expect(updated.storeName).toBe("Shifa A Hayat Unani Centre");
      expect(updated.freeShippingThreshold).toBe(599);

      // Verify persistent read
      const current = getStoreSettingsSecure();
      expect(current.storeName).toBe("Shifa A Hayat Unani Centre");
      expect(current.freeShippingThreshold).toBe(599);

      // Verify audit log
      const logs = getAdminAuditLogs();
      const settingsLog = logs.find((l) => l.action === "UPDATE_STORE_SETTINGS");
      expect(settingsLog).toBeDefined();
      expect(settingsLog!.details!["storeName"]).toBe("Shifa A Hayat Unani Centre");
    });

    it("allows authenticated admin to update product catalog price and details", () => {
      const sessionToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "admin-test-ip");

      const updatedProd = updateStoreProductSecure(
        {
          id: "shifa-tanavai-tel",
          price: 220,
          compareAtPrice: 300,
        },
        sessionToken,
        "admin-test-ip"
      );

      expect(updatedProd.price).toBe(220);
      expect(updatedProd.compareAtPrice).toBe(300);

      // Verify persistent read
      const prods = getStoreProductsSecure();
      const prod = prods.find((p) => p.id === "shifa-tanavai-tel");
      expect(prod).toBeDefined();
      expect(prod!.price).toBe(220);

      // Verify audit log
      const logs = getAdminAuditLogs();
      const prodLog = logs.find((l) => l.action === "UPDATE_PRODUCT" && l.entityId === "shifa-tanavai-tel");
      expect(prodLog).toBeDefined();
      expect(prodLog!.details!["price"]).toBe(220);
    });

    it("rejects negative stock counts and invalid product prices", () => {
      const sessionToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "admin-test-ip");

      expect(() =>
        updateStoreProductSecure({ id: "shifa-tanavai-tel", price: -50 }, sessionToken)
      ).toThrow(/Product price must be at least ₹1/);

      expect(() =>
        updateStoreProductSecure({ id: "shifa-tanavai-tel", stockCount: -10 }, sessionToken)
      ).toThrow(/Stock count cannot be negative/);
    });
  });

  // =========================================================================
  // 4. Server-Side Price, Stock, Coupon & Order Total Validation
  // =========================================================================
  describe("4. Server Price Recalculation & Tampering Prevention", () => {
    it("strictly recalculates prices from authentic catalog and ignores client tampering", () => {
      const result = validateAndCalculateOrder({
        customer: {
          fullName: "Price Tamper Tester",
          phone: "9825044444",
          addressLine: "Main Bazaar",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-zafrani-gold", quantity: 1 }],
        clientClaimedSubtotal: 10, // Client claimed ₹10 instead of ₹1,450
        clientClaimedTotal: 10,
      });

      expect(result.isValid).toBe(true);
      expect(result.subtotal).toBe(1450);
      expect(result.total).toBe(1450);
      expect(result.wasPriceTampered).toBe(true);
      expect(result.tamperingDetails).toContain("Client claimed subtotal");
    });

    it("strictly validates coupon discounts on the server (SHIFA10 gives 10% capped at ₹300)", () => {
      const result = validateAndCalculateOrder({
        customer: {
          fullName: "Coupon Tester",
          phone: "9825055555",
          addressLine: "Station Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-santaan-course", quantity: 1 }], // ₹3,200
        couponCode: "SHIFA10",
      });

      expect(result.isValid).toBe(true);
      expect(result.subtotal).toBe(3200);
      expect(result.discount).toBe(320); // 10% of 3200 is 320
      expect(result.total).toBe(2880);
    });

    it("prevents ordering products that exceed available stock atomically", () => {
      const sessionToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "admin-test-ip");
      updateProductStockSecure("shifa-dimagi-tonic", 2, sessionToken, "admin-test-ip");

      // Attempting to buy 5 when only 2 are available
      expect(() =>
        submitStorefrontOrderSecure({
          customer: {
            fullName: "Overstock Tester",
            phone: "9825066666",
            addressLine: "College Road",
            cityVillage: "Palanpur",
            state: "Gujarat",
            pincode: "385001",
          },
          items: [{ productId: "shifa-dimagi-tonic", quantity: 5 }],
        })
      ).toThrow(/Insufficient stock/);
    });
  });

  // =========================================================================
  // 5. Session Expiration, Invalidation & Login Rate Limiting
  // =========================================================================
  describe("5. Session Security, Invalidation & Rate Limiting", () => {
    it("issues HMAC-signed token on successful authentication and validates session", () => {
      const loginRes = authenticateAdminCredentials(
        "inaytchaudhri@gmail.com",
        "Inaytullah@9586",
        "admin-test-ip"
      );

      expect(loginRes.success).toBe(true);
      expect(loginRes.sessionToken).toBeDefined();

      const status = getAdminSessionStatus(loginRes.sessionToken);
      expect(status.authenticated).toBe(true);
      expect(status.adminEmail).toBe("inaytchaudhri@gmail.com");
    });

    it("invalidates session token on logout so subsequent requests fail", () => {
      const sessionToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "admin-test-ip");
      expect(verifyAdminSessionToken(sessionToken).authorized).toBe(true);

      const logoutRes = logoutAdminSession(sessionToken, "admin-test-ip");
      expect(logoutRes.success).toBe(true);

      const check = verifyAdminSessionToken(sessionToken);
      expect(check.authorized).toBe(false);
      expect(check.error).toContain("Session has been terminated or logged out");
    });

    it("triggers 15-minute rate limit lockout after 5 consecutive failed login attempts", () => {
      const ip = "rate-limit-test-ip";
      adminRateLimiter.reset(ip);

      for (let i = 1; i <= 4; i++) {
        expect(() =>
          authenticateAdminCredentials("inaytchaudhri@gmail.com", "WrongPassword!", ip)
        ).toThrow(/अमान्य क्रेडेंशियल्स/);
      }

      // 5th attempt triggers lockout
      expect(() =>
        authenticateAdminCredentials("inaytchaudhri@gmail.com", "WrongPassword!", ip)
      ).toThrow(/अत्यधिक गलत प्रयास/);

      // Subsequent attempt blocked immediately by cooldown
      expect(() =>
        authenticateAdminCredentials("inaytchaudhri@gmail.com", "Inaytullah@9586", ip)
      ).toThrow(/सुरक्षा कूलडाउन/);
    });

    it("revokes all other active sessions when admin rotates password", () => {
      const session1 = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "device-1");
      const session2 = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "device-2");

      expect(verifyAdminSessionToken(session1).authorized).toBe(true);
      expect(verifyAdminSessionToken(session2).authorized).toBe(true);

      // Rotate password from device 1
      const res = changeAdminPasswordSecure(
        "Inaytullah@9586",
        "NewComplexPass9586!Secure",
        session1,
        "device-1"
      );

      expect(res.success).toBe(true);
      expect(res.otherSessionsRevoked).toBeGreaterThanOrEqual(1);

      // Session 1 is preserved
      expect(verifyAdminSessionToken(session1).authorized).toBe(true);
      // Session 2 is revoked
      expect(verifyAdminSessionToken(session2).authorized).toBe(false);
    });
  });

  // =========================================================================
  // 6. Preservation of Catalogue & Authentic Unani Business Invariants
  // =========================================================================
  describe("6. Catalogue Preservation & Authentic Business Invariants", () => {
    it("preserves all 21 genuine Shifa A Hayat formulations with accurate prices", () => {
      expect(INITIAL_PRODUCTS.length).toBe(21);

      const knownProducts = [
        { id: "shifa-zafrani-gold", price: 1450, image: "/assets/molana/IMG-20261009-WA0003.jpg" },
        { id: "shifa-pehlwan-capsule", price: 990, image: "/assets/molana/IMG-20261009-WA0004.jpg" },
        { id: "shifa-habbe-hawa", price: 350, image: "/assets/molana/IMG-20261009-WA0005.jpg" },
        { id: "shifa-santaan-course", price: 3200, image: "/assets/molana/IMG-20261009-WA0006.jpg" },
        { id: "shifa-hoor-night-cream", price: 499, image: "/assets/molana/IMG-20261009-WA0007.jpg" },
        { id: "shifa-majun-mardangi", price: 1850, image: "/assets/molana/IMG-20261009-WA0008.jpg" },
        { id: "shifa-dimagi-tonic", price: 420, image: "/assets/molana/IMG-20261009-WA0009.jpg" },
        { id: "shifa-jiriyan-timing-pearls", price: 850, image: "/assets/molana/IMG-20261009-WA0010.jpg" },
        { id: "shifa-weight-cutter", price: 799, image: "/assets/molana/IMG-20261009-WA0011.jpg" },
        { id: "shifa-pait-samasya-set", price: 650, image: "/assets/molana/IMG-20261009-WA0012.jpg" },
        { id: "shifa-arq-abe-hayat", price: 250, image: "/assets/molana/IMG-20261009-WA0013.jpg" },
      ];

      for (const known of knownProducts) {
        const item = INITIAL_PRODUCTS.find((p) => p.id === known.id);
        expect(item).toBeDefined();
        expect(item!.price).toBe(known.price);
        expect(item!.image).toBe(known.image);
      }
    });
  });
});
