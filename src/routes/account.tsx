import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, Address } from "@/context/StoreContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Package,
  Clock,
  CheckCircle,
  Truck,
  Plus,
  SlidersHorizontal,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function AccountPage() {
  const {
    currentUser,
    orders,
    wishlist,
    products,
    saveAddress,
    logout,
    login,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"orders" | "wishlist" | "addresses">("orders");
  const [showAddAddress, setShowAddAddress] = useState(false);

  // New Address Form State
  const [addrName, setAddrName] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrLine, setAddrLine] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("Gujarat");
  const [addrPincode, setAddrPincode] = useState("");

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrName || !addrPhone || !addrLine || !addrCity || !addrPincode) return;
    saveAddress({
      fullName: addrName,
      phone: addrPhone,
      addressLine: addrLine,
      city: addrCity,
      state: addrState,
      pincode: addrPincode,
    });
    setShowAddAddress(false);
    setAddrName("");
    setAddrPhone("");
    setAddrLine("");
    setAddrCity("");
    setAddrPincode("");
  };

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* User Banner */}
        <div className="bg-card border border-border rounded-3xl p-4 sm:p-8 mb-6 sm:mb-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-serif text-2xl font-bold shadow-md">
              {currentUser?.name?.charAt(0) || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-foreground">
                  {currentUser?.name || "ग्राहक प्रोफाइल"}
                </h1>
                {currentUser?.role === "admin" && (
                  <Badge className="bg-amber-500/20 text-amber-800 border-amber-400 font-semibold text-[10px]">
                    Admin
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentUser?.email || "guest@shifaahayat.com"} • {currentUser?.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-primary" />
                <span>Admin Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-8 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "orders"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>मेरे ऑर्डर्स ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("wishlist")}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "wishlist"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>विशलिस्ट ({wishlist.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "addresses"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>सहेजे गए पते ({currentUser?.addresses?.length || 0})</span>
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.length > 0 ? (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <span className="font-bold text-foreground text-sm">
                        ऑर्डर #{order.id}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        तारीख: {new Date(order.createdAt).toLocaleDateString("hi-IN", { dateStyle: "medium" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-xs font-semibold ${
                          order.orderStatus === "Delivered"
                            ? "bg-emerald-600 text-white"
                            : order.orderStatus === "Shipped"
                            ? "bg-purple-600 text-white"
                            : order.orderStatus === "Processing"
                            ? "bg-indigo-600 text-white"
                            : order.orderStatus === "Confirmed"
                            ? "bg-blue-600 text-white"
                            : order.orderStatus === "Cancelled"
                            ? "bg-rose-600 text-white"
                            : "bg-amber-600 text-white"
                        }`}
                      >
                        {order.orderStatus}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {order.paymentMethod === "WhatsApp Direct Order"
                          ? "WhatsApp ऑर्डर अनुरोध"
                          : order.paymentMethod === "COD"
                          ? "कैश ऑन डिलीवरी"
                          : "ऑनलाइन UPI"}
                      </span>
                    </div>
                  </div>

                  {/* Order items preview */}
                  <div className="divide-y divide-border/60">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-10 h-12 object-cover rounded-md border shrink-0"
                          />
                          <div>
                            <span className="font-bold text-foreground">{item.productName}</span>
                            <p className="text-[11px] text-muted-foreground">
                              {item.packSize} • मात्रा: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-foreground">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
                    <div className="text-muted-foreground">
                      डिलीवरी: {order.shippingAddress.addressLine}, {order.shippingAddress.city} (पिन: {order.shippingAddress.pincode})
                      {order.trackingNumber && (
                        <span className="block text-primary font-semibold">
                          ट्रैकिंग कोड: {order.trackingNumber}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-foreground text-sm">
                      कुल भुगतान: <span className="text-primary font-bold">₹{order.total}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-card border rounded-3xl p-8 max-w-md mx-auto">
                <p className="text-sm text-muted-foreground mb-4">आपने अभी तक कोई ऑर्डर नहीं दिया है।</p>
                <Link to="/shop">
                  <Button size="sm" className="rounded-full">
                    दुकान में उत्पाद देखें
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Wishlist */}
        {activeTab === "wishlist" && (
          <div>
            {wishlistProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                {wishlistProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-card border rounded-3xl p-8 max-w-md mx-auto">
                <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-4">आपकी विशलिस्ट खाली है।</p>
                <Link to="/shop">
                  <Button size="sm" className="rounded-full">
                    उत्पाद खोजें
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Saved Addresses */}
        {activeTab === "addresses" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-lg font-bold text-foreground">
                सहेजे गए पते
              </h3>
              <Button
                size="sm"
                onClick={() => setShowAddAddress(!showAddAddress)}
                className="rounded-xl text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>नया पता जोड़ें</span>
              </Button>
            </div>

            {showAddAddress && (
              <form
                onSubmit={handleSaveNewAddress}
                className="bg-card border-2 border-primary/40 rounded-2xl p-5 space-y-4 max-w-lg"
              >
                <h4 className="font-bold text-sm text-foreground">नया डिलीवरी पता जोड़ें</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    required
                    placeholder="पूरा नाम"
                    value={addrName}
                    onChange={(e) => setAddrName(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    required
                    placeholder="मोबाइल नंबर"
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Input
                  required
                  placeholder="मकान नंबर, मोहल्ला व सड़क"
                  value={addrLine}
                  onChange={(e) => setAddrLine(e.target.value)}
                  className="text-xs"
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    required
                    placeholder="शहर"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    required
                    placeholder="राज्य"
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    required
                    placeholder="पिनकोड"
                    value={addrPincode}
                    onChange={(e) => setAddrPincode(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddAddress(false)}
                    className="text-xs"
                  >
                    रद्द करें
                  </Button>
                  <Button type="submit" size="sm" className="text-xs">
                    सहेजें
                  </Button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentUser?.addresses?.map((addr) => (
                <div key={addr.id} className="bg-card border rounded-2xl p-4 text-xs space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{addr.fullName}</span>
                    {addr.isDefault && (
                      <Badge className="bg-primary/10 text-primary text-[10px]">डिफ़ॉल्ट</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{addr.phone}</p>
                  <p className="text-stone-700 dark:text-stone-300">
                    {addr.addressLine}, {addr.city}, {addr.state} - {addr.pincode}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
