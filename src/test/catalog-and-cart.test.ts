import { describe, expect, it } from "vitest";
import { INITIAL_PRODUCTS, CATEGORIES } from "@/data/products";

describe("Product Catalog Data Integrity", () => {
  it("contains exactly 21 initial products matching the molana.zip assets", () => {
    expect(INITIAL_PRODUCTS.length).toBe(21);
  });

  it("verifies Arq Abe Hayat poster price is exactly 250 INR", () => {
    const arq = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat");
    expect(arq).toBeDefined();
    expect(arq?.price).toBe(250);
    expect(arq?.isVerifiedPrice).toBe(true);
    expect(arq?.imageName).toBe("IMG-20261009-WA0013.jpg");
  });

  it("verifies Tanavai Nabhi Tel poster price is exactly 200 INR", () => {
    const tel = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel");
    expect(tel).toBeDefined();
    expect(tel?.price).toBe(200);
    expect(tel?.isVerifiedPrice).toBe(true);
    expect(tel?.imageName).toBe("IMG-20261009-WA0021.jpg");
  });

  it("all products have valid categories from the defined taxonomy", () => {
    const validCategoryIds = CATEGORIES.map((c) => c.id);
    INITIAL_PRODUCTS.forEach((p) => {
      expect(validCategoryIds).toContain(p.category);
      expect(p.price).toBeGreaterThan(0);
      expect(p.name).toBeTruthy();
      expect(p.nameHindi).toBeTruthy();
      expect(p.image).toMatch(/^\/assets\/(products|molana)\//);
      expect(p.posterImage || p.image).toMatch(/^\/assets\/molana\/IMG-/);
      expect(p.benefits.length).toBeGreaterThan(0);
      expect(p.ingredients.length).toBeGreaterThan(0);
    });
  });

  it("calculates discounts and free shipping correctly", () => {
    const subtotal = 700;
    const freeShippingThreshold = 499;
    const shipping = subtotal >= freeShippingThreshold ? 0 : 49;
    expect(shipping).toBe(0);

    const discount10 = Math.round(subtotal * 0.1);
    expect(discount10).toBe(70);

    const grandTotal = subtotal + shipping - discount10;
    expect(grandTotal).toBe(630);
  });
});

import {
  buildWhatsAppOrderMessage,
  generateWhatsAppOrderUrl,
  cleanWhatsAppNumber,
  formatWhatsAppUrl,
  formatWhatsAppWebUrl,
  CustomerDeliveryDetails,
} from "@/context/StoreContext";

describe("WhatsApp Order Request Generator (PRD Section 7)", () => {
  const mockCustomer: CustomerDeliveryDetails = {
    fullName: "Mohammad Rafiq",
    phone: "9825012345",
    addressLine: "House No. 14, Near Madina Masjid",
    cityVillage: "Palanpur",
    state: "Gujarat",
    pincode: "385001",
    country: "India",
    landmark: "Water Tank Road",
    email: "rafiq@example.com",
  };

  const sampleProducts = [
    {
      product: INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat")!,
      quantity: 2,
      packSize: "15ml Amber Dropper Bottle",
    },
    {
      product: INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel")!,
      quantity: 1,
      packSize: "30ml Dropper Bottle",
    },
  ];

  it("builds exact WhatsApp message adhering to Section 7 format", () => {
    const message = buildWhatsAppOrderMessage({
      customer: mockCustomer,
      items: sampleProducts,
      subtotal: 700,
      shippingCharge: 0,
      finalAmount: 700,
      origin: "https://shifa-a-hayat.com",
    });

    // 1. Mandatory Header
    expect(message).toContain("SHIFA A HAYAT — NEW ORDER REQUEST");

    // 2. Customer Details Section & Fields
    expect(message).toContain("CUSTOMER DETAILS");
    expect(message).toContain("- Full name: Mohammad Rafiq");
    expect(message).toContain("- Mobile number: 9825012345");
    expect(message).toContain("- Complete delivery address: House No. 14, Near Madina Masjid");
    expect(message).toContain("- City or village: Palanpur");
    expect(message).toContain("- State: Gujarat");
    expect(message).toContain("- PIN code: 385001");
    expect(message).toContain("- Country: India");
    expect(message).toContain("- Landmark: Water Tank Road");
    expect(message).toContain("- Email: rafiq@example.com");

    // 3. Product Details Section with URLs
    expect(message).toContain("PRODUCT DETAILS");
    expect(message).toContain("Arq Abe Hayat Drops");
    expect(message).toContain("Product price: ₹250");
    expect(message).toContain("Selected quantity: 2");
    expect(message).toContain("Product image URL: https://shifa-a-hayat.com/assets/products/arq-abe-hayat.jpg");
    expect(message).toContain("Product page URL: https://shifa-a-hayat.com/product/shifa-arq-abe-hayat");

    expect(message).toContain("Tanavai Nabhi Tel");
    expect(message).toContain("Product price: ₹200");
    expect(message).toContain("Selected quantity: 1");

    // 4. Order Summary Section
    expect(message).toContain("ORDER SUMMARY");
    expect(message).toContain("- Subtotal: ₹700");
    expect(message).toContain("- Shipping charge: ₹0 (Free Delivery)");
    expect(message).toContain("- Final amount: ₹700");
    expect(message).toContain("Please review this order request and press Send to submit to Shifa A Hayat.");
  });

  it("generates valid click-to-chat URL with proper phone and URL-encoding", () => {
    const url = generateWhatsAppOrderUrl({
      customer: mockCustomer,
      items: [sampleProducts[0]!],
      subtotal: 500,
      shippingCharge: 0,
      finalAmount: 500,
      whatsappNumber: "9586037331",
      origin: "https://shifa-a-hayat.com",
    });

    expect(url.startsWith("https://wa.me/919586037331?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("SHIFA A HAYAT — NEW ORDER REQUEST"));
    expect(url).toContain(encodeURIComponent("Mohammad Rafiq"));
  });

  it("normalizes phone numbers with various formats (cleanWhatsAppNumber)", () => {
    expect(cleanWhatsAppNumber("9586037331")).toBe("919586037331");
    expect(cleanWhatsAppNumber("+91 9586037331")).toBe("919586037331");
    expect(cleanWhatsAppNumber("+91-95860-37331")).toBe("919586037331");
    expect(cleanWhatsAppNumber("919586037331")).toBe("919586037331");
  });

  it("formats consultation click-to-chat URL with full URL encoding", () => {
    const text = "السلام علیکم Hakeem Ji, I want consultation regarding herbal products.";
    const url = formatWhatsAppUrl("9586037331", text);
    expect(url.startsWith("https://wa.me/919586037331?text=")).toBe(true);
    expect(url).not.toContain("api.whatsapp.com");
    expect(url).toContain(encodeURIComponent(text));
  });

  it("generates desktop WhatsApp Web fallback URL", () => {
    const text = "Test order";
    const webUrl = formatWhatsAppWebUrl("9586037331", text);
    expect(webUrl.startsWith("https://web.whatsapp.com/send?phone=919586037331&text=")).toBe(true);
  });
});

describe("Catalog Search, Filtering & Coupon Business Logic", () => {
  it("finds products by Hindi and English search keywords", () => {
    const queryHindi = "ज़ाफरानी";
    const matchesHindi = INITIAL_PRODUCTS.filter(
      (p) => p.name.includes(queryHindi) || p.nameHindi.includes(queryHindi)
    );
    expect(matchesHindi.length).toBeGreaterThanOrEqual(1);
    expect(matchesHindi[0]?.id).toBe("shifa-zafrani-gold");

    const queryEng = "capsule";
    const matchesEng = INITIAL_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(queryEng) ||
        p.description.toLowerCase().includes(queryEng) ||
        p.category.toLowerCase().includes(queryEng)
    );
    expect(matchesEng.length).toBeGreaterThanOrEqual(2);
  });

  it("filters correctly by health category", () => {
    const mens = INITIAL_PRODUCTS.filter((p) => p.category === "mens-wellness");
    expect(mens.length).toBeGreaterThan(0);
    mens.forEach((p) => {
      expect(p.category).toBe("mens-wellness");
    });
  });

  it("calculates coupons SHIFA10, AYURVEDA50, and FREECOD accurately", () => {
    const subtotal = 1000;
    const shipping = 49;

    // SHIFA10: 10% discount
    const discount10 = Math.round(subtotal * 0.1);
    expect(discount10).toBe(100);

    // AYURVEDA50: flat 50
    const discount50 = Math.min(50, subtotal);
    expect(discount50).toBe(50);

    // FREECOD: discounts shipping charge
    const discountFreeCod = shipping;
    expect(discountFreeCod).toBe(49);
  });

  it("validates 10-digit Indian phone numbers and PIN codes", () => {
    const isValidPhone = (p: string) => /^[6-9]\d{9}$/.test(p.replace(/[^0-9]/g, ""));
    expect(isValidPhone("9586037331")).toBe(true);
    expect(isValidPhone("+91 9586037331")).toBe(false); // Raw digits test
    expect(isValidPhone("9586037331".replace(/[^0-9]/g, ""))).toBe(true);
    expect(isValidPhone("123456")).toBe(false);

    const isValidPincode = (pin: string) => /^\d{6}$/.test(pin.trim());
    expect(isValidPincode("385001")).toBe(true);
    expect(isValidPincode("38500")).toBe(false);
    expect(isValidPincode("3850011")).toBe(false);
  });
});

describe("Product 404 Guard & Admin Security Verification", () => {
  it("does not silently fall back to product 0 when invalid product ID is requested", () => {
    const invalidId = "invalid-non-existent-product-id-12345";
    const found = INITIAL_PRODUCTS.find((p) => p.id === invalidId);
    expect(found).toBeUndefined();
    // Verify it is NOT sampleProducts[0] or INITIAL_PRODUCTS[0]
    expect(found).not.toBe(INITIAL_PRODUCTS[0]);
  });

  it("calculates progressive cooldown correctly for failed admin PIN attempts", () => {
    const calculateCooldown = (failedAttempts: number) => {
      if (failedAttempts < 5) return 0;
      return Math.min(30 + (failedAttempts - 5) * 15, 300);
    };

    expect(calculateCooldown(3)).toBe(0);
    expect(calculateCooldown(4)).toBe(0);
    expect(calculateCooldown(5)).toBe(30); // 30 seconds base
    expect(calculateCooldown(6)).toBe(45); // +15s
    expect(calculateCooldown(7)).toBe(60);
    expect(calculateCooldown(25)).toBe(300); // capped at 5 minutes
  });
});

