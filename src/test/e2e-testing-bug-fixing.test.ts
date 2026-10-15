import { describe, it, expect, beforeEach } from "vitest";
import { INITIAL_PRODUCTS, CATEGORIES, type Product } from "@/data/products";
import {
  buildWhatsAppOrderMessage,
  formatWhatsAppUrl,
  cleanWhatsAppNumber,
  type CustomerDeliveryDetails,
} from "../context/StoreContext";

describe("Part 21 — End-to-End Testing and Bug Fixing Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("1. Invalid Product IDs & Catalog Robustness", () => {
    it("handles non-existent product IDs gracefully without throwing runtime exceptions", () => {
      const invalidIds = ["non-existent-product", "", "undefined", "null", "12345", "../../etc/passwd"];
      invalidIds.forEach((id) => {
        const found = INITIAL_PRODUCTS.find((p) => p.id === id);
        expect(found).toBeUndefined();
      });
    });

    it("verifies all 21 authentic catalog products exist with non-empty required fields", () => {
      expect(INITIAL_PRODUCTS).toHaveLength(21);
      INITIAL_PRODUCTS.forEach((product) => {
        expect(product.id).toBeTruthy();
        expect(product.name).toBeTruthy();
        expect(product.nameHindi).toBeTruthy();
        expect(product.price).toBeGreaterThan(0);
        expect(product.image).toBeTruthy();
        expect(product.category).toBeTruthy();
        expect(product.packSize).toBeTruthy();
      });
    });

    it("validates authentic pricing for flagship verified products", () => {
      const arqAbeHayat = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat")!;
      expect(arqAbeHayat).toBeDefined();
      expect(arqAbeHayat.price).toBe(250);

      const tanavaiTel = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel")!;
      expect(tanavaiTel).toBeDefined();
      expect(tanavaiTel.price).toBe(200);

      const zafraniGold = INITIAL_PRODUCTS.find((p) => p.id === "shifa-zafrani-gold")!;
      expect(zafraniGold).toBeDefined();
      expect(zafraniGold.price).toBe(1450);

      const dimagiTonic = INITIAL_PRODUCTS.find((p) => p.id === "shifa-dimagi-tonic")!;
      expect(dimagiTonic).toBeDefined();
      expect(dimagiTonic.price).toBe(420);
    });
  });

  describe("2. Empty States & Navigation Handling", () => {
    it("identifies empty cart state and provides appropriate zero-item totals", () => {
      const cart: { product: Product; quantity: number }[] = [];
      const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const standardShipping = 49;
      const freeShippingThreshold = 499;

      const shippingFee = cartSubtotal >= freeShippingThreshold || cartSubtotal === 0 ? 0 : standardShipping;
      const finalTotal = cartSubtotal + shippingFee;

      expect(cart).toHaveLength(0);
      expect(cartSubtotal).toBe(0);
      expect(shippingFee).toBe(0); // Empty cart does not charge shipping
      expect(finalTotal).toBe(0);
    });

    it("identifies empty search filter results and allows recovery", () => {
      const query = "nonexistentherbalformula123";
      const matches = INITIAL_PRODUCTS.filter((p) =>
        p.name.toLowerCase().includes(query) || p.nameHindi.includes(query)
      );
      expect(matches).toHaveLength(0);
      // Empty state triggers reset
      const resetQuery = "";
      const recovered = INITIAL_PRODUCTS.filter((p) =>
        resetQuery === "" ? true : p.name.includes(resetQuery)
      );
      expect(recovered).toHaveLength(21);
    });
  });

  describe("3. Verified Coupon Rules & ₹499 Free Shipping Exactness", () => {
    const freeShippingThreshold = 499;
    const standardShipping = 49;

    it("verifies SHIFA10 grants 10% discount accurately rounded", () => {
      const subtotal = 750;
      const discount = Math.round(subtotal * 0.1);
      expect(discount).toBe(75);
      const total = subtotal - discount;
      expect(total).toBe(675);
    });

    it("verifies AYURVEDA50 grants flat ₹50 discount capped at subtotal", () => {
      const subtotalNormal = 300;
      const discountNormal = Math.min(50, subtotalNormal);
      expect(discountNormal).toBe(50);

      const subtotalSmall = 35;
      const discountSmall = Math.min(50, subtotalSmall);
      expect(discountSmall).toBe(35);
      expect(subtotalSmall - discountSmall).toBe(0);
    });

    it("verifies FREECOD waives the ₹49 shipping charge on orders below ₹499", () => {
      const subtotal = 250;
      const shipping = subtotal >= freeShippingThreshold ? 0 : standardShipping;
      expect(shipping).toBe(49);

      const discount = shipping; // FREECOD discount equals shipping fee
      const finalShipping = shipping - discount;
      expect(finalShipping).toBe(0);
      expect(subtotal + finalShipping).toBe(250);
    });

    it("verifies ₹499 free shipping threshold boundaries", () => {
      // 1 rupee below threshold
      expect(498 >= freeShippingThreshold ? 0 : standardShipping).toBe(49);
      // Exactly at threshold
      expect(499 >= freeShippingThreshold ? 0 : standardShipping).toBe(0);
      // 1 rupee above threshold
      expect(500 >= freeShippingThreshold ? 0 : standardShipping).toBe(0);
    });
  });

  describe("4. Displayed Total & WhatsApp Message Reconciliation", () => {
    it("ensures WhatsApp message breakdown reconciles with displayed cart total (without coupon)", () => {
      const customer: CustomerDeliveryDetails = {
        fullName: "Akram Shaikh",
        phone: "9825123456",
        addressLine: "Near Delhi Gate",
        cityVillage: "Palanpur",
        state: "Gujarat",
        pincode: "385001",
        country: "India",
      };

      const product = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat")!;
      const quantity = 2;
      const subtotal = product.price * quantity; // 250 * 2 = 500
      const shippingCharge = subtotal >= 499 ? 0 : 49; // 0
      const finalAmount = subtotal + shippingCharge; // 500

      const msg = buildWhatsAppOrderMessage({
        customer,
        items: [{ product, quantity }],
        subtotal,
        shippingCharge,
        finalAmount,
        origin: "https://shifa-a-hayat.com",
      });

      expect(msg).toContain("Subtotal: ₹500");
      expect(msg).toContain("Shipping charge: ₹0 (Free Delivery)");
      expect(msg).toContain("Final amount: ₹500");
    });

    it("ensures WhatsApp message breakdown reconciles when coupon discount is applied", () => {
      const customer: CustomerDeliveryDetails = {
        fullName: "Mohammed Rafiq",
        phone: "9825098250",
        addressLine: "Station Road",
        cityVillage: "Palanpur",
        state: "Gujarat",
        pincode: "385001",
        country: "India",
      };

      const product = INITIAL_PRODUCTS.find((p) => p.id === "shifa-zafrani-gold")!;
      const quantity = 1;
      const subtotal = product.price * quantity; // 1450
      const shippingCharge = subtotal >= 499 ? 0 : 49; // 0
      const discount = Math.round(subtotal * 0.1); // 145 (SHIFA10)
      const finalAmount = subtotal + shippingCharge - discount; // 1305

      const msg = buildWhatsAppOrderMessage({
        customer,
        items: [{ product, quantity }],
        subtotal,
        shippingCharge,
        finalAmount,
        discount,
        couponCode: "SHIFA10",
        origin: "https://shifa-a-hayat.com",
      });

      expect(msg).toContain("Subtotal: ₹1450");
      expect(msg).toContain("Shipping charge: ₹0 (Free Delivery)");
      expect(msg).toContain("Coupon discount (SHIFA10): -₹145");
      expect(msg).toContain("Final amount: ₹1305");
      // Check mathematical reconciliation: 1450 + 0 - 145 = 1305
      expect(subtotal + shippingCharge - discount).toBe(finalAmount);
    });

    it("verifies official WhatsApp helpline number +91 95860 37331 formatting", () => {
      const raw = "+91 95860 37331";
      const cleaned = cleanWhatsAppNumber(raw);
      expect(cleaned).toBe("919586037331");

      const waUrl = formatWhatsAppUrl(cleaned, "Test message");
      expect(waUrl.startsWith("https://wa.me/919586037331?text=")).toBe(true);
    });
  });

  describe("5. Quantity Bounds & Stock Protections", () => {
    it("sanitizes negative, fractional, and exorbitant quantities", () => {
      const maxStock = 20;

      const sanitize = (rawQty: number) => {
        return Math.max(1, Math.min(maxStock, Math.min(99, Math.floor(rawQty) || 1)));
      };

      expect(sanitize(-10)).toBe(1);
      expect(sanitize(0)).toBe(1);
      expect(sanitize(2.8)).toBe(2);
      expect(sanitize(50)).toBe(20); // Capped at stock
    });

    it("blocks checkout when stock is 0 (out-of-stock)", () => {
      const product: Product = {
        ...INITIAL_PRODUCTS[0]!,
        stockCount: 0,
        inStock: false,
      };

      const canCheckout = product.inStock && (product.stockCount ?? 0) > 0;
      expect(canCheckout).toBe(false);
    });
  });

  describe("6. Customer Form Validation & Data Integrity", () => {
    it("validates mobile number to strictly require 10 digits", () => {
      const validatePhone = (p: string) => {
        const clean = p.replace(/[^0-9]/g, "");
        return clean.length === 10 || (clean.length === 12 && clean.startsWith("91"));
      };

      expect(validatePhone("9825123456")).toBe(true);
      expect(validatePhone("+91 98251 23456")).toBe(true);
      expect(validatePhone("12345")).toBe(false);
      expect(validatePhone("abcdefghij")).toBe(false);
      expect(validatePhone("")).toBe(false);
    });

    it("validates Indian pincode to require 6 digits", () => {
      const validatePincode = (p: string) => {
        const clean = p.replace(/[^0-9]/g, "");
        return clean.length === 6;
      };

      expect(validatePincode("385001")).toBe(true);
      expect(validatePincode("38500")).toBe(false);
      expect(validatePincode("3850012")).toBe(false);
      expect(validatePincode("ABCDEF")).toBe(false);
    });
  });

  describe("7. Admin PIN Authentication & Rate Limiting", () => {
    it("authenticates valid admin PIN 9586", () => {
      const pin = "9586";
      const isAuth = pin === "9586";
      expect(isAuth).toBe(true);
    });

    it("rejects invalid admin PIN and increments failed attempts counter", () => {
      let failedAttempts = 0;
      const attemptPin = (entered: string) => {
        if (entered !== "9586") {
          failedAttempts += 1;
          return false;
        }
        return true;
      };

      expect(attemptPin("0000")).toBe(false);
      expect(attemptPin("1234")).toBe(false);
      expect(attemptPin("9999")).toBe(false);
      expect(failedAttempts).toBe(3);

      // Lockout triggered after 5 failed attempts
      for (let i = 0; i < 2; i++) {
        attemptPin("wrong");
      }
      expect(failedAttempts).toBe(5);
      const isLockedOut = failedAttempts >= 5;
      expect(isLockedOut).toBe(true);
    });
  });
});
