import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Part 19 — Sticky Header & Header Navigation Invariance Suite", () => {
  const stylesPath = path.resolve(process.cwd(), "src/styles.css");
  const headerPath = path.resolve(process.cwd(), "src/components/layout/Header.tsx");

  it("ensures html and body use overflow-x: clip instead of overflow-x: hidden to preserve viewport position: sticky", () => {
    const css = fs.readFileSync(stylesPath, "utf-8");
    expect(css).toMatch(/html\s*\{[^}]*overflow-x:\s*clip/);
    expect(css).toMatch(/body\s*\{[^}]*overflow-x:\s*clip/);
    expect(css).not.toMatch(/html\s*\{[^}]*overflow-x:\s*hidden/);
    expect(css).not.toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/);
  });

  it("ensures Header component renders a sticky top-0 header with z-50 and backdrop blur", () => {
    const headerSource = fs.readFileSync(headerPath, "utf-8");
    expect(headerSource).toContain('sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md shadow-xs transition-all');
  });

  it("verifies all 7 required elements are present in the Header row", () => {
    const headerSource = fs.readFileSync(headerPath, "utf-8");

    // 1. Brand Logo & Name
    expect(headerSource).toContain("Shifa A Hayat");
    expect(headerSource).toContain("हकीम इनायत अहमदी (पालनपुर)");

    // 2. Hindi/English Language Selector
    expect(headerSource).toContain("toggleLanguage");
    expect(headerSource).toContain("हिं");
    expect(headerSource).toContain("EN");
    expect(headerSource).toContain("shifa_lang");

    // 3. Product Search Bar
    expect(headerSource).toContain("handleSearchSubmit");
    expect(headerSource).toContain("सर्च करें: ज़ाफरानी, तेल, दर्द...");

    // 4. Hakim Ji Se Salah Button (visible at 1024px lg and above)
    expect(headerSource).toContain("हकीम जी से सलाह");
    expect(headerSource).toContain("hidden lg:inline-flex");

    // 5. Wishlist Heart Icon
    expect(headerSource).toContain("विशलिस्ट (Wishlist)");

    // 6. Cart Button
    expect(headerSource).toContain("Shopping cart with");
    expect(headerSource).toContain("Cart");

    // 7. Admin Button (visible at 768px md and above, plus mobile drawer)
    expect(headerSource).toContain('to="/admin"');
    expect(headerSource).toContain("Admin Portal");
  });

  it("verifies the top heritage announcement bar sits above the sticky header", () => {
    const headerSource = fs.readFileSync(headerPath, "utf-8");
    const topBarIndex = headerSource.indexOf("Top Heritage & Trust Bar");
    const stickyHeaderIndex = headerSource.indexOf("<header className=\"sticky top-0");
    expect(topBarIndex).toBeGreaterThan(-1);
    expect(stickyHeaderIndex).toBeGreaterThan(topBarIndex);
  });

  it("verifies Header is rendered across all key storefront routes", () => {
    const routeFiles = [
      "src/routes/index.tsx",
      "src/routes/shop.tsx",
      "src/routes/product.$id.tsx",
      "src/routes/cart.tsx",
      "src/routes/about.tsx",
      "src/routes/contact.tsx",
      "src/routes/account.tsx",
    ];

    for (const file of routeFiles) {
      const fullPath = path.resolve(process.cwd(), file);
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content).toContain("<Header />");
    }
  });
});
