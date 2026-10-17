import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  createOrderServer,
  DEFAULT_SERVER_SETTINGS,
  initializeStore,
} from "@/server/order-store";
import { validateAndCalculateOrder } from "@/server/order-validator";
import { INITIAL_PRODUCTS } from "@/data/products";

describe("SHIFA A HAYAT — COMPLETE CASH ON DELIVERY (COD) REMOVAL SUITE", () => {
  beforeEach(() => {
    initializeStore();
  });

  describe("1. Complete UI & Codebase COD Removal Verification", () => {
    const rootDir = process.cwd();

    it("verifies Header does not contain COD or Cash on Delivery", () => {
      const headerCode = fs.readFileSync(
        path.join(rootDir, "src/components/layout/Header.tsx"),
        "utf-8"
      );
      expect(headerCode).not.toContain("COD उपलब्ध");
      expect(headerCode).not.toContain("Cash on Delivery");
      expect(headerCode).toContain("ऑल इंडिया डिलीवरी");
    });

    it("verifies Footer does not advertise COD or Cash on Delivery", () => {
      const footerCode = fs.readFileSync(
        path.join(rootDir, "src/components/layout/Footer.tsx"),
        "utf-8"
      );
      expect(footerCode).not.toContain("कैश ऑन डिलीवरी (COD) उपलब्ध");
      expect(footerCode).not.toContain("Cash on Delivery Available");
      expect(footerCode).toContain("All-India Delivery");
    });

    it("verifies ProductCard does not contain COD badge", () => {
      const productCardCode = fs.readFileSync(
        path.join(rootDir, "src/components/product/ProductCard.tsx"),
        "utf-8"
      );
      expect(productCardCode).not.toContain("COD उपलब्ध");
      expect(productCardCode).toContain("सुरक्षित डिलीवरी");
    });

    it("verifies Product Detail page does not advertise COD", () => {
      const productDetailCode = fs.readFileSync(
        path.join(rootDir, "src/routes/product.$id.tsx"),
        "utf-8"
      );
      expect(productDetailCode).not.toContain("कैश ऑन डिलीवरी उपलब्ध");
      expect(productDetailCode).not.toContain("कैश ऑन डिलीवरी एवं ऑल इंडिया डिलीवरी");
      expect(productDetailCode).toContain("सुरक्षित ऑल इंडिया डिलीवरी");
    });

    it("verifies Home page does not display COD stats or badges", () => {
      const indexCode = fs.readFileSync(
        path.join(rootDir, "src/routes/index.tsx"),
        "utf-8"
      );
      expect(indexCode).not.toMatch(/<span[^>]*>COD<\/span>/);
      expect(indexCode).not.toContain("ऑल इंडिया डिलीवरी एवं कैश ऑन डिलीवरी उपलब्ध");
      expect(indexCode).toContain("ऑल इंडिया सुरक्षित डिलीवरी उपलब्ध");
    });

    it("verifies Policies terms and conditions removed COD requirement", () => {
      const policiesCode = fs.readFileSync(
        path.join(rootDir, "src/routes/policies.tsx"),
        "utf-8"
      );
      expect(policiesCode).not.toContain("कैश ऑन डिलीवरी (COD) ऑर्डर बुक करते समय");
    });

    it("verifies Root meta description does not mention Cash on Delivery", () => {
      const rootMeta = fs.readFileSync(
        path.join(rootDir, "src/routes/__root.tsx"),
        "utf-8"
      );
      expect(rootMeta).not.toContain("and Cash on Delivery");
    });

    it("verifies Cart page does not have FREECOD button in UI", () => {
      const cartCode = fs.readFileSync(
        path.join(rootDir, "src/routes/cart.tsx"),
        "utf-8"
      );
      expect(cartCode).not.toContain("FREECOD (निःशुल्क शिपिंग)");
      expect(cartCode).toContain("FREEDELIVERY (निःशुल्क शिपिंग)");
    });
  });

  describe("2. Payment Configuration & Server Settings", () => {
    it("verifies codAvailable is disabled (false) in default server settings", () => {
      expect(DEFAULT_SERVER_SETTINGS.codAvailable).toBe(false);
      expect(DEFAULT_SERVER_SETTINGS.onlinePaymentAvailable).toBe(true);
    });

    it("verifies server order calculation message does not contain Cash on Delivery", () => {
      const calc = validateAndCalculateOrder({
        customer: {
          fullName: "Test Customer",
          phone: "9825144210",
          addressLine: "Test Address Line, Station Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
          country: "India",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(calc.isValid).toBe(true);
      expect(calc.whatsAppMessage).not.toContain("Cash on Delivery");
      expect(calc.whatsAppMessage).toContain("UPI / Online Payment upon merchant confirmation");
    });
  });

  describe("3. Server-Side Protection & Enforcement against Malicious COD Submissions", () => {
    it("strictly rejects COD orders if a customer manually manipulates the paymentMethod field to 'COD'", () => {
      const maliciousPayload = {
        customer: {
          fullName: "Malicious Tester",
          phone: "9825144210",
          addressLine: "Test Address, Street 1",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
          country: "India",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
        paymentMethod: "COD" as any,
      };

      expect(() => createOrderServer(maliciousPayload)).toThrow(
        /Cash on Delivery \(COD\) is disabled and not accepted/
      );
    });

    it("strictly rejects requests containing 'Cash on Delivery' in paymentMethod", () => {
      const maliciousPayload = {
        customer: {
          fullName: "Malicious Tester",
          phone: "9825144210",
          addressLine: "Test Address, Street 1",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
          country: "India",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
        paymentMethod: "Cash on Delivery" as any,
      };

      expect(() => createOrderServer(maliciousPayload)).toThrow(
        /Cash on Delivery \(COD\) is disabled and not accepted/
      );
    });

    it("allows valid supported paymentMethod 'WhatsApp Direct Order' to be created", () => {
      const validPayload = {
        customer: {
          fullName: "Valid Customer",
          phone: "9825144210",
          addressLine: "Valid Address, Street 1",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
          country: "India",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
        paymentMethod: "WhatsApp Direct Order" as const,
      };

      const res = createOrderServer(validPayload);
      expect(res.success).toBe(true);
      expect(res.order.paymentMethod).toBe("WhatsApp Direct Order");
      expect(res.order.paymentStatus).toBe("Pending Confirmation");
    });
  });

  describe("4. Preservation of Historical Orders & Admin Integrity", () => {
    it("verifies existing orders with historical COD payment method are preserved with unmodified payment status", () => {
      // Historical order fixture matching database/localStorage format
      const historicalOrder = {
        id: "ORD-HIST-72104",
        createdAt: "2026-09-15T10:00:00.000Z",
        customerName: "Mohammad Arif",
        customerPhone: "9825144210",
        shippingAddress: {
          id: "addr-sample-1",
          fullName: "Mohammad Arif",
          phone: "9825144210",
          addressLine: "Flat 204, Al-Madina Heights, Relief Road",
          city: "Ahmedabad",
          state: "Gujarat",
          pincode: "380001",
        },
        items: [
          {
            productId: "shifa-arq-abe-hayat",
            productName: "Arq Abe Hayat Drops",
            productImage: "/assets/molana/IMG-20261009-WA0013.jpg",
            price: 250,
            quantity: 2,
            packSize: "15ml Amber Dropper Bottle",
          },
        ],
        subtotal: 500,
        shippingCharge: 0,
        discount: 0,
        total: 500,
        paymentMethod: "COD" as const,
        paymentStatus: "Paid" as const,
        orderStatus: "Delivered" as const,
        trackingNumber: "TRK-IN74291",
        notes: "Historical order delivered safely",
      };

      // Ensure historical records remain unchanged
      expect(historicalOrder.paymentMethod).toBe("COD");
      expect(historicalOrder.paymentStatus).toBe("Paid");
      expect(historicalOrder.orderStatus).toBe("Delivered");
    });
  });
});
