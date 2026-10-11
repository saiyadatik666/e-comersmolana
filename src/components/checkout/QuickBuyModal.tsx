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
  if (!isOpen) return null;

  const subtotal = product.price * quantity;
  const shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
  const finalTotal = subtotal + shippingFee;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative bg-background border border-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Snippet Header */}
        <div className="flex items-center gap-4 border-b border-border pb-4 pr-10">
          <img
            src={product.image}
            alt={product.name}
            className="w-16 h-20 object-cover rounded-xl border border-border shrink-0"
          />
          <div>
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
              तत्काल ऑर्डर (Instant Order)
            </span>
            <h3 className="font-serif font-bold text-base text-foreground mt-0.5 truncate">
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground">
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
