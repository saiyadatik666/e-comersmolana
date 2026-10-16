import { describe, it, expect, beforeEach } from "vitest";
import {
  AUTHORIZED_ADMIN_EMAIL,
  getAuthorizedAdminEmail,
  verifyPassword,
  hashPassword,
  getActiveAdminPasswordHash,
  updateActiveAdminPasswordHash,
  validatePasswordStrength,
  createAdminSession,
  revokeAdminSession,
  revokeAllAdminSessions,
  verifyAdminSessionToken,
  verifyServerAdminToken,
  isProductionCredentialConfigured,
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
  getAuditLogsSecure,
  changeAdminPasswordSecure,
  adminCheckEmailServerFn,
  adminLoginServerFn,
  adminGetSessionServerFn,
  adminLogoutServerFn,
  adminUpdateProductStockServerFn,
  adminUpdateOrderStatusServerFn,
  adminGetAuditLogsServerFn,
  adminChangePasswordServerFn,
} from "@/server/store-functions";
import { validateAndCalculateOrder } from "@/server/order-validator";
import { INITIAL_PRODUCTS } from "@/data/products";

describe("Shifa A Hayat — Secure Admin Authentication Suite", () => {
  const TEST_IP = "test-admin-auth-ip";
  const INITIAL_TEST_PASSWORD = "Inaytullah@9586";

  beforeEach(() => {
    adminRateLimiter.reset(TEST_IP);
    adminRateLimiter.reset("admin-client");
  });

  // =========================================================================
  // 1. AUTHORIZED ADMIN EMAIL VERIFICATION
  // =========================================================================
  describe("Authorized Admin Email", () => {
    it("recognizes inaytchaudhri@gmail.com as the default authorized admin email", () => {
      expect(getAuthorizedAdminEmail()).toBe("inaytchaudhri@gmail.com");
      expect(AUTHORIZED_ADMIN_EMAIL).toBe("inaytchaudhri@gmail.com");
    });

    it("accepts exact authorized email address via validateAdminEmail", () => {
      const res = validateAdminEmail("inaytchaudhri@gmail.com", TEST_IP);
      expect(res.authorized).toBe(true);
      expect(res.email).toBe("inaytchaudhri@gmail.com");
    });

    it("normalizes case and trims whitespace around the authorized email", () => {
      const res = validateAdminEmail("   InaytChaudhri@GMAIL.COM   ", TEST_IP);
      expect(res.authorized).toBe(true);
      expect(res.email).toBe("inaytchaudhri@gmail.com");
    });

    it("rejects unauthorized emails during step 1 email check", () => {
      expect(() =>
        validateAdminEmail("attacker@example.com", TEST_IP)
      ).toThrow("यह ईमेल अधिकृत व्यवस्थापक खाते के रूप में पंजीकृत नहीं है।");
    });

    it("rejects malformed email format", () => {
      expect(() =>
        validateAdminEmail("not-an-email", TEST_IP)
      ).toThrow("कृपया एक मान्य ईमेल पता दर्ज करें।");
    });
  });

  // =========================================================================
  // 2. PASSWORD HASHING & SCRYPT VERIFICATION
  // =========================================================================
  describe("Password Hashing & Scrypt Verification", () => {
    it("verifies the initial password against default scrypt hash", () => {
      const isValid = verifyPassword(INITIAL_TEST_PASSWORD);
      expect(isValid).toBe(true);
    });

    it("rejects incorrect passwords", () => {
      expect(verifyPassword("WrongPassword123")).toBe(false);
      expect(verifyPassword("inaytullah@9586")).toBe(false); // Case sensitive check
      expect(verifyPassword("")).toBe(false);
      expect(verifyPassword("123456")).toBe(false);
    });

    it("generates and verifies secure salted scrypt hashes dynamically", () => {
      const testPass = "NewSecretPassword@2026!";
      const generatedHash = hashPassword(testPass);

      expect(generatedHash.startsWith("scrypt:")).toBe(true);
      expect(verifyPassword(testPass, generatedHash)).toBe(true);
      expect(verifyPassword("WrongPass", generatedHash)).toBe(false);
    });

    it("retrieves the active admin password hash without exposing plain password", () => {
      const activeHash = getActiveAdminPasswordHash();
      expect(activeHash.startsWith("scrypt:")).toBe(true);
      expect(activeHash).not.toContain(INITIAL_TEST_PASSWORD);
    });
  });

  // =========================================================================
  // 3. STEP 2 LOGIN & SESSION GENERATION
  // =========================================================================
  describe("Admin Login Flow & Session Token Generation", () => {
    it("authenticates authorized email with correct password and generates signed session token", () => {
      const res = authenticateAdminCredentials(
        "inaytchaudhri@gmail.com",
        INITIAL_TEST_PASSWORD,
        TEST_IP
      );

      expect(res.success).toBe(true);
      expect(res.adminEmail).toBe("inaytchaudhri@gmail.com");
      expect(res.sessionToken).toBeDefined();
      expect(res.sessionToken.includes(".")).toBe(true);

      // Verify the generated token is accepted by session validator
      const check = verifyAdminSessionToken(res.sessionToken);
      expect(check.authorized).toBe(true);
      expect(check.adminEmail).toBe("inaytchaudhri@gmail.com");
    });

    it("rejects authorized email with incorrect password and records audit failure", () => {
      expect(() =>
        authenticateAdminCredentials(
          "inaytchaudhri@gmail.com",
          "WrongPassword999",
          TEST_IP
        )
      ).toThrow("अमान्य क्रेडेंशियल्स");

      const audits = getAdminAuditLogs();
      const lastAudit = audits[0];
      expect(lastAudit).toBeDefined();
      expect(lastAudit?.action).toBe("ADMIN_LOGIN_FAILED");
      expect(lastAudit?.adminEmail).toBe("inaytchaudhri@gmail.com");
    });

    it("rejects unauthorized email with any password", () => {
      expect(() =>
        authenticateAdminCredentials(
          "hacker@test.com",
          INITIAL_TEST_PASSWORD,
          TEST_IP
        )
      ).toThrow("यह ईमेल अधिकृत व्यवस्थापक खाते के रूप में पंजीकृत नहीं है।");
    });
  });

  // =========================================================================
  // 4. SESSION VALIDATION & REVOCATION (LOGOUT)
  // =========================================================================
  describe("Session Validation & Server-Side Revocation", () => {
    it("validates legitimate active sessions", () => {
      const token = createAdminSession("inaytchaudhri@gmail.com", TEST_IP);
      const verifyRes = verifyServerAdminToken(token);

      expect(verifyRes.authorized).toBe(true);
      expect(verifyRes.adminEmail).toBe("inaytchaudhri@gmail.com");
      expect(verifyRes.adminId).toBe("srv-admin-verified");

      const sessionStatus = getAdminSessionStatus(token);
      expect(sessionStatus.authenticated).toBe(true);
      expect(sessionStatus.adminEmail).toBe("inaytchaudhri@gmail.com");
    });

    it("rejects tampered token signature", () => {
      const token = createAdminSession("inaytchaudhri@gmail.com", TEST_IP);
      const [payload, sig = ""] = token.split(".");
      const tamperedToken = `${payload}.${sig.slice(0, -3)}abc`;

      const verifyRes = verifyServerAdminToken(tamperedToken);
      expect(verifyRes.authorized).toBe(false);
      expect(verifyRes.error).toContain("Invalid or expired admin credentials");
    });

    it("rejects sessions created for unauthorized email", () => {
      const unauthorizedToken = createAdminSession("intruder@example.com", TEST_IP);
      const verifyRes = verifyAdminSessionToken(unauthorizedToken);

      expect(verifyRes.authorized).toBe(false);
      expect(verifyRes.error).toContain("Email address is not authorized");
    });

    it("revokes session on logout so subsequent requests are blocked", () => {
      const token = createAdminSession("inaytchaudhri@gmail.com", TEST_IP);
      expect(verifyServerAdminToken(token).authorized).toBe(true);

      // Perform logout
      const logoutRes = logoutAdminSession(token, TEST_IP);
      expect(logoutRes.success).toBe(true);

      // Verify the revoked session is now rejected
      const afterLogout = verifyServerAdminToken(token);
      expect(afterLogout.authorized).toBe(false);
      expect(afterLogout.error).toContain("terminated or logged out");

      const sessionStatus = getAdminSessionStatus(token);
      expect(sessionStatus.authenticated).toBe(false);
    });
  });

  // =========================================================================
  // 5. RATE LIMITING & LOCKOUT DEFENSE
  // =========================================================================
  describe("Rate Limiting & Lockout Defense", () => {
    it("enforces temporary lockout after repeated failed attempts", () => {
      const testIp = "brute-force-attacker-ip";
      adminRateLimiter.reset(testIp);

      for (let i = 1; i <= 4; i++) {
        const attempt = adminRateLimiter.recordFailure(testIp);
        expect(attempt.allowed).toBe(true);
        expect(attempt.remainingAttempts).toBe(5 - i);
      }

      // 5th failure triggers lockout
      const fifthAttempt = adminRateLimiter.recordFailure(testIp);
      expect(fifthAttempt.allowed).toBe(false);
      expect(fifthAttempt.remainingAttempts).toBe(0);
      expect(fifthAttempt.lockoutRemainingSeconds).toBeGreaterThan(0);

      // Subsequent check confirms lockout
      const blockedCheck = adminRateLimiter.check(testIp);
      expect(blockedCheck.allowed).toBe(false);

      // Cleanup
      adminRateLimiter.reset(testIp);
    });
  });

  // =========================================================================
  // 6. PROTECTED ADMINISTRATIVE APIS
  // =========================================================================
  describe("Administrative API Protection", () => {
    it("blocks unauthenticated product stock modification (requires valid session)", () => {
      expect(() =>
        updateProductStockSecure("shifa-arq-abe-hayat", 50, "unauthorized-token", TEST_IP)
      ).toThrow(/Unauthorized/i);
    });

    it("blocks unauthenticated order status updates", () => {
      expect(() =>
        updateOrderStatusSecure("ord-test-123", "Shipped", undefined, TEST_IP)
      ).toThrow(/Unauthorized/i);
    });

    it("blocks unauthenticated audit log access", () => {
      expect(() =>
        getAuditLogsSecure("invalid-token")
      ).toThrow(/Unauthorized/i);
    });

    it("allows authorized admin with valid session token to execute administrative functions", () => {
      const sessionToken = createAdminSession("inaytchaudhri@gmail.com", TEST_IP);

      const stockResult = updateProductStockSecure(
        "shifa-arq-abe-hayat",
        25,
        sessionToken,
        TEST_IP
      );

      expect(stockResult.success).toBe(true);
      expect(stockResult.productId).toBe("shifa-arq-abe-hayat");
      expect(stockResult.updatedStock).toBe(25);

      const logsResult = getAuditLogsSecure(sessionToken);

      expect(Array.isArray(logsResult.logs)).toBe(true);
      expect(logsResult.logs.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 7. CUSTOMER STOREFRONT ACCESSIBILITY
  // =========================================================================
  describe("Customer Storefront Accessibility", () => {
    it("allows ordinary customers to calculate and validate orders without admin token", () => {
      const arq = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat")!;
      const customerOrder = validateAndCalculateOrder({
        customer: {
          fullName: "Customer Demo",
          phone: "9825123456",
          addressLine: "Palanpur City",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
          country: "India",
          email: "customer@example.com",
        },
        items: [{ productId: arq.id, quantity: 1 }],
        origin: "https://shifa-a-hayat.com",
      });

      expect(customerOrder.isValid).toBe(true);
      expect(customerOrder.subtotal).toBe(arq.price);
      expect(customerOrder.shippingCharge).toBe(50);
      expect(customerOrder.total).toBe(arq.price + 50); // ₹50 shipping below threshold
    });
  });

  // =========================================================================
  // 8. PASSWORD POLICY & ROTATION SUITE
  // =========================================================================
  describe("Password Policy & Rotation Suite", () => {
    it("validates password strength rules strictly", () => {
      // Too short
      expect(validatePasswordStrength("Short1!").valid).toBe(false);
      // No uppercase
      expect(validatePasswordStrength("nouppercase123!").valid).toBe(false);
      // No lowercase
      expect(validatePasswordStrength("NOLOWERCASE123!").valid).toBe(false);
      // No numbers
      expect(validatePasswordStrength("NoNumbersHere!@#").valid).toBe(false);
      // No special characters
      expect(validatePasswordStrength("NoSpecialChar12345").valid).toBe(false);
      // Valid strong password
      expect(validatePasswordStrength("ShifaSecure@2026!").valid).toBe(true);
    });

    it("rejects password change from unauthenticated caller", () => {
      expect(() =>
        changeAdminPasswordSecure(
          INITIAL_TEST_PASSWORD,
          "NewSecretPass@999!",
          "invalid-session-token",
          TEST_IP
        )
      ).toThrow(/Unauthorized/i);
    });

    it("rejects password change when current password is wrong", () => {
      const token = createAdminSession("inaytchaudhri@gmail.com", TEST_IP);
      expect(() =>
        changeAdminPasswordSecure(
          "WrongCurrentPassword123!",
          "NewSecretPass@999!",
          token,
          TEST_IP
        )
      ).toThrow("वर्तमान पासवर्ड अमान्य है।");
    });

    it("rejects password change when new password is weak or same as current", () => {
      const token = createAdminSession("inaytchaudhri@gmail.com", TEST_IP);

      // Weak new password
      expect(() =>
        changeAdminPasswordSecure(INITIAL_TEST_PASSWORD, "simple", token, TEST_IP)
      ).toThrow("नया पासवर्ड कम से कम 10 अक्षरों का होना चाहिए।");

      // Same as current password
      expect(() =>
        changeAdminPasswordSecure(
          INITIAL_TEST_PASSWORD,
          INITIAL_TEST_PASSWORD,
          token,
          TEST_IP
        )
      ).toThrow("नया पासवर्ड वर्तमान पासवर्ड से भिन्न होना चाहिए।");
    });

    it("successfully rotates password and invalidates old credentials & other sessions", () => {
      const primarySession = createAdminSession("inaytchaudhri@gmail.com", TEST_IP);
      const otherStaleSession = createAdminSession("inaytchaudhri@gmail.com", "other-ip");

      // Other session is active before rotation
      expect(verifyServerAdminToken(otherStaleSession).authorized).toBe(true);

      const NEW_PASSWORD = "ShifaRotated@2026Safe!";
      const result = changeAdminPasswordSecure(
        INITIAL_TEST_PASSWORD,
        NEW_PASSWORD,
        primarySession,
        TEST_IP
      );

      expect(result.success).toBe(true);
      expect(result.otherSessionsRevoked).toBeGreaterThanOrEqual(1);

      // Verify that the NEW password now validates
      expect(verifyPassword(NEW_PASSWORD)).toBe(true);

      // Verify that the OLD password is now strictly rejected
      expect(verifyPassword(INITIAL_TEST_PASSWORD)).toBe(false);

      // Verify that the other stale session was invalidated
      expect(verifyServerAdminToken(otherStaleSession).authorized).toBe(false);

      // Verify that new logins work with the NEW password
      const newLogin = authenticateAdminCredentials(
        "inaytchaudhri@gmail.com",
        NEW_PASSWORD,
        TEST_IP
      );
      expect(newLogin.success).toBe(true);

      // Verify old password fails login
      expect(() =>
        authenticateAdminCredentials(
          "inaytchaudhri@gmail.com",
          INITIAL_TEST_PASSWORD,
          TEST_IP
        )
      ).toThrow("अमान्य क्रेडेंशियल्स");

      // Cleanup: revert runtime hash back to default for other test suites
      updateActiveAdminPasswordHash(
        "scrypt:shifa_salt_9586_inaytullah_palanpur:38c040255cf432ffb6e9174b8dd0e796b4c289ac2e18289abb7fffa2b2e8b4571fca3d6245bc199c4868623f2ad440306ff48680c7f1493b4495a8177a519459"
      );
    });
  });

  // =========================================================================
  // 9. SERVER FUNCTION CONTRACTS
  // =========================================================================
  describe("Server Functions Export Verification", () => {
    it("exports all required TanStack server functions including change password", () => {
      expect(typeof adminCheckEmailServerFn).toBe("function");
      expect(typeof adminLoginServerFn).toBe("function");
      expect(typeof adminGetSessionServerFn).toBe("function");
      expect(typeof adminLogoutServerFn).toBe("function");
      expect(typeof adminUpdateProductStockServerFn).toBe("function");
      expect(typeof adminUpdateOrderStatusServerFn).toBe("function");
      expect(typeof adminGetAuditLogsServerFn).toBe("function");
      expect(typeof adminChangePasswordServerFn).toBe("function");
    });
  });
});
