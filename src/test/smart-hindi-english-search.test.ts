import { describe, it, expect } from "vitest";
import { INITIAL_PRODUCTS, Product } from "@/data/products";
import {
  normalizeHindi,
  normalizeEnglish,
  scoreProductMatch,
  searchCatalogProducts,
  getProductSuggestions,
} from "@/lib/smart-search";

describe("SHIFA A HAYAT — SMART HINDI AND ENGLISH PRODUCT SEARCH SUITE", () => {
  const products: Product[] = INITIAL_PRODUCTS;

  describe("1. Devanagari Hindi Normalization & Nukta Handling", () => {
    it("normalizes precomposed nukta letters to base consonants", () => {
      // ज़ (U+095B) -> ज (U+091C)
      expect(normalizeHindi("ज़ाफरानी")).toBe(normalizeHindi("जाफरानी"));
      // फ़ (U+095E) -> फ (U+092B)
      expect(normalizeHindi("फ़ायदा")).toBe(normalizeHindi("फायदा"));
      // क़ (U+0958) -> क (U+0915)
      expect(normalizeHindi("अर्क़")).toBe(normalizeHindi("अर्क"));
      // ख़ (U+0959) -> ख (U+0916)
      expect(normalizeHindi("ख़ास")).toBe(normalizeHindi("खास"));
    });

    it("strips combining nukta mark (\\u093C)", () => {
      const combinedZa = "ज\u093Cाफरानी";
      expect(normalizeHindi(combinedZa)).toBe(normalizeHindi("जाफरानी"));
    });

    it("normalizes vowel matras (long to short) for relaxed Hindi matching", () => {
      // ी -> ि
      expect(normalizeHindi("दिमागी")).toBe(normalizeHindi("दीमागी"));
      // ू -> ु
      expect(normalizeHindi("यूनानी")).toBe(normalizeHindi("युनानी"));
    });

    it("normalizes chandrabindu to anusvara", () => {
      expect(normalizeHindi("बूटियाँ")).toBe(normalizeHindi("बूटियां"));
    });
  });

  describe("2. English & Hinglish Phonetic Normalization", () => {
    it("handles case insensitivity and trims unnecessary spaces", () => {
      expect(normalizeEnglish("   ZaFrAnI   GoLd   ")).toBe("jafrani gold");
    });

    it("normalizes phonetically interchangeable English characters (z/j, ph/f, ee/i, oo/u)", () => {
      expect(normalizeEnglish("zafrani")).toBe(normalizeEnglish("jafrani"));
      expect(normalizeEnglish("majoon")).toBe(normalizeEnglish("majun"));
      expect(normalizeEnglish("shilajeet")).toBe(normalizeEnglish("shilajit"));
      expect(normalizeEnglish("shipha")).toBe(normalizeEnglish("shifa"));
    });

    it("handles w/v and double letter collapses", () => {
      expect(normalizeEnglish("hawa")).toBe(normalizeEnglish("hava"));
      expect(normalizeEnglish("suvarna")).toBe(normalizeEnglish("swarna"));
    });

    it("cleans special characters without crashing", () => {
      const clean = normalizeEnglish("oil & pain @#% relief!");
      expect(clean).toContain("oil");
      expect(clean).toContain("pain");
      expect(clean).toContain("relief");
    });
  });

  describe("3. Exact & Partial Matches (Hindi & English)", () => {
    it("finds exact English product names with highest score", () => {
      const results = searchCatalogProducts(products, "Capsule Zafrani Gold");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.id).toBe("shifa-zafrani-gold");
      expect(results[0].score).toBeGreaterThan(200);
    });

    it("finds exact Hindi product names with highest score", () => {
      const results = searchCatalogProducts(products, "कैप्सूल ज़ाफरानी गोल्ड");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.id).toBe("shifa-zafrani-gold");
      expect(results[0].score).toBeGreaterThan(200);
    });

    it("finds products with Devanagari variations without nukta (जाफरानी instead of ज़ाफरानी)", () => {
      const results = searchCatalogProducts(products, "जाफरानी");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.id).toBe("shifa-zafrani-gold");
    });

    it("finds products by partial English query (pehlwan, hoor, rahat)", () => {
      const pehlwan = searchCatalogProducts(products, "pehlwan");
      expect(pehlwan[0].product.id).toBe("shifa-pehlwan-capsule");

      const hoor = searchCatalogProducts(products, "hoor");
      expect(hoor[0].product.id).toBe("shifa-hoor-night-cream");

      const rahat = searchCatalogProducts(products, "rahat");
      expect(rahat[0].product.id).toBe("shifa-rahat-e-dard");
    });
  });

  describe("4. Phonetic Transliterations & Unani Synonym Mapping", () => {
    it("maps 'arq', 'ark', 'arak', 'irq' to classical distillate products", () => {
      const arqResults = searchCatalogProducts(products, "ark");
      const ids = arqResults.map((r) => r.product.id);
      expect(ids).toContain("shifa-arq-abe-hayat");
      expect(ids).toContain("shifa-arq-e-amber");
    });

    it("maps 'tel', 'tail', 'oil', 'malish' to oil formulations", () => {
      const telResults = searchCatalogProducts(products, "tel");
      const ids = telResults.map((r) => r.product.id);
      expect(ids).toContain("shifa-tanavai-tel");
      expect(ids).toContain("shifa-hair-oil");
      expect(ids).toContain("shifa-rahat-e-dard");
    });

    it("maps 'dard', 'pain', 'kamar dard', 'joint pain', 'gathiya' to pain relief medicines", () => {
      const dardResults = searchCatalogProducts(products, "joint pain");
      const ids = dardResults.map((r) => r.product.id);
      expect(ids).toContain("shifa-rahat-e-dard");
      expect(ids).toContain("shifa-va-rog-relief");

      const kamarResults = searchCatalogProducts(products, "कमर दर्द");
      expect(kamarResults.map((r) => r.product.id)).toContain("shifa-rahat-e-dard");
    });

    it("maps 'dimag', 'dimaag', 'dimagi', 'brain', 'memory' to Dimagi Tonic", () => {
      const brainResults = searchCatalogProducts(products, "memory");
      expect(brainResults[0].product.id).toBe("shifa-dimagi-tonic");

      const dimagResults = searchCatalogProducts(products, "dimag");
      expect(dimagResults[0].product.id).toBe("shifa-dimagi-tonic");
    });

    it("maps 'kabz', 'qabz', 'gas', 'constipation', 'pet' to digestive medicines", () => {
      const kabzResults = searchCatalogProducts(products, "qabz");
      expect(kabzResults.map((r) => r.product.id)).toContain("shifa-pait-samasya-set");

      const gasResults = searchCatalogProducts(products, "गैस");
      expect(gasResults.map((r) => r.product.id)).toContain("shifa-gas-ki-goliyan");
    });

    it("maps 'majoon', 'majun', 'mardanagi' to Majoon Mardanagi", () => {
      const majunResults = searchCatalogProducts(products, "majun");
      expect(majunResults[0].product.id).toBe("shifa-majun-mardangi");
    });

    it("maps 'nabhi', 'tanavai', 'naval oil' to Tanavai Tel", () => {
      const nabhiResults = searchCatalogProducts(products, "नाभि तेल");
      expect(nabhiResults[0].product.id).toBe("shifa-tanavai-tel");
    });

    it("maps 'sugar', 'diabetes', 'madhumeh' to Diabetes Care", () => {
      const sugarResults = searchCatalogProducts(products, "शुगर");
      expect(sugarResults[0].product.id).toBe("shifa-diabetes-care");
    });
  });

  describe("5. Search Across Catalogue Descriptions, Benefits & Ingredients", () => {
    it("searches inside product ingredients (e.g. 'pure kashmiri saffron', 'swarna bhasm')", () => {
      const saffronResults = searchCatalogProducts(products, "saffron");
      expect(saffronResults.map((r) => r.product.id)).toContain("shifa-zafrani-gold");

      const bhasmResults = searchCatalogProducts(products, "bhasm");
      expect(bhasmResults.map((r) => r.product.id)).toContain("shifa-tiger-suwarna-bhasm");
      expect(bhasmResults.map((r) => r.product.id)).toContain("shifa-zafrani-gold");
    });

    it("searches inside product benefits and description", () => {
      const staminaResults = searchCatalogProducts(products, "stamina");
      expect(staminaResults.length).toBeGreaterThan(0);
      expect(staminaResults.some((r) => r.product.id === "shifa-zafrani-gold")).toBe(true);

      const dndrfResults = searchCatalogProducts(products, "dandruff");
      expect(dndrfResults[0].product.id).toBe("shifa-hair-oil");
    });
  });

  describe("6. Leading/Trailing Spaces, Mixed Casing & Special Characters", () => {
    it("ignores excessive leading, trailing and internal spaces", () => {
      const normalResults = searchCatalogProducts(products, "zafrani gold");
      const messyResults = searchCatalogProducts(products, "   zafrani     gold    ");
      expect(messyResults.length).toBe(normalResults.length);
      expect(messyResults[0].product.id).toBe(normalResults[0].product.id);
    });

    it("handles special characters and punctuation gracefully without throwing", () => {
      expect(() => searchCatalogProducts(products, "!@#$%^&*()_+=-~`{}[]|;:'<>,.?/")).not.toThrow();
      expect(() => searchCatalogProducts(products, "zafrani???")).not.toThrow();

      const questionResults = searchCatalogProducts(products, "zafrani???");
      expect(questionResults[0].product.id).toBe("shifa-zafrani-gold");
    });

    it("returns empty suggestions for blank or whitespace query", () => {
      expect(getProductSuggestions(products, "")).toEqual([]);
      expect(getProductSuggestions(products, "   ")).toEqual([]);
    });
  });

  describe("7. Autocomplete Suggestions (Images, Pack Sizes, Verified Prices)", () => {
    it("returns rich suggestion payloads containing correct verified prices", () => {
      const suggestions = getProductSuggestions(products, "zafrani");
      expect(suggestions.length).toBeGreaterThan(0);

      const zafrani = suggestions[0];
      expect(zafrani.id).toBe("shifa-zafrani-gold");
      expect(zafrani.name).toBe("Capsule Zafrani Gold");
      expect(zafrani.nameHindi).toBe("कैप्सूल ज़ाफरानी गोल्ड");
      expect(zafrani.price).toBe(1450); // Exact verified price from catalogue
      expect(zafrani.packSize).toBe("60 Capsules (30 White + 30 Black-Orange)");
      expect(zafrani.image).toMatch(/^\/assets\/molana\//);
      expect(zafrani.inStock).toBe(true);
    });

    it("respects the limit argument in suggestions", () => {
      const limit3 = getProductSuggestions(products, "tel", 2);
      expect(limit3.length).toBeLessThanOrEqual(2);
    });
  });

  describe("8. Category Filtering & Price Sorting", () => {
    it("filters search results strictly within selected category", () => {
      const results = searchCatalogProducts(products, "oil", { category: "skin-hair" });
      for (const r of results) {
        expect(r.product.category).toBe("skin-hair");
      }
      expect(results.some((r) => r.product.id === "shifa-hair-oil")).toBe(true);
    });

    it("filters by price range (under-500, 500-1000, above-1000)", () => {
      const under500 = searchCatalogProducts(products, "", { priceRange: "under-500" });
      for (const r of under500) {
        expect(r.product.price).toBeLessThan(500);
      }

      const above1000 = searchCatalogProducts(products, "", { priceRange: "above-1000" });
      for (const r of above1000) {
        expect(r.product.price).toBeGreaterThan(1000);
      }
    });

    it("sorts by price-asc (low to high) and price-desc (high to low)", () => {
      const asc = searchCatalogProducts(products, "", { sortBy: "price-asc" });
      for (let i = 0; i < asc.length - 1; i++) {
        expect(asc[i].product.price).toBeLessThanOrEqual(asc[i + 1].product.price);
      }

      const desc = searchCatalogProducts(products, "", { sortBy: "price-desc" });
      for (let i = 0; i < desc.length - 1; i++) {
        expect(desc[i].product.price).toBeGreaterThanOrEqual(desc[i + 1].product.price);
      }
    });
  });

  describe("9. Catalogue Integrity & Privacy Protection", () => {
    it("strictly returns products from actual 21 catalogue items, never inventing products", () => {
      const results = searchCatalogProducts(products, "allopathic paracetamol antibiotic");
      expect(results.length).toBe(0); // Never invents fictitious items
    });

    it("never leaks private customer orders, addresses, or phone numbers in search results", () => {
      const results = searchCatalogProducts(products, "9825000000 order tracking secret");
      expect(results.length).toBe(0);

      // Verify returned objects only contain public Product fields
      const allResults = searchCatalogProducts(products, "zafrani");
      for (const r of allResults) {
        const p = r.product as unknown as Record<string, unknown>;
        expect(p["customerPhone"]).toBeUndefined();
        expect(p["customerAddress"]).toBeUndefined();
        expect(p["orderId"]).toBeUndefined();
        expect(p["adminPassword"]).toBeUndefined();
      }
    });
  });
});
