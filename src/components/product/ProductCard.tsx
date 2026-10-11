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

  // Calculate discount percentage
  const discountPercent = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="group relative bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col h-full">
      {/* Poster Image Container */}
      <div className="relative aspect-4/5 w-full bg-secondary/40 overflow-hidden">
        <Link to="/product/$id" params={{ id: product.id }} className="block w-full h-full">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Badges on Image */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.isVerifiedPrice && (
            <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 shadow-sm border border-amber-400">
              पोस्टर प्रमाणित मूल्य ₹{product.price}
            </Badge>
          )}
          {product.isBestseller && !product.isVerifiedPrice && (
            <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white font-semibold text-[10px] px-2 py-0.5 shadow-sm">
              लोकप्रिय नुस्खा
            </Badge>
          )}
          {discountPercent > 0 && (
            <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Wishlist & Zoom Actions */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          <button
            onClick={handleWishlist}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-md ${
              inWish ? "bg-red-500 text-white" : "bg-white/90 text-stone-700 hover:bg-white"
            }`}
            title="Add to Wishlist"
          >
            <Heart className={`w-4 h-4 ${inWish ? "fill-white" : ""}`} />
          </button>

          {onOpenPoster && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenPoster(product);
              }}
              className="w-8 h-8 rounded-full bg-white/90 text-stone-700 hover:bg-white flex items-center justify-center transition-transform hover:scale-110 shadow-md"
              title="View Original Poster"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick WhatsApp Order Ribbon on Hover */}
        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
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
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">
              {product.categoryHindi}
            </span>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground text-xs">{product.rating}</span>
              <span className="text-muted-foreground text-[10px]">({product.reviewCount})</span>
            </div>
          </div>

          {/* Bilingual Title */}
          <Link to="/product/$id" params={{ id: product.id }} className="block group-hover:text-primary transition-colors">
            <h3 className="font-serif font-bold text-base text-foreground leading-snug line-clamp-1">
              {product.name}
            </h3>
            <p className="text-xs font-medium text-muted-foreground line-clamp-1 mt-0.5">
              {product.nameHindi}
            </p>
          </Link>

          {/* Subtitle / Key Benefit */}
          <p className="text-[11px] text-stone-500 line-clamp-1 mt-1">
            {product.subtitle}
          </p>

          {/* Pack Size */}
          <div className="mt-2 text-[11px] text-stone-600 dark:text-stone-300 font-medium bg-secondary/60 px-2 py-1 rounded-md inline-block">
            पैकिंग: {product.packSize}
          </div>
        </div>

        {/* Pricing and Cart Action */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-primary">₹{product.price}</span>
              {product.compareAtPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{product.compareAtPrice}
                </span>
              )}
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              कैश ऑन डिलीवरी
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleAddToCart}
            className={`rounded-xl px-3 text-xs font-semibold transition-all ${
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
        </div>
      </div>
    </div>
  );
};
