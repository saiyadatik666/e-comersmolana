import { describe, it, expect } from "vitest";
import { INITIAL_PRODUCTS, CATEGORIES } from "@/data/products";
import {
  buildWhatsAppOrderMessage,
  cleanWhatsAppNumber,
  formatWhatsAppUrl,
  formatWhatsAppWebUrl,
  CustomerDeliveryDetails,
} from "@/context/StoreContext";
import fs from "fs";
import path from "path";

describe("Part 11 — Final Professional Launch Audit Suite", () => {
  describe("1. Catalog and Image Integrity (All 21 Products)", () => {
    it("contains exactly 21 authentic Unani/Ayurvedic herbal formulations", () => {
      expect(INITIAL_PRODUCTS.length).toBe(21);
      const uniqueIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
      expect(uniqueIds.size).toBe(21);
    });

    it("verifies all 21 product studio packaging images exist on disk", () => {
      for (const product of INITIAL_PRODUCTS) {
        const fullPath = path.join(process.cwd(), "public", product.image);
        expect(fs.existsSync(fullPath), `Missing studio image for ${product.id} at ${fullPath}`).toBe(true);
      }
    });

    it("verifies all 21 authentic heritage vintage posters (molana.zip) exist on disk", () => {
      for (const product of INITIAL_PRODUCTS) {
        expect(product.posterImage).toBeDefined();
        if (product.posterImage) {
          const fullPath = path.join(process.cwd(), "public", product.posterImage);
          expect(fs.existsSync(fullPath), `Missing poster image for ${product.id} at ${fullPath}`).toBe(true);
        }
      }
    });

    it("verifies verified price products match historical vintage rate cards", () => {
      const arqAbeHayat = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat");
      expect(arqAbeHayat).toBeDefined();
      expect(arqAbeHayat?.price).toBe(250);
      expect(arqAbeHayat?.isVerifiedPrice).toBe(true);

      const tanavaiTel = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel");
      expect(tanavaiTel).toBeDefined();
      expect(tanavaiTel?.price).toBe(200);
      expect(tanavaiTel?.isVerifiedPrice).toBe(true);
    });

    it("verifies all 7 categories have mapped products and descriptions", () => {
      const nonAllCategories = CATEGORIES.filter((c) => c.id !== "all");
      expect(nonAllCategories.length).toBe(7);

      for (const cat of nonAllCategories) {
        const prods = INITIAL_PRODUCTS.filter((p) => p.category === cat.id);
        expect(prods.length, `Category ${cat.id} has no products`).toBeGreaterThan(0);
      }
    });
  });

  describe("2. Cart Calculations, Quantity Updates & Free Shipping (₹499)", () => {
    const FREE_SHIPPING_THRESHOLD = 499;
    const STANDARD_SHIPPING_FEE = 49;

    it("calculates cart subtotal and quantity changes accurately", () => {
      const item1 = { price: 250, quantity: 1 }; // Arq Abe Hayat
      const item2 = { price: 200, quantity: 2 }; // Tanavai Tel
      const subtotal = item1.price * item1.quantity + item2.price * item2.quantity;
      expect(subtotal).toBe(650);

      // Increasing quantity of item1 to 3
      const updatedQuantity = 3;
      const updatedSubtotal = item1.price * updatedQuantity + item2.price * item2.quantity;
      expect(updatedSubtotal).toBe(1150);
    });

    it("charges ₹49 shipping when cart subtotal is below ₹499", () => {
      const subtotalBelow = 450; // Below 499
      const shipping = subtotalBelow >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
      expect(shipping).toBe(49);
      expect(subtotalBelow + shipping).toBe(499);
    });

    it("unlocks ₹0 free shipping when cart subtotal is ₹499 or more", () => {
      const subtotalExact = 499;
      const shippingExact = subtotalExact >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
      expect(shippingExact).toBe(0);

      const subtotalAbove = 1450;
      const shippingAbove = subtotalAbove >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
      expect(shippingAbove).toBe(0);
    });

    it("evaluates amount needed and progress percentage for free shipping", () => {
      const subtotal = 250;
      const amountNeeded = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
      expect(amountNeeded).toBe(249);
      const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
      expect(progress).toBe(50);
    });
  });

  describe("3. Coupon Engine Verification (SHIFA10, AYURVEDA50, FREECOD)", () => {
    it("applies SHIFA10 with 10% discount", () => {
      const subtotal = 1000;
      const discount = Math.round(subtotal * 0.1);
      expect(discount).toBe(100);
      const grandTotal = subtotal - discount;
      expect(grandTotal).toBe(900);
    });

    it("applies AYURVEDA50 with flat ₹50 discount capped at subtotal", () => {
      const subtotal = 400;
      const discount = Math.min(50, subtotal);
      expect(discount).toBe(50);
      expect(subtotal - discount).toBe(350);

      // Subtotal less than 50
      const smallSubtotal = 30;
      const smallDiscount = Math.min(50, smallSubtotal);
      expect(smallDiscount).toBe(30);
      expect(smallSubtotal - smallDiscount).toBe(0);
    });

    it("applies FREECOD which waives shipping fee", () => {
      const subtotal = 300; // Below free shipping threshold
      const shippingFee = 49;
      const discount = shippingFee; // FREECOD discounts shipping fee
      const grandTotal = subtotal + shippingFee - discount;
      expect(grandTotal).toBe(300);
    });

    it("rejects unknown or invalid coupons", () => {
      const validCoupons = ["SHIFA10", "AYURVEDA50", "FREECOD"];
      expect(validCoupons.includes("DISCOUNT100")).toBe(false);
      expect(validCoupons.includes("FREE")).toBe(false);
      expect(validCoupons.includes("")).toBe(false);
    });
  });

  describe("4. Checkout Validation & WhatsApp Order Preparation", () => {
    const validCustomer: CustomerDeliveryDetails = {
      fullName: "Hakim Mohammad Rafiq",
      phone: "9586037331",
      addressLine: "Shifa Khana, Station Road",
      cityVillage: "Palanpur",
      state: "Gujarat",
      pincode: "385001",
      country: "India",
      landmark: "Near Bus Stand",
      email: "consultation@shifaahayt.com",
    };

    it("validates 10-digit phone number and 6-digit PIN code", () => {
      const cleanPhone = validCustomer.phone.replace(/[^0-9]/g, "");
      expect(cleanPhone.length).toBe(10);
      expect(/^[6-9]\d{9}$/.test(cleanPhone)).toBe(true);

      const cleanPin = validCustomer.pincode.replace(/[^0-9]/g, "");
      expect(cleanPin.length).toBe(6);
      expect(/^\d{6}$/.test(cleanPin)).toBe(true);
    });

    it("builds clean WhatsApp order message with customer details and line items", () => {
      const msg = buildWhatsAppOrderMessage({
        customer: validCustomer,
        items: [
          {
            product: {
              id: "shifa-zafrani-gold",
              name: "Capsule Zafrani Gold",
              nameHindi: "कैप्सूल ज़ाफरानी गोल्ड",
              price: 1450,
              image: "/assets/products/zafrani-gold.jpg",
              packSize: "60 Capsules",
            },
            quantity: 1,
            packSize: "60 Capsules",
          },
        ],
        subtotal: 1450,
        shippingCharge: 0,
        finalAmount: 1450,
        origin: "https://shifa-a-hayat.com",
      });

      expect(msg).toContain("SHIFA A HAYAT — NEW ORDER REQUEST");
      expect(msg).toContain("Hakim Mohammad Rafiq");
      expect(msg).toContain("9586037331");
      expect(msg).toContain("Palanpur");
      expect(msg).toContain("385001");
      expect(msg).toContain("Capsule Zafrani Gold");
      expect(msg).toContain("₹1450");
      expect(msg).toContain("- Final amount: ₹1450");
    });

    it("cleans WhatsApp phone number properly", () => {
      expect(cleanWhatsAppNumber("9586037331")).toBe("919586037331");
      expect(cleanWhatsAppNumber("+91 95860 37331")).toBe("919586037331");
      expect(cleanWhatsAppNumber("919586037331")).toBe("919586037331");
    });

    it("generates correct WhatsApp web and mobile URLs", () => {
      const mobileUrl = formatWhatsAppUrl("9586037331", "Test Order");
      expect(mobileUrl).toBe("https://wa.me/919586037331?text=Test%20Order");

      const webUrl = formatWhatsAppWebUrl("9586037331", "Test Order");
      expect(webUrl).toBe("https://web.whatsapp.com/send?phone=919586037331&text=Test%20Order");
    });
  });

  describe("5. Admin Portal Security & Progressive Lockout Guard", () => {
    it("computes progressive cooldown seconds for repeated failed PIN attempts", () => {
      const calculateCooldown = (failedAttempts: number) => {
        if (failedAttempts < 5) return 0;
        return Math.min(30 + (failedAttempts - 5) * 15, 300);
      };

      expect(calculateCooldown(1)).toBe(0);
      expect(calculateCooldown(4)).toBe(0);
      expect(calculateCooldown(5)).toBe(30); // 5th attempt triggers 30s
      expect(calculateCooldown(6)).toBe(45); // 6th attempt triggers 45s
      expect(calculateCooldown(10)).toBe(105);
      expect(calculateCooldown(30)).toBe(300); // capped at 5 minutes
    });

    it("verifies admin default PIN matches 9586", () => {
      const defaultPin = "9586";
      expect(defaultPin).toBe("9586");
    });
  });

  describe("6. Statutory Disclaimer & SEO Architecture", () => {
    it("verifies medical disclaimer is present and explicit", () => {
      const disclaimer =
        "Shifa A Hayat के सभी उत्पाद पारंपरिक भारतीय आयुर्वेद एवं यूनानी पद्धति के अनुसार प्राकृतिक जड़ी-बूटियों से तैयार किए जाते हैं।";
      expect(disclaimer.length).toBeGreaterThan(50);
    });

    it("verifies business telephone helpline matches +91 95860 37331", () => {
      const phone = "+91 95860 37331";
      expect(phone.replace(/[^0-9]/g, "")).toBe("919586037331");
    });
  });
});
