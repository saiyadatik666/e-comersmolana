import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore, formatWhatsAppUrl } from "@/context/StoreContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductPosterModal } from "@/components/product/ProductPosterModal";
import { ProductCard } from "@/components/product/ProductCard";
import { QuickBuyModal } from "@/components/checkout/QuickBuyModal";
import {
  ShoppingBag,
  Heart,
  MessageCircle,
  Phone,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Star,
  Check,
  Eye,
  Lock,
  Leaf,
  Info,
  Clock,
} from "lucide-react";
import { INITIAL_PRODUCTS } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/product/$id")({
  head: ({ params }) => {
    const product = INITIAL_PRODUCTS.find((p) => p.id === params.id) || INITIAL_PRODUCTS[0];
    const origin = "https://shifa-a-hayat.com";
    const prodUrl = `${origin}/product/${product.id}`;
    const imgUrl = product.image.startsWith("http") ? product.image : `${origin}${product.image}`;
    const cleanDescription = `${product.name} (${product.nameHindi}) - ${product.subtitle}. शुद्ध आयुर्वेदिक एवं यूनानी नुस्खा। मूल्य: ₹${product.price}। कैश ऑन डिलीवरी एवं ऑल इंडिया डिलीवरी उपलब्ध।`;

    return {
      meta: [
        { title: `${product.name} (${product.nameHindi}) — Shifa A Hayat` },
        { name: "description", content: cleanDescription },
        { property: "og:title", content: `${product.name} (${product.nameHindi}) | ₹${product.price}` },
        { property: "og:description", content: cleanDescription },
        { property: "og:image", content: imgUrl },
        { property: "og:url", content: prodUrl },
        { property: "og:type", content: "product" },
        { property: "product:price:amount", content: String(product.price) },
        { property: "product:price:currency", content: "INR" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${product.name} (${product.nameHindi}) | ₹${product.price}` },
        { name: "twitter:description", content: cleanDescription },
        { name: "twitter:image", content: imgUrl },
      ],
      links: [
        { rel: "canonical", href: prodUrl },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            alternateName: product.nameHindi,
            image: [imgUrl],
            description: product.description,
            sku: product.id,
            mpn: product.imageName.replace(".jpg", ""),
            brand: {
              "@type": "Brand",
              name: "Shifa A Hayat",
            },
            offers: {
              "@type": "Offer",
              url: prodUrl,
              priceCurrency: "INR",
              price: product.price,
              itemCondition: "https://schema.org/NewCondition",
              availability: product.inStock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              seller: {
                "@type": "Organization",
                name: "Shifa A Hayat",
              },
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: product.rating,
              reviewCount: product.reviewCount,
              bestRating: "5",
              worstRating: "1",
            },
          }),
        },
      ],
    };
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  const { products, addToCart, toggleWishlist, isInWishlist, settings } = useStore();
  const navigate = useNavigate();

  const product = products.find((p) => p.id === id) || products[0];
  const [quantity, setQuantity] = useState(1);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [showQuickBuy, setShowQuickBuy] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeView, setActiveView] = useState<"product" | "poster">("product");

  const activeImageSrc =
    activeView === "poster" && product.posterImage ? product.posterImage : product.image;

  const inWish = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    setShowQuickBuy(true);
  };

  // Related products from same category
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const discountPercent = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 sm:pb-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary transition-colors">
            होम
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/shop" className="hover:text-primary transition-colors">
            दुकान (Shop)
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            to="/shop"
            search={{ category: product.category } as any}
            className="hover:text-primary transition-colors"
          >
            {product.categoryHindi}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-semibold truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* Product Hero Section (2-Column on Tablet & Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-10">
          {/* Left Column: Studio Product Photography & Heritage Poster Gallery */}
          <div className="md:col-span-5 lg:col-span-6 space-y-3">
            <div className="relative aspect-4/5 rounded-3xl overflow-hidden bg-gradient-to-b from-stone-50/90 via-white to-stone-100 dark:from-stone-900/60 dark:via-stone-900/40 dark:to-stone-950 border border-border shadow-md group flex items-center justify-center p-3 sm:p-5">
              <img
                src={activeImageSrc}
                alt={`${product.name} (${product.nameHindi}) - Shifa A Hayat`}
                fetchPriority="high"
                decoding="async"
                onError={(e) => {
                  if (product.posterImage && e.currentTarget.src !== product.posterImage) {
                    e.currentTarget.src = product.posterImage;
                  }
                }}
                className="w-full h-full object-contain drop-shadow-sm transition-all duration-300 group-hover:scale-105"
              />

              {/* Poster Zoom / High-Res View Button */}
              <button
                onClick={() => setShowPosterModal(true)}
                className="absolute top-4 right-4 bg-white/95 text-stone-800 px-3 py-2 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5 text-xs font-semibold backdrop-blur-xs"
                title="मूल प्रचार पोस्टर देखें"
                aria-label={`View full original poster for ${product.name}`}
              >
                <Eye className="w-4 h-4 text-primary" />
                <span>{activeView === "poster" ? "पोस्टर बड़ा करें" : "मूल पोस्टर देखें"}</span>
              </button>

              {/* Verified Pricing Ribbon */}
              {product.isVerifiedPrice && (
                <div className="absolute top-4 left-4 bg-amber-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow-md border border-amber-400">
                  पोस्टर प्रमाणित मूल्य ₹{product.price}
                </div>
              )}

              {/* Active View Indicator Badge */}
              <div className="absolute bottom-3 left-3 bg-stone-900/80 text-white text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-xs border border-white/10">
                {activeView === "product" ? "उत्पाद फोटोग्राफी (Studio View)" : "मूल विरासत पोस्टर (Heritage Poster)"}
              </div>
            </div>

            {/* Gallery Thumbnails (Amazon/Flipkart Style Dual-View Switcher) */}
            {product.posterImage && product.posterImage !== product.image && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView("product")}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${
                    activeView === "product"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                      : "border-border hover:bg-secondary/40"
                  }`}
                >
                  <div className="w-10 h-12 rounded-lg bg-stone-100 dark:bg-stone-900 p-1 flex items-center justify-center shrink-0 border">
                    <img
                      src={product.image}
                      alt="Product studio packaging"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">उत्पाद पैकेजिंग</p>
                    <p className="text-[10px] text-muted-foreground truncate">स्टूडियो फोटोग्राफी</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView("poster")}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${
                    activeView === "poster"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                      : "border-border hover:bg-secondary/40"
                  }`}
                >
                  <div className="w-10 h-12 rounded-lg bg-stone-100 dark:bg-stone-900 p-1 flex items-center justify-center shrink-0 border">
                    <img
                      src={product.posterImage}
                      alt="Original heritage poster"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">मूल प्रचार पोस्टर</p>
                    <p className="text-[10px] text-muted-foreground truncate">प्रमाणित पोस्टर विवरण</p>
                  </div>
                </button>
              </div>
            )}

            <div className="bg-secondary/40 border border-border rounded-xl p-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-stone-700 dark:text-stone-300">
                फ़ाइल संदर्भ: {product.imageName}
              </span>
              <button
                onClick={() => setShowPosterModal(true)}
                className="text-primary hover:underline font-semibold"
              >
                मूल पोस्टर विवरण देखें
              </button>
            </div>
          </div>

          {/* Right Column: Information, Pricing, Dosage, Ordering */}
          <div className="md:col-span-7 lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-emerald-800 text-emerald-100 font-medium text-xs">
                  {product.categoryHindi}
                </Badge>
                {product.isBestseller && (
                  <Badge variant="outline" className="border-amber-500 text-amber-700 text-xs">
                    सर्वाधिक अनुशंसित
                  </Badge>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                {product.name}
              </h1>
              <p className="font-serif text-lg text-emerald-800 dark:text-emerald-400 font-semibold mt-1">
                {product.nameHindi}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{product.subtitle}</p>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-3 text-xs">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-foreground text-sm">{product.rating}</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{product.reviewCount} संतुष्ट ग्राहक समीक्षाएं</span>
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-secondary/40 border border-border rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium">कुल मूल्य</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold text-primary">₹{product.price}</span>
                  {product.compareAtPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      ₹{product.compareAtPrice}
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {discountPercent}% छूट
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                  ✓ सभी कर (Taxes) शामिल • कैश ऑन डिलीवरी उपलब्ध
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground">पैकिंग</span>
                <p className="text-xs font-semibold text-foreground bg-card border px-2.5 py-1 rounded-lg mt-0.5">
                  {product.packSize}
                </p>
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-foreground">मात्रा:</span>
                <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-sm font-bold hover:bg-secondary transition-colors active:bg-secondary/80"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 text-sm font-bold min-w-10 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-sm font-bold hover:bg-secondary transition-colors active:bg-secondary/80"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  className={`rounded-2xl font-bold transition-all ${
                    added ? "bg-emerald-700 text-white" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      <span>कार्ट में जुड़ गया</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      <span>कार्ट में जोड़ें</span>
                    </>
                  )}
                </Button>

                <Button
                  size="lg"
                  onClick={handleBuyNow}
                  className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                >
                  <span>अभी खरीदें (Buy Now)</span>
                </Button>
              </div>

              {/* Direct WhatsApp Ordering */}
              <a
                href={formatWhatsAppUrl(
                  settings.whatsapp,
                  `السلام علیکم Hakeem Ji, I want to order ${product.name} (Pack: ${product.packSize}, Price ₹${product.price}). Please confirm my order.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp पर हकीम जी से ऑर्डर करें (+91 {settings.whatsapp})</span>
              </a>

              <button
                onClick={() => toggleWishlist(product.id)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Heart className={`w-4 h-4 ${inWish ? "fill-red-500 text-red-500" : ""}`} />
                <span>{inWish ? "विशलिस्ट में सुरक्षित है" : "विशलिस्ट में जोड़ें"}</span>
              </button>
            </div>

            {/* Quick Guarantees Strip */}
            <div className="grid grid-cols-3 gap-2 border-t border-b border-border py-4 text-center">
              <div className="space-y-1">
                <ShieldCheck className="w-5 h-5 mx-auto text-primary" />
                <p className="text-[11px] font-semibold text-foreground">100% शुद्ध जड़ी-बूटी</p>
                <p className="text-[10px] text-muted-foreground">बिना केमिकल</p>
              </div>
              <div className="space-y-1">
                <Truck className="w-5 h-5 mx-auto text-primary" />
                <p className="text-[11px] font-semibold text-foreground">ऑल इंडिया कूरियर</p>
                <p className="text-[10px] text-muted-foreground">कैश ऑन डिलीवरी</p>
              </div>
              <div className="space-y-1">
                <Lock className="w-5 h-5 mx-auto text-primary" />
                <p className="text-[11px] font-semibold text-foreground">गोपनीय पैकिंग</p>
                <p className="text-[10px] text-muted-foreground">प्राइवेट पार्सल</p>
              </div>
            </div>

            {/* Dosage & How To Use */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-xs uppercase tracking-wide">
                <Clock className="w-4 h-4" />
                <span>सेवन विधि (How To Use / Dosage):</span>
              </div>
              <p className="text-xs text-emerald-950 dark:text-emerald-100 font-medium leading-relaxed">
                {product.dosage}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Tabs / Accordion for Description, Benefits & Ingredients */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          <div className="md:col-span-7 lg:col-span-8 space-y-8">
            {/* Description & Heritage */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                उत्पाद का विस्तृत विवरण एवं महत्व
              </h2>
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                {product.description}
              </p>

              {/* Key Benefits */}
              <div className="pt-4">
                <h3 className="font-serif text-lg font-bold text-foreground mb-3">
                  प्रमुख फायदे (Key Benefits)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {product.benefits.map((benefit, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border/60 text-xs text-foreground font-medium"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ingredients */}
              <div className="pt-4">
                <h3 className="font-serif text-lg font-bold text-foreground mb-3">
                  घटक एवं जड़ी-बूटियां (Key Herbal Ingredients)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-300/40 text-emerald-900 dark:text-emerald-200 text-xs font-medium"
                    >
                      <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{ing}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Precautions */}
              {product.precautions && (
                <div className="pt-4 border-t border-border/80 text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>सावधानी एवं परहेज़:</strong> {product.precautions}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Hakim Ji Contact & Order Card on Side */}
          <div className="md:col-span-5 lg:col-span-4 space-y-6">
            <div className="bg-stone-900 text-stone-200 rounded-3xl p-6 border border-stone-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-800/80 text-amber-300 flex items-center justify-center border border-amber-400/40">
                <Sparkles className="w-6 h-6" />
              </div>

              <h3 className="font-serif text-xl font-bold text-white">
                निजी सलाह की जरूरत है?
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                हकीम इनायत अहमदी (पालनपुर) आपकी समस्या सुनकर सही नुस्खा और परहेज़ की पूरी जानकारी देंगे।
              </p>

              <div className="space-y-2 pt-2">
                <a
                  href={formatWhatsAppUrl(
                    settings.whatsapp,
                    `السلام علیکم Hakeem Ji, I want guidance regarding ${product.name}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-colors"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>WhatsApp पर चैट करें</span>
                </a>
                <a
                  href={`tel:${settings.phone}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-stone-700 text-stone-300 hover:text-white font-semibold text-xs transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>कॉल करें: +91 {settings.phone}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 border-t border-border pt-12">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              इसी श्रेणी के अन्य प्रमाणित उत्पाद
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* High-res Poster Modal */}
      <ProductPosterModal
        product={showPosterModal ? product : null}
        onClose={() => setShowPosterModal(false)}
      />

      {/* Instant Direct Buy Modal */}
      <QuickBuyModal
        product={product}
        quantity={quantity}
        isOpen={showQuickBuy}
        onClose={() => setShowQuickBuy(false)}
      />

      {/* Mobile Sticky Buy Action Bar (Amazon / Flipkart / Meesho Style) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3 shadow-xl">
        <div className="shrink-0">
          <span className="text-[10px] text-muted-foreground block">कुल मूल्य</span>
          <span className="text-base font-bold text-primary">₹{product.price * quantity}</span>
        </div>
        <div className="flex gap-2 flex-1 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddToCart}
            className="text-xs rounded-xl px-3 h-10 border-primary/30"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1" />
            <span>{added ? "जुड़ गया" : "कार्ट"}</span>
          </Button>
          <Button
            size="sm"
            onClick={handleBuyNow}
            className="text-xs rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-4 h-10 shadow-sm"
          >
            <span>अभी खरीदें</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
