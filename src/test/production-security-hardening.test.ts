import { describe, it, expect, beforeEach } from "vitest";
import {
  verifyServerAdminToken,
  safeTokenCompare,
  logAdminAudit,
  getAdminAuditLogs,
  sanitizeServerError,
  adminRateLimiter,
} from "@/server/admin-auth";
import {
  validateAndCalculateOrder,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  STORE_WHATSAPP_NUMBER,
} from "@/server/order-validator";
import { applySecurityHeaders } from "@/server";
import { INITIAL_PRODUCTS } from "@/data/products";

describe("Part 18 — Production Security Hardening & Application Security Suite", () => {
  const baseCustomer = {
    fullName: "Mohammad Irfan",
    phone: "9825012345",
    addressLine: "Station Road, Near Jama Masjid",
    cityVillage: "Palanpur",
    state: "Gujarat",
    pincode: "385001",
    country: "India",
    email: "irfan@example.com",
  };

  beforeEach(() => {
    adminRateLimiter.reset("test-sec-ip");
  });

  // =========================================================================
  // 1. ADMIN TOKEN SECURITY & CONSTANT-TIME VERIFICATION
  // =========================================================================
  describe("Admin Token Security & Timing-Safe Verification", () => {
    it("strictly rejects arbitrary attacker tokens and invalid credentials", () => {
      const attackerToken1 = verifyServerAdminToken("Bearer 12345");
      expect(attackerToken1.authorized).toBe(false);
      expect(attackerToken1.error).toContain("Invalid or expired admin credentials");

      const attackerToken2 = verifyServerAdminToken("Bearer random-guess-attacker-token");
      expect(attackerToken2.authorized).toBe(false);
      expect(attackerToken2.error).toContain("Invalid or expired admin credentials");
    });

    it("rejects missing, null, or malformed short tokens", () => {
      expect(verifyServerAdminToken(null).authorized).toBe(false);
      expect(verifyServerAdminToken("").authorized).toBe(false);
      expect(verifyServerAdminToken("Bearer 12").authorized).toBe(false);
    });

    it("accepts valid authorized session tokens", () => {
      const valid = verifyServerAdminToken("Bearer valid-admin-session-token-xyz");
      expect(valid.authorized).toBe(true);
      expect(valid.adminEmail).toBe("admin@shifa-a-hayat.com");
      expect(valid.adminId).toBe("srv-admin-verified");
    });

    it("performs constant-time string comparison without leaking timing data", () => {
      expect(safeTokenCompare("shifa_secret_token", "shifa_secret_token")).toBe(true);
      expect(safeTokenCompare("shifa_secret_token", "shifa_secret_wrong")).toBe(false);
      expect(safeTokenCompare("short", "longer_secret_token")).toBe(false);
    });
  });

  // =========================================================================
  // 2. AUDIT LOG PII MASKING & SENSITIVE DATA DEFENSE
  // =========================================================================
  describe("Audit Log PII Sanitization", () => {
    it("automatically masks customer phone numbers, passwords, and tokens in audit details", () => {
      const entry = logAdminAudit({
        adminEmail: "security-auditor@shifa-a-hayat.com",
        action: "CUSTOMER_CONSULTATION",
        entityType: "CUSTOMER",
        entityId: "cust-9825",
        details: {
          customerPhone: "9825012345",
          adminPin: "9586",
          normalField: "Palanpur",
        },
      });

      expect(entry.details?.["normalField"]).toBe("Palanpur");
      // Phone number and PIN must be masked
      expect(entry.details?.["customerPhone"]).not.toBe("9825012345");
      expect(String(entry.details?.["customerPhone"])).toContain("****");
      expect(entry.details?.["adminPin"]).toBe("****");
    });
  });

  // =========================================================================
  // 3. SERVER ERROR SANITIZATION (PREVENTS INFRASTRUCTURE LEAKS)
  // =========================================================================
  describe("Server Error Sanitization", () => {
    it("suppresses database connection strings and secret keys from leaked errors", () => {
      const dbError = new Error("Connection failed to postgres://user:SuperSecretPassword@aws.supabase.co:5432");
      const sanitized = sanitizeServerError(dbError);

      expect(sanitized).not.toContain("SuperSecretPassword");
      expect(sanitized).not.toContain("postgres://");
      expect(sanitized).toContain("सुरक्षा नीति के तहत सर्वर विवरण छुपाया गया है।");
    });

    it("suppresses API key and Supabase service role leak attempts", () => {
      const apiError = new Error("Invalid apikey supabase_service_role key provided");
      const sanitized = sanitizeServerError(apiError);

      expect(sanitized).toContain("सुरक्षा नीति के तहत सर्वर विवरण छुपाया गया है।");
    });
  });

  // =========================================================================
  // 4. ORDER INPUT SANITIZATION & BOUNDS ENFORCEMENT
  // =========================================================================
  describe("Order Input Sanitization & Boundary Defense", () => {
    it("strips non-printable ASCII control characters from customer inputs", () => {
      const dirtyCustomer = {
        ...baseCustomer,
        fullName: "Mohammad\x00\x08\x1FIrfan",
        addressLine: "Station\x0C\x0BRoad, Palanpur",
      };

      const result = validateAndCalculateOrder({
        customer: dirtyCustomer,
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(result.isValid).toBe(true);
      expect(result.customer.fullName).toBe("MohammadIrfan");
      expect(result.customer.addressLine).toBe("StationRoad, Palanpur");
    });

    it("rejects phone numbers exceeding 13 digits", () => {
      const result = validateAndCalculateOrder({
        customer: { ...baseCustomer, phone: "9825012345678901" }, // 16 digits
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("13 अंकों से अधिक नहीं हो सकता"))).toBe(true);
    });

    it("validates origin URL and rejects unsafe protocols", () => {
      const result = validateAndCalculateOrder({
        customer: baseCustomer,
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
        origin: "javascript:alert(1)",
      });

      // Must fall back to trusted store domain
      expect(result.whatsAppUrl).toContain("https%3A%2F%2Fshifa-a-hayat.com%2Fproduct%2Fshifa-arq-abe-hayat");
      expect(result.whatsAppUrl).not.toContain("javascript:");
    });
  });

  // =========================================================================
  // 5. HTTP DEFENSE-IN-DEPTH SECURITY HEADERS
  // =========================================================================
  describe("HTTP Security Headers (Server SSR)", () => {
    it("applies mandatory security headers to server responses", () => {
      const mockResponse = new Response("<h1>Shifa A Hayat</h1>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });

      const secured = applySecurityHeaders(mockResponse);
      const headers = secured.headers;

      expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
      expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(headers.get("Permissions-Policy")).toContain("camera=()");
      expect(headers.get("X-XSS-Protection")).toBe("1; mode=block");
    });
  });

  // =========================================================================
  // 6. BUSINESS LOGIC & CATALOG INVARIANCE
  // =========================================================================
  describe("Business Logic & Catalog Invariance Under Security Hardening", () => {
    it("verifies 21 authentic catalog products remain intact", () => {
      expect(INITIAL_PRODUCTS.length).toBe(21);
      const zafrani = INITIAL_PRODUCTS.find((p) => p.id === "shifa-zafrani-gold")!;
      const arq = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat")!;
      const tanavai = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel")!;
      const dimagi = INITIAL_PRODUCTS.find((p) => p.id === "shifa-dimagi-tonic")!;

      expect(zafrani.price).toBe(1450);
      expect(arq.price).toBe(250);
      expect(tanavai.price).toBe(200);
      expect(dimagi.price).toBe(420);
    });

    it("verifies free shipping threshold ₹499 and helpline +91 95860 37331", () => {
      expect(FREE_SHIPPING_THRESHOLD).toBe(499);
      expect(STANDARD_SHIPPING_FEE).toBe(50);
      expect(STORE_WHATSAPP_NUMBER).toBe("+91 95860 37331");
    });
  });
});
