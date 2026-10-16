import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useStore, formatWhatsAppUrl } from "@/context/StoreContext";
import { CATEGORIES, Product } from "@/data/products";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductPosterModal } from "@/components/product/ProductPosterModal";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Filter,
  CheckCircle,
  Sparkles,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PriceRange = "all" | "under-500" | "500-1000" | "above-1000";

export interface ShopSearch {
  category?: string | undefined;
  q?: string | undefined;
  price?: string | undefined;
}

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    const category = typeof search["category"] === "string" ? search["category"] : undefined;
    const q = typeof search["q"] === "string" ? search["q"] : (typeof search["search"] === "string" ? search["search"] : undefined);
    const price = typeof search["price"] === "string" ? search["price"] : undefined;
    return {
      category,
      q,
      price,
    };
  },
  head: () => ({
    meta: [
      { title: "आयुर्वेदिक व यूनानी औषधियां (Product Catalog) — Shifa A Hayat" },
      {
        name: "description",
        content:
          "हकीम इनायत अहमदी (पालनपुर, गुजरात) द्वारा तैयार 21 प्रामाणिक आयुर्वेदिक व यूनानी दवाओं का संपूर्ण कैटलॉग। शुद्ध जड़ी-बूटी, ऑल इंडिया डिलीवरी एवं कैश ऑन डिलीवरी।",
      },
      { property: "og:title", content: "Shifa A Hayat Product Catalog | Ayurvedic & Unani Store" },
      {
        property: "og:description",
        content:
          "Browse pure classical herbal medicines, tonics, pain oils, and wellness courses crafted in Palanpur, Gujarat.",
      },
      { property: "og:url", content: "https://shifa-a-hayat.com/shop" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://shifa-a-hayat.com/shop" }],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { products, settings, recentlyViewed, clearRecentlyViewed } = useStore();
  const searchParams = Route.useSearch();

  const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.category || "all");
  const [priceRange, setPriceRange] = useState<PriceRange>(() => {
    if (searchParams.price === "under-500" || searchParams.price === "500-1000" || searchParams.price === "above-1000") {
      return searchParams.price;
    }
    return "all";
  });
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "rating">("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<Product | null>(null);

  const handleOpenPoster = useCallback((p: Product) => {
    setSelectedPoster(p);
  }, []);

  useEffect(() => {
    if (searchParams.category !== undefined) {
      setSelectedCategory(searchParams.category || "all");
    }
    if (searchParams.q !== undefined) {
      setSearchQuery(searchParams.q || "");
    }
    if (searchParams.price !== undefined) {
      if (searchParams.price === "under-500" || searchParams.price === "500-1000" || searchParams.price === "above-1000") {
        setPriceRange(searchParams.price);
      } else {
        setPriceRange("all");
      }
    }
  }, [searchParams.category, searchParams.q, searchParams.price]);

  // Comprehensive Multi-criteria Search & Sort Logic
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Category filter
      if (selectedCategory !== "all" && product.category !== selectedCategory) {
        return false;
      }
      // In-stock filter
      if (inStockOnly && !product.inStock) {
        return false;
      }
      // Price range filter
      if (priceRange === "under-500" && product.price >= 500) {
        return false;
      }
      if (priceRange === "500-1000" && (product.price < 500 || product.price > 1000)) {
        return false;
      }
      if (priceRange === "above-1000" && product.price <= 1000) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesHindi = product.nameHindi.toLowerCase().includes(query);
        const matchesDesc = product.description.toLowerCase().includes(query);
        const matchesSub = product.subtitle.toLowerCase().includes(query);
        const matchesCategory = product.category.toLowerCase().includes(query);
        const matchesCategoryHindi = product.categoryHindi.toLowerCase().includes(query);
        const matchesIngredients = product.ingredients?.some((ing) => ing.toLowerCase().includes(query));
        const matchesBenefits = product.benefits?.some((b) => b.toLowerCase().includes(query));
        const matchesDosage = product.dosage?.toLowerCase().includes(query);
        const matchedTaxonomy = CATEGORIES.find(
          (c) => c.id !== "all" && (c.name.toLowerCase().includes(query) || c.hindi.toLowerCase().includes(query))
        );
        const matchesMappedCategory = matchedTaxonomy ? product.category === matchedTaxonomy.id : false;

        if (
          !matchesName &&
          !matchesHindi &&
          !matchesDesc &&
          !matchesSub &&
          !matchesCategory &&
          !matchesCategoryHindi &&
          !matchesIngredients &&
          !matchesBenefits &&
          !matchesDosage &&
          !matchesMappedCategory
        ) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      // Default: featured (bestsellers first)
      if (a.isBestseller && !b.isBestseller) return -1;
      if (!a.isBestseller && b.isBestseller) return 1;
      return 0;
    });
  }, [products, selectedCategory, searchQuery, inStockOnly, sortBy, priceRange]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "all" ||
    priceRange !== "all" ||
    sortBy !== "featured" ||
    inStockOnly;

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setPriceRange("all");
    setSortBy("featured");
    setInStockOnly(false);
  }, []);

  const recentlyViewedProducts = useMemo(() => {
    return recentlyViewed
      .map((vId) => products.find((p) => p.id === vId))
      .filter((p): p is Product => p !== undefined)
      .slice(0, 4);
  }, [recentlyViewed, products]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
            <div>
              <span className="text-xs font-bold text-primary tracking-wider uppercase">
                मूल जड़ी-बूटी कैटलॉग
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mt-1">
                सभी आयुर्वेदिक एवं यूनानी उत्पाद
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                हकीम इनायत अहमदी (पालनपुर, गुजरात) के सभी 21 प्रमाणित नुस्खे।
              </p>
            </div>

            <div className="text-xs text-muted-foreground font-medium">
              कुल उत्पाद: <span className="text-primary font-bold">{filteredProducts.length}</span> (21 में से)
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-8 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="sm:col-span-12 md:col-span-5 relative">
              <Input
                type="text"
                placeholder="उत्पाद खोजें (जैसे: ज़ाफरानी, हब्बे हवा, तेल, दर्द...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 bg-secondary/40 rounded-xl text-sm"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Select on mobile / small screens */}
            <div className="sm:col-span-6 md:col-span-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full bg-secondary/40 rounded-xl text-xs sm:text-sm">
                  <SelectValue placeholder="श्रेणी चुनें" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.hindi} ({cat.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Select */}
            <div className="sm:col-span-6 md:col-span-3">
              <Select
                value={sortBy}
                onValueChange={(val: "featured" | "price-asc" | "price-desc" | "rating") =>
                  setSortBy(val)
                }
              >
                <SelectTrigger className="w-full bg-secondary/40 rounded-xl text-xs sm:text-sm">
                  <SelectValue placeholder="क्रमबद्ध करें" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">लोकप्रियता (Featured)</SelectItem>
                  <SelectItem value="price-asc">कीमत: कम से ज्यादा</SelectItem>
                  <SelectItem value="price-desc">कीमत: ज्यादा से कम</SelectItem>
                  <SelectItem value="rating">सर्वोच्च रेटिंग</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Category Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors border ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/60 text-stone-700 dark:text-stone-300 border-border hover:bg-secondary"
                }`}
              >
                {cat.hindi}
              </button>
            ))}
          </div>

          {/* Quick Price Range Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-primary" />
              मूल्य दायरा:
            </span>
            {[
              { id: "all", label: "सभी मूल्य" },
              { id: "under-500", label: "₹500 से कम (Under ₹500)" },
              { id: "500-1000", label: "₹500 - ₹1,000" },
              { id: "above-1000", label: "₹1,000 से अधिक" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPriceRange(item.id as PriceRange)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                  priceRange === item.id
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-secondary/40 text-stone-700 dark:text-stone-300 border-border hover:bg-secondary"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Active Filter Indicators & Quick Clear (Section 1) */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-primary" />
                <span>सक्रिय फ़िल्टर:</span>
              </span>

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                  खोज: "{searchQuery}"
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="hover:text-foreground ml-0.5 cursor-pointer"
                    aria-label="खोज साफ़ करें"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedCategory !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.hindi || selectedCategory}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="hover:text-foreground ml-0.5 cursor-pointer"
                    aria-label="श्रेणी फ़िल्टर हटाएं"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {priceRange !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-medium">
                  मूल्य: {priceRange === "under-500" ? "₹500 से कम" : priceRange === "500-1000" ? "₹500 - ₹1,000" : "₹1,000 से अधिक"}
                  <button
                    type="button"
                    onClick={() => setPriceRange("all")}
                    className="hover:text-foreground ml-0.5 cursor-pointer"
                    aria-label="मूल्य फ़िल्टर हटाएं"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {sortBy !== "featured" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-foreground border border-border font-medium">
                  क्रम: {sortBy === "price-asc" ? "कम से ज्यादा" : sortBy === "price-desc" ? "ज्यादा से कम" : "रेटिंग"}
                  <button
                    type="button"
                    onClick={() => setSortBy("featured")}
                    className="hover:text-foreground ml-0.5 cursor-pointer"
                    aria-label="क्रमबद्धता रीसेट करें"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-0 ml-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                <span>सभी रीसेट करें (Reset All)</span>
              </Button>
            </div>
          )}
        </div>

        {/* Product Grid (2-column on mobile, 3-column on tablet, 4-column on desktop) */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenPoster={handleOpenPoster}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card border border-dashed rounded-3xl p-6 sm:p-10 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-2 border border-border">
              <Search className="w-7 h-7 text-primary/70" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              कोई उत्पाद नहीं मिला
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {searchQuery.trim()
                ? `"${searchQuery}" के लिए कोई उत्पाद मेल नहीं खाता। कृपया स्पेलिंग जांचें या सामान्य शब्द खोजें।`
                : "चयनित श्रेणी या फ़िल्टर के अनुसार कोई उत्पाद नहीं मिला।"}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={resetFilters}
                className="w-full sm:w-auto rounded-full text-xs font-semibold px-6 cursor-pointer"
              >
                सभी फ़िल्टर हटाएं (Show All 21 Products)
              </Button>
              <a
                href={formatWhatsAppUrl(
                  settings.whatsapp,
                  `السلام علیکم Hakeem Ji, I am looking for medicines for: ${searchQuery || "health consultation"}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-2 px-5 rounded-full border border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>हकीम जी से सलाह लें</span>
              </a>
            </div>
          </div>
        )}

        {/* Recently Viewed Products Section on Shop Page (Section 2) */}
        {recentlyViewedProducts.length > 0 && (
          <div className="mt-16 sm:mt-20 border-t border-border pt-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                  हाल ही में देखे गए उत्पाद (Recently Viewed)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  आपके द्वारा इस डिवाइस पर हाल ही में देखे गए उत्पाद
                </p>
              </div>
              <button
                type="button"
                onClick={clearRecentlyViewed}
                className="text-xs text-muted-foreground hover:text-rose-600 transition-colors font-medium border border-border px-3 py-1.5 rounded-full hover:bg-secondary cursor-pointer"
                aria-label="हाल ही में देखे गए इतिहास को साफ़ करें"
              >
                इतिहास साफ़ करें (Clear)
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {recentlyViewedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onOpenPoster={(posterProd) => setSelectedPoster(posterProd)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Poster Inspection Modal */}
      <ProductPosterModal
        product={selectedPoster}
        onClose={() => setSelectedPoster(null)}
      />
    </div>
  );
}
