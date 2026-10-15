import React, { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, Order, OrderStatus, formatWhatsAppUrl } from "@/context/StoreContext";
import { Product, CATEGORIES, INITIAL_PRODUCTS } from "@/data/products";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductPosterModal } from "@/components/product/ProductPosterModal";
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Image as ImageIcon,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  MessageCircle,
  Save,
  Search,
  Filter,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  X,
  Shield,
  Info,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "स्टोर व्यवस्थापक एवं इन्वेंट्री पोर्टल (Admin Portal) — Shifa A Hayat" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

interface ProductFormErrors {
  id?: string;
  name?: string;
  nameHindi?: string;
  price?: string;
  compareAtPrice?: string;
  stockCount?: string;
  category?: string;
  image?: string;
}

interface SettingsFormErrors {
  storeName?: string;
  phone?: string;
  whatsapp?: string;
  freeShippingThreshold?: string;
  adminPin?: string;
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

function AdminPage() {
  const {
    products,
    updateProduct,
    addProduct,
    deleteProduct,
    resetProductsToDefault,
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
  // NOTE: In this client-side SPA architecture without a dedicated backend server,
  // the admin PIN check and sessionStorage lockout are front-of-house operational
  // deterrents intended for authorized staff convenience on local devices.
  //
  // CRITICAL DISTINCTION:
  // Client-side storage CANNOT provide cryptographic, server-side tamper-proof security.
  // Enterprise-grade admin security requires:
  // 1. Server-side authentication (e.g. HttpOnly session cookies or signed JWTs).
  // 2. Server-side Role-Based Access Control (RBAC) middleware verifying every mutation.
  // 3. Centralized rate limiting on the server / API gateway to prevent brute-force attacks.
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

  // =========================================================================
  // PRODUCT MANAGEMENT & STOCK STATE
  // =========================================================================
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  // Product Edit Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productErrors, setProductErrors] = useState<ProductFormErrors>({});

  // Product Delete Confirmation
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Restore Catalog Confirmation
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // =========================================================================
  // ORDER MANAGEMENT STATE
  // =========================================================================
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    orderId: string;
    newStatus: OrderStatus;
  } | null>(null);

  // =========================================================================
  // SETTINGS STATE
  // =========================================================================
  const [settingsForm, setSettingsForm] = useState(settings);
  const [settingsErrors, setSettingsErrors] = useState<SettingsFormErrors>({});

  // Sync settingsForm if store settings change
  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // =========================================================================
  // STATS CALCULATIONS (Empirical from current Store state)
  // =========================================================================
  const totalSales = useMemo(() => orders.reduce((sum, ord) => sum + ord.total, 0), [orders]);
  const totalOrders = orders.length;
  const publishedProducts = useMemo(() => products.filter((p) => p.status === "published").length, [products]);
  const outOfStockCount = useMemo(() => products.filter((p) => !p.inStock || p.stockCount <= 0).length, [products]);
  const lowStockCount = useMemo(() => products.filter((p) => p.inStock && p.stockCount > 0 && p.stockCount <= 10).length, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.nameHindi.includes(productSearch) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(productSearch.toLowerCase());

      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;

      let matchesStock = true;
      if (stockFilter === "in_stock") {
        matchesStock = p.inStock && p.stockCount > 10;
      } else if (stockFilter === "low_stock") {
        matchesStock = p.inStock && p.stockCount > 0 && p.stockCount <= 10;
      } else if (stockFilter === "out_of_stock") {
        matchesStock = !p.inStock || p.stockCount <= 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, productSearch, categoryFilter, stockFilter]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === "all") return orders;
    return orders.filter((ord) => ord.orderStatus === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  // =========================================================================
  // PRODUCT VALIDATION & ACTIONS
  // =========================================================================
  const validateProductForm = (prod: Product, isNew: boolean): boolean => {
    const errors: ProductFormErrors = {};

    if (!prod.name || prod.name.trim().length < 2) {
      errors.name = "अंग्रेजी नाम अनिवार्य है (न्यूनतम 2 अक्षर)।";
    }

    if (!prod.nameHindi || prod.nameHindi.trim().length < 2) {
      errors.nameHindi = "हिंदी नाम अनिवार्य है (न्यूनतम 2 अक्षर)।";
    }

    if (!prod.id || prod.id.trim().length < 2) {
      errors.id = "उत्पाद आईडी (Product ID) अनिवार्य है।";
    } else if (isNew && products.some((p) => p.id === prod.id.trim())) {
      errors.id = "यह उत्पाद आईडी पहले से मौजूद है। कृपया अद्वितीय आईडी चुनें।";
    }

    if (typeof prod.price !== "number" || isNaN(prod.price) || prod.price <= 0) {
      errors.price = "मूल्य सकारात्मक संख्या (₹1 या अधिक) होना चाहिए।";
    }

    if (
      prod.compareAtPrice !== undefined &&
      prod.compareAtPrice > 0 &&
      prod.compareAtPrice < prod.price
    ) {
      errors.compareAtPrice = "MRP (Compare At Price) विक्रय मूल्य (₹) से कम नहीं हो सकता।";
    }

    if (typeof prod.stockCount !== "number" || isNaN(prod.stockCount) || prod.stockCount < 0) {
      errors.stockCount = "स्टॉक संख्या 0 या अधिक होनी चाहिए (ऋणात्मक नहीं)।";
    }

    if (!prod.category) {
      errors.category = "श्रेणी चुनना अनिवार्य है।";
    }

    if (!prod.image || prod.image.trim().length < 3) {
      errors.image = "उत्पाद छवि पथ अनिवार्य है।";
    }

    setProductErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!validateProductForm(editingProduct, isNewProduct)) {
      toast.error("कृपया फॉर्म में दी गई त्रुटियों को सुधारें।");
      return;
    }

    const safeStock = Math.max(0, Math.floor(editingProduct.stockCount) || 0);
    const sanitized: Product = {
      ...editingProduct,
      price: Math.max(1, Math.floor(editingProduct.price) || 1),
      compareAtPrice:
        editingProduct.compareAtPrice !== undefined && editingProduct.compareAtPrice > 0
          ? Math.max(editingProduct.price, Math.floor(editingProduct.compareAtPrice))
          : undefined,
      stockCount: safeStock,
      inStock: safeStock > 0 && editingProduct.inStock !== false,
    };

    if (isNewProduct) {
      addProduct(sanitized);
    } else {
      updateProduct(sanitized);
    }
    setEditingProduct(null);
    setProductErrors({});
  };

  const handleQuickStockAdjust = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const currentStock = prod.stockCount || 0;
    const newStock = Math.max(0, currentStock + delta);
    updateProduct({
      ...prod,
      stockCount: newStock,
      inStock: newStock > 0,
    });
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  const handleConfirmRestoreCatalog = () => {
    resetProductsToDefault();
    setShowRestoreModal(false);
  };

  // =========================================================================
  // ORDER STATUS UPDATE WITH CONFIRMATION
  // =========================================================================
  const handleInitiateStatusChange = (orderId: string, targetStatus: OrderStatus) => {
    if (targetStatus === "Cancelled" || targetStatus === "Delivered") {
      setPendingStatusChange({ orderId, newStatus: targetStatus });
    } else {
      updateOrderStatus(orderId, targetStatus);
    }
  };

  const handleConfirmStatusChange = () => {
    if (!pendingStatusChange) return;
    updateOrderStatus(pendingStatusChange.orderId, pendingStatusChange.newStatus);
    setPendingStatusChange(null);
  };

  // =========================================================================
  // SETTINGS VALIDATION & SAVE
  // =========================================================================
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: SettingsFormErrors = {};

    if (!settingsForm.storeName || settingsForm.storeName.trim().length < 2) {
      errors.storeName = "दुकान का नाम आवश्यक है।";
    }

    const cleanPhone = settingsForm.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      errors.phone = "कृपया वैध 10-अंकीय फोन नंबर दर्ज करें।";
    }

    const cleanWA = settingsForm.whatsapp.replace(/[^0-9]/g, "");
    if (cleanWA.length < 10) {
      errors.whatsapp = "कृपया वैध WhatsApp नंबर दर्ज करें (उदा. 9586037331)।";
    }

    if (
      typeof settingsForm.freeShippingThreshold !== "number" ||
      settingsForm.freeShippingThreshold < 0
    ) {
      errors.freeShippingThreshold = "फ्री शिपिंग सीमा 0 या अधिक होनी चाहिए।";
    }

    if (!settingsForm.adminPin || settingsForm.adminPin.trim().length < 4) {
      errors.adminPin = "सुरक्षा पिन न्यूनतम 4 अंकों का होना चाहिए।";
    }

    setSettingsErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("कृपया सेटिंग्स फॉर्म में त्रुटियों को ठीक करें।");
      return;
    }

    updateSettings(settingsForm);
  };

  // =========================================================================
  // AUTHENTICATION GATE VIEW
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 sm:py-24 flex items-center justify-center">
          <form
            onSubmit={handleVerifyPin}
            className="w-full bg-card border-2 border-border rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 flex items-center justify-center mx-auto border-2 border-amber-500 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full uppercase tracking-wider">
                सुरक्षित एडमिन द्वार (Admin Gate)
              </span>
              <h1 className="font-serif text-2xl font-bold text-foreground mt-2">
                हकीम जी / स्टोर व्यवस्थापक लॉगिन
              </h1>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                यह क्षेत्र केवल अधिकृत व्यवस्थापक के लिए है। उत्पाद, इन्वेंट्री, ऑर्डर्स या स्टोर सेटिंग्स बदलने के लिए कृपया अपना स्टोर सुरक्षा पिन दर्ज करें।
              </p>
            </div>

            {/* Security Architecture Notice */}
            <div className="bg-secondary/50 border border-border/80 rounded-2xl p-3 text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>क्लाइंट-साइड सुरक्षा गेट</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                यह पिन स्थानीय ब्राउज़र सत्र (sessionStorage) में सत्यापित होता है। सर्वर-ग्रेड आरबीएसी (RBAC) के लिए समर्पित बैकएंड प्रमाणीकरण आवश्यक है।
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
                disabled={lockoutRemaining > 0}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (showPinError) setShowPinError(false);
                }}
                className={`text-center font-mono tracking-widest text-lg bg-secondary/50 ${
                  showPinError ? "border-rose-500 ring-rose-500/20" : ""
                }`}
              />
              {showPinError && (
                <p className="text-[11px] text-rose-600 font-medium text-center">
                  अमान्य पिन। कृपया सही स्टोर सुरक्षा पिन दर्ज करें।
                </p>
              )}
              {lockoutRemaining > 0 && (
                <p className="text-[11px] text-rose-600 font-bold text-center">
                  सुरक्षा कूलडाउन सक्रिय: {lockoutRemaining} सेकंड शेष
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={lockoutRemaining > 0}
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

  // =========================================================================
  // MAIN AUTHENTICATED DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                एडमिन एवं इन्वेंट्री पोर्टल
              </span>
              <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                Authorized Session
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                localStorage Mode
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              उत्पाद संपादन, लाइव स्टॉक नियंत्रण, विरासत पोस्टर एवं ऑर्डर प्रबंधन।
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestoreModal(true)}
              className="rounded-xl text-xs text-amber-700 border-amber-300 dark:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-950/50"
              title="सभी 21 मूल आयुर्वेदिक उत्पाद व प्रमाणित मूल्यों को पुनः लोड करें"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>कैटलॉग पुनर्स्थापित करें</span>
            </Button>

            <Link to="/shop">
              <Button variant="outline" size="sm" className="rounded-xl text-xs">
                दुकान देखें
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogoutAdmin}
              className="rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              <span>पोर्टल लॉक करें</span>
            </Button>
          </div>
        </div>

        {/* STORAGE & SECURITY ARCHITECTURE NOTICE BANNER */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
            <Info className="w-4 h-4 shrink-0 text-amber-600" />
            <span>तकनीकी वास्तुकला सूचना (Architecture Notice)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              • <strong>इन्वेंट्री व डेटा स्टोरेज</strong>: उत्पाद, स्टॉक संख्या और सेटिंग्स इस डिवाइस के <code>localStorage</code> में सुरक्षित हैं। यह स्वचालित रूप से अन्य डिवाइसों से सिंक नहीं होता।
            </p>
            <p>
              • <strong>ऑर्डर व सुरक्षा स्थिति</strong>: ऑर्डर रिकॉर्ड्स चेकआउट फॉर्म सबमिट करने पर स्थानीय रूप से दर्ज होते हैं। व्हाट्सएप चैट प्रत्यक्ष ग्राहक वार्तालाप हैं, स्वचालित गेटवे नहीं।
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-6 gap-2 overflow-x-auto scrollbar-none pb-1 text-xs sm:text-sm font-semibold">
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
            <span>उत्पाद व स्टॉक प्रबंधन ({products.length})</span>
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
            <span>21 विरासत पोस्टर (molana.zip Assets)</span>
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

        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold">कुल बिक्री (Total Sales)</span>
                <p className="font-serif text-3xl font-bold text-primary">₹{totalSales}</p>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
                  {orders.length} दर्ज ऑर्डर्स से संकलित
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold">कुल ऑर्डर्स (Orders)</span>
                <p className="font-serif text-3xl font-bold text-foreground">{totalOrders}</p>
                <span className="text-[11px] text-muted-foreground block">
                  ब्राउज़र चेकआउट द्वारा दर्ज
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold">सक्रिय उत्पाद (Catalog)</span>
                <p className="font-serif text-3xl font-bold text-foreground">{publishedProducts}</p>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
                  21 पोस्टर में से {publishedProducts} सक्रिय
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold">स्टॉक चेतावनी (Stock Alerts)</span>
                <div className="flex items-baseline gap-2">
                  <p className="font-serif text-3xl font-bold text-amber-600">{lowStockCount}</p>
                  <span className="text-xs text-muted-foreground">कम</span>
                  {outOfStockCount > 0 && (
                    <span className="text-xs font-bold text-rose-600">({outOfStockCount} आउट ऑफ स्टॉक)</span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  पुनः निर्माण आवश्यक नुस्खे
                </span>
              </div>
            </div>

            {/* Critical Stock Alerts Box */}
            {(outOfStockCount > 0 || lowStockCount > 0) && (
              <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="font-serif text-base font-bold text-foreground">
                      तत्काल ध्यान दें: कम या अनुपलब्ध स्टॉक ({outOfStockCount + lowStockCount} उत्पाद)
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("products");
                      setStockFilter("low_stock");
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    इन्वेंट्री में प्रबंधित करें →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {products
                    .filter((p) => !p.inStock || p.stockCount <= 10)
                    .slice(0, 6)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/80"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-9 h-11 object-contain rounded-md bg-stone-100 dark:bg-stone-900 border shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                            <span
                              className={`text-[10px] font-semibold block ${
                                p.stockCount <= 0 ? "text-rose-600" : "text-amber-600"
                              }`}
                            >
                              {p.stockCount <= 0 ? "आउट ऑफ स्टॉक (0)" : `केवल ${p.stockCount} शेष`}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickStockAdjust(p.id, 10)}
                          className="text-[11px] h-7 px-2.5 rounded-lg shrink-0"
                          title="+10 नग स्टॉक जोड़ें"
                        >
                          +10 जोड़ें
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recent Orders Overview */}
            <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-serif text-lg font-bold text-foreground">
                  हालिया ऑर्डर्स (Recent Orders)
                </h3>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  सभी ({orders.length}) देखें →
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  अभी तक कोई ऑर्डर दर्ज नहीं हुआ है। जब ग्राहक वेबसाइट पर चेकआउट करेंगे, वे यहाँ दिखाई देंगे।
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {orders.slice(0, 5).map((ord) => (
                    <div
                      key={ord.id}
                      className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">#{ord.id}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-medium text-foreground">{ord.customerName}</span>
                          <span className="text-stone-500 font-mono">({ord.customerPhone})</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {ord.items.length} उत्पाद • {ord.paymentMethod} • {ord.shippingAddress.city},{" "}
                          {ord.shippingAddress.state}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="font-bold text-primary text-sm">₹{ord.total}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {ord.orderStatus}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setInspectingOrder(ord)}
                          className="text-xs h-7 px-2"
                        >
                          विवरण
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: PRODUCT & STOCK MANAGEMENT */}
        {/* ================================================================= */}
        {activeTab === "products" && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-2xl">
                {/* Search */}
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="नाम, श्रेणी या आईडी से खोजें..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 text-xs rounded-xl"
                  />
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-secondary/50 border border-border rounded-xl text-xs py-2 px-3 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">सभी श्रेणियां ({products.length})</option>
                  {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.hindi}
                    </option>
                  ))}
                </select>

                {/* Stock Status Filter */}
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                  className="bg-secondary/50 border border-border rounded-xl text-xs py-2 px-3 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">सभी स्टॉक स्थितियां</option>
                  <option value="in_stock">उपलब्ध स्टॉक (&gt;10)</option>
                  <option value="low_stock">कम स्टॉक (1-10)</option>
                  <option value="out_of_stock">आउट ऑफ स्टॉक (0)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setIsNewProduct(true);
                    setProductErrors({});
                    setEditingProduct({
                      id: `shifa-custom-${Date.now()}`,
                      slug: `new-product-${Date.now()}`,
                      name: "नया हर्बल उत्पाद",
                      nameHindi: "नया हर्बल उत्पाद",
                      subtitle: "शुद्ध आयुर्वेदिक नुस्खा",
                      category: "mens-wellness",
                      categoryHindi: "पुरुष स्वास्थ्य एवं मर्दाना ताकत",
                      price: 500,
                      compareAtPrice: 650,
                      rating: 4.8,
                      reviewCount: 1,
                      image: "/assets/products/zafrani-gold.jpg",
                      posterImage: "/assets/molana/IMG-20261009-WA0003.jpg",
                      imageName: "IMG-20261009-WA0003.jpg",
                      packSize: "60 Capsules",
                      inStock: true,
                      stockCount: 50,
                      isVerifiedPrice: false,
                      status: "published",
                      dosage: "1-2 गोली दिन में दो बार गुनगुने पानी या दूध से",
                      description: "हकीम इनायत अहमदी द्वारा तैयार शुद्ध नुस्खा।",
                      benefits: ["प्राकृतिक शक्ति व संतुलन", "रोग प्रतिरोधक क्षमता में वृद्धि"],
                      ingredients: ["शुद्ध जड़ी-बूटी"],
                    });
                  }}
                  className="rounded-xl text-xs font-semibold"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>नया उत्पाद जोड़ें</span>
                </Button>
              </div>
            </div>

            {/* Results count indicator */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                {filteredProducts.length} उत्पाद प्रदर्शित (कुल: {products.length})
              </span>
              {(productSearch || categoryFilter !== "all" || stockFilter !== "all") && (
                <button
                  onClick={() => {
                    setProductSearch("");
                    setCategoryFilter("all");
                    setStockFilter("all");
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  फ़िल्टर रीसेट करें
                </button>
              )}
            </div>

            {/* Products Table */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">फोटो</th>
                      <th className="py-3 px-4">उत्पाद का नाम व विवरण</th>
                      <th className="py-3 px-4">श्रेणी</th>
                      <th className="py-3 px-4">मूल्य / MRP</th>
                      <th className="py-3 px-4">लाइव स्टॉक नियंत्रण</th>
                      <th className="py-3 px-4">स्थिति</th>
                      <th className="py-3 px-4 text-right">कार्य (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((p) => {
                      const isCore = INITIAL_PRODUCTS.some((cp) => cp.id === p.id);
                      return (
                        <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="relative w-11 h-14 bg-stone-50 dark:bg-stone-900 rounded-lg border p-1 flex items-center justify-center">
                              <img
                                src={p.image}
                                alt={p.name}
                                onError={(e) => {
                                  if (p.posterImage && e.currentTarget.src !== p.posterImage) {
                                    e.currentTarget.src = p.posterImage;
                                  }
                                }}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[240px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-foreground">{p.name}</span>
                              {isCore && (
                                <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded">
                                  मूल 21 नुस्खा
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {p.nameHindi}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                ID: {p.id}
                              </span>
                              {p.isVerifiedPrice && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-400 px-1.5 py-0.2 rounded font-semibold">
                                  पोस्टर प्रमाणित
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                            {p.categoryHindi}
                            <span className="text-[10px] text-muted-foreground block">
                              {p.packSize}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-primary text-sm">₹{p.price}</span>
                            {p.compareAtPrice && (
                              <span className="text-[10px] text-muted-foreground line-through block">
                                MRP ₹{p.compareAtPrice}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                  !p.inStock || p.stockCount <= 0
                                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-400"
                                    : p.stockCount <= 10
                                    ? "bg-amber-500/20 text-amber-800 dark:text-amber-400"
                                    : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-400"
                                }`}
                              >
                                {!p.inStock || p.stockCount <= 0
                                  ? "आउट ऑफ स्टॉक (0)"
                                  : `${p.stockCount} नग`}
                              </span>

                              {/* Quick stock adjustments */}
                              <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
                                <button
                                  type="button"
                                  onClick={() => handleQuickStockAdjust(p.id, -1)}
                                  className="w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-secondary transition-colors"
                                  title="1 नग कम करें"
                                  aria-label={`Decrease stock for ${p.name}`}
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickStockAdjust(p.id, 5)}
                                  className="px-1.5 h-6 flex items-center justify-center text-[10px] font-semibold hover:bg-secondary transition-colors border-l border-border"
                                  title="5 नग स्टॉक जोड़ें"
                                  aria-label={`Add 5 stock for ${p.name}`}
                                >
                                  +5
                                </button>
                              </div>
                            </div>
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
                          <td className="py-3 px-4 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsNewProduct(false);
                                setProductErrors({});
                                setEditingProduct({ ...p });
                              }}
                              className="text-xs h-8 px-2.5"
                              title="उत्पाद संपादित करें"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              <span>संपादित</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setProductToDelete(p)}
                              className="text-xs h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              title="उत्पाद हटाएं"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: 21 ASSETS INVENTORY */}
        {/* ================================================================= */}
        {activeTab === "assets" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-lg font-bold text-foreground">
                  मूल प्रचार पोस्टर विरासत इन्वेंट्री (21 Authentic Posters)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                हकीम इनायत अहमदी साहब के मूल 21 हर्बल नुस्खों के विज्ञापनों और पैकेजिंग का डिजिटाइज़्ड संग्रह। किसी भी कार्ड पर क्लिक करके पूर्ण रिज़ॉल्यूशन पोस्टर और उत्पाद संबंध देखें।
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
                    <span className="text-[10px] text-muted-foreground block truncate font-mono">
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

        {/* ================================================================= */}
        {/* TAB 4: ORDERS MANAGEMENT */}
        {/* ================================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Orders Header Banner */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-4">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  ग्राहक ऑर्डर्स अभिलेख ({orders.length} कुल ऑर्डर्स)
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  ब्राउज़र चेकआउट द्वारा दर्ज किए गए ऑर्डर्स। स्थिति बदलने से पहले पुष्टि ली जाती है।
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-secondary/60 border border-border rounded-xl text-xs py-1.5 px-3 font-semibold text-foreground focus:outline-none"
                >
                  <option value="all">सभी स्थितियां ({orders.length})</option>
                  <option value="Pending Confirmation">Pending Confirmation</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">ऑर्डर नंबर</th>
                      <th className="py-3 px-4">ग्राहक व संपर्क</th>
                      <th className="py-3 px-4">सामान (Items)</th>
                      <th className="py-3 px-4">डिलीवरी पता</th>
                      <th className="py-3 px-4">कुल राशि</th>
                      <th className="py-3 px-4">भुगतान विधि</th>
                      <th className="py-3 px-4">स्थिति</th>
                      <th className="py-3 px-4 text-right">कार्य</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          इस स्थिति में कोई ऑर्डर नहीं मिला।
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-foreground">
                            #{ord.id}
                            <span className="block text-[10px] text-muted-foreground font-normal">
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-foreground block">{ord.customerName}</span>
                            <a
                              href={`tel:${ord.customerPhone}`}
                              className="text-primary hover:underline font-mono"
                            >
                              {ord.customerPhone}
                            </a>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-foreground">
                              {ord.items.reduce((s, it) => s + it.quantity, 0)} नग
                            </span>
                            <span className="text-[11px] text-muted-foreground block truncate max-w-[160px]">
                              {ord.items.map((it) => it.productName).join(", ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-600 dark:text-stone-300 max-w-[180px] truncate">
                            {ord.shippingAddress.addressLine}, {ord.shippingAddress.city}
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
                              onChange={(e) =>
                                handleInitiateStatusChange(ord.id, e.target.value as OrderStatus)
                              }
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
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInspectingOrder(ord)}
                              className="text-xs h-7 px-2.5 rounded-lg"
                            >
                              पूर्ण विवरण
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: STORE SETTINGS */}
        {/* ================================================================= */}
        {activeTab === "settings" && (
          <form
            onSubmit={handleSaveSettings}
            className="max-w-3xl bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-foreground">
                  दुकान व संपर्क सेटिंग्स
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  हेल्पलाइन, WhatsApp नंबर, शिपिंग सीमा और एडमिन पिन सेटिंग्स।
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                स्थानीय रूप से सुरक्षित
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">दुकान का नाम (Store Name) *</Label>
                <Input
                  value={settingsForm.storeName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, storeName: e.target.value })
                  }
                  className={`text-xs ${settingsErrors.storeName ? "border-rose-500" : ""}`}
                />
                {settingsErrors.storeName && (
                  <p className="text-[10px] text-rose-600 font-medium">{settingsErrors.storeName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">हकीम जी का नाम (Founder)</Label>
                <Input
                  value={settingsForm.founderName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, founderName: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">मोबाइल फोन (Helpline) *</Label>
                <Input
                  value={settingsForm.phone}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, phone: e.target.value })
                  }
                  className={`text-xs ${settingsErrors.phone ? "border-rose-500" : ""}`}
                />
                {settingsErrors.phone && (
                  <p className="text-[10px] text-rose-600 font-medium">{settingsErrors.phone}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  WhatsApp नंबर (Official Helpline) *
                </Label>
                <Input
                  value={settingsForm.whatsapp}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, whatsapp: e.target.value })
                  }
                  className={`text-xs font-mono font-bold ${
                    settingsErrors.whatsapp ? "border-rose-500" : ""
                  }`}
                />
                <p className="text-[10px] text-muted-foreground">
                  प्रमाणित नंबर: 95860 37331 (बिना देश कोड के 10 अंक)
                </p>
                {settingsErrors.whatsapp && (
                  <p className="text-[10px] text-rose-600 font-medium">{settingsErrors.whatsapp}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">दुकान का पूरा पता (Address)</Label>
              <Input
                value={settingsForm.address}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, address: e.target.value })
                }
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">शहर (City)</Label>
                <Input
                  value={settingsForm.city}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, city: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">राज्य (State)</Label>
                <Input
                  value={settingsForm.state}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, state: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">फ्री शिपिंग सीमा (₹) *</Label>
                <Input
                  type="number"
                  value={settingsForm.freeShippingThreshold}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      freeShippingThreshold: Number(e.target.value),
                    })
                  }
                  className={`text-xs ${
                    settingsErrors.freeShippingThreshold ? "border-rose-500" : ""
                  }`}
                />
                {settingsErrors.freeShippingThreshold && (
                  <p className="text-[10px] text-rose-600 font-medium">
                    {settingsErrors.freeShippingThreshold}
                  </p>
                )}
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
              <Label className="text-xs font-semibold">
                एडमिन सुरक्षा पिन (Admin Security PIN) *
              </Label>
              <Input
                type="text"
                value={settingsForm.adminPin || "9586"}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, adminPin: e.target.value })
                }
                className={`text-xs font-mono font-bold max-w-xs ${
                  settingsErrors.adminPin ? "border-rose-500" : ""
                }`}
              />
              <p className="text-[10px] text-muted-foreground">
                एडमिन पोर्टल अनलॉक करने के लिए आवश्यक गुप्त 4-अंकीय पिन (डिफ़ॉल्ट: 9586)
              </p>
              {settingsErrors.adminPin && (
                <p className="text-[10px] text-rose-600 font-medium">{settingsErrors.adminPin}</p>
              )}
            </div>

            <Button type="submit" className="rounded-xl text-xs font-bold px-6">
              <Save className="w-4 h-4 mr-1.5" />
              <span>सेटिंग्स सुरक्षित करें (Save Settings)</span>
            </Button>
          </form>
        )}

        {/* ================================================================= */}
        {/* PRODUCT EDIT / CREATE MODAL */}
        {/* ================================================================= */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
            <div className="bg-card border border-border rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">
                  {isNewProduct ? "नया उत्पाद जोड़ें" : `संपादित करें: ${editingProduct.name}`}
                </h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ID & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    उत्पाद ID {isNewProduct ? "(अद्वितीय)" : "(स्थायी)"} *
                  </Label>
                  <Input
                    value={editingProduct.id}
                    disabled={!isNewProduct}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, id: e.target.value.trim() })
                    }
                    className={`text-xs font-mono ${
                      productErrors.id ? "border-rose-500" : ""
                    } ${!isNewProduct ? "bg-secondary/60 text-muted-foreground" : ""}`}
                  />
                  {productErrors.id && (
                    <p className="text-[10px] text-rose-600 font-medium">{productErrors.id}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">श्रेणी (Category) *</Label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => {
                      const sel = CATEGORIES.find((c) => c.id === e.target.value);
                      setEditingProduct({
                        ...editingProduct,
                        category: e.target.value,
                        categoryHindi: sel ? sel.hindi : editingProduct.categoryHindi,
                      });
                    }}
                    className="w-full text-xs p-2 rounded-xl border bg-secondary/30 text-foreground"
                  >
                    {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.hindi} ({cat.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">अंग्रेजी नाम *</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className={`text-xs ${productErrors.name ? "border-rose-500" : ""}`}
                  />
                  {productErrors.name && (
                    <p className="text-[10px] text-rose-600 font-medium">{productErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">हिंदी नाम *</Label>
                  <Input
                    value={editingProduct.nameHindi}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, nameHindi: e.target.value })
                    }
                    className={`text-xs ${productErrors.nameHindi ? "border-rose-500" : ""}`}
                  />
                  {productErrors.nameHindi && (
                    <p className="text-[10px] text-rose-600 font-medium">{productErrors.nameHindi}</p>
                  )}
                </div>
              </div>

              {/* Price, MRP & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">विक्रय मूल्य (₹) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                    }
                    className={`text-xs ${productErrors.price ? "border-rose-500" : ""}`}
                  />
                  {productErrors.price && (
                    <p className="text-[10px] text-rose-600 font-medium">{productErrors.price}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">MRP (Compare Price) (₹)</Label>
                  <Input
                    type="number"
                    min={editingProduct.price}
                    value={editingProduct.compareAtPrice || 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        compareAtPrice: Number(e.target.value),
                      })
                    }
                    className={`text-xs ${productErrors.compareAtPrice ? "border-rose-500" : ""}`}
                  />
                  {productErrors.compareAtPrice && (
                    <p className="text-[10px] text-rose-600 font-medium">
                      {productErrors.compareAtPrice}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">स्टॉक संख्या (Units) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingProduct.stockCount}
                    onChange={(e) => {
                      const count = Math.max(0, Number(e.target.value));
                      setEditingProduct({
                        ...editingProduct,
                        stockCount: count,
                        inStock: count > 0,
                      });
                    }}
                    className={`text-xs ${productErrors.stockCount ? "border-rose-500" : ""}`}
                  />
                  {productErrors.stockCount && (
                    <p className="text-[10px] text-rose-600 font-medium">
                      {productErrors.stockCount}
                    </p>
                  )}
                </div>
              </div>

              {/* Image & PackSize */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">उत्पाद छवि (Image Path) *</Label>
                  <Input
                    value={editingProduct.image}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, image: e.target.value })
                    }
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">पैकिंग विवरण (Pack Size)</Label>
                  <Input
                    value={editingProduct.packSize}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, packSize: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">उपशीर्षक (Subtitle)</Label>
                <Input
                  value={editingProduct.subtitle}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, subtitle: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              {/* Dosage */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">सेवन विधि (Dosage)</Label>
                <Input
                  value={editingProduct.dosage}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, dosage: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">विवरण (Description)</Label>
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full text-xs p-2.5 rounded-xl border bg-secondary/30 text-foreground"
                />
              </div>

              {/* Status Radio */}
              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs font-semibold">प्रकाशन स्थिति:</span>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name="product-status"
                    checked={editingProduct.status === "published"}
                    onChange={() => setEditingProduct({ ...editingProduct, status: "published" })}
                  />
                  <span>Published (सक्रिय)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name="product-status"
                    checked={editingProduct.status === "draft"}
                    onChange={() => setEditingProduct({ ...editingProduct, status: "draft" })}
                  />
                  <span>Draft (अप्रकाशित)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
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

        {/* ================================================================= */}
        {/* PRODUCT DELETE CONFIRMATION MODAL */}
        {/* ================================================================= */}
        {productToDelete && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border-2 border-destructive/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="font-serif text-lg font-bold text-foreground">
                  उत्पाद हटाने की पुष्टि करें
                </h4>
                <p className="text-xs text-muted-foreground">
                  क्या आप वाकई <strong className="text-foreground">"{productToDelete.name}"</strong> ({productToDelete.nameHindi}) को कैटलॉग से हटाना चाहते हैं?
                </p>
              </div>

              {/* Core 21 Warning */}
              {INITIAL_PRODUCTS.some((p) => p.id === productToDelete.id) && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>महत्वपूर्ण मूल नुस्खा चेतावनी</span>
                  </div>
                  <p className="text-[11px] leading-normal">
                    यह Shifa A Hayat के मूल 21 प्रमाणित आयुर्वेदिक नुस्खों में से एक है। इसे हटाने पर ग्राहकों को मुख्य स्टोर में यह उत्पाद नहीं दिखेगा। (आप बाद में 'कैटलॉग पुनर्स्थापित करें' से इसे पुनः ला सकते हैं)।
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProductToDelete(null)}
                  className="rounded-xl text-xs"
                >
                  रद्द करें
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmDeleteProduct}
                  className="rounded-xl text-xs font-bold"
                >
                  हाँ, उत्पाद हटाएं
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CATALOG RESTORE CONFIRMATION MODAL */}
        {/* ================================================================= */}
        {showRestoreModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border-2 border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="font-serif text-lg font-bold text-foreground">
                  डिफ़ॉल्ट 21 उत्पाद पुनर्स्थापित करें
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  यह क्रिया सभी 21 मूल आयुर्वेदिक नुस्खों, उनके वास्तविक प्रमाणित मूल्यों (जैसे अर्क आबे हयात ₹250, तनावी तैल ₹200) और मूल पैकेजिंग तस्वीरों को पुनः स्थापित कर देगी।
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRestoreModal(false)}
                  className="rounded-xl text-xs"
                >
                  रद्द करें
                </Button>
                <Button
                  onClick={handleConfirmRestoreCatalog}
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  पुनर्स्थापित करें (Restore Now)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ORDER STATUS CHANGE CONFIRMATION MODAL */}
        {/* ================================================================= */}
        {pendingStatusChange && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="font-serif text-lg font-bold text-foreground">
                  ऑर्डर स्थिति बदलाव की पुष्टि
                </h4>
                <p className="text-xs text-muted-foreground">
                  क्या आप वाकई ऑर्डर <strong>#{pendingStatusChange.orderId}</strong> की स्थिति बदलकर{" "}
                  <strong className="text-foreground">"{pendingStatusChange.newStatus}"</strong> करना चाहते हैं?
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingStatusChange(null)}
                  className="rounded-xl text-xs"
                >
                  रद्द करें
                </Button>
                <Button
                  onClick={handleConfirmStatusChange}
                  className="rounded-xl text-xs font-bold"
                >
                  पुष्टि करें
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ORDER DETAIL INSPECTOR MODAL */}
        {/* ================================================================= */}
        {inspectingOrder && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-card border border-border rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    ऑर्डर विवरण: #{inspectingOrder.id}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    तारीख: {new Date(inspectingOrder.createdAt).toLocaleString("hi-IN")}
                  </span>
                </div>
                <button
                  onClick={() => setInspectingOrder(null)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer & Shipping Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/30 p-4 rounded-2xl border border-border/80">
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-foreground block">ग्राहक जानकारी</span>
                  <p className="text-foreground font-semibold">{inspectingOrder.customerName}</p>
                  <p className="text-muted-foreground">
                    फोन:{" "}
                    <a
                      href={`tel:${inspectingOrder.customerPhone}`}
                      className="text-primary hover:underline font-mono"
                    >
                      {inspectingOrder.customerPhone}
                    </a>
                  </p>
                  {inspectingOrder.customerEmail && (
                    <p className="text-muted-foreground">ईमेल: {inspectingOrder.customerEmail}</p>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-bold text-foreground block">डिलीवरी पता</span>
                  <p className="text-foreground">
                    {inspectingOrder.shippingAddress.addressLine}
                    {inspectingOrder.customerDeliveryDetails?.landmark && (
                      <span className="block text-muted-foreground">
                        लैंडमार्क: {inspectingOrder.customerDeliveryDetails.landmark}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {inspectingOrder.shippingAddress.city}, {inspectingOrder.shippingAddress.state} -{" "}
                    {inspectingOrder.shippingAddress.pincode}
                  </p>
                </div>
              </div>

              {/* Itemized Products Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground">ऑर्डर किए गए उत्पाद</span>
                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {inspectingOrder.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 flex items-center justify-between gap-3 text-xs bg-card"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {it.productImage && (
                          <img
                            src={it.productImage}
                            alt={it.productName}
                            className="w-8 h-10 object-contain rounded bg-stone-100 dark:bg-stone-900 border shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{it.productName}</p>
                          <span className="text-[11px] text-muted-foreground">
                            {it.packSize} • ₹{it.price} × {it.quantity}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-primary shrink-0">
                        ₹{it.price * it.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-secondary/40 p-4 rounded-2xl border border-border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">उप-कुल (Subtotal):</span>
                  <span>₹{inspectingOrder.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">शिपिंग शुल्क:</span>
                  <span>
                    {inspectingOrder.shippingCharge === 0 ? "निःशुल्क (FREE)" : `₹${inspectingOrder.shippingCharge}`}
                  </span>
                </div>
                {inspectingOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>कूपन छूट:</span>
                    <span>-₹{inspectingOrder.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border">
                  <span>कुल राशि:</span>
                  <span className="text-primary">₹{inspectingOrder.total}</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                  <span>भुगतान विधि:</span>
                  <span>{inspectingOrder.paymentMethod} ({inspectingOrder.paymentStatus})</span>
                </div>
              </div>

              {/* Actions & WhatsApp Contact */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
                <a
                  href={formatWhatsAppUrl(
                    inspectingOrder.customerPhone,
                    `السلام علیکم ${inspectingOrder.customerName} जी, Shifa A Hayat से आपके ऑर्डर #${inspectingOrder.id} (राशि ₹${inspectingOrder.total}) के संदर्भ में संपर्क कर रहे हैं।`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>ग्राहक को WhatsApp संदेश भेजें</span>
                </a>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectingOrder(null)}
                  className="w-full sm:w-auto text-xs rounded-xl"
                >
                  बंद करें
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Poster Inspector Modal */}
        <ProductPosterModal
          product={selectedPoster}
          onClose={() => setSelectedPoster(null)}
        />
      </main>

      <Footer />
    </div>
  );
}
