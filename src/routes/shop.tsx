import React, { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/context/StoreContext";
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

export interface ShopSearch {
  category?: string | undefined;
  q?: string | undefined;
}

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    const category = typeof search["category"] === "string" ? search["category"] : undefined;
    const q = typeof search["q"] === "string" ? search["q"] : undefined;
    return {
      category,
      q,
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
  const { products } = useStore();
  const searchParams = Route.useSearch();

  const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.category || "all");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "rating">("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<Product | null>(null);

  useEffect(() => {
    if (searchParams.category !== undefined) {
      setSelectedCategory(searchParams.category || "all");
    }
    if (searchParams.q !== undefined) {
      setSearchQuery(searchParams.q || "");
    }
  }, [searchParams.category, searchParams.q]);

  // Filter & Sort Logic
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
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesHindi = product.nameHindi.includes(query);
        const matchesDesc = product.description.toLowerCase().includes(query);
        const matchesSub = product.subtitle.toLowerCase().includes(query);
        const matchesCategory = product.category.toLowerCase().includes(query);
        if (!matchesName && !matchesHindi && !matchesDesc && !matchesSub && !matchesCategory) {
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
  }, [products, selectedCategory, searchQuery, inStockOnly, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("featured");
    setInStockOnly(false);
  };

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
        </div>

        {/* Product Grid (2-column on mobile, 3-column on tablet, 4-column on desktop) */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenPoster={(p) => setSelectedPoster(p)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card border border-dashed rounded-3xl p-8 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              कोई उत्पाद नहीं मिला
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              आपके खोजे गए शब्द या फिल्टर के लिए कोई उत्पाद उपलब्ध नहीं है।
            </p>
            <Button onClick={resetFilters} variant="outline" className="rounded-full text-xs">
              फिल्टर हटाएं (Reset Filters)
            </Button>
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
