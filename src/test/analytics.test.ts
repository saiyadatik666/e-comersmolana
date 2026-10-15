import { describe, it, expect } from "vitest";
import { INITIAL_PRODUCTS, Product } from "@/data/products";
import { Order } from "@/context/StoreContext";
import {
  computeTopOrderedProducts,
  computeOrderStatusDistribution,
  computeCouponAnalytics,
  computeCatalogHealth,
  computeCategoryDistribution,
  evaluateShoppingFlowDiagnostics,
  ALL_ORDER_STATUSES,
} from "@/lib/analytics";

describe("Privacy-Friendly Analytics Engine", () => {
  const mockOrder1: Order = {
    id: "ORD-TEST-1001",
    createdAt: new Date().toISOString(),
    customerName: "Mohd Saleem",
    customerPhone: "9876543210",
    shippingAddress: {
      id: "addr-1",
      fullName: "Mohd Saleem",
      phone: "9876543210",
      addressLine: "123 Old Bazar",
      city: "Bareilly",
      state: "Uttar Pradesh",
      pincode: "243001",
    },
    items: [
      {
        productId: "shifa-zafrani-gold",
        productName: "Capsule Zafrani Gold",
        productImage: "/assets/products/zafrani-gold.jpg",
        price: 1450,
        quantity: 2,
        packSize: "60 Capsules",
      },
      {
        productId: "shifa-arq-abe-hayat",
        productName: "Arq Abe Hayat",
        productImage: "/assets/products/arq-abe-hayat.jpg",
        price: 250,
        quantity: 1,
        packSize: "500ml",
      },
    ],
    subtotal: 3150,
    shippingCharge: 0,
    discount: 315, // Coupon used
    total: 2835,
    paymentMethod: "COD",
    paymentStatus: "Pending",
    orderStatus: "Confirmed",
  };

  const mockOrder2: Order = {
    id: "ORD-TEST-1002",
    createdAt: new Date().toISOString(),
    customerName: "Fatima Khan",
    customerPhone: "9898989898",
    shippingAddress: {
      id: "addr-2",
      fullName: "Fatima Khan",
      phone: "9898989898",
      addressLine: "45 Civil Lines",
      city: "Lucknow",
      state: "Uttar Pradesh",
      pincode: "226001",
    },
    items: [
      {
        productId: "shifa-zafrani-gold",
        productName: "Capsule Zafrani Gold",
        productImage: "/assets/products/zafrani-gold.jpg",
        price: 1450,
        quantity: 3,
        packSize: "60 Capsules",
      },
      {
        productId: "shifa-majoon-shabab",
        productName: "Majoon Shabab Awar",
        productImage: "/assets/products/majoon-shabab.jpg",
        price: 850,
        quantity: 1,
        packSize: "250g",
      },
    ],
    subtotal: 5200,
    shippingCharge: 0,
    discount: 0, // No coupon
    total: 5200,
    paymentMethod: "WhatsApp Direct Order",
    paymentStatus: "Pending Confirmation",
    orderStatus: "Pending Confirmation",
  };

  const sampleOrders: Order[] = [mockOrder1, mockOrder2];

  describe("1. computeTopOrderedProducts", () => {
    it("returns an empty array when no orders exist", () => {
      const result = computeTopOrderedProducts([], INITIAL_PRODUCTS);
      expect(result).toEqual([]);
    });

    it("aggregates quantities and order frequencies correctly", () => {
      const result = computeTopOrderedProducts(sampleOrders, INITIAL_PRODUCTS);
      expect(result.length).toBe(3);

      // Zafrani Gold was in 2 orders (qty 2 + qty 3 = 5 units)
      const zafrani = result.find((p) => p.productId === "shifa-zafrani-gold");
      expect(zafrani).toBeDefined();
      expect(zafrani?.totalQuantity).toBe(5);
      expect(zafrani?.orderCount).toBe(2);
      expect(zafrani?.totalGrossAmount).toBe(5 * 1450);

      // Top item should be Zafrani Gold
      expect(result[0]?.productId).toBe("shifa-zafrani-gold");
    });

    it("STRICT PRIVACY TEST: contains ZERO PII from orders", () => {
      const result = computeTopOrderedProducts(sampleOrders, INITIAL_PRODUCTS);
      const stringified = JSON.stringify(result);

      // Ensure no customer names, phones, addresses leak into the analytics model
      expect(stringified).not.toContain("Mohd Saleem");
      expect(stringified).not.toContain("Fatima Khan");
      expect(stringified).not.toContain("9876543210");
      expect(stringified).not.toContain("9898989898");
      expect(stringified).not.toContain("Old Bazar");
      expect(stringified).not.toContain("Civil Lines");
    });
  });

  describe("2. computeOrderStatusDistribution", () => {
    it("handles zero orders gracefully with all 6 statuses represented at 0%", () => {
      const dist = computeOrderStatusDistribution([]);
      expect(dist.length).toBe(6);
      for (const item of dist) {
        expect(item.count).toBe(0);
        expect(item.percentage).toBe(0);
      }
    });

    it("accurately computes status counts and percentage share", () => {
      const dist = computeOrderStatusDistribution(sampleOrders);
      expect(dist.length).toBe(6);

      const confirmed = dist.find((d) => d.status === "Confirmed");
      expect(confirmed?.count).toBe(1);
      expect(confirmed?.percentage).toBe(50);

      const pending = dist.find((d) => d.status === "Pending Confirmation");
      expect(pending?.count).toBe(1);
      expect(pending?.percentage).toBe(50);

      const delivered = dist.find((d) => d.status === "Delivered");
      expect(delivered?.count).toBe(0);
      expect(delivered?.percentage).toBe(0);
    });

    it("verifies all 6 statuses match official ALL_ORDER_STATUSES", () => {
      const dist = computeOrderStatusDistribution(sampleOrders);
      expect(dist.map((d) => d.status)).toEqual(ALL_ORDER_STATUSES.map((s) => s.status));
    });
  });

  describe("3. computeCouponAnalytics", () => {
    it("handles empty orders without division by zero", () => {
      const coupons = computeCouponAnalytics([]);
      expect(coupons.totalOrders).toBe(0);
      expect(coupons.ordersWithCoupon).toBe(0);
      expect(coupons.couponUsageRate).toBe(0);
      expect(coupons.totalDiscountAmount).toBe(0);
      expect(coupons.averageDiscountAmount).toBe(0);
      expect(coupons.ordersWithoutCoupon).toBe(0);
    });

    it("computes adoption rate and discount metrics on sample orders", () => {
      const coupons = computeCouponAnalytics(sampleOrders);
      expect(coupons.totalOrders).toBe(2);
      expect(coupons.ordersWithCoupon).toBe(1);
      expect(coupons.ordersWithoutCoupon).toBe(1);
      expect(coupons.couponUsageRate).toBe(50);
      expect(coupons.totalDiscountAmount).toBe(315);
      expect(coupons.averageDiscountAmount).toBe(315);
    });
  });

  describe("4. computeCatalogHealth", () => {
    it("reports genuine price verification and heritage poster coverage on INITIAL_PRODUCTS", () => {
      const health = computeCatalogHealth(INITIAL_PRODUCTS);
      expect(health.totalProducts).toBe(21);
      expect(health.publishedCount).toBe(21);
      // Exactly 2 products (Arq Abe Hayat ₹250 and Tanavai Tel ₹200) have poster-printed verified prices
      expect(health.verifiedPriceCount).toBe(2);
      expect(health.verifiedPriceRate).toBe(Math.round((2 / 21) * 100));
      expect(health.heritagePosterCount).toBe(21);
      expect(health.heritagePosterRate).toBe(100);
      expect(health.outOfStockCount).toBe(0);
    });

    it("accurately flags low-stock, out-of-stock, and missing information", () => {
      const modifiedCatalog: Product[] = [
        ...INITIAL_PRODUCTS,
        {
          id: "shifa-test-oos",
          slug: "test-oos",
          name: "Test Out of Stock Product",
          nameHindi: "टेस्ट अनुपलब्ध उत्पाद",
          subtitle: "Test Subtitle",
          category: "mens-wellness",
          categoryHindi: "पुरुष स्वास्थ्य",
          price: 500,
          rating: 5,
          reviewCount: 0,
          image: "/assets/products/zafrani-gold.jpg",
          imageName: "test.jpg",
          packSize: "50g",
          inStock: false,
          stockCount: 0,
          isVerifiedPrice: false,
          status: "draft",
          dosage: "1 tsp daily",
          description: "Short", // Less than 30 chars
          benefits: [],
          ingredients: [],
        },
      ];

      const health = computeCatalogHealth(modifiedCatalog);
      expect(health.totalProducts).toBe(22);
      expect(health.outOfStockCount).toBe(1);
      expect(health.draftCount).toBe(1);
      expect(health.verifiedPriceRate).toBeLessThan(100);

      // Verify attention list items
      const issues = health.itemsNeedingAttention.filter((i) => i.id === "shifa-test-oos");
      expect(issues.some((i) => i.issueType === "out_of_stock")).toBe(true);
      expect(issues.some((i) => i.issueType === "unverified_price")).toBe(true);
      expect(issues.some((i) => i.issueType === "short_description")).toBe(true);
      expect(issues.some((i) => i.issueType === "missing_poster")).toBe(true);
    });
  });

  describe("5. computeCategoryDistribution", () => {
    it("groups all 21 products into the 7 categories", () => {
      const dist = computeCategoryDistribution(INITIAL_PRODUCTS);
      expect(dist.length).toBe(7);

      const totalCount = dist.reduce((acc, cat) => acc + cat.productCount, 0);
      expect(totalCount).toBe(21);

      // Every category has at least 1 product
      for (const cat of dist) {
        expect(cat.productCount).toBeGreaterThan(0);
        expect(cat.totalStockUnits).toBeGreaterThan(0);
      }
    });
  });

  describe("6. evaluateShoppingFlowDiagnostics", () => {
    it("returns all 6 critical flow diagnostics with verified or attention status", () => {
      const diagnostics = evaluateShoppingFlowDiagnostics(INITIAL_PRODUCTS, sampleOrders);
      expect(diagnostics.length).toBe(6);

      const ids = diagnostics.map((d) => d.id);
      expect(ids).toContain("discovery");
      expect(ids).toContain("cart_stock");
      expect(ids).toContain("coupon_engine");
      expect(ids).toContain("checkout_validation");
      expect(ids).toContain("whatsapp_gateway");
      expect(ids).toContain("order_storage");

      for (const diag of diagnostics) {
        expect(diag.titleHindi.length).toBeGreaterThan(5);
        expect(diag.descriptionHindi.length).toBeGreaterThan(10);
        expect(diag.architectureDetails.length).toBeGreaterThan(10);
      }
    });
  });
});
