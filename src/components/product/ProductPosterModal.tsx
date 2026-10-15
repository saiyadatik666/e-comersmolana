import React, { useEffect } from "react";
import { Product } from "@/data/products";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductPosterModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductPosterModal: React.FC<ProductPosterModalProps> = ({ product, onClose }) => {
  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="poster-modal-title"
        className="relative max-w-3xl w-full max-h-[90vh] bg-card rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/50">
          <div>
            <h3 id="poster-modal-title" className="font-serif font-bold text-base text-foreground flex items-center gap-2">
              <span>{product.name}</span>
              <span className="text-xs font-sans text-muted-foreground font-normal">
                ({product.imageName})
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">{product.nameHindi} • मूल प्रचार पोस्टर</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full w-9 h-9"
            aria-label="मूल प्रचार पोस्टर बंद करें (Close poster viewer)"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Image Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-stone-950/20">
          <img
            src={product.posterImage || product.image}
            alt={`${product.name} - मूल प्रचार पोस्टर`}
            decoding="async"
            className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-secondary/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>{product.packSize} • मूल्य: ₹{product.price}</span>
          <a
            href={product.posterImage || product.image}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            <span>पूर्ण रिज़ॉल्यूशन में खोलें</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
