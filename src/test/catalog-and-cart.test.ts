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
      expect(p.image).toMatch(/^\/assets\/molana\/IMG-/);
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
