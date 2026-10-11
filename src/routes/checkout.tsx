import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore, Order } from "@/context/StoreContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  Lock,
  MessageCircle,
  Phone,
  QrCode,
  ArrowRight,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

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
    createOrder,
    currentUser,
    settings,
  } = useStore();

  const navigate = useNavigate();

  // Form State
  const defaultAddr = currentUser?.addresses?.[0];
  const [fullName, setFullName] = useState(defaultAddr?.fullName || currentUser?.name || "");
  const [phone, setPhone] = useState(defaultAddr?.phone || currentUser?.phone || "");
  const [addressLine, setAddressLine] = useState(defaultAddr?.addressLine || "");
  const [landmark, setLandmark] = useState(defaultAddr?.landmark || "");
  const [city, setCity] = useState(defaultAddr?.city || "");
  const [stateName, setStateName] = useState(defaultAddr?.state || "Gujarat");
  const [pincode, setPincode] = useState(defaultAddr?.pincode || "");
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE_UPI">("COD");

  // Submitted Order State
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim() || !addressLine.trim() || !city.trim() || !pincode.trim()) {
      toast.error("कृपया सभी आवश्यक पते की जानकारी भरें।");
      return;
    }

    if (cart.length === 0) {
      toast.error("आपकी कार्ट में कोई उत्पाद नहीं है।");
      return;
    }

    const orderPayload = {
      customerName: fullName.trim(),
      customerPhone: phone.trim(),
      customerEmail: currentUser?.email || "customer@shifaahayat.com",
      shippingAddress: {
        id: `addr-${Date.now()}`,
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine: addressLine.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
      },
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
        packSize: item.packSize || item.product.packSize,
      })),
      subtotal: cartSubtotal,
      shippingCharge: shippingFee,
      discount: discountAmount,
      total: cartGrandTotal,
      paymentMethod,
      paymentStatus: paymentMethod === "ONLINE_UPI" ? ("Pending" as const) : ("Pending" as const),
      notes: orderNotes.trim(),
    };

    const newOrder = createOrder(orderPayload);
    setConfirmedOrder(newOrder);
  };

  if (confirmedOrder) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 sm:py-16">
          <div className="bg-card border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 flex items-center justify-center mx-auto border-2 border-emerald-500">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full uppercase tracking-wider">
                ऑर्डर सफलतापूर्वक दर्ज हुआ
              </span>
              <h1 className="font-serif text-3xl font-bold text-foreground mt-3">
                शुक्रिया! आपका ऑर्डर प्राप्त हो गया है
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                ऑर्डर नंबर: <strong className="text-primary font-bold">{confirmedOrder.id}</strong> • ट्रैकिंग: {confirmedOrder.trackingNumber}
              </p>
            </div>

            {/* Order Details Card */}
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 text-left text-xs space-y-3">
              <div className="flex justify-between border-b border-border pb-2 font-semibold text-foreground">
                <span>डिलीवरी का पता:</span>
                <span>{confirmedOrder.paymentMethod === "COD" ? "कैश ऑन डिलीवरी (COD)" : "UPI / ऑनलाइन"}</span>
              </div>
              <p className="text-stone-700 dark:text-stone-300">
                <strong>{confirmedOrder.customerName}</strong> ({confirmedOrder.customerPhone})<br />
                {confirmedOrder.shippingAddress.addressLine},{" "}
                {confirmedOrder.shippingAddress.landmark ? `${confirmedOrder.shippingAddress.landmark}, ` : ""}
                {confirmedOrder.shippingAddress.city}, {confirmedOrder.shippingAddress.state} - {confirmedOrder.shippingAddress.pincode}
              </p>

              <div className="border-t border-border pt-2 flex justify-between font-bold text-base text-foreground">
                <span>कुल देय राशि:</span>
                <span className="text-primary">₹{confirmedOrder.total}</span>
              </div>
            </div>

            {/* WhatsApp Notify Button */}
            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/91${settings.whatsapp}?text=السلام علیکم Hakeem Ji, I have placed Order %23${
                  confirmedOrder.id
                } for ₹${confirmedOrder.total} on Shifa A Hayat. Please confirm delivery.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>हकीम जी को WhatsApp पर ऑर्डर नंबर भेजें</span>
              </a>

              <div className="flex gap-3 justify-center">
                <Link to="/account">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs">
                    ऑर्डर स्टेटस देखें (My Orders)
                  </Button>
                </Link>
                <Link to="/shop">
                  <Button size="sm" className="rounded-xl text-xs">
                    अन्य उत्पाद देखें (Continue Shopping)
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            सुरक्षित चेकआउट (Secure Checkout)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            अपने पार्सल की डिलीवरी का पता और भुगतान का तरीका चुनें।
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-3xl p-8 max-w-md mx-auto space-y-4">
            <p className="text-sm text-muted-foreground">आपकी कार्ट में कोई उत्पाद नहीं है।</p>
            <Link to="/shop">
              <Button size="sm" className="rounded-full">
                शॉपिंग शुरू करें
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Customer & Address Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Delivery Address Box */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Truck className="w-5 h-5 text-primary" />
                  <h2 className="font-serif text-lg font-bold text-foreground">
                    डिलीवरी का पता (Shipping Address)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-semibold">
                      पूरा नाम (Full Name) *
                    </Label>
                    <Input
                      id="fullName"
                      required
                      placeholder="उदा: मोहम्मद रफ़ीक"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-secondary/40 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">
                      मोबाइल नंबर (Mobile Number) *
                    </Label>
                    <Input
                      id="phone"
                      required
                      type="tel"
                      placeholder="उदा: 98250 12345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-secondary/40 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="addressLine" className="text-xs font-semibold">
                    मकान नंबर, गली व मोहल्ला (Address Line) *
                  </Label>
                  <Input
                    id="addressLine"
                    required
                    placeholder="उदा: मकान न. 12, मदीना मस्जिद के पास"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    className="bg-secondary/40 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold">
                      शहर / कस्बा (City) *
                    </Label>
                    <Input
                      id="city"
                      required
                      placeholder="उदा: पालनपुर"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="bg-secondary/40 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="stateName" className="text-xs font-semibold">
                      राज्य (State) *
                    </Label>
                    <Input
                      id="stateName"
                      required
                      placeholder="उदा: गुजरात"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="bg-secondary/40 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pincode" className="text-xs font-semibold">
                      पिनकोड (Pincode) *
                    </Label>
                    <Input
                      id="pincode"
                      required
                      placeholder="उदा: 385001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="bg-secondary/40 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="orderNotes" className="text-xs font-semibold">
                    अतिरिक्त निर्देश (Optional Delivery Instructions)
                  </Label>
                  <Input
                    id="orderNotes"
                    placeholder="उदा: शाम को 5 बजे के बाद डिलीवरी दें..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="bg-secondary/40 text-xs"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <h2 className="font-serif text-lg font-bold text-foreground">
                    भुगतान का तरीका (Payment Method)
                  </h2>
                </div>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(val: any) => setPaymentMethod(val)}
                  className="space-y-3"
                >
                  {/* COD Option */}
                  <label
                    htmlFor="pm-cod"
                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === "COD"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-secondary/30"
                    }`}
                  >
                    <RadioGroupItem value="COD" id="pm-cod" className="mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">
                          कैश ऑन डिलीवरी (Cash On Delivery)
                        </span>
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                          सर्वाधिक लोकप्रिय
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        पार्सल हाथ में मिलने पर नकद या UPI द्वारा कूरियर बॉय को भुगतान करें।
                      </p>
                    </div>
                  </label>

                  {/* UPI / Online Option */}
                  <label
                    htmlFor="pm-upi"
                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === "ONLINE_UPI"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-secondary/30"
                    }`}
                  >
                    <RadioGroupItem value="ONLINE_UPI" id="pm-upi" className="mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">
                          ऑनलाइन UPI / QR स्कैन (Online Payment)
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                          फास्ट डिस्पैच
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        PhonePe, Google Pay, Paytm द्वारा भुगतान करें। ऑर्डर के बाद UPI निर्देश भेजे जाएंगे।
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>

            {/* Right: Order Review & Placement */}
            <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5 sticky top-24">
              <h2 className="font-serif text-xl font-bold text-foreground border-b border-border pb-3">
                आपके चुने हुए उत्पाद
              </h2>

              <div className="max-h-64 overflow-y-auto divide-y divide-border pr-1 space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-12 h-16 object-cover rounded-lg border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{item.product.name}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        {item.packSize} • मात्रा: {item.quantity}
                      </p>
                      <p className="text-xs font-semibold text-primary pt-0.5">
                        ₹{item.product.price * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Details */}
              <div className="border-t border-border pt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>सामान का कुल मूल्य (Subtotal):</span>
                  <span className="font-semibold text-foreground">₹{cartSubtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>डिलीवरी चार्ज:</span>
                  <span className="font-semibold text-foreground">
                    {shippingFee === 0 ? "मुफ्त (FREE)" : `₹${shippingFee}`}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>छूट:</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between text-base font-bold text-foreground">
                  <span>कुल देय राशि:</span>
                  <span className="text-primary text-xl">₹{cartGrandTotal}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold shadow-md text-sm py-6"
                >
                  <span>ऑर्डर कन्फर्म करें (Confirm Order - ₹{cartGrandTotal})</span>
                </Button>

                <p className="text-[10px] text-center text-muted-foreground">
                  🔒 आपकी सभी जानकारियां सुरक्षित हैं। पार्सल पर उत्पाद का नाम नहीं छपता।
                </p>
              </div>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
