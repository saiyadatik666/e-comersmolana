import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, Order, OrderStatus } from "@/context/StoreContext";
import { Product, CATEGORIES } from "@/data/products";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductPosterModal } from "@/components/product/ProductPosterModal";
import {
  SlidersHorizontal,
  Package,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  Truck,
  Phone,
  MessageCircle,
  Save,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "स्टोर व्यवस्थापक पोर्टल (Admin Portal) — Shifa A Hayat" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const {
    products,
    updateProduct,
    addProduct,
    deleteProduct,
    orders,
    updateOrderStatus,
    settings,
    updateSettings,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"overview" | "products" | "assets" | "orders" | "settings">("overview");
  const [selectedPoster, setSelectedPoster] = useState<Product | null>(null);

  // =========================================================================
  // SECURITY ARCHITECTURE NOTICE — CLIENT-SIDE PIN GATEWAY
  // =========================================================================
  // NOTE: In this static / client-side SPA deployment without a dedicated
  // backend server or database, the admin PIN check and sessionStorage lockout
  // are operational front-of-house barriers intended to deter casual tampering,
  // accidental edits, and local unauthorized staff browsing.
  //
  // CRITICAL SECURITY DISTINCTION:
  // Client-side storage (sessionStorage / localStorage) CANNOT provide true,
  // tamper-proof security against a determined adversary with browser DevTools.
  // Genuine, production-grade admin security requires:
  // 1. Server-side authentication (e.g. HttpOnly session cookies or signed JWTs).
  // 2. Server-side Role-Based Access Control (RBAC) middleware verifying every mutation.
  // 3. Centralized rate limiting on the server / API gateway to prevent brute-force attacks.
  // Secrets and private business data must never be committed to client-side bundles.
  // =========================================================================

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("shifa_admin_authenticated") === "true";
    }
    return false;
  });
  const [pinInput, setPinInput] = useState("");
  const [showPinError, setShowPinError] = useState(false);

  // Persistent failed attempts state (retained across refresh within browser session)
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("shifa_admin_failed_attempts");
      return saved ? parseInt(saved, 10) || 0 : 0;
    }
    return 0;
  });

  // Persistent lockout remaining calculation based on stored timestamp
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const lockoutUntil = sessionStorage.getItem("shifa_admin_lockout_until");
      if (lockoutUntil) {
        const diff = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
      }
    }
    return 0;
  });

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("shifa_admin_lockout_until");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) {
      toast.error(`अत्यधिक गलत प्रयास। कृपया ${lockoutRemaining} सेकंड प्रतीक्षा करें।`);
      return;
    }
    const currentPin = settings.adminPin || "9586";
    if (pinInput.trim() === currentPin) {
      setIsAuthenticated(true);
      setShowPinError(false);
      setFailedAttempts(0);
      setLockoutRemaining(0);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("shifa_admin_authenticated", "true");
        sessionStorage.removeItem("shifa_admin_failed_attempts");
        sessionStorage.removeItem("shifa_admin_lockout_until");
      }
      toast.success("सुरक्षा पिन सत्यापित! एडमिन पोर्टल अनलॉक हो गया।");
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setShowPinError(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("shifa_admin_failed_attempts", String(nextAttempts));
      }

      if (nextAttempts >= 5) {
        // Cooldown: 30 seconds base + 15 seconds for each extra failed attempt up to 300s
        const cooldownSeconds = Math.min(30 + (nextAttempts - 5) * 15, 300);
        const until = Date.now() + cooldownSeconds * 1000;
        if (typeof window !== "undefined") {
          sessionStorage.setItem("shifa_admin_lockout_until", String(until));
        }
        setLockoutRemaining(cooldownSeconds);
        toast.error(`अत्यधिक गलत प्रयास (${nextAttempts} बार)। सुरक्षा कारणों से ${cooldownSeconds} सेकंड का कूलडाउन लागू है।`);
      } else {
        toast.error(`गलत सुरक्षा पिन। (शेष प्रयास: ${5 - nextAttempts})`);
      }
    }
  };

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("shifa_admin_authenticated");
    }
    setPinInput("");
    toast.info("एडमिन पोर्टल लॉक हो गया है।");
  };

  // Search in products
  const [productSearch, setProductSearch] = useState("");

  // Product Edit Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  // Settings local state
  const [settingsForm, setSettingsForm] = useState(settings);

  // Stats
  const totalSales = orders.reduce((sum, ord) => sum + ord.total, 0);
  const totalOrders = orders.length;
  const publishedProducts = products.filter((p) => p.status === "published").length;
  const lowStockCount = products.filter((p) => p.stockCount <= 30).length;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.nameHindi.includes(productSearch) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (isNewProduct) {
      addProduct(editingProduct);
    } else {
      updateProduct(editingProduct);
    }
    setEditingProduct(null);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settingsForm);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 sm:py-24 flex items-center justify-center">
          <form
            onSubmit={handleVerifyPin}
            className="w-full bg-card border-2 border-border rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 flex items-center justify-center mx-auto border-2 border-amber-500">
              <Settings className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full uppercase tracking-wider">
                सुरक्षित एडमिन द्वार (Admin Gate)
              </span>
              <h1 className="font-serif text-2xl font-bold text-foreground mt-2">
                हकीम जी / स्टोर व्यवस्थापक लॉगिन
              </h1>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                यह क्षेत्र केवल अधिकृत व्यवस्थापक के लिए है। उत्पाद, 21 पोस्टर इन्वेंट्री या सेटिंग्स बदलने के लिए कृपया अपना स्टोर सुरक्षा पिन दर्ज करें।
              </p>
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="admin-pin" className="text-xs font-semibold">
                स्टोर सुरक्षा पिन (Security PIN) *
              </Label>
              <Input
                id="admin-pin"
                type="password"
                required
                autoFocus
                placeholder="पिन दर्ज करें..."
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (showPinError) setShowPinError(false);
                }}
                className={`text-center font-mono tracking-widest text-lg bg-secondary/50 ${
                  showPinError ? "border-rose-500" : ""
                }`}
              />
              {showPinError && (
                <p className="text-[11px] text-rose-600 font-medium text-center">
                  अमान्य पिन। कृपया सही स्टोर सुरक्षा पिन दर्ज करें।
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md"
            >
              डैशबोर्ड अनलॉक करें (Unlock Portal)
            </Button>

            <div className="pt-2">
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
                ← मुख्य वेबसाइट पर वापस जाएँ
              </Link>
            </div>
          </form>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                एडमिन डैशबोर्ड (Admin Portal)
              </span>
              <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                Authorized Active
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              उत्पाद प्रबंधन, 21 पोस्टर इन्वेंट्री, ऑर्डर्स और स्टोर सेटिंग्स।
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/shop">
              <Button variant="outline" size="sm" className="rounded-xl text-xs">
                दुकान देखें (View Storefront)
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogoutAdmin}
              className="rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
            >
              पोर्टल लॉक करें (Lock Admin)
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-8 gap-2 overflow-x-auto scrollbar-none pb-1 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>डैशबोर्ड सांख्यिकी (Overview)</span>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "products"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>उत्पाद प्रबंधन ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("assets")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "assets"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>21 पोस्टर इन्वेंट्री (molana.zip Assets)</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "orders"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>ग्राहक ऑर्डर्स ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>स्टोर सेटिंग्स</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-xs text-muted-foreground font-semibold">कुल बिक्री (Total Sales)</span>
                <p className="font-serif text-3xl font-bold text-primary">₹{totalSales}</p>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {orders.length} ऑर्डर्स से संकलित
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-xs text-muted-foreground font-semibold">कुल ऑर्डर्स (Orders)</span>
                <p className="font-serif text-3xl font-bold text-foreground">{totalOrders}</p>
                <span className="text-[11px] text-muted-foreground">
                  कैश ऑन डिलीवरी एवं ऑनलाइन
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-xs text-muted-foreground font-semibold">प्रमाणित उत्पाद (Catalog)</span>
                <p className="font-serif text-3xl font-bold text-foreground">{publishedProducts}</p>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  21 पोस्टर में से सभी सक्रिय
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-xs text-muted-foreground font-semibold">कम स्टॉक अलर्ट</span>
                <p className="font-serif text-3xl font-bold text-amber-600">{lowStockCount}</p>
                <span className="text-[11px] text-muted-foreground">
                  पुनः निर्माण आवश्यक उत्पाद
                </span>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-serif text-lg font-bold text-foreground">
                  हालिया ऑर्डर्स (Recent Orders)
                </h3>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  सभी देखें →
                </button>
              </div>

              <div className="divide-y divide-border">
                {orders.slice(0, 5).map((ord) => (
                  <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground">#{ord.id}</span> • {ord.customerName} ({ord.customerPhone})
                      <p className="text-[11px] text-muted-foreground">
                        {ord.items.length} उत्पाद • {ord.paymentMethod} • {ord.shippingAddress.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">₹{ord.total}</span>
                      <Badge className="text-[10px]">{ord.orderStatus}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCT MANAGEMENT */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Input
                  type="text"
                  placeholder="उत्पाद खोजें..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <Button
                onClick={() => {
                  setIsNewProduct(true);
                  setEditingProduct({
                    id: `shifa-custom-${Date.now()}`,
                    slug: `new-product-${Date.now()}`,
                    name: "नया हर्बल उत्पाद",
                    nameHindi: "नया हर्बल उत्पाद",
                    subtitle: "शुद्ध आयुर्वेदिक नुस्खा",
                    category: "mens-wellness",
                    categoryHindi: "पुरुष स्वास्थ्य",
                    price: 500,
                    compareAtPrice: 650,
                    rating: 4.8,
                    reviewCount: 1,
                    image: "/assets/molana/IMG-20261009-WA0003.jpg",
                    imageName: "IMG-20261009-WA0003.jpg",
                    packSize: "60 Capsules",
                    inStock: true,
                    stockCount: 50,
                    isVerifiedPrice: false,
                    status: "published",
                    dosage: "1-2 गोली दिन में दो बार",
                    description: "हकीम इनायत अहमदी द्वारा तैयार शुद्ध नुस्खा।",
                    benefits: ["ताकत और स्फूर्ति", "प्राकृतिक संतुलन"],
                    ingredients: ["शुद्ध जड़ी-बूटी"],
                  });
                }}
                className="rounded-xl text-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>नया उत्पाद जोड़ें (Add Product)</span>
              </Button>
            </div>

            {/* Products Table */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">फोटो</th>
                      <th className="py-3 px-4">उत्पाद का नाम</th>
                      <th className="py-3 px-4">श्रेणी</th>
                      <th className="py-3 px-4">मूल्य (Price)</th>
                      <th className="py-3 px-4">स्टॉक</th>
                      <th className="py-3 px-4">स्थिति</th>
                      <th className="py-3 px-4 text-right">कार्य (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4">
                          <img
                            src={p.image}
                            alt={p.name}
                            onError={(e) => {
                              if (p.posterImage && e.currentTarget.src !== p.posterImage) {
                                e.currentTarget.src = p.posterImage;
                              }
                            }}
                            className="w-10 h-12 object-contain p-0.5 bg-stone-50 dark:bg-stone-900 rounded-md border"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-foreground block">{p.name}</span>
                          <span className="text-[11px] text-muted-foreground">{p.nameHindi}</span>
                          {p.isVerifiedPrice && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-700 px-1.5 py-0.2 rounded font-semibold inline-block mt-0.5">
                              पोस्टर प्रमाणित मूल्य
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                          {p.categoryHindi}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-primary text-sm">₹{p.price}</span>
                          {p.compareAtPrice && (
                            <span className="text-[10px] text-muted-foreground line-through block">
                              ₹{p.compareAtPrice}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              p.stockCount <= 30 ? "text-amber-600" : "text-emerald-700"
                            }`}
                          >
                            {p.stockCount} उपलब्ध
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[10px] ${
                              p.status === "published"
                                ? "bg-emerald-700 text-white"
                                : "bg-stone-500 text-white"
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsNewProduct(false);
                              setEditingProduct(p);
                            }}
                            className="text-xs h-7 px-2"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProduct(p.id)}
                            className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 21 ASSETS INVENTORY */}
        {activeTab === "assets" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <h3 className="font-serif text-lg font-bold text-foreground mb-1">
                molana.zip प्रारंभिक प्रचार पोस्टर इन्वेंट्री (21 JPG Images)
              </h3>
              <p className="text-xs text-muted-foreground">
                प्रत्येक पोस्टर का निरीक्षण कर उत्पाद डेटाबेस से जोड़ा गया है। क्लिक करके मूल पोस्टर का पूर्ण रिज़ॉल्यूशन देखें।
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {products.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPoster(p)}
                  className="bg-card border border-border rounded-2xl overflow-hidden p-2.5 shadow-xs hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="aspect-4/5 rounded-xl overflow-hidden bg-stone-900/5 dark:bg-stone-950 mb-2 relative flex items-center justify-center border">
                    <img
                      src={p.posterImage || p.image}
                      alt={p.name}
                      className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1">
                      <Eye className="w-4 h-4" />
                      <span>बड़ा करें</span>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-center">
                    <span className="text-[10px] text-muted-foreground block truncate">
                      #{idx + 1} {p.imageName}
                    </span>
                    <h4 className="font-bold text-xs text-foreground truncate">{p.name}</h4>
                    <span className="text-xs font-semibold text-primary">₹{p.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS MANAGEMENT */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">ऑर्डर नंबर</th>
                      <th className="py-3 px-4">ग्राहक व संपर्क</th>
                      <th className="py-3 px-4">सामान (Items)</th>
                      <th className="py-3 px-4">डिलीवरी पता</th>
                      <th className="py-3 px-4">कुल राशि</th>
                      <th className="py-3 px-4">भुगतान</th>
                      <th className="py-3 px-4">स्थिति बदलें</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">
                          #{ord.id}
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-foreground block">{ord.customerName}</span>
                          <span className="text-stone-500">{ord.customerPhone}</span>
                        </td>
                        <td className="py-3 px-4">
                          {ord.items.map((it, i) => (
                            <span key={i} className="block text-stone-700 dark:text-stone-300">
                              • {it.productName} ({it.quantity}x)
                            </span>
                          ))}
                        </td>
                        <td className="py-3 px-4 text-stone-600 dark:text-stone-300 max-w-[200px] truncate">
                          {ord.shippingAddress.addressLine}, {ord.shippingAddress.city} ({ord.shippingAddress.pincode})
                        </td>
                        <td className="py-3 px-4 font-bold text-primary text-sm">
                          ₹{ord.total}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px]">
                            {ord.paymentMethod}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={ord.orderStatus}
                            onChange={(e) => updateOrderStatus(ord.id, e.target.value as OrderStatus)}
                            className="bg-secondary border border-border rounded-lg text-xs py-1 px-2 font-semibold"
                          >
                            <option value="Pending Confirmation">Pending Confirmation</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STORE SETTINGS */}
        {activeTab === "settings" && (
          <form onSubmit={handleSaveSettings} className="max-w-2xl bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <h3 className="font-serif text-xl font-bold text-foreground border-b border-border pb-3">
              दुकान व संपर्क सेटिंग्स
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">दुकान का नाम (Store Name)</Label>
                <Input
                  value={settingsForm.storeName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">हकीम जी का नाम (Founder)</Label>
                <Input
                  value={settingsForm.founderName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, founderName: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">मोबाइल फोन (Helpline)</Label>
                <Input
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">WhatsApp नंबर</Label>
                <Input
                  value={settingsForm.whatsapp}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">दुकान का पता (Address)</Label>
              <Input
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">शहर (City)</Label>
                <Input
                  value={settingsForm.city}
                  onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">राज्य (State)</Label>
                <Input
                  value={settingsForm.state}
                  onChange={(e) => setSettingsForm({ ...settingsForm, state: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">फ्री शिपिंग सीमा (₹)</Label>
                <Input
                  type="number"
                  value={settingsForm.freeShippingThreshold}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      freeShippingThreshold: Number(e.target.value),
                    })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">घोषणा पट्टी (Announcement Text)</Label>
              <Input
                value={settingsForm.announcementText}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, announcementText: e.target.value })
                }
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">एडमिन सुरक्षा पिन (Admin Security PIN)</Label>
              <Input
                type="text"
                value={settingsForm.adminPin || "9586"}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, adminPin: e.target.value })
                }
                className="text-xs font-mono font-bold"
              />
              <p className="text-[10px] text-muted-foreground">
                पोर्टल अनलॉक करने के लिए आवश्यक गुप्त पिन (Default: 9586)
              </p>
            </div>

            <Button type="submit" className="rounded-xl text-xs font-bold px-6">
              <Save className="w-4 h-4 mr-1.5" />
              <span>सेटिंग्स सुरक्षित करें (Save Settings)</span>
            </Button>
          </form>
        )}

        {/* Product Edit / Create Modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
            <div className="bg-card border border-border rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
              <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">
                {isNewProduct ? "नया उत्पाद जोड़ें" : `संपादित करें: ${editingProduct.name}`}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">अंग्रेजी नाम</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">हिंदी नाम</Label>
                  <Input
                    value={editingProduct.nameHindi}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, nameHindi: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">कीमत (₹)</Label>
                  <Input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">MRP (₹)</Label>
                  <Input
                    type="number"
                    value={editingProduct.compareAtPrice || 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        compareAtPrice: Number(e.target.value),
                      })
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">स्टॉक संख्या</Label>
                  <Input
                    type="number"
                    value={editingProduct.stockCount}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stockCount: Number(e.target.value),
                      })
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">पैकिंग विवरण</Label>
                <Input
                  value={editingProduct.packSize}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, packSize: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">सेवन विधि (Dosage)</Label>
                <Input
                  value={editingProduct.dosage}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, dosage: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">विवरण (Description)</Label>
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full text-xs p-2.5 rounded-xl border bg-secondary/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingProduct(null)}
                  className="text-xs"
                >
                  रद्द करें
                </Button>
                <Button onClick={handleSaveProduct} size="sm" className="text-xs font-semibold">
                  सहेजें (Save Changes)
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Poster Inspector Modal */}
      <ProductPosterModal
        product={selectedPoster}
        onClose={() => setSelectedPoster(null)}
      />
    </div>
  );
}
