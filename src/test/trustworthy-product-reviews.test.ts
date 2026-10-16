import { describe, it, expect, beforeEach } from "vitest";
import {
  submitProductReviewServer,
  getProductReviewsServer,
  adminListReviewsServer,
  adminModerateReviewServer,
  adminDeleteReviewServer,
  calculateProductReviewStats,
  maskCustomerName,
  maskOrderId,
  maskPhone,
  sanitizeHtml,
  resetReviewsStoreForTesting,
  StoredReview,
} from "@/server/review-store";
import {
  memoryOrders,
  initializeStore,
  StoredOrder,
} from "@/server/order-store";
import {
  createAdminSession,
  getAdminAuditLogs,
  AUTHORIZED_ADMIN_EMAIL,
} from "@/server/admin-auth";

describe("SHIFA A HAYAT — TRUSTWORTHY PRODUCT REVIEW SYSTEM SUITE", () => {
  let validAdminToken: string;

  const TEST_PRODUCT_ID = "shifa-zafrani-gold";
  const TEST_PRODUCT_NAME = "Capsule Zafrani Gold";
  const OTHER_PRODUCT_ID = "shifa-dimagi-tonic";

  beforeEach(() => {
    initializeStore();
    resetReviewsStoreForTesting([]);
    validAdminToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL);

    // Set up a mock completed order in memoryOrders for verification tests
    const existingOrderIndex = memoryOrders.findIndex((o) => o.id === "ORD-TEST-REV-001");
    if (existingOrderIndex !== -1) {
      memoryOrders.splice(existingOrderIndex, 1);
    }

    const testOrder: StoredOrder = {
      id: "ORD-TEST-REV-001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerName: "Mohammad Arif",
      customerPhone: "9825098250",
      customerEmail: "arif.test@example.com",
      shippingAddress: {
        fullName: "Mohammad Arif",
        phone: "9825098250",
        addressLine: "Station Road, Near Jama Masjid",
        cityVillage: "Palanpur",
        state: "Gujarat",
        pincode: "385001",
        country: "India",
      },
      items: [
        {
          productId: TEST_PRODUCT_ID,
          productName: TEST_PRODUCT_NAME,
          productImage: "/images/zafrani.jpg",
          price: 1250,
          quantity: 1,
          packSize: "60 Capsules",
          lineTotal: 1250,
        },
      ],
      subtotal: 1250,
      shippingCharge: 0,
      discount: 0,
      total: 1250,
      paymentMethod: "WhatsApp Direct Order",
      paymentStatus: "Paid",
      orderStatus: "Delivered",
      trackingNumber: "SP-GJ-9825",
      notes: "Delivered safely",
      wasPriceTampered: false,
      isWhatsAppConfirmedByCustomer: true,
      statusHistory: [
        {
          status: "Delivered",
          timestamp: new Date().toISOString(),
          updatedBy: "System",
        },
      ],
    };

    memoryOrders.unshift(testOrder);
  });

  // ===========================================================================
  // 1. REVIEWS DISPLAY & EMPTY STATE (Requirements 1, 7, 8)
  // ===========================================================================
  describe("1. Display Reviews & Honest Empty State (Requirements 1, 7, 8)", () => {
    it("returns zero rating and accurate empty state when product has no reviews", () => {
      const res = getProductReviewsServer("shifa-non-existent-or-empty");
      expect(res.reviews).toEqual([]);
      expect(res.stats.totalReviews).toBe(0);
      expect(res.stats.averageRating).toBe(0);
      expect(res.stats.verifiedCount).toBe(0);
      expect(res.stats.ratingDistribution).toEqual({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
      expect(res.stats.ratingPercentages).toEqual({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    });

    it("displays reviews only on the relevant product and does not leak to other products", () => {
      submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 5,
          title: "अति उत्तम व असरदार नुस्खा",
          comment: "मैंने 15 दिन सेवन किया, बहुत लाभ मिला। कोई साइड इफेक्ट नहीं।",
          authorName: "Hakim Fan",
          city: "Palanpur",
        },
        "192.168.1.10"
      );

      const testProdReviews = getProductReviewsServer(TEST_PRODUCT_ID);
      const otherProdReviews = getProductReviewsServer(OTHER_PRODUCT_ID);

      expect(testProdReviews.reviews.length).toBe(1);
      expect(testProdReviews.reviews[0]!.productId).toBe(TEST_PRODUCT_ID);
      expect(otherProdReviews.reviews.length).toBe(0);
    });
  });

  // ===========================================================================
  // 2. ABUSE-RESISTANT SUBMISSION & VALIDATION (Requirements 2, 5)
  // ===========================================================================
  describe("2. Abuse-Resistant Submission & Validation (Requirements 2, 5)", () => {
    it("submits a clean genuine review successfully", () => {
      const res = submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 5,
          title: "बहुत लाभकारी यूनानी दवा",
          comment: "नियमित दूध के साथ सेवन करने से काफी स्फूर्ति महसूस होती है।",
          authorName: "Rajesh Kumar",
          city: "Ahmedabad",
        },
        "10.0.0.1"
      );

      expect(res.success).toBe(true);
      expect(res.review.rating).toBe(5);
      expect(res.review.title).toBe("बहुत लाभकारी यूनानी दवा");
      expect(res.review.isVerifiedPurchase).toBe(false);
    });

    it("rejects invalid rating values (< 1, > 5, NaN)", () => {
      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 6,
            title: "Superb product",
            comment: "This is a detailed comment that is long enough.",
            authorName: "John Doe",
          },
          "10.0.0.2"
        )
      ).toThrow(/कृपया 1 से 5 सितारों के बीच एक वैध रेटिंग चुनें/);

      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 0,
            title: "Zero rating test",
            comment: "This is a detailed comment that is long enough.",
            authorName: "John Doe",
          },
          "10.0.0.3"
        )
      ).toThrow(/कृपया 1 से 5 सितारों के बीच एक वैध रेटिंग चुनें/);
    });

    it("rejects short or empty titles and comments", () => {
      // Too short title (< 3 chars)
      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 5,
            title: "Ok",
            comment: "This is a detailed comment that is long enough.",
            authorName: "John Doe",
          },
          "10.0.0.4"
        )
      ).toThrow(/समीक्षा का शीर्षक 3 से 100 अक्षरों/);

      // Too short comment (< 10 chars)
      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 5,
            title: "Good Product",
            comment: "Too short",
            authorName: "John Doe",
          },
          "10.0.0.5"
        )
      ).toThrow(/विस्तृत समीक्षा कम से कम 10/);

      // Missing author name (< 2 chars)
      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 5,
            title: "Good Product",
            comment: "This is a detailed comment that is long enough.",
            authorName: "A",
          },
          "10.0.0.6"
        )
      ).toThrow(/ग्राहक का नाम 2 से 60 अक्षरों/);
    });

    it("sanitizes HTML tags and XSS vectors from title and comment", () => {
      const res = submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 4,
          title: "Pure Medicine <script>alert('xss')</script>",
          comment: "<b>Natural formulation</b> without any chemicals or steroids <iframe src='evil.com'></iframe>.",
          authorName: "Safe <script>User</script>",
        },
        "10.0.0.7"
      );

      expect(res.review.title).not.toContain("<script>");
      expect(res.review.comment).not.toContain("<iframe");
      expect(res.review.comment).not.toContain("<b>");
      expect(res.review.authorMasked).not.toContain("<script>");
    });

    it("traps bot submissions using the honeypot botField", () => {
      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 5,
            title: "Bot Title Here",
            comment: "Spam comment submitted by automated bot scraper.",
            authorName: "Bot Spammer",
            botField: "http://spam-link.ru",
          },
          "10.0.0.8"
        )
      ).toThrow(/Spam submission detected/);
    });

    it("enforces server-side IP rate limiting (max 3 reviews per 15 mins per IP)", () => {
      const spammerIp = "185.220.101.55";

      // 1st review: OK
      submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 5,
          title: "First valid review",
          comment: "This is my first genuine review for this product.",
          authorName: "Customer One",
        },
        spammerIp
      );

      // 2nd review: OK
      submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 4,
          title: "Second valid review",
          comment: "This is my second genuine review for this product.",
          authorName: "Customer Two",
        },
        spammerIp
      );

      // 3rd review: OK
      submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 5,
          title: "Third valid review",
          comment: "This is my third genuine review for this product.",
          authorName: "Customer Three",
        },
        spammerIp
      );

      // 4th review: Throws rate limit exceeded!
      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 5,
            title: "Fourth review should be blocked",
            comment: "This fourth review must be blocked by rate limiter.",
            authorName: "Customer Four",
          },
          spammerIp
        )
      ).toThrow(/समीक्षा सबमिशन सीमा पार हो गई है/);
    });

    it("rejects exact duplicate reviews for the same product", () => {
      submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 5,
          title: "Duplicate Test Title",
          comment: "Exact duplicate comment text submitted twice.",
          authorName: "Reviewer A",
        },
        "10.0.0.9"
      );

      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 5,
            title: "Duplicate Test Title",
            comment: "Exact duplicate comment text submitted twice.",
            authorName: "Reviewer B",
          },
          "10.0.0.10"
        )
      ).toThrow(/समान समीक्षा पहले ही दर्ज की जा चुकी है/);
    });
  });

  // ===========================================================================
  // 3 & 4. VERIFIED PURCHASE VALIDATION & FRAUD PREVENTION (Requirements 3, 4)
  // ===========================================================================
  describe("3 & 4. Verified Purchase Validation & Anti-Fraud Suite (Requirements 3, 4)", () => {
    it("confirms Verified Purchase badge only when Order ID, Phone and Product match a real order", () => {
      const res = submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 5,
          title: "सत्यापित खरीददार का वास्तविक अनुभव",
          comment: "ऑर्डर 3 दिन में मिला, दवा बहुत ताज़ा और असरदार है। हकीम जी का शुक्रिया।",
          authorName: "Mohammad Arif",
          city: "Palanpur",
          orderId: "ORD-TEST-REV-001",
          phone: "9825098250",
        },
        "10.0.1.1"
      );

      expect(res.success).toBe(true);
      expect(res.review.isVerifiedPurchase).toBe(true);
      expect(res.review.verifiedOrderIdMasked).toBe("ORD-***001");
      expect(res.message).toContain("प्रमाणित ग्राहक अनुभव");
    });

    it("strictly blocks claiming a non-existent Order ID", () => {
      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 5,
            title: "Fake Order Attempt",
            comment: "Trying to claim verified badge with fake order ID.",
            authorName: "Impostor",
            orderId: "ORD-FAKE-999999",
            phone: "9825098250",
          },
          "10.0.1.2"
        )
      ).toThrow(/प्रदान किया गया ऑर्डर आईडी सिस्टम में नहीं मिला/);
    });

    it("prevents users from claiming orders belonging to someone else (Phone mismatch)", () => {
      // Order ORD-TEST-REV-001 belongs to phone 9825098250.
      // An impostor tries to claim it using phone 9999999999:
      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 5,
            title: "Impostor Claim",
            comment: "Claiming someone else's order with different phone number.",
            authorName: "Attacker",
            orderId: "ORD-TEST-REV-001",
            phone: "9999999999",
          },
          "10.0.1.3"
        )
      ).toThrow(/दर्ज मोबाइल नंबर इस ऑर्डर के ग्राहक विवरण से मेल नहीं खाता/);
    });

    it("rejects verification if the order did not contain the reviewed product", () => {
      // Order ORD-TEST-REV-001 only contains TEST_PRODUCT_ID ('shifa-zafrani-gold').
      // User tries to verify review for OTHER_PRODUCT_ID ('shifa-dimagi-tonic') using this order:
      expect(() =>
        submitProductReviewServer(
          {
            productId: OTHER_PRODUCT_ID,
            rating: 5,
            title: "Mismatched Product",
            comment: "Attempting to verify item that was not in this parcel.",
            authorName: "Mohammad Arif",
            orderId: "ORD-TEST-REV-001",
            phone: "9825098250",
          },
          "10.0.1.4"
        )
      ).toThrow(/यह ऑर्डर इस उत्पाद .* की खरीद से संबंधित नहीं है/);
    });

    it("rejects verification if the order status is Cancelled", () => {
      const cancelledOrder: StoredOrder = {
        ...memoryOrders.find((o) => o.id === "ORD-TEST-REV-001")!,
        id: "ORD-CANCELLED-999",
        orderStatus: "Cancelled",
      };
      memoryOrders.unshift(cancelledOrder);

      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 1,
            title: "Cancelled order test",
            comment: "Attempting to claim verified badge on cancelled parcel.",
            authorName: "Mohammad Arif",
            orderId: "ORD-CANCELLED-999",
            phone: "9825098250",
          },
          "10.0.1.5"
        )
      ).toThrow(/रद्द किए गए ऑर्डर पर सत्यापित खरीद समीक्षा मान्य नहीं है/);
    });

    it("prevents multiple review submissions on the same order for the same product", () => {
      // 1st review on order: succeeds
      submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 5,
          title: "First valid verified review",
          comment: "I received my order and it worked very well for me.",
          authorName: "Mohammad Arif",
          orderId: "ORD-TEST-REV-001",
          phone: "9825098250",
        },
        "10.0.1.6"
      );

      // 2nd review on same order for same product: rejected to prevent spamming
      expect(() =>
        submitProductReviewServer(
          {
            productId: TEST_PRODUCT_ID,
            rating: 4,
            title: "Second attempt on same order",
            comment: "Submitting another review on the exact same order reference.",
            authorName: "Mohammad Arif",
            orderId: "ORD-TEST-REV-001",
            phone: "9825098250",
          },
          "10.0.1.7"
        )
      ).toThrow(/इस ऑर्डर संदर्भ के लिए इस उत्पाद की समीक्षा पहले ही दर्ज की जा चुकी है/);
    });
  });

  // ===========================================================================
  // 6. ADMIN MODERATION & REVIEW INTEGRITY (Requirement 6)
  // ===========================================================================
  describe("6. Admin Moderation & Integrity Preservation (Requirement 6)", () => {
    it("strictly blocks unauthenticated access to review moderation", () => {
      expect(() => adminListReviewsServer({}, null)).toThrow(/Unauthorized/);
      expect(() =>
        adminModerateReviewServer({ reviewId: "rev-1", status: "rejected" }, "invalid-token")
      ).toThrow(/Unauthorized/);
      expect(() => adminDeleteReviewServer("rev-1", "")).toThrow(/Unauthorized/);
    });

    it("allows authenticated admin to approve, reject or reply without altering customer rating or words", () => {
      const sub = submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 3,
          title: "दवा अच्छी है लेकिन असर धीरे हुआ",
          comment: "दवा का असर दिखने में 20 दिन लग गए, हालांकि कोई दुष्प्रभाव नहीं हुआ।",
          authorName: "Suresh Patel",
          city: "Mehsana",
        },
        "10.0.2.1"
      );

      const reviewId = sub.review.id;

      // Admin adds an official reply from Hakeem Ji
      const moderated = adminModerateReviewServer(
        {
          reviewId,
          status: "approved",
          adminReply: "हकीम जी का उत्तर: यूनानी दवाएं जड़ से काम करती हैं, इसलिए 30 दिन का पूरा कोर्स अवश्य करें।",
        },
        validAdminToken,
        "admin-ip"
      );

      // Verify customer text and rating are 100% UNTOUCHED
      expect(moderated.rating).toBe(3);
      expect(moderated.title).toBe("दवा अच्छी है लेकिन असर धीरे हुआ");
      expect(moderated.comment).toBe("दवा का असर दिखने में 20 दिन लग गए, हालांकि कोई दुष्प्रभाव नहीं हुआ।");
      expect(moderated.authorName).toBe("Suresh Patel");
      expect(moderated.adminReply).toContain("हकीम जी का उत्तर");

      // Verify audit trail logged
      const logs = getAdminAuditLogs();
      const modLog = logs.find((l) => l.action === "MODERATE_REVIEW" && l.entityId === reviewId);
      expect(modLog).toBeDefined();
    });

    it("allows admin to reject an abusive review so it is hidden from the public storefront", () => {
      const sub = submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 1,
          title: "Abusive Headline",
          comment: "Abusive inappropriate text submitted by an internet troll.",
          authorName: "Troll User",
        },
        "10.0.2.2"
      );

      // Admin rejects review
      adminModerateReviewServer(
        {
          reviewId: sub.review.id,
          status: "rejected",
        },
        validAdminToken
      );

      // Public storefront should NOT show this review
      const publicReviews = getProductReviewsServer(TEST_PRODUCT_ID);
      expect(publicReviews.reviews.some((r) => r.id === sub.review.id)).toBe(false);
    });

    it("allows admin to permanently delete illegal or spam reviews", () => {
      const sub = submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 1,
          title: "Spam Review",
          comment: "Pure spam content that should be permanently deleted.",
          authorName: "Spammer",
        },
        "10.0.2.3"
      );

      const delRes = adminDeleteReviewServer(sub.review.id, validAdminToken);
      expect(delRes.success).toBe(true);

      const allReviews = adminListReviewsServer({}, validAdminToken);
      expect(allReviews.some((r) => r.id === sub.review.id)).toBe(false);
    });
  });

  // ===========================================================================
  // 7. ACCURATE AVERAGE RATING & STATS CALCULATION (Requirement 7)
  // ===========================================================================
  describe("7. Accurate Average Rating & Distribution Math (Requirement 7)", () => {
    it("calculates average ratings only from approved reviews and ignores rejected/pending ones", () => {
      // 1st review: 5 stars (approved)
      submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 5,
          title: "Five Star Experience",
          comment: "Excellent formulation, worked remarkably well.",
          authorName: "Customer A",
        },
        "10.0.3.1"
      );

      // 2nd review: 4 stars (approved)
      submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 4,
          title: "Four Star Experience",
          comment: "Very good product, quick shipping and good packaging.",
          authorName: "Customer B",
        },
        "10.0.3.2"
      );

      // 3rd review: 1 star (submitted, then rejected by admin)
      const rev3 = submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 1,
          title: "Fake review by competitor",
          comment: "Baseless review that gets rejected by admin moderation.",
          authorName: "Competitor",
        },
        "10.0.3.3"
      );
      adminModerateReviewServer({ reviewId: rev3.review.id, status: "rejected" }, validAdminToken);

      // Total approved: 2 reviews. Sum: 5 + 4 = 9. Average: 9 / 2 = 4.5.
      const stats = getProductReviewsServer(TEST_PRODUCT_ID).stats;
      expect(stats.totalReviews).toBe(2);
      expect(stats.averageRating).toBe(4.5);
      expect(stats.ratingDistribution[5]).toBe(1);
      expect(stats.ratingDistribution[4]).toBe(1);
      expect(stats.ratingDistribution[1]).toBe(0); // 1-star rejected review must NOT count!
    });
  });

  // ===========================================================================
  // 10. CUSTOMER PRIVACY PROTECTION (Requirement 10)
  // ===========================================================================
  describe("10. Customer Privacy Protection (Requirement 10)", () => {
    it("masks customer names appropriately (e.g. 'Mohammad Arif' -> 'M*** A***')", () => {
      expect(maskCustomerName("Mohammad Arif")).toBe("M***d A***f");
      expect(maskCustomerName("Suresh")).toBe("S***h");
      expect(maskCustomerName("Ali")).toBe("A***i");
      expect(maskCustomerName("")).toBe("संतुष्ट ग्राहक");
    });

    it("masks order IDs (e.g. 'ORD-123456-7890' -> 'ORD-***7890')", () => {
      expect(maskOrderId("ORD-123456-7890")).toBe("ORD-***7890");
    });

    it("masks customer phone numbers", () => {
      expect(maskPhone("9825098250")).toBe("******8250");
    });

    it("never exposes customer phone number, full address, or raw name in public API payload", () => {
      submitProductReviewServer(
        {
          productId: TEST_PRODUCT_ID,
          rating: 5,
          title: "Privacy Test Review",
          comment: "Checking that private phone numbers and addresses are never leaked.",
          authorName: "Zuber Chaudhry",
          city: "Palanpur",
          orderId: "ORD-TEST-REV-001",
          phone: "9825098250",
        },
        "10.0.4.1"
      );

      const publicData = getProductReviewsServer(TEST_PRODUCT_ID);
      const rev = publicData.reviews[0]!;

      // Verify public review object does NOT have private customer keys
      expect((rev as unknown as Record<string, unknown>)["authorName"]).toBeUndefined();
      expect((rev as unknown as Record<string, unknown>)["phone"]).toBeUndefined();
      expect((rev as unknown as Record<string, unknown>)["customerPhone"]).toBeUndefined();
      expect((rev as unknown as Record<string, unknown>)["shippingAddress"]).toBeUndefined();
      expect((rev as unknown as Record<string, unknown>)["verifiedOrderId"]).toBeUndefined();
      expect((rev as unknown as Record<string, unknown>)["ipHash"]).toBeUndefined();

      // Verify safe masked fields
      expect(rev.authorMasked).toBe("Z***r C***y");
      expect(rev.verifiedOrderIdMasked).toBe("ORD-***001");
    });
  });
});
