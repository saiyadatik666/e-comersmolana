import { describe, it, expect } from "vitest";
import {
  createBackupPayload,
  validateBackupPayload,
  convertOrdersToCSV,
  StoreBackupPayload,
} from "@/lib/backup";
import { INITIAL_PRODUCTS, Product } from "@/data/products";
import { Order, StoreSettings } from "@/context/StoreContext";

describe("Part 14 — Backup, Recovery & Data Protection Suite", () => {
  const sampleSettings: StoreSettings = {
    storeName: "Shifa A Hayat",
    tagline: "Ayurvedic & Unani Heritage Pharmacy",
    founderName: "Hakeem Inayat Palanpuri",
    phone: "+91 95860 37331",
    whatsapp: "9586037331",
    email: "contact@shifaahayat.com",
    address: "Station Road",
    city: "Palanpur",
    state: "Gujarat",
    country: "India",
    freeShippingThreshold: 499,
    standardShippingFee: 50,
    announcementText: "Free Delivery over ₹499",
    codAvailable: true,
    onlinePaymentAvailable: true,
    upiId: "9586037331@upi",
    adminPin: "9586",
  };

  const sampleOrders: Order[] = [
    {
      id: "ORD-94812",
      createdAt: "2026-10-15T12:00:00.000Z",
      customerName: "Mohammad Arif",
      customerPhone: "+91 98251 44210",
      customerEmail: "arif@example.com",
      shippingAddress: {
        id: "addr-1",
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
      trackingNumber: "SHIFA-94812",
      notes: "Customer requested evening delivery",
    },
  ];

  // =========================================================================
  // 1. BACKUP PAYLOAD CREATION
  // =========================================================================
  describe("createBackupPayload", () => {
    it("creates a standardized version 1.0 backup with summary and sanitized records", () => {
      const payload = createBackupPayload(INITIAL_PRODUCTS, sampleOrders, sampleSettings);

      expect(payload.version).toBe("1.0");
      expect(payload.source).toContain("Shifa A Hayat");
      expect(payload.exportedAt).toBeDefined();
      expect(payload.summary.productsCount).toBe(21);
      expect(payload.summary.ordersCount).toBe(1);
      expect(payload.products.length).toBe(21);
      expect(payload.orders.length).toBe(1);
      expect(payload.settings.storeName).toBe("Shifa A Hayat");
    });
  });

  // =========================================================================
  // 2. BACKUP VALIDATION & INTEGRITY
  // =========================================================================
  describe("validateBackupPayload", () => {
    it("validates a healthy backup payload successfully", () => {
      const payload = createBackupPayload(INITIAL_PRODUCTS, sampleOrders, sampleSettings);
      const result = validateBackupPayload(payload);

      expect(result.isValid).toBe(true);
      expect(result.payload?.version).toBe("1.0");
      expect(result.error).toBeUndefined();
    });

    it("rejects non-object or null data", () => {
      expect(validateBackupPayload(null).isValid).toBe(false);
      expect(validateBackupPayload("corrupted string").isValid).toBe(false);
      expect(validateBackupPayload(12345).isValid).toBe(false);
    });

    it("rejects unsupported schema versions", () => {
      const invalid = {
        version: "9.9",
        products: [],
        orders: [],
        settings: {},
      };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Unsupported backup version");
    });

    it("rejects backups with missing or non-array product lists", () => {
      const invalid = {
        version: "1.0",
        products: "not-an-array",
        orders: [],
        settings: sampleSettings,
      };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Products array is missing");
    });

    it("rejects backups with corrupted product entries", () => {
      const invalid = {
        version: "1.0",
        products: [{ id: "shifa-test" }], // Missing name and price
        orders: [],
        settings: sampleSettings,
      };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Corrupted product record");
    });

    it("rejects backups with corrupted order entries", () => {
      const invalid = {
        version: "1.0",
        products: INITIAL_PRODUCTS,
        orders: [{ id: "ORD-999" }], // Missing customerName and total
        settings: sampleSettings,
      };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Corrupted order record");
    });
  });

  // =========================================================================
  // 3. ORDER CSV EXPORT CONVERSION
  // =========================================================================
  describe("convertOrdersToCSV", () => {
    it("formats order records into valid CSV with RFC-4180 quoting", () => {
      const csv = convertOrdersToCSV(sampleOrders);

      // Verify headers
      expect(csv).toContain("Order ID,Date,Customer Name,Mobile Number");
      expect(csv).toContain("Subtotal (INR),Shipping (INR),Discount (INR),Total (INR)");

      // Verify row content
      expect(csv).toContain('"ORD-94812"');
      expect(csv).toContain('"Mohammad Arif"');
      expect(csv).toContain('"+91 98251 44210"');
      expect(csv).toContain('"450"');
      expect(csv).toContain('"Arq Abe Hayat Drops (x2)"');
    });

    it("safely escapes quotes and commas within customer addresses and notes", () => {
      const complexOrders: Order[] = [
        {
          ...sampleOrders[0]!,
          customerName: 'Ahmad "Hakeem" Ali',
          shippingAddress: {
            ...sampleOrders[0]!.shippingAddress,
            addressLine: 'Near Gate #4, "Royal Plaza", Palanpur',
          },
        },
      ];

      const csv = convertOrdersToCSV(complexOrders);
      // Double quotes should be escaped as "" in RFC-4180
      expect(csv).toContain('"Ahmad ""Hakeem"" Ali"');
      expect(csv).toContain('"Near Gate #4, ""Royal Plaza"", Palanpur"');
    });
  });

  // =========================================================================
  // 4. CATALOG RESTORATION GUARANTEE
  // =========================================================================
  describe("Catalog Recovery Guarantee", () => {
    it("verifies all 21 authentic products exist with correct prices for recovery", () => {
      expect(INITIAL_PRODUCTS.length).toBe(21);

      const arq = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat");
      expect(arq?.price).toBe(250);
      expect(arq?.name).toBe("Arq Abe Hayat Drops");

      const tel = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel");
      expect(tel?.price).toBe(200);

      const zafrani = INITIAL_PRODUCTS.find((p) => p.id === "shifa-zafrani-gold");
      expect(zafrani?.price).toBe(1450);

      const dimagi = INITIAL_PRODUCTS.find((p) => p.id === "shifa-dimagi-tonic");
      expect(dimagi?.price).toBe(420);
    });
  });
});
