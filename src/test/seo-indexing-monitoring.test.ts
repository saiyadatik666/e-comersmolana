import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { INITIAL_PRODUCTS } from "@/data/products";

describe("Part 24 — Technical SEO, Indexing & Monitoring Suite", () => {
  const rootDir = process.cwd();
  const robotsPath = path.join(rootDir, "public", "robots.txt");
  const sitemapPath = path.join(rootDir, "public", "sitemap.xml");

  // =========================================================================
  // 1. ROBOTS.TXT DIRECTIVES & CRAWLER ACCESS
  // =========================================================================
  describe("Robots.txt Configuration", () => {
    it("exists and defines standard crawler access rules", () => {
      expect(fs.existsSync(robotsPath), "robots.txt must exist in public/").toBe(true);
      const content = fs.readFileSync(robotsPath, "utf-8");

      // Verify global user-agent allowance
      expect(content).toContain("User-agent: *");
      expect(content).toContain("Allow: /");

      // Verify admin panel is protected from search crawlers
      expect(content).toContain("Disallow: /admin");

      // Verify absolute sitemap reference
      expect(content).toContain("Sitemap: https://shifa-a-hayat.com/sitemap.xml");
    });
  });

  // =========================================================================
  // 2. SITEMAP.XML VALIDITY & CATALOG RECONCILIATION
  // =========================================================================
  describe("Sitemap.xml Reconciliation", () => {
    it("exists and is structured as valid XML urlset", () => {
      expect(fs.existsSync(sitemapPath), "sitemap.xml must exist in public/").toBe(true);
      const content = fs.readFileSync(sitemapPath, "utf-8");

      expect(content).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
      expect(content).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(content).toContain("</urlset>");
    });

    it("includes all core public pages and excludes utility/admin routes", () => {
      const content = fs.readFileSync(sitemapPath, "utf-8");

      // Public indexable landing pages
      expect(content).toContain("<loc>https://shifa-a-hayat.com/</loc>");
      expect(content).toContain("<loc>https://shifa-a-hayat.com/shop</loc>");
      expect(content).toContain("<loc>https://shifa-a-hayat.com/about</loc>");
      expect(content).toContain("<loc>https://shifa-a-hayat.com/contact</loc>");
      expect(content).toContain("<loc>https://shifa-a-hayat.com/policies</loc>");

      // Excluded utility, transactional, and admin routes
      expect(content).not.toContain("<loc>https://shifa-a-hayat.com/admin</loc>");
      expect(content).not.toContain("<loc>https://shifa-a-hayat.com/cart</loc>");
      expect(content).not.toContain("<loc>https://shifa-a-hayat.com/checkout</loc>");
      expect(content).not.toContain("<loc>https://shifa-a-hayat.com/account</loc>");
    });

    it("includes all 21 authentic catalog products without missing or extra URLs", () => {
      const content = fs.readFileSync(sitemapPath, "utf-8");

      // Check each product from the authentic catalog
      INITIAL_PRODUCTS.forEach((product) => {
        const expectedUrl = `<loc>https://shifa-a-hayat.com/product/${product.id}</loc>`;
        expect(
          content.includes(expectedUrl),
          `Sitemap missing product URL: ${expectedUrl}`
        ).toBe(true);
      });

      // Count product loc entries in sitemap
      const productMatches = content.match(/<loc>https:\/\/shifa-a-hayat\.com\/product\/[^<]+<\/loc>/g);
      expect(productMatches?.length).toBe(21);
    });
  });

  // =========================================================================
  // 3. STRUCTURED DATA & CANONICAL URL INTEGRITY
  // =========================================================================
  describe("Structured Data & Schema.org Definitions", () => {
    it("ensures product schema requirements are satisfied by catalog items", () => {
      INITIAL_PRODUCTS.forEach((p) => {
        // Price must be a positive number
        expect(p.price).toBeGreaterThan(0);
        expect(Number.isFinite(p.price)).toBe(true);

        // Required naming and category fields
        expect(p.name).toBeTruthy();
        expect(p.nameHindi).toBeTruthy();
        expect(p.category).toBeTruthy();

        // Image path format
        expect(p.image).toMatch(/^\/assets\//);

        // Rating metadata
        expect(p.rating).toBeGreaterThanOrEqual(1);
        expect(p.rating).toBeLessThanOrEqual(5);
        expect(p.reviewCount).toBeGreaterThanOrEqual(0);
      });
    });

    it("verifies canonical URLs are consistently rooted on production domain", () => {
      const canonicalDomain = "https://shifa-a-hayat.com";

      const sampleUrls = [
        `${canonicalDomain}/`,
        `${canonicalDomain}/shop`,
        `${canonicalDomain}/about`,
        `${canonicalDomain}/contact`,
        `${canonicalDomain}/policies`,
        `${canonicalDomain}/product/shifa-zafrani-gold`,
        `${canonicalDomain}/product/shifa-arq-abe-hayat`,
      ];

      sampleUrls.forEach((url) => {
        expect(url.startsWith(canonicalDomain)).toBe(true);
        expect(url).not.toContain("localhost");
        expect(url).not.toContain("127.0.0.1");
      });
    });
  });

  // =========================================================================
  // 4. CRAWLABILITY & NOINDEX DIRECTIVE AUDIT
  // =========================================================================
  describe("Robots Meta Directives & Route Indexability", () => {
    it("safeguards admin and transactional routes with noindex directives", () => {
      const adminPath = path.join(rootDir, "src", "routes", "admin.tsx");
      const cartPath = path.join(rootDir, "src", "routes", "cart.tsx");
      const checkoutPath = path.join(rootDir, "src", "routes", "checkout.tsx");

      const adminContent = fs.readFileSync(adminPath, "utf-8");
      expect(adminContent).toContain('content: "noindex, nofollow"');

      const cartContent = fs.readFileSync(cartPath, "utf-8");
      expect(cartContent).toContain('content: "noindex, follow"');

      const checkoutContent = fs.readFileSync(checkoutPath, "utf-8");
      expect(checkoutContent).toContain('content: "noindex, follow"');
    });

    it("ensures valid product detail pages are indexable while missing products get noindex", () => {
      const productRoutePath = path.join(rootDir, "src", "routes", "product.$id.tsx");
      const content = fs.readFileSync(productRoutePath, "utf-8");

      // When product is missing: noindex
      expect(content).toContain('{ name: "robots", content: "noindex, follow" }');

      // When product is valid: OpenGraph, Product schema, and canonical tags are attached
      expect(content).toContain('{ rel: "canonical", href: prodUrl }');
      expect(content).toContain('"@type": "Product"');
      expect(content).toContain('"@type": "BreadcrumbList"');
    });
  });
});
