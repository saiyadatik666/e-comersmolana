import { describe, it, expect } from "vitest";
import { INITIAL_PRODUCTS } from "@/data/products";
import fs from "fs";
import path from "path";

describe("Part 16 — Mobile UX & Accessibility (WCAG 2.1) Audit Suite", () => {
  describe("1. Header Mobile Navigation Drawer & Keyboard Accessibility", () => {
    it("ensures Header mobile drawer has role='dialog', aria-modal='true', and aria-labelledby", () => {
      const headerPath = path.resolve(process.cwd(), "src/components/layout/Header.tsx");
      const content = fs.readFileSync(headerPath, "utf-8");
      expect(content).toContain('role="dialog"');
      expect(content).toContain('aria-modal="true"');
      expect(content).toContain('aria-labelledby="mobile-nav-title"');
      expect(content).toContain('id="mobile-navigation-drawer"');
    });

    it("ensures mobile menu hamburger toggle button has aria-expanded and aria-controls", () => {
      const headerPath = path.resolve(process.cwd(), "src/components/layout/Header.tsx");
      const content = fs.readFileSync(headerPath, "utf-8");
      expect(content).toContain("aria-expanded={mobileMenuOpen}");
      expect(content).toContain('aria-controls="mobile-navigation-drawer"');
    });

    it("verifies Escape key listener exists for mobile drawer dismissal", () => {
      const headerPath = path.resolve(process.cwd(), "src/components/layout/Header.tsx");
      const content = fs.readFileSync(headerPath, "utf-8");
      expect(content).toContain('e.key === "Escape"');
      expect(content).toContain("setMobileMenuOpen(false)");
    });

    it("ensures mobile search input has accessible aria-label and id", () => {
      const headerPath = path.resolve(process.cwd(), "src/components/layout/Header.tsx");
      const content = fs.readFileSync(headerPath, "utf-8");
      expect(content).toContain('id="mobile-search-input"');
      expect(content).toContain('aria-label="उत्पाद खोजें (Search products)"');
    });
  });

  describe("2. ProductCard Touch Targets & Accessible Controls", () => {
    it("verifies ProductCard action buttons meet minimum touch target guidelines (min 34px-36px)", () => {
      const cardPath = path.resolve(process.cwd(), "src/components/product/ProductCard.tsx");
      const content = fs.readFileSync(cardPath, "utf-8");
      expect(content).toContain("min-w-[34px] min-h-[34px]");
      expect(content).toContain("min-w-[36px] min-h-[36px]");
    });

    it("ensures ProductCard icon-only buttons have descriptive accessible names (aria-label)", () => {
      const cardPath = path.resolve(process.cwd(), "src/components/product/ProductCard.tsx");
      const content = fs.readFileSync(cardPath, "utf-8");
      expect(content).toContain("aria-label={`${inWish ? 'Remove' : 'Add'} ${product.name} to wishlist`}");
      expect(content).toContain("aria-label={`View full poster for ${product.name}`}");
      expect(content).toContain("aria-label={`WhatsApp order for ${product.name}`}");
    });
  });

  describe("3. Cart Page Quantity Steppers & Coupon Accessibility", () => {
    it("ensures Cart quantity increase/decrease buttons meet touch target standards (min-w-[36px])", () => {
      const cartPath = path.resolve(process.cwd(), "src/routes/cart.tsx");
      const content = fs.readFileSync(cartPath, "utf-8");
      expect(content).toContain("min-w-[36px] min-h-[36px]");
    });

    it("ensures Cart coupon input has accessible label, aria-invalid, and alert error container", () => {
      const cartPath = path.resolve(process.cwd(), "src/routes/cart.tsx");
      const content = fs.readFileSync(cartPath, "utf-8");
      expect(content).toContain('aria-label="कूपन कोड दर्ज करें (Enter coupon code)"');
      expect(content).toContain("aria-invalid={!!couponError}");
      expect(content).toContain('aria-describedby={couponError ? "cart-coupon-error" : undefined}');
      expect(content).toContain('id="cart-coupon-error" role="alert"');
    });
  });

  describe("4. Checkout Form Autocomplete & Accessible Validation", () => {
    it("verifies CustomerDetailsForm provides standard autocomplete attributes for mobile autofill", () => {
      const formPath = path.resolve(process.cwd(), "src/components/checkout/CustomerDetailsForm.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toContain('autoComplete="name"');
      expect(content).toContain('autoComplete="tel"');
      expect(content).toContain('autoComplete="street-address"');
      expect(content).toContain('autoComplete="address-level2"');
      expect(content).toContain('autoComplete="address-level1"');
      expect(content).toContain('autoComplete="postal-code"');
      expect(content).toContain('autoComplete="country-name"');
      expect(content).toContain('autoComplete="email"');
    });

    it("verifies inputs have aria-invalid and aria-describedby linked to alert elements", () => {
      const formPath = path.resolve(process.cwd(), "src/components/checkout/CustomerDetailsForm.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toContain("aria-invalid={!!errors.fullName}");
      expect(content).toContain('aria-describedby={errors.fullName ? "cust-fullName-error" : undefined}');
      expect(content).toContain('id="cust-fullName-error" role="alert"');

      expect(content).toContain("aria-invalid={!!errors.phone}");
      expect(content).toContain('aria-describedby={errors.phone ? "cust-phone-error" : undefined}');
      expect(content).toContain('id="cust-phone-error" role="alert"');
    });
  });

  describe("5. ProductPosterModal Accessibility", () => {
    it("ensures modal viewer has role='dialog', aria-modal='true', and accessible close button", () => {
      const modalPath = path.resolve(process.cwd(), "src/components/product/ProductPosterModal.tsx");
      const content = fs.readFileSync(modalPath, "utf-8");
      expect(content).toContain('role="dialog"');
      expect(content).toContain('aria-modal="true"');
      expect(content).toContain('aria-labelledby="poster-modal-title"');
      expect(content).toContain('id="poster-modal-title"');
      expect(content).toContain('aria-label="मूल प्रचार पोस्टर बंद करें (Close poster viewer)"');
    });

    it("verifies Escape key listener is registered for poster modal", () => {
      const modalPath = path.resolve(process.cwd(), "src/components/product/ProductPosterModal.tsx");
      const content = fs.readFileSync(modalPath, "utf-8");
      expect(content).toContain('e.key === "Escape"');
      expect(content).toContain("onClose()");
    });
  });

  describe("6. Footer Contrast & Accessible Contact Links", () => {
    it("ensures Footer statutory disclaimer uses elevated contrast classes (text-stone-300/200)", () => {
      const footerPath = path.resolve(process.cwd(), "src/components/layout/Footer.tsx");
      const content = fs.readFileSync(footerPath, "utf-8");
      expect(content).toContain("text-xs text-stone-300 leading-relaxed");
      expect(content).toContain("font-semibold text-stone-200");
    });

    it("ensures Footer phone, email, and WhatsApp items have accessible links and labels", () => {
      const footerPath = path.resolve(process.cwd(), "src/components/layout/Footer.tsx");
      const content = fs.readFileSync(footerPath, "utf-8");
      expect(content).toContain('href={`tel:${settings.phone}`}');
      expect(content).toContain('href={`mailto:${settings.email}`}');
      expect(content).toContain('aria-label={`WhatsApp पर परामर्श लें: +91 ${settings.whatsapp}`}');
    });
  });

  describe("7. Commercial Invariance & Catalog Integrity", () => {
    it("preserves exact authentic product pricing and 21 catalog entries", () => {
      expect(INITIAL_PRODUCTS.length).toBe(21);
      const zafraniGold = INITIAL_PRODUCTS.find((p) => p.id === "shifa-zafrani-gold");
      expect(zafraniGold?.price).toBe(1450);

      const arqAbeHayat = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat");
      expect(arqAbeHayat?.price).toBe(250);

      const tanavaiTel = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel");
      expect(tanavaiTel?.price).toBe(200);

      const dimagiTonic = INITIAL_PRODUCTS.find((p) => p.id === "shifa-dimagi-tonic");
      expect(dimagiTonic?.price).toBe(420);
    });
  });
});
