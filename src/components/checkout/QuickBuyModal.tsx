import React from "react";
import { Product } from "@/data/products";
import { CustomerDetailsForm } from "@/components/checkout/CustomerDetailsForm";
import { X, ShoppingBag } from "lucide-react";
import { useStore } from "@/context/StoreContext";

interface QuickBuyModalProps {
  product: Product;
  quantity: number;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickBuyModal: React.FC<QuickBuyModalProps> = ({
  product,
  quantity,
  isOpen,
  onClose,
}) => {
  const { settings } = useStore();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = product.price * quantity;
  const shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
  const finalTotal = subtotal + shippingFee;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickbuy-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative bg-background border border-border rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-8 space-y-5 sm:space-y-6 max-h-[94vh] overflow-y-auto shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="बंद करें (Close)"
          className="absolute top-3 right-3 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center cursor-pointer z-10"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Snippet Header */}
        <div className="flex items-center gap-3 sm:gap-4 border-b border-border pb-3 sm:pb-4 pr-10">
          <img
            src={product.image}
            alt={product.name}
            className="w-14 h-16 sm:w-16 sm:h-20 object-cover rounded-xl border border-border shrink-0"
          />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
              तत्काल ऑर्डर (Instant Order)
            </span>
            <h3 id="quickbuy-modal-title" className="font-serif font-bold text-sm sm:text-base text-foreground mt-0.5 truncate">
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {product.packSize} • मात्रा: {quantity} • कुल: <strong className="text-primary font-bold">₹{finalTotal}</strong>
            </p>
          </div>
        </div>

        {/* Customer Details Form */}
        <CustomerDetailsForm
          items={[{ product, quantity }]}
          subtotal={subtotal}
          shippingFee={shippingFee}
          finalTotal={finalTotal}
          onOrderCompleted={() => {
            // Can leave open so customer sees WhatsApp instruction & copy button
          }}
        />
      </div>
    </div>
  );
};
