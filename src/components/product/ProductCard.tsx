import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Product } from "@/data/products";
import { useStore, formatWhatsAppUrl } from "@/context/StoreContext";
import {
  Heart,
  ShoppingBag,
  MessageCircle,
  Eye,
  Check,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
  onOpenPoster?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenPoster }) => {
  const { addToCart, toggleWishlist, isInWishlist, settings } = useStore();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const inWish = isInWishlist(product.id);
  const isOutOfStock = !product.inStock || (product.stockCount !== undefined && product.stockCount <= 0);

  // Calculate discount percentage
  const discountPercent = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="group relative bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:border-primary/40 focus-within:ring-2 focus-within:ring-primary/60 transition-all duration-300 flex flex-col h-full">
      {/* Product Image Container - Studio E-Commerce Presentation */}
      <div className="relative aspect-4/5 w-full bg-gradient-to-b from-stone-50/80 via-white to-stone-100/90 dark:from-stone-900/60 dark:via-stone-900/40 dark:to-stone-950 p-2 sm:p-3 overflow-hidden flex items-center justify-center">
        <Link to="/product/$id" params={{ id: product.id }} className="block w-full h-full flex items-center justify-center">
          <img
            src={product.image}
            alt={`${product.name} (${product.nameHindi}) - Shifa A Hayat`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              if (product.posterImage && e.currentTarget.src !== product.posterImage) {
                e.currentTarget.src = product.posterImage;
              }
            }}
            className="w-full h-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Badges on Image */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 max-w-[85%]">
          {isOutOfStock ? (
            <Badge className="bg-rose-700 hover:bg-rose-700 text-white font-bold text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 shadow-sm border border-rose-500 truncate">
              आउट ऑफ स्टॉक
            </Badge>
          ) : product.isVerifiedPrice ? (
            <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 shadow-sm border border-amber-400 truncate">
              <span className="sm:hidden">₹{product.price} प्रमाणित</span>
              <span className="hidden sm:inline">पोस्टर प्रमाणित मूल्य ₹{product.price}</span>
            </Badge>
          ) : product.isBestseller ? (
            <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white font-semibold text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 shadow-sm truncate">
              लोकप्रिय
            </Badge>
          ) : null}
          {discountPercent > 0 && (
            <span className="bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs self-start">
              {discountPercent}% छूट
            </span>
          )}
          {product.image.startsWith("/assets/products/") ? (
            <span className="bg-stone-900/75 text-emerald-300 text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded shadow-xs self-start backdrop-blur-xs border border-emerald-500/30">
              स्टूडियो पैकेजिंग
            </span>
          ) : (
            <span className="bg-stone-900/75 text-amber-300 text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded shadow-xs self-start backdrop-blur-xs border border-amber-500/30">
              विरासत पोस्टर
            </span>
          )}
        </div>

        {/* Wishlist & Zoom Actions */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
          <button
            onClick={handleWishlist}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105 shadow-md ${
              inWish ? "bg-red-500 text-white" : "bg-white/90 text-stone-700 hover:bg-white"
            }`}
            title={inWish ? "विशलिस्ट से हटाएं" : "विशलिस्ट में जोड़ें"}
            aria-label={`${inWish ? 'Remove' : 'Add'} ${product.name} to wishlist`}
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${inWish ? "fill-white" : ""}`} />
          </button>

          {onOpenPoster && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenPoster(product);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 text-stone-700 hover:bg-white flex items-center justify-center transition-transform active:scale-95 hover:scale-105 shadow-md"
              title="मूल प्रचार पोस्टर देखें"
              aria-label={`View full poster for ${product.name}`}
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Quick WhatsApp Order Ribbon on Hover (Desktop) */}
        <div className="hidden sm:block absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <a
            href={formatWhatsAppUrl(
              settings.whatsapp,
              `السلام علیکم Hakeem Ji, I want to order ${product.name} (Price ₹${product.price}). Please guide me.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600/95 hover:bg-emerald-700 text-white text-xs font-semibold shadow-lg backdrop-blur-xs transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white" />
            <span>WhatsApp पर ऑर्डर करें</span>
          </a>
        </div>
      </div>

      {/* Product Details Section */}
      <div className="p-2.5 sm:p-4 flex flex-col flex-1 justify-between gap-2 sm:gap-3">
        <div>
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 gap-1">
            <span className="font-medium text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] truncate max-w-[65%]">
              {product.categoryHindi}
            </span>
            <div className="flex items-center gap-0.5 sm:gap-1 text-amber-500 shrink-0">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground text-[11px] sm:text-xs">{product.rating}</span>
            </div>
          </div>

          {/* Bilingual Title */}
          <Link to="/product/$id" params={{ id: product.id }} className="block group-hover:text-primary transition-colors">
            <h3 className="font-serif font-bold text-xs sm:text-base text-foreground leading-snug line-clamp-1">
              {product.name}
            </h3>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground line-clamp-1 mt-0.5">
              {product.nameHindi}
            </p>
          </Link>

          {/* Pack Size */}
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-stone-600 dark:text-stone-300 font-medium bg-secondary/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md inline-block">
            {product.packSize}
          </div>
        </div>

        {/* Pricing and Cart Action */}
        <div className="pt-2 border-t border-border/60 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2">
          <div className="flex xs:flex-col items-baseline xs:items-start justify-between xs:justify-start gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-primary">₹{product.price}</span>
              {product.compareAtPrice && (
                <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                  ₹{product.compareAtPrice}
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              COD उपलब्ध
            </span>
          </div>

          <div className="flex items-center gap-1.5 w-full xs:w-auto">
            {isOutOfStock ? (
              <Button
                size="sm"
                variant="outline"
                disabled
                aria-label={`${product.name} वर्तमान में अनुपलब्ध है`}
                className="flex-1 xs:flex-initial rounded-xl px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold h-8 sm:h-9 bg-secondary/70 text-muted-foreground border-border/80 cursor-not-allowed opacity-75"
              >
                <span>अनुपलब्ध (Out of Stock)</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleAddToCart}
                aria-label={added ? `${product.name} कार्ट में जुड़ गया` : `${product.name} कार्ट में जोड़ें`}
                className={`flex-1 xs:flex-initial rounded-xl px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold h-8 sm:h-9 transition-all cursor-pointer ${
                  added
                    ? "bg-emerald-700 text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>जुड़ गया</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                    <span>कार्ट में जोड़ें</span>
                  </>
                )}
              </Button>
            )}

            <a
              href={formatWhatsAppUrl(
                settings.whatsapp,
                `السلام علیکم Hakeem Ji, I want to order ${product.name} (Price ₹${product.price}). Please guide me.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="xs:hidden h-8 w-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors"
              title="WhatsApp पर तुरंत ऑर्डर करें"
              aria-label={`WhatsApp order for ${product.name}`}
            >
              <MessageCircle className="w-4 h-4 fill-white" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
