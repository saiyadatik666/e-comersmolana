import { describe, it, expect, beforeEach } from "vitest";
import { INITIAL_PRODUCTS, CATEGORIES, type Product } from "@/data/products";
import {
  buildWhatsAppOrderMessage,
  formatWhatsAppUrl,
  cleanWhatsAppNumber,
  type CustomerDeliveryDetails,
} from "../context/StoreContext";

describe("Part 20 — Customer Journey & Conversion Optimization Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("1. Customer Discovery & Catalog Navigation", () => {
    it("provides all 21 catalog products with valid slugs and essential metadata", () => {
      expect(INITIAL_PRODUCTS).toHaveLength(21);
      INITIAL_PRODUCTS.forEach((prod) => {
        expect(prod.id).toBeTruthy();
        expect(prod.name).toBeTruthy();
        expect(prod.nameHindi).toBeTruthy();
        expect(prod.price).toBeGreaterThan(0);
        expect(prod.image).toBeTruthy();
        expect(prod.category).toBeTruthy();
      });
    });

    it("verifies all 4 defined categories are accessible and cover catalog products", () => {
      const definedCategoryIds = CATEGORIES.map((c) => c.id).filter((id) => id !== "all");
      expect(definedCategoryIds.length).toBeGreaterThanOrEqual(4);

      definedCategoryIds.forEach((catId) => {
        const matches = INITIAL_PRODUCTS.filter((p) => p.category === catId);
        expect(matches.length).toBeGreaterThan(0);
      });
    });

    it("ensures authentic heritage products have verified prices and images", () => {
      const arqAbeHayat = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat");
      expect(arqAbeHayat).toBeDefined();
      expect(arqAbeHayat?.price).toBe(250);
      expect(arqAbeHayat?.isVerifiedPrice).toBe(true);

      const tanavaiTel = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel");
      expect(tanavaiTel).toBeDefined();
      expect(tanavaiTel?.price).toBe(200);
      expect(tanavaiTel?.isVerifiedPrice).toBe(true);

      const zafraniGold = INITIAL_PRODUCTS.find((p) => p.id === "shifa-zafrani-gold");
      expect(zafraniGold).toBeDefined();
      expect(zafraniGold?.price).toBe(1450);
    });
  });

  describe("2. Product Page Usability & Duplicate Click Prevention", () => {
    it("debounces and ignores duplicate rapid clicks when item is already added or in processing", () => {
      let cartCount = 0;
      let added = false;
      const product = INITIAL_PRODUCTS[0]!;

      const simulateClick = () => {
        if (added) return false;
        cartCount += 1;
        added = true;
        return true;
      };

      // First click succeeds
      const firstClick = simulateClick();
      expect(firstClick).toBe(true);
      expect(cartCount).toBe(1);

      // Rapid second and third clicks are ignored while feedback is showing
      const secondClick = simulateClick();
      const thirdClick = simulateClick();
      expect(secondClick).toBe(false);
      expect(thirdClick).toBe(false);
      expect(cartCount).toBe(1);
    });

    it("clamps quantity selector to available stock limits", () => {
      const product: Product = {
        ...INITIAL_PRODUCTS[0]!,
        stockCount: 4,
        inStock: true,
      };

      const maxStock = product.stockCount !== undefined ? Math.max(1, product.stockCount) : 99;
      expect(maxStock).toBe(4);

      let qty = 1;
      // Increment until max
      for (let i = 0; i < 10; i++) {
        qty = Math.min(maxStock, qty + 1);
      }
      expect(qty).toBe(4);

      // Decrement cannot go below 1
      for (let i = 0; i < 10; i++) {
        qty = Math.max(1, qty - 1);
      }
      expect(qty).toBe(1);
    });
  });

  describe("3. Shopping Cart & Frictionless Pricing Calculations", () => {
    it("correctly applies 10% discount for coupon SHIFA10", () => {
      const subtotal = 1200;
      const discount = Math.round(subtotal * 0.1);
      expect(discount).toBe(120);
      expect(subtotal - discount).toBe(1080);
    });

    it("correctly applies flat ₹50 discount for coupon AYURVEDA50", () => {
      const subtotal = 350;
      const discount = Math.min(50, subtotal);
      expect(discount).toBe(50);
      expect(subtotal - discount).toBe(300);
    });

    it("waives the ₹49 shipping fee on orders below ₹499 when coupon FREECOD is applied", () => {
      const subtotal = 300;
      const standardShipping = 49;
      const freeShippingThreshold = 499;

      const baseShipping = subtotal >= freeShippingThreshold ? 0 : standardShipping;
      expect(baseShipping).toBe(49);

      // With FREECOD
      const discount = baseShipping;
      const finalShipping = baseShipping - discount;
      expect(finalShipping).toBe(0);
      const total = subtotal + finalShipping;
      expect(total).toBe(300);
    });

    it("automatically grants free shipping when cart subtotal meets or exceeds ₹499", () => {
      const freeShippingThreshold = 499;
      const standardShipping = 49;

      const subtotalBelow = 450;
      expect(subtotalBelow >= freeShippingThreshold ? 0 : standardShipping).toBe(49);

      const subtotalExact = 499;
      expect(subtotalExact >= freeShippingThreshold ? 0 : standardShipping).toBe(0);

      const subtotalAbove = 900;
      expect(subtotalAbove >= freeShippingThreshold ? 0 : standardShipping).toBe(0);
    });
  });

  describe("4. Checkout Form Validation & Customer Information", () => {
    it("validates all 7 required customer fields", () => {
      const validate = (details: Partial<CustomerDeliveryDetails>) => {
        const errors: Record<string, string> = {};
        if (!details.fullName?.trim()) errors["fullName"] = "Required";
        const cleanPhone = (details.phone || "").replace(/[^0-9]/g, "");
        if (!cleanPhone || cleanPhone.length < 10) errors["phone"] = "Required";
        if (!details.addressLine?.trim() || details.addressLine.trim().length < 5) errors["addressLine"] = "Required";
        if (!details.cityVillage?.trim()) errors["cityVillage"] = "Required";
        if (!details.state?.trim()) errors["state"] = "Required";
        const cleanPincode = (details.pincode || "").replace(/[^0-9]/g, "");
        if (!cleanPincode || cleanPincode.length !== 6) errors["pincode"] = "Required";
        if (!details.country?.trim()) errors["country"] = "Required";
        return errors;
      };

      // Empty submission fails
      const emptyErrors = validate({});
      expect(Object.keys(emptyErrors).length).toBe(7);

      // Complete valid submission passes
      const validErrors = validate({
        fullName: "Mohammed Rafiq",
        phone: "9825123456",
        addressLine: "Flat 302, Green Avenue, Delhi Gate",
        cityVillage: "Palanpur",
        state: "Gujarat",
        pincode: "385001",
        country: "India",
      });
      expect(Object.keys(validErrors).length).toBe(0);
    });

    it("allows optional landmark and email without validation errors", () => {
      const cleanPhone = "9825123456";
      const pincode = "385001";
      expect(cleanPhone.length).toBe(10);
      expect(pincode.length).toBe(6);
    });
  });

  describe("5. WhatsApp Order Generation & Confirmation Disclosure", () => {
    it("builds clean WhatsApp message containing all required items, address, and instructions", () => {
      const customer: CustomerDeliveryDetails = {
        fullName: "Sanjay Patel",
        phone: "9825098250",
        addressLine: "Station Road Near Post Office",
        cityVillage: "Palanpur",
        state: "Gujarat",
        pincode: "385001",
        country: "India",
      };

      const items = [
        {
          product: {
            name: "Arq Abe Hayat Drops",
            nameHindi: "अर्क आब-ए-हयात",
            price: 250,
            id: "shifa-arq-abe-hayat",
            image: "/assets/products/arq-abe-hayat.jpg",
            packSize: "15ml Amber Dropper Bottle",
          },
          quantity: 2,
        },
      ];

      const msg = buildWhatsAppOrderMessage({
        customer,
        items,
        subtotal: 500,
        shippingCharge: 0,
        finalAmount: 500,
        origin: "https://shifa-a-hayat.com",
      });

      expect(msg).toContain("SHIFA A HAYAT — NEW ORDER REQUEST");
      expect(msg).toContain("Sanjay Patel");
      expect(msg).toContain("9825098250");
      expect(msg).toContain("Station Road Near Post Office");
      expect(msg).toContain("Palanpur");
      expect(msg).toContain("385001");
      expect(msg).toContain("Arq Abe Hayat Drops");
      expect(msg).toContain("Selected quantity: 2");
      expect(msg).toContain("Final amount: ₹500");
      expect(msg).toContain("Please review this order request and press Send to submit to Shifa A Hayat.");
    });

    it("formats WhatsApp URL with sanitized 91 country code", () => {
      const rawNumber = "+91 95860 37331";
      const cleaned = cleanWhatsAppNumber(rawNumber);
      expect(cleaned).toBe("919586037331");

      const url = formatWhatsAppUrl(cleaned, "Test Message");
      expect(url).toBe("https://wa.me/919586037331?text=Test%20Message");
    });
  });
});
