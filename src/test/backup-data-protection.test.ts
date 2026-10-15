import { describe, it, expect, beforeEach } from "vitest";
import {
  createBackupPayload,
  validateBackupPayload,
  convertOrdersToCSV,
  StoreBackupPayload,
} from "@/lib/backup";
import { INITIAL_PRODUCTS, Product } from "@/data/products";
import { Order, StoreSettings } from "@/context/StoreContext";

describe("Part 22 — Backup, Recovery & Data Protection Validation Suite", () => {
  const sampleSettings: StoreSettings = {
    storeName: "Shifa A Hayat",
    tagline: "Ayurvedic & Unani Heritage Pharmacy",
    founderName: "Hakeem Molana Noor Mohammad",
    phone: "+91 95860 37331",
    whatsapp: "9586037331",
    email: "contact@shifaahayat.com",
    address: "Dhalvas, Kazi Wada",
    city: "Palanpur",
    state: "Gujarat",
    country: "India",
    freeShippingThreshold: 499,
    standardShippingFee: 49,
    announcementText: "निःशुल्क डिलीवरी ₹499 से अधिक के ऑर्डर पर",
    codAvailable: true,
    onlinePaymentAvailable: true,
    upiId: "9586037331@upi",
    adminPin: "9586",
  };

  const sampleOrders: Order[] = [
    {
      id: "ORD-TEST-001",
      createdAt: "2026-10-15T18:00:00.000Z",
      customerName: "Mohammad Arif",
      customerPhone: "+91 98251 44210",
      customerEmail: "arif@example.com",
      shippingAddress: {
        id: "addr-001",
        fullName: "Mohammad Arif",
        phone: "9825144210",
        addressLine: "Flat 204, Al-Madina Heights, Station Road",
        city: "Palanpur",
        state: "Gujarat",
        pincode: "385001",
      },
      items: [
        {
          productId: "shifa-arq-abe-hayat",
          productName: "Arq Abe Hayat Drops",
          productImage: "/assets/products/arq-abe-hayat.jpg",
          price: 250,
          quantity: 2,
          packSize: "15ml Amber Dropper Bottle",
        },
      ],
      subtotal: 500,
      shippingCharge: 0,
      discount: 50,
      total: 450,
      paymentMethod: "WhatsApp Direct Order",
      paymentStatus: "Pending Confirmation",
      orderStatus: "Confirmed",
      trackingNumber: "SHIFA-TEST-001",
      notes: "Customer requested evening delivery",
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // =========================================================================
  // 1. DATA CONFIDENTIALITY & CREDENTIAL SANITIZATION (Rule 8)
  // =========================================================================
  describe("Data Confidentiality & Sanitization", () => {
    it("never exports admin PIN, passwords, session tokens, or API secrets in backup payload", () => {
      const payload = createBackupPayload(INITIAL_PRODUCTS, sampleOrders, sampleSettings);

      // Verify adminPin is omitted from settings
      expect((payload.settings as Record<string, unknown>)["adminPin"]).toBeUndefined();
      expect((payload.settings as Record<string, unknown>)["password"]).toBeUndefined();
      expect((payload.settings as Record<string, unknown>)["token"]).toBeUndefined();
      expect((payload.settings as Record<string, unknown>)["secret"]).toBeUndefined();

      // Ensure public store settings are preserved
      expect(payload.settings.storeName).toBe("Shifa A Hayat");
      expect(payload.settings.phone).toBe("+91 95860 37331");
      expect(payload.settings.freeShippingThreshold).toBe(499);
      expect(payload.settings.standardShippingFee).toBe(49);
    });

    it("strips maliciously injected adminPin and credentials from incoming backup files", () => {
      const maliciousPayload = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        source: "Attacker File",
        summary: { productsCount: 1, ordersCount: 0, hasCustomSettings: true },
        products: [INITIAL_PRODUCTS[0]],
        orders: [],
        settings: {
          storeName: "Injected Store",
          adminPin: "0000", // Malicious PIN injection attempt
          password: "hacked-password",
          token: "malicious-session-token",
        },
      };

      const result = validateBackupPayload(maliciousPayload);
      expect(result.isValid).toBe(true);
      expect(result.payload).toBeDefined();

      // Verified: Injected security properties must be stripped
      const sanitized = result.payload?.settings as Record<string, unknown>;
      expect(sanitized["adminPin"]).toBeUndefined();
      expect(sanitized["password"]).toBeUndefined();
      expect(sanitized["token"]).toBeUndefined();
      expect(sanitized["storeName"]).toBe("Injected Store");
    });
  });

  // =========================================================================
  // 2. MALFORMED FILE REJECTION & IMMUTABILITY GUARANTEE
  // =========================================================================
  describe("Malformed File Rejection & Immutability Guarantee", () => {
    it("rejects non-object or corrupt JSON structures", () => {
      expect(validateBackupPayload(null).isValid).toBe(false);
      expect(validateBackupPayload(undefined).isValid).toBe(false);
      expect(validateBackupPayload("plain string").isValid).toBe(false);
      expect(validateBackupPayload(12345).isValid).toBe(false);
      expect(validateBackupPayload([]).isValid).toBe(false);
    });

    it("rejects unsupported schema versions", () => {
      const invalid = {
        version: "2.0",
        products: INITIAL_PRODUCTS,
        orders: [],
        settings: sampleSettings,
      };
      const res = validateBackupPayload(invalid);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Unsupported backup version");
    });

    it("rejects products with negative prices or NaN", () => {
      const invalid = {
        version: "1.0",
        products: [
          {
            ...INITIAL_PRODUCTS[0],
            price: -100, // Negative price attack/corruption
          },
        ],
        orders: [],
        settings: sampleSettings,
      };
      const res = validateBackupPayload(invalid);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Invalid price");
    });

    it("rejects products with negative stock count or NaN", () => {
      const invalid = {
        version: "1.0",
        products: [
          {
            ...INITIAL_PRODUCTS[0],
            stockCount: -10, // Corrupted stock count
          },
        ],
        orders: [],
        settings: sampleSettings,
      };
      const res = validateBackupPayload(invalid);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Invalid stock count");
    });

    it("rejects orders with negative total", () => {
      const invalid = {
        version: "1.0",
        products: INITIAL_PRODUCTS,
        orders: [
          {
            ...sampleOrders[0],
            total: -500, // Corrupted negative order total
          },
        ],
        settings: sampleSettings,
      };
      const res = validateBackupPayload(invalid);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Invalid total for order");
    });

    it("rejects payloads that exceed safety bounds to prevent denial of service", () => {
      const oversizeProducts = new Array(501).fill(INITIAL_PRODUCTS[0]);
      const invalid = {
        version: "1.0",
        products: oversizeProducts,
        orders: [],
        settings: sampleSettings,
      };
      const res = validateBackupPayload(invalid);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Products array exceeds maximum limit");
    });

    it("guarantees existing data remains untouched when import validation fails", () => {
      // Simulate existing state
      const initialProductsState = [...INITIAL_PRODUCTS];
      const initialOrdersState = [...sampleOrders];
      let currentProducts = [...initialProductsState];
      let currentOrders = [...initialOrdersState];

      const malformedPayload = {
        version: "1.0",
        products: "corrupted-products-string",
        orders: sampleOrders,
        settings: sampleSettings,
      };

      const validation = validateBackupPayload(malformedPayload);
      expect(validation.isValid).toBe(false);

      // Import handler pattern: Only update if valid
      if (validation.isValid && validation.payload) {
        currentProducts = validation.payload.products;
        currentOrders = validation.payload.orders;
      }

      // Existing data must remain completely unaltered
      expect(currentProducts.length).toBe(initialProductsState.length);
      expect(currentProducts[0]?.id).toBe("shifa-zafrani-gold");
      expect(currentOrders.length).toBe(1);
      expect(currentOrders[0]?.id).toBe("ORD-TEST-001");
    });
  });

  // =========================================================================
  // 3. ROUND-TRIP EXPORT & IMPORT FIDELITY
  // =========================================================================
  describe("Round-Trip Export & Import Fidelity", () => {
    it("preserves all 21 products, orders, and public settings across an export/import cycle", () => {
      const payload = createBackupPayload(INITIAL_PRODUCTS, sampleOrders, sampleSettings);
      const jsonText = JSON.stringify(payload);
      const parsed = JSON.parse(jsonText);

      const validation = validateBackupPayload(parsed);
      expect(validation.isValid).toBe(true);
      expect(validation.payload).toBeDefined();

      const restored = validation.payload!;
      expect(restored.products.length).toBe(21);
      expect(restored.orders.length).toBe(1);
      expect(restored.orders[0]?.id).toBe("ORD-TEST-001");
      expect(restored.orders[0]?.total).toBe(450);

      // Verify specific product data fidelity
      const arq = restored.products.find((p) => p.id === "shifa-arq-abe-hayat");
      expect(arq?.name).toBe("Arq Abe Hayat Drops");
      expect(arq?.nameHindi).toBe("इर्क आबे हयात");
      expect(arq?.price).toBe(250);
      expect(arq?.packSize).toBe("15ml Amber Dropper Bottle");
    });
  });

  // =========================================================================
  // 4. RFC-4180 ORDERS SPREADSHEET (CSV) EXPORT INTEGRITY
  // =========================================================================
  describe("Orders CSV Export Integrity", () => {
    it("generates compliant CSV with correct column headers and safe quote escaping", () => {
      const csv = convertOrdersToCSV(sampleOrders);

      // Verify headers
      expect(csv).toContain("Order ID,Date,Customer Name,Mobile Number,Email,Delivery Address");
      expect(csv).toContain("Subtotal (INR),Shipping (INR),Discount (INR),Total (INR)");

      // Verify data row
      expect(csv).toContain('"ORD-TEST-001"');
      expect(csv).toContain('"Mohammad Arif"');
      expect(csv).toContain('"+91 98251 44210"');
      expect(csv).toContain('"450"');
      expect(csv).toContain('"Arq Abe Hayat Drops (x2)"');
    });

    it("safely escapes embedded quotes, commas, and linebreaks in delivery addresses", () => {
      const complexOrders: Order[] = [
        {
          ...sampleOrders[0]!,
          customerName: 'Hakeem "Noor" Mohammad',
          shippingAddress: {
            ...sampleOrders[0]!.shippingAddress,
            addressLine: 'Shop #3, "Heritage Gali", Near Jama Masjid, Palanpur',
          },
        },
      ];

      const csv = convertOrdersToCSV(complexOrders);
      // Double quotes should be escaped as "" in RFC-4180
      expect(csv).toContain('"Hakeem ""Noor"" Mohammad"');
      expect(csv).toContain('"Shop #3, ""Heritage Gali"", Near Jama Masjid, Palanpur"');
    });
  });

  // =========================================================================
  // 5. IMMUTABLE SOURCE-CONTROLLED DEFAULTS GUARANTEE
  // =========================================================================
  describe("Source-Controlled Catalog & Factory Reset Guarantee", () => {
    it("guarantees all 21 authentic formulations exist in INITIAL_PRODUCTS with official pricing", () => {
      expect(INITIAL_PRODUCTS.length).toBe(21);

      const productsMap = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));

      // Spot-check cornerstone formulations
      expect(productsMap.get("shifa-arq-abe-hayat")?.price).toBe(250);
      expect(productsMap.get("shifa-tanavai-tel")?.price).toBe(200);
      expect(productsMap.get("shifa-zafrani-gold")?.price).toBe(1450);
      expect(productsMap.get("shifa-pehlwan-capsule")?.price).toBe(990);
      expect(productsMap.get("shifa-habbe-hawa")?.price).toBe(350);
      expect(productsMap.get("shifa-santaan-course")?.price).toBe(3200);
      expect(productsMap.get("shifa-hoor-night-cream")?.price).toBe(499);
    });
  });
});
