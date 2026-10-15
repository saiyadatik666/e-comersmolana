import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/context/StoreContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck,
  Tag,
  Check,
  X,
  Plus,
  Minus,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "शॉपिंग कार्ट (Shopping Cart) — Shifa A Hayat" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartSubtotal,
    shippingFee,
    discountAmount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    cartGrandTotal,
    settings,
  } = useStore();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const navigate = useNavigate();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim()) {
      const ok = applyCoupon(couponInput.trim());
      if (ok) {
        setCouponInput("");
        setCouponError("");
      } else {
        setCouponError("अमान्य कूपन कोड। कृपया SHIFA10, AYURVEDA50 या FREECOD का उपयोग करें।");
      }
    }
  };

  const handleQuickCoupon = (code: string) => {
    const ok = applyCoupon(code);
    if (ok) {
      setCouponInput("");
      setCouponError("");
    }
  };

  const amountNeededForFreeShipping = Math.max(0, settings.freeShippingThreshold - cartSubtotal);
  const freeShippingProgress = Math.min(
    100,
    Math.round((cartSubtotal / settings.freeShippingThreshold) * 100)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            शॉपिंग कार्ट (Shopping Cart)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            अपने चुने हुए आयुर्वेदिक एवं यूनानी उत्पादों की समीक्षा करें।
          </p>
        </div>

        {cart.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left: Cart Items List */}
            <div className="md:col-span-7 lg:col-span-8 space-y-4">
              {/* Free Shipping Progress Indicator */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-200 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-700" />
                    <span>
                      {amountNeededForFreeShipping === 0
                        ? "🎉 बधाई! आपको इस ऑर्डर पर मुफ्त डिलीवरी (Free Shipping) मिल रही है!"
                        : `मुफ्त डिलीवरी के लिए सिर्फ ₹${amountNeededForFreeShipping} का सामान और जोड़ें!`}
                    </span>
                  </div>
                  <span>{freeShippingProgress}%</span>
                </div>
                <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>

              {/* Items Card List */}
              <div className="bg-card border border-border rounded-3xl divide-y divide-border overflow-hidden shadow-xs">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-3.5 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
                    <div className="flex gap-3 sm:gap-4 items-center flex-1 min-w-0">
                      <Link to="/product/$id" params={{ id: item.product.id }} className="shrink-0">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          onError={(e) => {
                            if (item.product.posterImage && e.currentTarget.src !== item.product.posterImage) {
                              e.currentTarget.src = item.product.posterImage;
                            }
                          }}
                          className="w-16 h-20 sm:w-20 sm:h-24 object-contain p-1 bg-stone-50 dark:bg-stone-900 rounded-xl border border-border"
                        />
                      </Link>

                      <div className="space-y-1 min-w-0 flex-1">
                        <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                          {item.product.categoryHindi}
                        </span>
                        <Link to="/product/$id" params={{ id: item.product.id }} className="block hover:text-primary transition-colors">
                          <h3 className="font-serif font-bold text-sm sm:text-base text-foreground truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">{item.product.nameHindi}</p>
                        </Link>
                        <p className="text-[11px] sm:text-xs text-stone-500 font-medium">{item.packSize || item.product.packSize}</p>
                        <span className="text-xs font-bold text-primary sm:hidden block">
                          ₹{item.product.price}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                      {/* Quantity Controller */}
                      <div className="flex items-center border border-border rounded-xl bg-secondary/30 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
                          aria-label={`मात्रा घटाएं: ${item.product.name} (Decrease quantity)`}
                          title={item.quantity === 1 ? "हटाएं (Remove)" : "मात्रा घटाएं"}
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="px-2.5 text-xs font-bold min-w-7 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= 99}
                          className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          aria-label={`मात्रा बढ़ाएं: ${item.product.name} (Increase quantity)`}
                          title={item.quantity >= 99 ? "अधिकतम सीमा 99" : "मात्रा बढ़ाएं"}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line Item Total */}
                      <div className="text-right min-w-[60px] sm:min-w-[70px]">
                        <p className="text-sm sm:text-base font-bold text-foreground">
                          ₹{item.product.price * item.quantity}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ₹{item.product.price} / प्रति
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-stone-400 hover:text-rose-600 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                        title="Remove from cart"
                        aria-label={`कार्ट से हटाएं: ${item.product.name} (Remove item)`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link to="/shop">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                    ← अन्य उत्पाद जोड़ें
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-700"
                >
                  कार्ट खाली करें
                </Button>
              </div>
            </div>

            {/* Right: Order Summary Card */}
            <div className="md:col-span-5 lg:col-span-4 bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 md:sticky md:top-24">
              <h2 className="font-serif text-xl font-bold text-foreground border-b border-border pb-3">
                ऑर्डर सारांश (Order Summary)
              </h2>

              {/* Pricing breakdown */}
              <div className="space-y-2.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>उप-योग (Subtotal):</span>
                  <span className="font-semibold text-foreground">₹{cartSubtotal}</span>
                </div>

                <div className="flex justify-between">
                  <span>डिलीवरी शुल्क (Shipping):</span>
                  <span className="font-semibold text-foreground">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">मुफ्त (FREE)</span>
                    ) : (
                      `₹${shippingFee}`
                    )}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>कूपन छूट ({appliedCoupon}):</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}

                <div className="border-t border-border pt-3 flex justify-between text-base font-bold text-foreground">
                  <span>कुल देय राशि (Total):</span>
                  <span className="text-primary text-xl">₹{cartGrandTotal}</span>
                </div>
              </div>

              {/* Coupon Code Section */}
              <div className="pt-2 border-t border-border space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-semibold">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>कूपन '{appliedCoupon}' लागू है! ({discountAmount > 0 ? `₹${discountAmount} बचत` : "मुफ्त डिलीवरी"})</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-stone-500 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove Coupon"
                      aria-label="कूपन हटाएं (Remove coupon)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="कूपन कोड (उदा: SHIFA10)"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value);
                          if (couponError) setCouponError("");
                        }}
                        className={`text-xs bg-secondary/50 rounded-xl uppercase ${couponError ? "border-rose-500" : ""}`}
                      />
                      <Button type="submit" size="sm" variant="outline" className="text-xs rounded-xl shrink-0 cursor-pointer">
                        लागू करें
                      </Button>
                    </form>

                    {couponError && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">
                        {couponError}
                      </p>
                    )}

                    {/* Quick Available Coupon Chips */}
                    <div className="pt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">उपलब्ध कूपन:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickCoupon("SHIFA10")}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        SHIFA10 (10% छूट)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickCoupon("AYURVEDA50")}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        AYURVEDA50 (₹50 छूट)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickCoupon("FREECOD")}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        FREECOD (निःशुल्क शिपिंग)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Actions */}
              <div className="space-y-2.5 pt-2">
                <Button
                  size="lg"
                  onClick={() => navigate({ to: "/checkout" })}
                  className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md text-sm flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5 fill-white" />
                  <span>WhatsApp पर ऑर्डर भेजें (Proceed to Order)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  डिलीवरी विवरण दर्ज करें और हकीम जी को WhatsApp पर सीधा ऑर्डर भेजें।
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-card border border-border rounded-3xl p-8 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              आपकी कार्ट खाली है
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              आपने अभी तक कोई आयुर्वेदिक उत्पाद नहीं जोड़ा है। अपनी स्वास्थ्य जरूरत के अनुसार उत्पाद चुनें।
            </p>
            <div className="pt-2">
              <Link to="/shop">
                <Button size="lg" className="rounded-full bg-primary text-primary-foreground font-semibold px-8 text-xs">
                  उत्पाद कैटलॉग देखें (Explore Products)
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
