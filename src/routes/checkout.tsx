import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/context/StoreContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CustomerDetailsForm } from "@/components/checkout/CustomerDetailsForm";
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  Lock,
  MessageCircle,
  Phone,
  ArrowRight,
  ShoppingBag,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const {
    cart,
    cartSubtotal,
    shippingFee,
    discountAmount,
    cartGrandTotal,
    settings,
  } = useStore();

  const [orderReference, setOrderReference] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb / Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>सुरक्षित व्हाट्सएप चेकआउट (Secure WhatsApp Checkout)</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            ऑर्डर विवरण एवं चेकआउट
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
            अपना डिलीवरी पता भरें और WhatsApp के ज़रिए हकीम जी को सीधा ऑर्डर भेजें। किसी पेमेंट गेटवे या अग्रिम भुगतान की आवश्यकता नहीं है।
          </p>
        </div>

        {cart.length === 0 && !orderReference ? (
          <div className="text-center py-20 bg-card border border-border rounded-3xl p-8 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              आपकी कार्ट खाली है
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              चेकआउट करने से पहले कृपया दुकान से अपनी आवश्यकता के उत्पाद कार्ट में जोड़ें।
            </p>
            <div className="pt-2">
              <Link to="/shop">
                <Button size="lg" className="rounded-full bg-primary text-primary-foreground font-semibold px-8 text-xs">
                  उत्पाद देखें (Browse Products)
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Customer Details & WhatsApp Order Request (Section 6 & 7) */}
            <div className="lg:col-span-7">
              <CustomerDetailsForm
                items={cart}
                subtotal={cartSubtotal}
                shippingFee={shippingFee}
                finalTotal={cartGrandTotal}
                onOrderCompleted={(orderId) => setOrderReference(orderId)}
              />
            </div>

            {/* Right Column: Order Summary & Amazon/Flipkart/Meesho Trust Card */}
            <div className="lg:col-span-5 space-y-6 sticky top-24">
              {/* Order Items Review Box */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="font-serif text-lg font-bold text-foreground">
                    ऑर्डर सारांश ({cart.length} उत्पाद)
                  </h2>
                  <Link to="/cart" className="text-xs text-primary hover:underline font-semibold">
                    कार्ट संपादित करें
                  </Link>
                </div>

                {/* Items List */}
                <div className="divide-y divide-border max-h-72 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.product.id} className="py-3 flex gap-3 items-center justify-between">
                      <div className="flex gap-3 items-center min-w-0">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-12 h-14 object-cover rounded-lg border border-border shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {item.product.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.product.nameHindi}
                          </p>
                          <span className="text-[10px] text-stone-500">
                            मात्रा: {item.quantity} × ₹{item.product.price}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-foreground">
                          ₹{item.product.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown */}
                <div className="border-t border-border pt-3 space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>सामग्री मूल्य (Subtotal):</span>
                    <span className="font-semibold text-foreground">₹{cartSubtotal}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>डिलीवरी शुल्क (Shipping Charge):</span>
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
                      <span>छूट (Discount):</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}

                  <div className="border-t border-border pt-3 flex justify-between text-base font-bold text-foreground">
                    <span>कुल देय राशि (Final Amount):</span>
                    <span className="text-primary text-xl">₹{cartGrandTotal}</span>
                  </div>
                </div>
              </div>

              {/* Genuine Ordering Process Explanation (Amazon/Flipkart/Meesho + Direct Consult) */}
              <div className="bg-secondary/40 border border-border rounded-3xl p-5 text-xs space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-foreground text-sm border-b border-border pb-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span>यह प्रक्रिया कैसे काम करती है?</span>
                </div>

                <div className="space-y-2.5 text-stone-700 dark:text-stone-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-snug">
                      अपना सही डिलीवरी पता दर्ज करें। आप चाहें तो विवरण डिवाइस पर सुरक्षित रख सकते हैं।
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-snug">
                      'WhatsApp पर भेजें' बटन दबाते ही ऑर्डर संदेश के साथ आधिकारिक WhatsApp चैट खुल जाएगी।
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="leading-snug">
                      हकीम जी आपकी दवा की उपलब्धता जांचकर पार्सल की पुष्टि करेंगे।
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>हकीम जी का WhatsApp:</span>
                  <strong className="text-foreground font-mono">+91 {settings.whatsapp}</strong>
                </div>
              </div>

              {/* Direct Helpline Banner */}
              <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-4 flex items-center gap-3">
                <Phone className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-foreground block">कोई प्रश्न या असमंजस?</span>
                  <span className="text-muted-foreground block text-[11px]">
                    सीधे हकीम जी से बात करें: <a href={`tel:${settings.phone}`} className="text-primary font-semibold hover:underline">{settings.phone}</a>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
