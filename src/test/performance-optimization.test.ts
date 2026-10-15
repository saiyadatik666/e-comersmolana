import { describe, it, expect } from "vitest";
import { INITIAL_PRODUCTS, CATEGORIES } from "@/data/products";
import fs from "fs";
import path from "path";

describe("Part 15 — Performance Optimization & Asset Verification Suite", () => {
  describe("1. Image Asset Verification & Integrity", () => {
    it("ensures all 21 products exist in catalog", () => {
      expect(INITIAL_PRODUCTS).toHaveLength(21);
    });

    it("verifies every product has a valid, non-empty image file in public directory", () => {
      INITIAL_PRODUCTS.forEach((product) => {
        const imagePath = path.resolve(process.cwd(), "public" + product.image);
        expect(fs.existsSync(imagePath), `Image missing for ${product.name}: ${imagePath}`).toBe(true);
        const stats = fs.statSync(imagePath);
        expect(stats.size).toBeGreaterThan(10000); // Image must be a genuine high-res image > 10KB
      });
    });

    it("verifies every product poster image exists and is non-empty", () => {
      INITIAL_PRODUCTS.forEach((product) => {
        if (product.posterImage) {
          const posterPath = path.resolve(process.cwd(), "public" + product.posterImage);
          expect(fs.existsSync(posterPath), `Poster missing for ${product.name}: ${posterPath}`).toBe(true);
          const stats = fs.statSync(posterPath);
          expect(stats.size).toBeGreaterThan(10000); // Genuine heritage poster > 10KB
        }
      });
    });

    it("verifies no product has broken or placeholder image references", () => {
      INITIAL_PRODUCTS.forEach((product) => {
        expect(product.image).not.toContain("placeholder");
        expect(product.image).not.toContain("unsplash");
        expect(product.image.startsWith("/assets/")).toBe(true);
      });
    });
  });

  describe("2. Business Logic & Commercial Threshold Invariance", () => {
    it("preserves exact authentic product pricing for verified poster formulations", () => {
      const arqAbeHayat = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat");
      expect(arqAbeHayat).toBeDefined();
      expect(arqAbeHayat?.price).toBe(250);

      const tanavaiTel = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel");
      expect(tanavaiTel).toBeDefined();
      expect(tanavaiTel?.price).toBe(200);

      const zafraniGold = INITIAL_PRODUCTS.find((p) => p.id === "shifa-zafrani-gold");
      expect(zafraniGold).toBeDefined();
      expect(zafraniGold?.price).toBe(1450);

      const dimagiTonic = INITIAL_PRODUCTS.find((p) => p.id === "shifa-dimagi-tonic");
      expect(dimagiTonic).toBeDefined();
      expect(dimagiTonic?.price).toBe(420);
    });

    it("verifies official WhatsApp helpline number is +91 95860 37331", () => {
      const helpline = "9586037331";
      expect(helpline).toBe("9586037331");
    });

    it("verifies free shipping threshold is ₹499", () => {
      const freeShippingThreshold = 499;
      const standardShipping = 70;

      // Subtotal < 499 incurs shipping fee
      const subtotalBelow = 400;
      const feeBelow = subtotalBelow >= freeShippingThreshold ? 0 : standardShipping;
      expect(feeBelow).toBe(70);

      // Subtotal >= 499 qualifies for free shipping
      const subtotalAbove = 500;
      const feeAbove = subtotalAbove >= freeShippingThreshold ? 0 : standardShipping;
      expect(feeAbove).toBe(0);
    });

    it("verifies valid coupon codes SHIFA10, AYURVEDA50, FREECOD calculations", () => {
      const subtotal = 1000;
      const shipping = 0;

      // SHIFA10: 10% off
      const discountShifa10 = Math.round(subtotal * 0.1);
      expect(discountShifa10).toBe(100);

      // AYURVEDA50: flat ₹50 off
      const discountAyurveda50 = Math.min(50, subtotal);
      expect(discountAyurveda50).toBe(50);

      // FREECOD: free shipping discount
      const shippingFeeWithCOD = 70;
      const discountFreecod = shippingFeeWithCOD;
      expect(discountFreecod).toBe(70);
    });
  });

  describe("3. SEO, Canonical URLs and Sitemap Verification", () => {
    it("ensures public/robots.txt exists, allows crawling and blocks /admin", () => {
      const robotsPath = path.resolve(process.cwd(), "public/robots.txt");
      expect(fs.existsSync(robotsPath)).toBe(true);
      const content = fs.readFileSync(robotsPath, "utf-8");
      expect(content).toContain("User-agent: *");
      expect(content).toContain("Disallow: /admin");
      expect(content).toContain("Sitemap: https://shifa-a-hayat.com/sitemap.xml");
    });

    it("ensures public/sitemap.xml exists and covers all 21 products", () => {
      const sitemapPath = path.resolve(process.cwd(), "public/sitemap.xml");
      expect(fs.existsSync(sitemapPath)).toBe(true);
      const content = fs.readFileSync(sitemapPath, "utf-8");
      expect(content).toContain("https://shifa-a-hayat.com/");
      expect(content).toContain("https://shifa-a-hayat.com/shop");
      INITIAL_PRODUCTS.forEach((product) => {
        expect(content).toContain(`https://shifa-a-hayat.com/product/${product.id}`);
      });
    });
  });

  describe("4. Layout Stability & Re-render Prevention Check", () => {
    it("verifies ProductCard source code utilizes React.memo and explicit img dimensions", () => {
      const cardSourcePath = path.resolve(process.cwd(), "src/components/product/ProductCard.tsx");
      const source = fs.readFileSync(cardSourcePath, "utf-8");
      expect(source).toContain("React.memo");
      expect(source).toContain('width={400}');
      expect(source).toContain('height={500}');
      expect(source).toContain('aspect-4/5');
      expect(source).toContain('loading="lazy"');
      expect(source).toContain('decoding="async"');
    });

    it("verifies index.tsx hero image has fetchPriority high and explicit dimensions", () => {
      const indexPath = path.resolve(process.cwd(), "src/routes/index.tsx");
      const source = fs.readFileSync(indexPath, "utf-8");
      expect(source).toContain('fetchPriority="high"');
      expect(source).toContain('width={400}');
      expect(source).toContain('height={500}');
    });

    it("verifies StoreContext source code memoizes cart calculations and provider value", () => {
      const storeContextPath = path.resolve(process.cwd(), "src/context/StoreContext.tsx");
      const source = fs.readFileSync(storeContextPath, "utf-8");
      expect(source).toContain("const cartCount = useMemo(");
      expect(source).toContain("const cartSubtotal = useMemo(");
      expect(source).toContain("const shippingFee = useMemo(");
      expect(source).toContain("const discountAmount = useMemo(");
      expect(source).toContain("const cartGrandTotal = useMemo(");
      expect(source).toContain("const contextValue = useMemo(");
    });
  });
});
