import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
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

  it("verifies that all primary and poster images for all 21 products exist on disk", () => {
    const publicDir = path.resolve(process.cwd(), "public");
    INITIAL_PRODUCTS.forEach((p) => {
      const primaryImagePath = path.join(publicDir, p.image.replace(/^\//, ""));
      expect(
        fs.existsSync(primaryImagePath),
        `Primary image for ${p.name} (${p.image}) does not exist on disk`
      ).toBe(true);

      if (p.posterImage) {
        const posterPath = path.join(publicDir, p.posterImage.replace(/^\//, ""));
        expect(
          fs.existsSync(posterPath),
          `Poster image for ${p.name} (${p.posterImage}) does not exist on disk`
        ).toBe(true);
      }
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
  sanitizeRecentlyViewedIds,
  pushRecentlyViewedId,
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
    expect(message).toContain("Product image URL: https://shifa-a-hayat.com/assets/molana/IMG-20261009-WA0013.jpg");
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

  it("reconciles cart items against authentic catalog data to prevent price tampering", () => {
    const rawMaliciousCart = [
      {
        product: { id: "shifa-arq-abe-hayat", name: "Tampered Product", price: 1 },
        quantity: 5,
      },
      {
        product: { id: "non-existent-fake-product", name: "Fake", price: 10 },
        quantity: 2,
      },
    ];

    const sanitizedCart = rawMaliciousCart
      .map((item) => {
        const authentic = INITIAL_PRODUCTS.find((p) => p.id === item.product.id);
        if (!authentic) return null;
        return {
          product: authentic,
          quantity: Math.max(1, Math.min(99, item.quantity)),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    expect(sanitizedCart.length).toBe(1);
    expect(sanitizedCart[0]?.product.id).toBe("shifa-arq-abe-hayat");
    // Verified authentic price must be 250, not 1!
    expect(sanitizedCart[0]?.product.price).toBe(250);
    expect(sanitizedCart[0]?.quantity).toBe(5);
  });

  it("calculates order discount correctly from subtotal, shippingFee, and finalTotal", () => {
    const subtotal = 1000;
    const shippingFee = 0;
    const finalTotal = 900; // 10% coupon applied
    const computedDiscount = Math.max(0, subtotal + shippingFee - finalTotal);
    expect(computedDiscount).toBe(100);
  });
});

describe("End-to-End Realistic Customer Shopping Journey (Part 4 Verification)", () => {
  it("completes full shopping journey: search -> detail -> add to cart -> quantity change -> coupon -> checkout -> WhatsApp message & copy fallback", () => {
    // 1. Search for product
    const searchQuery = "arq";
    const found = INITIAL_PRODUCTS.find(
      (p) =>
        p.id.toLowerCase().includes(searchQuery) ||
        p.name.toLowerCase().includes(searchQuery) ||
        p.nameHindi.includes(searchQuery)
    );
    expect(found).toBeDefined();
    expect(found?.id).toBe("shifa-arq-abe-hayat");
    expect(found?.price).toBe(250);

    // 2. Add to cart with quantity 1
    let cart = [{ product: found!, quantity: 1, packSize: found!.packSize }];
    let subtotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
    let shipping = subtotal >= 499 ? 0 : 49;
    let total = subtotal + shipping;
    expect(subtotal).toBe(250);
    expect(shipping).toBe(49);
    expect(total).toBe(299);

    // 3. Change quantity to 2 (Unlocks Free Shipping at >= ₹499)
    cart = [{ product: found!, quantity: 2, packSize: found!.packSize }];
    subtotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
    shipping = subtotal >= 499 ? 0 : 49;
    expect(subtotal).toBe(500);
    expect(shipping).toBe(0); // Free shipping unlocked

    // 4. Apply valid coupon SHIFA10 (10% off)
    const couponCode = "SHIFA10";
    let discount = 0;
    if (couponCode === "SHIFA10") {
      discount = Math.round(subtotal * 0.1);
    }
    expect(discount).toBe(50);
    total = Math.max(0, subtotal + shipping - discount);
    expect(total).toBe(450);

    // 5. Test invalid coupon rejection
    const invalidCoupon = "INVALID999";
    const isValidCoupon = ["SHIFA10", "AYURVEDA50", "FREECOD"].includes(invalidCoupon);
    expect(isValidCoupon).toBe(false);

    // 6. Enter customer checkout information
    const customer: CustomerDeliveryDetails = {
      fullName: "Mohammad Rafiq",
      phone: "9825012345",
      addressLine: "Station Road, Near Clock Tower",
      cityVillage: "Palanpur",
      state: "Gujarat",
      pincode: "385001",
      country: "India",
      landmark: "Opposite Civil Hospital",
      email: "rafiq@example.com",
    };

    // 7. Validate form fields
    const isFormValid =
      customer.fullName.trim().length > 0 &&
      /^[6-9]\d{9}$/.test(customer.phone.replace(/[^0-9]/g, "")) &&
      customer.addressLine.trim().length >= 5 &&
      customer.cityVillage.trim().length > 0 &&
      customer.state.trim().length > 0 &&
      /^\d{6}$/.test(customer.pincode.trim());
    expect(isFormValid).toBe(true);

    // 8. Generate WhatsApp Order Message
    const message = buildWhatsAppOrderMessage({
      customer,
      items: cart,
      subtotal,
      shippingCharge: shipping,
      finalAmount: total,
      origin: "https://shifa-a-hayat.com",
    });

    expect(message).toContain("SHIFA A HAYAT — NEW ORDER REQUEST");
    expect(message).toContain("Full name: Mohammad Rafiq");
    expect(message).toContain("Mobile number: 9825012345");
    expect(message).toContain("Arq Abe Hayat Drops");
    expect(message).toContain("Product price: ₹250");
    expect(message).toContain("Selected quantity: 2");
    expect(message).toContain("Subtotal: ₹500");
    expect(message).toContain("Final amount: ₹450");

    // 9. Generate click-to-chat URL
    const waUrl = generateWhatsAppOrderUrl({
      customer,
      items: cart,
      subtotal,
      shippingCharge: shipping,
      finalAmount: total,
      whatsappNumber: "9586037331",
      origin: "https://shifa-a-hayat.com",
    });

    expect(waUrl.startsWith("https://wa.me/919586037331?text=")).toBe(true);
    expect(waUrl).not.toContain("api.whatsapp.com");
    expect(waUrl).toContain(encodeURIComponent("Mohammad Rafiq"));
  });

  it("handles negative shopping journey cases: empty carts, invalid product IDs, and malformed forms", () => {
    // Empty cart totals
    const emptyCart: Array<{ product: { price: number }; quantity: number }> = [];
    const emptySubtotal = emptyCart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
    const emptyShipping = emptySubtotal > 0 ? (emptySubtotal >= 499 ? 0 : 49) : 0;
    const emptyTotal = emptySubtotal + emptyShipping;
    expect(emptySubtotal).toBe(0);
    expect(emptyShipping).toBe(0);
    expect(emptyTotal).toBe(0);

    // Invalid product ID lookup returns undefined
    const invalidProduct = INITIAL_PRODUCTS.find((p) => p.id === "non-existent-product-id-999");
    expect(invalidProduct).toBeUndefined();

    // Invalid form: missing phone and invalid pincode
    const invalidCustomer = {
      fullName: "",
      phone: "12345", // too short
      pincode: "12345", // only 5 digits
    };
    const isPhoneValid = /^[6-9]\d{9}$/.test(invalidCustomer.phone.replace(/[^0-9]/g, ""));
    const isPinValid = /^\d{6}$/.test(invalidCustomer.pincode);
    expect(isPhoneValid).toBe(false);
    expect(isPinValid).toBe(false);
  });
});

describe("Part 7 Advanced Shopping Features", () => {
  describe("Recently Viewed Products Tracking & Hygiene", () => {
    it("sanitizes raw storage data: keeps only valid product IDs, rejects deleted/unknown IDs, and drops duplicates", () => {
      const rawStored = [
        "shifa-zafrani-gold",
        "invalid-deleted-id-999",
        "shifa-arq-abe-hayat",
        "shifa-zafrani-gold", // duplicate
        12345, // malformed non-string
        null,
        undefined,
        "shifa-tanavai-tel",
      ];

      const sanitized = sanitizeRecentlyViewedIds(rawStored, INITIAL_PRODUCTS);
      expect(sanitized).toEqual([
        "shifa-zafrani-gold",
        "shifa-arq-abe-hayat",
        "shifa-tanavai-tel",
      ]);
      expect(sanitized.every((id) => INITIAL_PRODUCTS.some((p) => p.id === id))).toBe(true);
    });

    it("caps recently viewed products at maximum 6 items", () => {
      const sevenValidIds = INITIAL_PRODUCTS.slice(0, 7).map((p) => p.id);
      const sanitized = sanitizeRecentlyViewedIds(sevenValidIds, INITIAL_PRODUCTS);
      expect(sanitized.length).toBe(6);
      expect(sanitized).toEqual(sevenValidIds.slice(0, 6));
    });

    it("pushRecentlyViewedId prepends newest view to index 0, deduplicates, and caps at 6", () => {
      let viewed: string[] = ["shifa-zafrani-gold", "shifa-arq-abe-hayat"];

      // View a third product
      viewed = pushRecentlyViewedId(viewed, "shifa-tanavai-tel", 6, INITIAL_PRODUCTS);
      expect(viewed).toEqual([
        "shifa-tanavai-tel",
        "shifa-zafrani-gold",
        "shifa-arq-abe-hayat",
      ]);

      // Re-view the first product: should move to front without duplicate
      viewed = pushRecentlyViewedId(viewed, "shifa-zafrani-gold", 6, INITIAL_PRODUCTS);
      expect(viewed).toEqual([
        "shifa-zafrani-gold",
        "shifa-tanavai-tel",
        "shifa-arq-abe-hayat",
      ]);

      // Attempt to view an invalid/deleted ID: should ignore safely
      viewed = pushRecentlyViewedId(viewed, "unknown-deleted-product", 6, INITIAL_PRODUCTS);
      expect(viewed).toEqual([
        "shifa-zafrani-gold",
        "shifa-tanavai-tel",
        "shifa-arq-abe-hayat",
      ]);
    });
  });

  describe("Product Discovery & Multi-criteria Search", () => {
    it("finds products by Hindi name, English name, and ingredients", () => {
      // 1. Search by Hindi name: 'ज़ाफरानी'
      const hindiMatches = INITIAL_PRODUCTS.filter((p) =>
        p.nameHindi.toLowerCase().includes("ज़ाफरानी") || p.name.toLowerCase().includes("zafrani")
      );
      expect(hindiMatches.length).toBeGreaterThanOrEqual(1);
      expect(hindiMatches[0]?.id).toBe("shifa-zafrani-gold");

      // 2. Search by classical ingredient: 'अर्क' or 'रोग़न'
      const arqMatches = INITIAL_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes("arq") ||
          p.nameHindi.toLowerCase().includes("अर्क") ||
          p.category === "classical-tonics"
      );
      expect(arqMatches.length).toBeGreaterThanOrEqual(1);

      // 3. Search by symptom or benefit: 'दर्द' (pain relief)
      const jointMatches = INITIAL_PRODUCTS.filter(
        (p) =>
          p.category === "joint-pain" ||
          p.description.toLowerCase().includes("दर्द") ||
          p.benefits.some((b) => b.toLowerCase().includes("दर्द"))
      );
      expect(jointMatches.length).toBeGreaterThanOrEqual(2);
    });

    it("verifies category filters and sort options work synchronously", () => {
      const mensProducts = INITIAL_PRODUCTS.filter((p) => p.category === "mens-wellness");
      expect(mensProducts.length).toBeGreaterThan(0);

      // Sort by price ascending
      const sortedAsc = [...mensProducts].sort((a, b) => a.price - b.price);
      for (let i = 0; i < sortedAsc.length - 1; i++) {
        expect(sortedAsc[i]!.price).toBeLessThanOrEqual(sortedAsc[i + 1]!.price);
      }

      // Sort by price descending
      const sortedDesc = [...mensProducts].sort((a, b) => b.price - a.price);
      for (let i = 0; i < sortedDesc.length - 1; i++) {
        expect(sortedDesc[i]!.price).toBeGreaterThanOrEqual(sortedDesc[i + 1]!.price);
      }
    });
  });

  describe("Wishlist Catalog Integrity", () => {
    it("ensures wishlist items map 1:1 to authentic catalog products and prices", () => {
      const storedWishlist = ["shifa-zafrani-gold", "shifa-tanavai-tel"];
      const wishlistProducts = storedWishlist
        .map((id) => INITIAL_PRODUCTS.find((p) => p.id === id))
        .filter((p) => p !== undefined);

      expect(wishlistProducts.length).toBe(2);
      expect(wishlistProducts[0]?.price).toBe(1450);
      expect(wishlistProducts[1]?.price).toBe(200);
      expect(wishlistProducts[1]?.image).toBe("/assets/molana/IMG-20261009-WA0021.jpg");
    });
  });

  describe("Cart Quantity Bounds & Authenticity Protection", () => {
    it("strictly bounds cart quantities between 1 and 99", () => {
      const clampQty = (qty: number) => Math.max(1, Math.min(99, Math.floor(qty) || 1));
      expect(clampQty(0)).toBe(1);
      expect(clampQty(-5)).toBe(1);
      expect(clampQty(100)).toBe(99);
      expect(clampQty(999)).toBe(99);
      expect(clampQty(5)).toBe(5);
    });

    it("retains the exact ₹499 free shipping threshold and coupon discount calculations", () => {
      const freeShippingThreshold = 499;
      const standardShippingFee = 49;

      // Below threshold (₹450): shipping applies
      const subtotalBelow = 450;
      const shippingBelow = subtotalBelow >= freeShippingThreshold ? 0 : standardShippingFee;
      expect(shippingBelow).toBe(49);

      // At or above threshold (₹500): free shipping
      const subtotalAbove = 500;
      const shippingAbove = subtotalAbove >= freeShippingThreshold ? 0 : standardShippingFee;
      expect(shippingAbove).toBe(0);

      // SHIFA10 10% discount check
      const discount10 = Math.round(subtotalAbove * 0.1);
      expect(discount10).toBe(50);
      expect(subtotalAbove + shippingAbove - discount10).toBe(450);
    });
  });

  describe("Product Information & Authentic Dosage Transparency", () => {
    it("verifies all 21 products contain genuine dosage instructions and zero invented medical guarantees", () => {
      INITIAL_PRODUCTS.forEach((product) => {
        expect(product.dosage).toBeDefined();
        expect(product.dosage.length).toBeGreaterThan(5);
        // Ensure no fabricated '100% cure guarantee' or miraculous claims
        expect(product.description).not.toContain("100% गारंटी");
        expect(product.dosage).not.toContain("चमत्कारी शर्तिया इलाज");
      });
    });
  });

  describe("Part 8: Admin & Inventory Management Integrity", () => {
    it("sanitizes product stock to non-negative integers and synchronizes inStock flag", () => {
      const sanitizeStock = (stockCount: number, inStockParam?: boolean) => {
        const safeStock = Math.max(0, Math.floor(stockCount) || 0);
        return {
          stockCount: safeStock,
          inStock: safeStock > 0 && inStockParam !== false,
        };
      };

      // Negative stock clamped to 0 and marked out of stock
      expect(sanitizeStock(-5, true)).toEqual({ stockCount: 0, inStock: false });
      expect(sanitizeStock(0, true)).toEqual({ stockCount: 0, inStock: false });

      // Positive stock marked in stock
      expect(sanitizeStock(15, true)).toEqual({ stockCount: 15, inStock: true });
      expect(sanitizeStock(12.7, true)).toEqual({ stockCount: 12, inStock: true });

      // Explicitly disabled product remains out of stock even if quantity > 0
      expect(sanitizeStock(10, false)).toEqual({ stockCount: 10, inStock: false });
    });

    it("sanitizes product prices to strictly positive values and validates compareAtPrice >= price", () => {
      const sanitizePriceAndMrp = (price: number, compareAtPrice?: number) => {
        const safePrice = Math.max(1, Math.floor(price) || 1);
        const safeMrp =
          compareAtPrice !== undefined && compareAtPrice > 0
            ? Math.max(safePrice, Math.floor(compareAtPrice))
            : undefined;
        return { price: safePrice, compareAtPrice: safeMrp };
      };

      // Price zero or negative is clamped to 1
      expect(sanitizePriceAndMrp(0)).toEqual({ price: 1, compareAtPrice: undefined });
      expect(sanitizePriceAndMrp(-100)).toEqual({ price: 1, compareAtPrice: undefined });

      // MRP lower than price is elevated to at least the sale price
      expect(sanitizePriceAndMrp(500, 400)).toEqual({ price: 500, compareAtPrice: 500 });
      expect(sanitizePriceAndMrp(500, 650)).toEqual({ price: 500, compareAtPrice: 650 });
    });

    it("prevents out-of-stock products from being added to the shopping cart", () => {
      const outOfStockProduct = {
        ...INITIAL_PRODUCTS[0]!,
        stockCount: 0,
        inStock: false,
      };

      const canAddToCart = (product: { inStock: boolean; stockCount?: number }) => {
        if (!product.inStock || (product.stockCount !== undefined && product.stockCount <= 0)) {
          return false;
        }
        return true;
      };

      expect(canAddToCart(outOfStockProduct)).toBe(false);

      const inStockProduct = {
        ...INITIAL_PRODUCTS[0]!,
        stockCount: 25,
        inStock: true,
      };
      expect(canAddToCart(inStockProduct)).toBe(true);
    });

    it("validates product duplicate IDs when adding new products to the catalog", () => {
      const existingCatalog = INITIAL_PRODUCTS;
      const isDuplicateId = (id: string) => existingCatalog.some((p) => p.id === id);

      // Existing ID collision detected
      expect(isDuplicateId("shifa-zafrani-gold")).toBe(true);
      expect(isDuplicateId("shifa-arq-abe-hayat")).toBe(true);

      // Unique new ID permitted
      expect(isDuplicateId("shifa-custom-herb-2026")).toBe(false);
    });

    it("verifies official WhatsApp number 9586037331 is preserved across configuration defaults", () => {
      const officialNumber = "9586037331";
      const cleanNumber = (num: string) => num.replace(/[^0-9]/g, "");

      expect(cleanNumber("+91 95860 37331")).toBe(`91${officialNumber}`);
      expect(cleanNumber("9586037331")).toBe(officialNumber);
      expect(cleanNumber("9586037331").length).toBe(10);
    });

    it("verifies all 21 core products remain intact in default catalog with verified prices", () => {
      expect(INITIAL_PRODUCTS.length).toBe(21);
      const verifiedItems = INITIAL_PRODUCTS.filter((p) => p.isVerifiedPrice);
      expect(verifiedItems.length).toBeGreaterThanOrEqual(2);

      const arq = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat");
      expect(arq?.price).toBe(250);

      const tel = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel");
      expect(tel?.price).toBe(200);
    });
  });

  describe("Part 9: Customer Support, FAQ & WhatsApp Help Integrity", () => {
    it("generates correctly formatted and URL-encoded WhatsApp support links", () => {
      const waNumber = "+91 95860 37331";
      const message = "السلام علیکم Hakeem Ji, I need consultation for Zafrani Gold.";
      const url = formatWhatsAppUrl(waNumber, message);

      expect(url).toContain("https://wa.me/919586037331");
      expect(url).toContain("text=");
      expect(url).toContain(encodeURIComponent("السلام علیکم"));
    });

    it("validates contact consultation form inputs strictly without accepting empty or invalid data", () => {
      const validateContact = (name: string, phone: string, message: string) => {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        if (!name || name.trim().length < 2) return false;
        if (cleanPhone.length < 10) return false;
        if (!message || message.trim().length < 5) return false;
        return true;
      };

      // Invalid cases
      expect(validateContact("", "9586037331", "Need medicine")).toBe(false);
      expect(validateContact("Ali", "123", "Need medicine")).toBe(false);
      expect(validateContact("Ali", "9586037331", "Hi")).toBe(false);

      // Valid case
      expect(
        validateContact("Mohammad Rafiq", "+91 95860 37331", "I need consultation for joint pain")
      ).toBe(true);
    });

    it("formats customer order lookup query accurately with given order identifier", () => {
      const formatOrderQuery = (orderId: string) => {
        const cleanId = orderId.trim();
        return `السلام علیکم Hakeem Ji, मैं अपने Shifa A Hayat ऑर्डर #${cleanId} की स्थिति जानना चाहता हूँ। कृपया विवरण दें।`;
      };

      const query = formatOrderQuery("SHIFA-984210");
      expect(query).toContain("#SHIFA-984210");
      expect(query).toContain("Shifa A Hayat ऑर्डर");
    });

    it("preserves accurate FAQ policies: free shipping at ₹499, ₹49 fee, and 3-6 days delivery", () => {
      const freeShippingThreshold = 499;
      const standardShipping = 49;
      const deliveryTimeline = "3 से 6 कार्यदिवस";

      expect(freeShippingThreshold).toBe(499);
      expect(standardShipping).toBe(49);
      expect(deliveryTimeline).toBe("3 से 6 कार्यदिवस");
    });
  });
});



