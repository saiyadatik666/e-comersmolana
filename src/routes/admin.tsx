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
  BarChart3,
  CheckCircle2,
  Tag,
  Activity,
  Database,
  Download,
  Upload,
  FileText,
  Mail,
  EyeOff,
  ArrowRight,
  LogOut,
  Loader2,
  KeyRound,
  Star,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  createBackupPayload,
  downloadBackupJson,
  validateBackupPayload,
  downloadOrdersCsv,
} from "@/lib/backup";
import {
  computeTopOrderedProducts,
  computeOrderStatusDistribution,
  computeCouponAnalytics,
  computeCatalogHealth,
  computeCategoryDistribution,
  evaluateShoppingFlowDiagnostics,
} from "@/lib/analytics";
import {
  adminCheckEmailServerFn,
  adminLoginServerFn,
  adminGetSessionServerFn,
  adminLogoutServerFn,
  adminUpdateProductStockServerFn,
  adminUpdateOrderStatusServerFn,
  adminChangePasswordServerFn,
  adminExportOrdersServerFn,
  adminListOrdersServerFn,
  adminUpdateSettingsServerFn,
  adminUpdateProductServerFn,
  adminListReviewsServerFn,
  adminModerateReviewServerFn,
  adminDeleteReviewServerFn,
  StoredReview,
  ReviewStatus,
} from "@/lib/admin-api";

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
type AdminTab = "overview" | "analytics" | "products" | "assets" | "orders" | "reviews" | "settings";

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
    backendStatus,
    refreshBackendStatus,
    importBackup,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [selectedPoster, setSelectedPoster] = useState<Product | null>(null);

  // =========================================================================
  // SECURE SERVER-SIDE ADMIN AUTHENTICATION
  // =========================================================================
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("shifa_admin_authenticated") === "true";
    }
    return false;
  });
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [authStep, setAuthStep] = useState<"email" | "password">("email");
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("shifa_admin_email");
    }
    return null;
  });
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("shifa_admin_token");
    }
    return null;
  });
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [serverOrders, setServerOrders] = useState<Order[] | null>(null);
  const [isLoadingServerOrders, setIsLoadingServerOrders] = useState<boolean>(false);

  const fetchServerOrders = async (tokenOverride?: string) => {
    const activeToken =
      tokenOverride ||
      adminSessionToken ||
      (typeof window !== "undefined" ? sessionStorage.getItem("shifa_admin_token") : null);
    if (!activeToken) return;
    setIsLoadingServerOrders(true);
    try {
      const res = await adminListOrdersServerFn({ data: { adminToken: activeToken } });
      if (Array.isArray(res)) {
        const mapped: Order[] = res.map((stored) => ({
          id: stored.id,
          createdAt: stored.createdAt,
          customerName: stored.customerName,
          customerPhone: stored.customerPhone,
          customerEmail: stored.customerEmail,
          shippingAddress: {
            id: `addr-${stored.id}`,
            fullName: stored.customerName,
            phone: stored.customerPhone,
            addressLine: stored.shippingAddress.addressLine,
            city: stored.shippingAddress.cityVillage,
            state: stored.shippingAddress.state,
            pincode: stored.shippingAddress.pincode,
          },
          items: stored.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            productImage: it.productImage,
            price: it.price,
            quantity: it.quantity,
            packSize: it.packSize,
          })),
          subtotal: stored.subtotal,
          shippingCharge: stored.shippingCharge,
          discount: stored.discount,
          total: stored.total,
          paymentMethod: stored.paymentMethod,
          paymentStatus: stored.orderStatus === "Delivered" ? "Paid" : "Pending",
          orderStatus: stored.orderStatus as OrderStatus,
          trackingNumber: stored.trackingNumber,
          notes: stored.notes,
        }));
        setServerOrders(mapped);
      }
    } catch (err) {
      console.warn("[Admin] Could not load server orders:", err);
    } finally {
      setIsLoadingServerOrders(false);
    }
  };

  // Reviews Moderation State
  const [adminReviews, setAdminReviews] = useState<StoredReview[] | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | "all">("all");
  const [reviewProductFilter, setReviewProductFilter] = useState<string>("all");
  const [reviewVerifiedOnly, setReviewVerifiedOnly] = useState<boolean>(false);
  const [replyModalReview, setReplyModalReview] = useState<StoredReview | null>(null);
  const [adminReplyText, setAdminReplyText] = useState<string>("");
  const [isUpdatingReview, setIsUpdatingReview] = useState<boolean>(false);

  const fetchAdminReviews = async (tokenOverride?: string) => {
    const activeToken =
      tokenOverride ||
      adminSessionToken ||
      (typeof window !== "undefined" ? sessionStorage.getItem("shifa_admin_token") : null);
    if (!activeToken) return;
    setIsLoadingReviews(true);
    try {
      const res = await adminListReviewsServerFn({
        data: {
          adminToken: activeToken,
        },
      });
      if (Array.isArray(res)) {
        setAdminReviews(res);
      }
    } catch (err) {
      console.warn("[Admin] Could not load reviews for moderation:", err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const filteredAdminReviews = useMemo(() => {
    if (!adminReviews) return [];
    return adminReviews.filter((rev) => {
      const matchesStatus =
        reviewStatusFilter === "all" || rev.status === reviewStatusFilter;
      const matchesProduct =
        reviewProductFilter === "all" || rev.productId === reviewProductFilter;
      const matchesVerified =
        !reviewVerifiedOnly || rev.isVerifiedPurchase;
      return matchesStatus && matchesProduct && matchesVerified;
    });
  }, [adminReviews, reviewStatusFilter, reviewProductFilter, reviewVerifiedOnly]);

  const handleModerateReview = async (reviewId: string, newStatus: ReviewStatus) => {
    const activeToken =
      adminSessionToken ||
      (typeof window !== "undefined" ? sessionStorage.getItem("shifa_admin_token") : null);
    if (!activeToken) {
      toast.error("सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।");
      return;
    }
    setIsUpdatingReview(true);
    try {
      await adminModerateReviewServerFn({
        data: {
          adminToken: activeToken,
          reviewId,
          status: newStatus,
        },
      });
      toast.success(
        newStatus === "approved"
          ? "समीक्षा स्वीकृत एवं प्रकाशित कर दी गई है।"
          : newStatus === "rejected"
          ? "समीक्षा अस्वीकृत (छिपा दी गई) है।"
          : "समीक्षा लंबित स्थिति में स्थानांतरित।"
      );
      await fetchAdminReviews(activeToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "समीक्षा स्थिति अपडेट करने में त्रुटि";
      toast.error(msg);
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const handleSaveAdminReply = async () => {
    if (!replyModalReview) return;
    const activeToken =
      adminSessionToken ||
      (typeof window !== "undefined" ? sessionStorage.getItem("shifa_admin_token") : null);
    if (!activeToken) return;
    setIsUpdatingReview(true);
    try {
      await adminModerateReviewServerFn({
        data: {
          adminToken: activeToken,
          reviewId: replyModalReview.id,
          status: replyModalReview.status,
          adminReply: adminReplyText.trim(),
        },
      });
      toast.success("हकीम जी का उत्तर सफलतापूर्वक सहेज लिया गया।");
      setReplyModalReview(null);
      setAdminReplyText("");
      await fetchAdminReviews(activeToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "उत्तर सहेजने में विफल";
      toast.error(msg);
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (
      !window.confirm(
        "क्या आप वाकई इस अनुचित/स्पैम समीक्षा को स्थायी रूप से हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।"
      )
    ) {
      return;
    }
    const activeToken =
      adminSessionToken ||
      (typeof window !== "undefined" ? sessionStorage.getItem("shifa_admin_token") : null);
    if (!activeToken) return;
    setIsUpdatingReview(true);
    try {
      await adminDeleteReviewServerFn({
        data: {
          adminToken: activeToken,
          reviewId,
        },
      });
      toast.success("समीक्षा स्थायी रूप से हटा दी गई है।");
      await fetchAdminReviews(activeToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "समीक्षा हटाने में विफल";
      toast.error(msg);
    } finally {
      setIsUpdatingReview(false);
    }
  };

  // Check server session on initial mount
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      try {
        const savedToken =
          typeof window !== "undefined"
            ? sessionStorage.getItem("shifa_admin_token") || undefined
            : undefined;
        const res = await adminGetSessionServerFn({
          data: savedToken ? { adminToken: savedToken } : {},
        });
        if (isMounted) {
          if (res.authenticated) {
            setIsAuthenticated(true);
            setAdminEmail(res.adminEmail || "inaytchaudhri@gmail.com");
            if (savedToken) {
              setAdminSessionToken(savedToken);
              fetchServerOrders(savedToken);
              fetchAdminReviews(savedToken);
            }
          } else {
            setIsAuthenticated(false);
            setAdminEmail(null);
            setAdminSessionToken(null);
            setServerOrders(null);
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("shifa_admin_authenticated");
              sessionStorage.removeItem("shifa_admin_token");
              sessionStorage.removeItem("shifa_admin_email");
            }
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) {
      toast.error(`अत्यधिक गलत प्रयास। कृपया ${lockoutRemaining} सेकंड प्रतीक्षा करें।`);
      return;
    }
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setLoginError("कृपया अपना व्यवस्थापक ईमेल पता दर्ज करें। (Please enter admin email)");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setLoginError("कृपया एक मान्य ईमेल प्रारूप दर्ज करें। (Invalid email format)");
      return;
    }

    setIsSubmitting(true);
    setLoginError(null);

    try {
      const res = await adminCheckEmailServerFn({ data: { email: cleanEmail } });
      if (res.authorized) {
        setAuthStep("password");
        setLoginError(null);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "यह ईमेल अधिकृत व्यवस्थापक खाते के रूप में पंजीकृत नहीं है।";
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) {
      toast.error(`अत्यधिक गलत प्रयास। कृपया ${lockoutRemaining} सेकंड प्रतीक्षा करें।`);
      return;
    }
    if (!passwordInput) {
      setLoginError("कृपया व्यवस्थापक पासवर्ड दर्ज करें। (Password required)");
      return;
    }

    setIsSubmitting(true);
    setLoginError(null);

    try {
      const res = await adminLoginServerFn({
        data: {
          email: emailInput.trim(),
          password: passwordInput,
        },
      });

      if (res.success) {
        setIsAuthenticated(true);
        setAdminEmail(res.adminEmail);
        setAdminSessionToken(res.sessionToken);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("shifa_admin_authenticated", "true");
          sessionStorage.setItem("shifa_admin_token", res.sessionToken);
          sessionStorage.setItem("shifa_admin_email", res.adminEmail);
        }
        setPasswordInput("");
        setLoginError(null);
        setFailedAttempts(0);
        toast.success("सर्वर प्रमाणीकरण सफल! एडमिन डैशबोर्ड अनलॉक हो गया।");
        fetchServerOrders(res.sessionToken);
        fetchAdminReviews(res.sessionToken);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "अमान्य क्रेडेंशियल्स। कृपया अपना पासवर्ड पुनः जाँचें।";
      setLoginError(msg);
      toast.error(msg);
      setFailedAttempts((prev) => prev + 1);

      const match = msg.match(/(\d+)\s*सेकंड/);
      if (match && match[1]) {
        setLockoutRemaining(parseInt(match[1], 10));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutAdmin = async () => {
    try {
      await adminLogoutServerFn({
        data: adminSessionToken ? { adminToken: adminSessionToken } : {},
      });
    } catch (err) {
      void err;
    }

    setIsAuthenticated(false);
    setAdminEmail(null);
    setAdminSessionToken(null);
    setServerOrders(null);
    setAuthStep("email");
    setEmailInput("");
    setPasswordInput("");
    setLoginError(null);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("shifa_admin_authenticated");
      sessionStorage.removeItem("shifa_admin_token");
      sessionStorage.removeItem("shifa_admin_email");
    }

    toast.info("एडमिन सत्र सुरक्षित रूप से समाप्त हो गया है।");
  };

  // =========================================================================
  // PASSWORD ROTATION STATE & HANDLER
  // =========================================================================
  const [currentPwdInput, setCurrentPwdInput] = useState("");
  const [newPwdInput, setNewPwdInput] = useState("");
  const [confirmPwdInput, setConfirmPwdInput] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdChangeError, setPwdChangeError] = useState<string | null>(null);
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdChangeError(null);
    setPwdChangeSuccess(null);

    if (!currentPwdInput) {
      setPwdChangeError("कृपया वर्तमान पासवर्ड दर्ज करें।");
      return;
    }
    if (!newPwdInput) {
      setPwdChangeError("कृपया नया पासवर्ड दर्ज करें।");
      return;
    }
    if (newPwdInput.length < 10) {
      setPwdChangeError("नया पासवर्ड कम से कम 10 अक्षरों का होना चाहिए।");
      return;
    }
    if (newPwdInput !== confirmPwdInput) {
      setPwdChangeError("नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।");
      return;
    }
    if (currentPwdInput === newPwdInput) {
      setPwdChangeError("नया पासवर्ड वर्तमान पासवर्ड से भिन्न होना चाहिए।");
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await adminChangePasswordServerFn({
        data: {
          currentPassword: currentPwdInput,
          newPassword: newPwdInput,
          adminToken: adminSessionToken || undefined,
        },
      });

      if (res.success) {
        setPwdChangeSuccess(res.message || "पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है।");
        toast.success("व्यवस्थापक पासवर्ड सफलतापूर्वक बदल दिया गया!");
        setCurrentPwdInput("");
        setNewPwdInput("");
        setConfirmPwdInput("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "पासवर्ड अपडेट विफल रहा।";
      setPwdChangeError(msg);
      toast.error(msg);
    } finally {
      setIsChangingPwd(false);
    }
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

  // Backup & Recovery Import State (Part 14)
  const [importFileError, setImportFileError] = useState<string | null>(null);

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileError(null);

    // Limit maximum backup file upload size to 10MB to prevent DoS or memory issues
    if (file.size > 10 * 1024 * 1024) {
      const err = "फ़ाइल का आकार 10MB से अधिक नहीं होना चाहिए (File exceeds 10MB limit)";
      setImportFileError(err);
      toast.error(err);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawJson = JSON.parse(event.target?.result as string);
        const validation = validateBackupPayload(rawJson);
        if (!validation.isValid || !validation.payload) {
          const err = validation.error || "अमान्य बैकअप फ़ाइल";
          setImportFileError(err);
          toast.error(err);
          return;
        }
        if (
          window.confirm(
            `क्या आप यह बैकअप लोड करना चाहते हैं? इसमें ${validation.payload.products.length} उत्पाद और ${validation.payload.orders.length} ऑर्डर्स शामिल हैं।\n\nनोट: उत्पाद व ऑर्डर डेटा पुनर्स्थापित होगा, लेकिन सुरक्षा कारणों से वर्तमान एडमिन पिन अपरिवर्तित रहेगा।`
          )
        ) {
          importBackup(validation.payload);
        }
      } catch {
        const parseErr = "JSON पार्स करने में विफल। कृपया मान्य बैकअप फ़ाइल चुनें।";
        setImportFileError(parseErr);
        toast.error(parseErr);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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

  // Privacy-friendly empirical analytics (Local browser memory calculations)
  const topOrderedProducts = useMemo(() => computeTopOrderedProducts(orders, products), [orders, products]);
  const orderStatusDistribution = useMemo(() => computeOrderStatusDistribution(orders), [orders]);
  const couponAnalytics = useMemo(() => computeCouponAnalytics(orders), [orders]);
  const catalogHealth = useMemo(() => computeCatalogHealth(products), [products]);
  const categoryDistribution = useMemo(() => computeCategoryDistribution(products), [products]);
  const flowDiagnostics = useMemo(() => evaluateShoppingFlowDiagnostics(products, orders), [products, orders]);

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

  // Active Orders (Prefers live server database records, falls back to local cache)
  const activeOrders = useMemo(() => {
    return serverOrders !== null ? serverOrders : orders;
  }, [serverOrders, orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === "all") return activeOrders;
    return activeOrders.filter((ord) => ord.orderStatus === orderStatusFilter);
  }, [activeOrders, orderStatusFilter]);

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
    (async () => {
      try {
        await adminUpdateProductServerFn({
          data: {
            product: sanitized,
            adminToken: adminSessionToken || undefined,
          },
        });
      } catch (err) {
        console.warn("Server product sync notice:", err);
      }
    })();
    setEditingProduct(null);
    setProductErrors({});
  };

  const handleQuickStockAdjust = async (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const currentStock = prod.stockCount || 0;
    const newStock = Math.max(0, currentStock + delta);
    updateProduct({
      ...prod,
      stockCount: newStock,
      inStock: newStock > 0,
    });
    try {
      await adminUpdateProductStockServerFn({
        data: {
          productId,
          newStockCount: newStock,
          adminToken: adminSessionToken || undefined,
        },
      });
    } catch (err) {
      console.warn("Server stock sync notice:", err);
    }
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
  // ORDER STATUS UPDATE WITH CONFIRMATION & SERVER AUDIT SYNCHRONIZATION
  // =========================================================================
  const handleInitiateStatusChange = async (orderId: string, targetStatus: OrderStatus) => {
    if (targetStatus === "Cancelled" || targetStatus === "Delivered") {
      setPendingStatusChange({ orderId, newStatus: targetStatus });
    } else {
      updateOrderStatus(orderId, targetStatus);
      if (serverOrders) {
        setServerOrders((prev) =>
          prev ? prev.map((o) => (o.id === orderId ? { ...o, orderStatus: targetStatus } : o)) : null
        );
      }
      try {
        await adminUpdateOrderStatusServerFn({
          data: {
            orderId,
            status: targetStatus,
            adminToken: adminSessionToken || undefined,
          },
        });
      } catch (err) {
        console.warn("Server order status sync notice:", err);
      }
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    const { orderId, newStatus } = pendingStatusChange;
    updateOrderStatus(orderId, newStatus);
    if (serverOrders) {
      setServerOrders((prev) =>
        prev ? prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o)) : null
      );
    }
    try {
      await adminUpdateOrderStatusServerFn({
        data: {
          orderId,
          status: newStatus,
          adminToken: adminSessionToken || undefined,
        },
      });
    } catch (err) {
      console.warn("Server order status sync notice:", err);
    }
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
    (async () => {
      try {
        await adminUpdateSettingsServerFn({
          data: {
            settings: settingsForm,
            adminToken: adminSessionToken || undefined,
          },
        });
        toast.success("दुकान सेटिंग्स सर्वर डेटाबेस में सुरक्षित रूप से अपडेट हो गईं (Server Synchronized)!");
      } catch (err) {
        console.warn("Server settings sync notice:", err);
      }
    })();
  };

  // =========================================================================
  // SECURE AUTHENTICATION GATE VIEW (TWO-STEP ADMIN VERIFICATION)
  // =========================================================================
  if (!isAuthenticated) {
    if (authChecking) {
      return (
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">सत्र सुरक्षा जांची जा रही है...</p>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 max-w-md w-full mx-auto px-4 py-12 sm:py-20 flex items-center justify-center">
          <div className="w-full bg-card border-2 border-border rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-800 to-primary text-amber-300 flex items-center justify-center mx-auto border-2 border-amber-400/50 shadow-md">
              <Shield className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-3 py-1 rounded-full uppercase tracking-wider border border-amber-400/30">
                सुरक्षित एडमिन प्रवेश द्वार (Admin Gate)
              </span>
              <h1 className="font-serif text-2xl font-bold text-foreground mt-2.5">
                हकीम जी / स्टोर व्यवस्थापक लॉगिन
              </h1>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                यह क्षेत्र केवल अधिकृत व्यवस्थापक के लिए है। स्टोर सेटिंग्स, इन्वेंट्री व ऑर्डर्स प्रबंधित करने के लिए दो-चरणीय प्रमाणीकरण आवश्यक है।
              </p>
            </div>

            {/* Step 1: Email Verification */}
            {authStep === "email" && (
              <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold border-b border-border pb-2">
                  <span>चरण 1 / 2: अधिकृत ईमेल पहचान</span>
                  <span className="text-primary font-bold">Step 1</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-email" className="text-xs font-semibold text-foreground">
                    व्यवस्थापक ईमेल पता (Admin Email) *
                  </Label>
                  <div className="relative">
                    <Input
                      id="admin-email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      placeholder="inaytchaudhri@gmail.com"
                      value={emailInput}
                      disabled={isSubmitting || lockoutRemaining > 0}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      className={`pl-10 text-sm bg-secondary/50 ${
                        loginError ? "border-rose-500 ring-rose-500/20" : ""
                      }`}
                    />
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                {lockoutRemaining > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="font-bold">सुरक्षा कूलडाउन सक्रिय: {lockoutRemaining} सेकंड शेष</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || lockoutRemaining > 0}
                  className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ईमेल जांचा जा रहा है...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 justify-center">
                      <span>आगे बढ़ें (Continue)</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  केवल अधिकृत ईमेल <strong className="text-foreground">inaytchaudhri@gmail.com</strong> ही मान्य है। अन्य सभी पते अस्वीकृत किए जाते हैं।
                </p>
              </form>
            )}

            {/* Step 2: Password Verification */}
            {authStep === "password" && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold border-b border-border pb-2">
                  <span>चरण 2 / 2: सुरक्षा पासवर्ड सत्यापन</span>
                  <span className="text-primary font-bold">Step 2</span>
                </div>

                {/* Confirmed Authorized Email Banner */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                      {emailInput.trim()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep("email");
                      setPasswordInput("");
                      setLoginError(null);
                    }}
                    className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold ml-2 shrink-0 cursor-pointer"
                  >
                    बदलें
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-password" className="text-xs font-semibold text-foreground">
                    व्यवस्थापक पासवर्ड (Admin Password) *
                  </Label>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoFocus
                      autoComplete="current-password"
                      placeholder="पासवर्ड दर्ज करें..."
                      value={passwordInput}
                      disabled={isSubmitting || lockoutRemaining > 0}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      className={`pl-10 pr-10 text-sm bg-secondary/50 font-mono ${
                        loginError ? "border-rose-500 ring-rose-500/20" : ""
                      }`}
                    />
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                {lockoutRemaining > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="font-bold">सुरक्षा कूलडाउन सक्रिय: {lockoutRemaining} सेकंड शेष</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAuthStep("email");
                      setPasswordInput("");
                      setLoginError(null);
                    }}
                    disabled={isSubmitting}
                    className="rounded-2xl text-xs flex-1"
                  >
                    ← वापस
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || lockoutRemaining > 0}
                    className="rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md flex-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>सत्यापित किया जा रहा है...</span>
                      </span>
                    ) : (
                      <span>साइन इन करें (Sign In)</span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="pt-2 border-t border-border/60">
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← मुख्य वेबसाइट पर वापस जाएँ (Return to Storefront)
              </Link>
            </div>
          </div>
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
              <Badge className="bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>अधिकृत: {adminEmail || "inaytchaudhri@gmail.com"}</span>
              </Badge>
              {backendStatus.tablesLive ? (
                <Badge className="bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  <span>Supabase Live</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  <span>Dual Adapter (Local Storage)</span>
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              उत्पाद संपादन, लाइव स्टॉक नियंत्रण, विरासत पोस्टर एवं ऑर्डर प्रबंधन।
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refreshBackendStatus();
                toast.info("बैकएंड स्थिति जांची जा रही है...");
              }}
              className="rounded-xl text-xs text-stone-700 dark:text-stone-300 border-border"
              title="Supabase बैकएंड कनेक्शन व स्कीमा स्थिति पुनः जांचें"
            >
              <Database className="w-3.5 h-3.5 mr-1" />
              <span>डेटाबेस स्थिति जांचें</span>
            </Button>

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
              className="rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 font-semibold"
              title="प्रशासनिक सत्र सुरक्षित रूप से समाप्त करें"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              <span>लॉग आउट (Logout)</span>
            </Button>
          </div>
        </div>

        {/* STORAGE & SECURITY ARCHITECTURE NOTICE BANNER */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>तकनीकी वास्तुकला एवं बैकएंड स्थिति (Backend & Security Architecture)</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
              {backendStatus.statusText}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              • <strong>इन्वेंट्री व डेटा स्टोरेज</strong>: वर्तमान में डुअल-एडेप्टर मोड सक्रिय है। स्थानीय <code>localStorage</code> से डेटा सुरक्षित लोड होता है। PostgreSQL स्कीमा फ़ाइल <code>supabase/migrations/20261015000000_secure_backend_schema.sql</code> तैयार है।
            </p>
            <p>
              • <strong>प्रमाणीकरण सुरक्षा (Security Note)</strong>: वर्तमान पिन <code>9586</code> एक क्लाइंट-साइड सुरक्षा गेट है। उत्पादन बैकएंड सक्रिय होने पर इसे सर्वर-वेरिफाइड सेशन कुकीज़ व आरबीएसी (RBAC) से बदला जाएगा।
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
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "analytics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>व्यापारिक विश्लेषण (Analytics & Insights)</span>
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
            onClick={() => {
              setActiveTab("reviews");
              if (!adminReviews) fetchAdminReviews();
            }}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "reviews"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="w-4 h-4 shrink-0" />
            <span>ग्राहक समीक्षाएं ({adminReviews?.length ?? 0})</span>
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

            {/* Quick Link to Analytics Tab */}
            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    प्राइवेसी-अनुकूल व्यापारिक विश्लेषण एवं सिस्टम डायग्नोस्टिक्स
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    सर्वाधिक ऑर्डर किए गए उत्पाद, कूपन उपयोग दर ({couponAnalytics.couponUsageRate}%), 7-श्रेणी इन्वेंट्री इकाइयां एवं 6-बिंदु शॉपिंग फ़्लो स्वास्थ्य जाँच।
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("analytics")}
                className="rounded-xl text-xs shrink-0 border-primary/30 text-primary hover:bg-primary/10"
              >
                विस्तृत विश्लेषण देखें →
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: ANALYTICS & INSIGHTS (PART 10) */}
        {/* ================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Header & Architectural Transparency Card */}
            <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                      व्यापारिक विश्लेषण व प्राइवेसी-अनुकूल अंतर्दृष्टि
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      केवल वास्तविक उपलब्ध स्थानीय डेटा पर आधारित विश्लेषण • शून्य तृतीय-पक्ष ट्रैकर • शून्य व्यक्तिगत डेटा खनन
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto bg-secondary/50">
                  Privacy First: Zero PII
                </Badge>
              </div>

              {/* Data Scope & Limitations Notice */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground pt-1">
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>शून्य ट्रैकिंग (Zero Pixels)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    कोई तृतीय-पक्ष ट्रैकिंग स्क्रिप्ट (जैसे Google Analytics या Facebook Pixel) शामिल नहीं है। कोई विज्ञापन कुकीज सेट नहीं की जाती हैं।
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/40 border border-border/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>पूर्ण ग्राहक गोपनीयता (Zero PII)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    विश्लेषण हेतु किसी ग्राहक का नाम, फ़ोन नंबर, डिलीवरी पता या संदेश सामग्री का कभी उपयोग नहीं होता। केवल अनाम उत्पाद आईडी व मात्राएं संकलित हैं।
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/40 border border-border/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>स्थानीय दायरा (Browser Scope)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    ये आंकड़े केवल इस डिवाइस के स्थानीय स्टोरेज में उपलब्ध रिकॉर्ड्स दर्शाते हैं। बहु-उपकरण केंद्रीय विश्लेषण हेतु समर्पित बैकएंड आवश्यक है।
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">स्थानीय ऑर्डर रिकॉर्ड्स</span>
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="font-serif text-3xl font-bold text-foreground">{orders.length}</p>
                <span className="text-[11px] text-muted-foreground block">
                  {orders.length > 0 ? `सकल मूल्य: ₹${totalSales} (स्थानीय चेकआउट)` : "वर्तमान में कोई ऑर्डर दर्ज नहीं"}
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">कूपन उपयोग दर (Coupons)</span>
                  <Tag className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="font-serif text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    {couponAnalytics.couponUsageRate}%
                  </p>
                  <span className="text-xs text-muted-foreground">
                    ({couponAnalytics.ordersWithCoupon}/{couponAnalytics.totalOrders})
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  कुल दी गई छूट: ₹{couponAnalytics.totalDiscountAmount}
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">कैटलॉग आकार व स्थिति</span>
                  <Package className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="font-serif text-3xl font-bold text-foreground">{catalogHealth.totalProducts}</p>
                  <span className="text-xs text-muted-foreground">उत्पाद</span>
                </div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
                  {catalogHealth.publishedCount} सक्रिय • 100% विरासत पोस्टर लिंक
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">इन्वेंट्री उपलब्धता अलर्ट</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="font-serif text-3xl font-bold text-amber-600">{catalogHealth.lowStockCount}</p>
                  <span className="text-xs text-muted-foreground">कम</span>
                  {catalogHealth.outOfStockCount > 0 && (
                    <span className="text-xs font-bold text-rose-600">
                      ({catalogHealth.outOfStockCount} आउट ऑफ स्टॉक)
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  {catalogHealth.inStockCount} उत्पाद सामान्य स्टॉक में
                </span>
              </div>
            </div>

            {/* SECTION 1: TOP ORDERED PRODUCTS */}
            <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    सर्वाधिक ऑर्डर किए गए उत्पाद (Top Products by Recorded Demand)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    केवल स्थानीय डेटाबेस में मौजूद ऑर्डर्स से संकलित • कोई कल्पित या कृत्रिम आंकड़े नहीं
                  </p>
                </div>
                <Badge variant="outline" className="text-[11px] self-start sm:self-auto">
                  {topOrderedProducts.length} उत्पाद ऑर्डर्स में दर्ज
                </Badge>
              </div>

              {topOrderedProducts.length === 0 ? (
                <div className="py-10 text-center space-y-3 bg-secondary/20 rounded-2xl border border-dashed border-border p-6">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/80 flex items-center justify-center mx-auto text-muted-foreground">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-sm font-bold text-foreground">
                      स्थानीय ब्राउज़र में अभी कोई ऑर्डर रिकॉर्ड उपलब्ध नहीं है
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      जब ग्राहक वेबसाइट पर चेकआउट करेंगे और ऑर्डर इस डिवाइस पर दर्ज होंगे, तो सर्वाधिक बार ऑर्डर किए गए उत्पादों की रैंकिंग, बिक्री संख्या और कुल सकल राशि यहाँ वास्तविक समय में प्रदर्शित होगी।
                    </p>
                  </div>
                  <Link to="/shop">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs mt-2">
                      दुकान में उत्पाद कैटलॉग देखें
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-secondary/50 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3">रैंक (Rank)</th>
                        <th className="py-2.5 px-3">उत्पाद नाम व विवरण</th>
                        <th className="py-2.5 px-3">श्रेणी</th>
                        <th className="py-2.5 px-3 text-center">ऑर्डर आवृत्ति</th>
                        <th className="py-2.5 px-3 text-center">कुल नग (Units)</th>
                        <th className="py-2.5 px-3 text-right">सकल मूल्य (Gross)</th>
                        <th className="py-2.5 px-3 text-center">लाइव स्टॉक</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topOrderedProducts.map((item, index) => (
                        <tr key={item.productId} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-muted-foreground">
                            #{index + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image}
                                alt={item.productName}
                                className="w-10 h-12 object-contain rounded-md bg-stone-100 dark:bg-stone-900 border shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate">{item.productName}</p>
                                <p className="text-[11px] text-muted-foreground">{item.productNameHindi}</p>
                                <span className="text-[10px] text-stone-500">{item.packSize}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-[10px]">
                              {item.categoryHindi}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-foreground">
                            {item.orderCount} ऑर्डर्स
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-bold text-primary text-sm">
                              {item.totalQuantity}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">नग</span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-foreground">
                            ₹{item.totalGrossAmount}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge
                              className={`text-[10px] font-semibold ${
                                item.currentStockCount <= 0
                                  ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200"
                                  : item.currentStockCount <= 10
                                  ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200"
                                  : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                              }`}
                              variant="outline"
                            >
                              {item.currentStockCount <= 0
                                ? "आउट ऑफ स्टॉक (0)"
                                : `${item.currentStockCount} शेष`}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 2: ORDER STATUS DISTRIBUTION & CATEGORY COVERAGE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Order Status Distribution */}
              <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground">
                      ऑर्डर स्थिति वितरण (Order Status Distribution)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      सभी 6 समर्थित ऑर्डर स्थितियों का स्थानीय रिकॉर्ड अनुपात
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    कुल {orders.length}
                  </Badge>
                </div>

                <div className="space-y-3.5">
                  {orderStatusDistribution.map((statusItem) => (
                    <div key={statusItem.status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{statusItem.hindiLabel}</span>
                          <span className="text-[10px] text-muted-foreground">({statusItem.status})</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-foreground">{statusItem.count} ऑर्डर्स</span>
                          <span className="text-muted-foreground text-[11px]">({statusItem.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            statusItem.status === "Delivered"
                              ? "bg-emerald-600"
                              : statusItem.status === "Confirmed" || statusItem.status === "Processing"
                              ? "bg-blue-600"
                              : statusItem.status === "Shipped"
                              ? "bg-purple-600"
                              : statusItem.status === "Cancelled"
                              ? "bg-rose-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.max(statusItem.percentage, statusItem.count > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Category Distribution */}
              <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground">
                      श्रेणी कवरेज एवं इन्वेंट्री इकाइयां (7 Categories)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      प्रत्येक श्रेणी में सक्रिय उत्पाद व उपलब्ध स्टॉक शीशियां
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {categoryDistribution.length} श्रेणियां
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {categoryDistribution.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 rounded-2xl bg-secondary/30 border border-border/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{cat.hindi}</p>
                        <p className="text-[11px] text-muted-foreground">{cat.name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <span className="font-bold text-foreground">{cat.productCount} उत्पाद</span>
                          <span className="text-[10px] text-muted-foreground block">
                            {cat.inStockCount} उपलब्ध • {cat.outOfStockCount} शून्य
                          </span>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs font-bold">
                          {cat.totalStockUnits} नग
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 3: CATALOG HEALTH & QUALITY DIAGNOSTICS */}
            <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    कैटलॉग गुणवत्ता एवं सुधार अंतर्दृष्टि (Catalog Quality Insights)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    कम स्टॉक, शून्य स्टॉक, अपुष्ट मूल्य अथवा संक्षिप्त विवरण वाले उत्पादों की स्पष्ट सूची
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400">
                    {catalogHealth.heritagePosterCount}/21 विरासत पोस्टर जुड़े हैं
                  </Badge>
                  <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-400">
                    {catalogHealth.verifiedPriceCount}/21 प्रमाणित रेट कार्ड
                  </Badge>
                </div>
              </div>

              {catalogHealth.itemsNeedingAttention.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>सभी 21 उत्पाद संपूर्ण विवरण, पर्याप्त स्टॉक व सत्यापित विशेषताओं के साथ सक्रिय हैं।</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catalogHealth.itemsNeedingAttention.slice(0, 9).map((att, idx) => (
                    <div
                      key={`${att.id}-${idx}`}
                      className="p-3.5 rounded-2xl bg-secondary/40 border border-border/80 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-bold text-foreground truncate">{att.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{att.nameHindi}</p>
                        <span
                          className={`text-[10px] font-semibold inline-block px-2 py-0.5 rounded-md ${
                            att.issueType === "out_of_stock"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : att.issueType === "low_stock"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {att.issueHindi}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const prod = products.find((p) => p.id === att.id);
                          if (prod) {
                            setEditingProduct({ ...prod });
                            setIsNewProduct(false);
                            setActiveTab("products");
                          }
                        }}
                        className="text-[11px] h-7 px-2 shrink-0 text-primary hover:underline"
                      >
                        सुधारें →
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 4: SHOPPING FLOW OPERATIONAL DIAGNOSTICS */}
            <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary shrink-0" />
                  <h3 className="font-serif text-base font-bold text-foreground">
                    शॉपिंग फ़्लो परिचालन स्वास्थ्य जाँच (Shopping Flow Diagnostics)
                  </h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  6 प्रमुख बिंदु सत्यापित
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flowDiagnostics.map((diag) => (
                  <div
                    key={diag.id}
                    className="p-4 rounded-2xl bg-secondary/30 border border-border/80 flex flex-col justify-between space-y-3 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-foreground leading-tight">
                          {diag.titleHindi}
                        </span>
                        <Badge
                          className={`text-[9px] shrink-0 ${
                            diag.status === "verified"
                              ? "bg-emerald-700 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {diag.metricBadge}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {diag.descriptionHindi}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/60 text-[10px] text-stone-500 font-mono">
                      वास्तुकला: {diag.architectureDetails}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 5: BACKEND REQUIREMENTS & ARCHITECTURE DISCLOSURE */}
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-3xl p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-300">
                <Database className="w-4 h-4 text-amber-600 shrink-0" />
                <span>वास्तुकला सीमाएं एवं केंद्रीय एनालिटिक्स आवश्यकताएं (Backend Architecture Disclosure)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                वर्तमान में <strong>शिफा ए हयात</strong> बिना किसी तीसरे पक्ष के ट्रैकर या बाहरी सर्वर डेटाबेस के पूरी तरह क्लाइंट-साइड चल रही है।
                उपरोक्त सभी आंकड़े केवल इस स्थानीय ब्राउज़र में मौजूद वास्तविक रिकॉर्ड्स हैं।
                यदि आप सभी अलग-अलग ग्राहकों व डिवाइसों से वास्तविक समय में एकीकृत व्यापारिक डेटा प्राप्त करना चाहते हैं, तो अग्रिम अनुमति पर निम्न घटकों को जोड़ा जा सकता है:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground pt-1">
                <div className="p-3 rounded-xl bg-background/80 border border-border space-y-1">
                  <p className="font-bold text-foreground">1. केंद्रीय डेटाबेस (Shared Database)</p>
                  <p className="text-[11px] leading-relaxed">
                    PostgreSQL या Supabase डेटाबेस जहां प्रत्येक ग्राहक का चेकआउट सुरक्षित रूप से दर्ज हो सके।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-border space-y-1">
                  <p className="font-bold text-foreground">2. सर्वर प्रमाणीकरण व एपीआई (Server APIs & RBAC)</p>
                  <p className="text-[11px] leading-relaxed">
                    सर्वर-साइड सुरक्षित एंडपॉइंट्स जो अनधिकृत पहुंच को रोकें और एग्रीगेटेड डेटा ही एडमिन को भेजें।
                  </p>
                </div>
              </div>
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
                      image: "/assets/molana/IMG-20261009-WA0003.jpg",
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
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base font-bold text-foreground">
                    ग्राहक ऑर्डर्स अभिलेख ({activeOrders.length} कुल ऑर्डर्स)
                  </h3>
                  {serverOrders !== null ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                      सर्वर डेटाबेस सिंक
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300">
                      लोकल कैश
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  सुरक्षित सर्वर डेटाबेस द्वारा प्रबंधित ऑर्डर्स। बहु-उपकरण केंद्रीय रिकॉर्ड्स।
                </p>
              </div>

              {/* Actions & Status Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoadingServerOrders}
                  onClick={() => fetchServerOrders()}
                  className="rounded-xl text-xs gap-1.5 h-8"
                  title="सर्वर से ताज़ा ऑर्डर्स पुनः लोड करें"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-primary ${isLoadingServerOrders ? "animate-spin" : ""}`} />
                  <span>{isLoadingServerOrders ? "लोड हो रहा है..." : "सिंक करें"}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await adminExportOrdersServerFn({
                        data: { format: "csv", adminToken: adminSessionToken || undefined },
                      });
                      if (res && res.data) {
                        const blob = new Blob([res.data], { type: res.mimeType });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = res.filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success("सर्वर ऑर्डर्स CSV डाउनलोड हो गई (Orders Exported)!");
                        return;
                      }
                    } catch (err) {
                      console.warn("Server export fallback:", err);
                    }
                    downloadOrdersCsv(activeOrders);
                    toast.success("ऑर्डर्स CSV डाउनलोड हो गई (Orders Exported)!");
                  }}
                  className="rounded-xl text-xs gap-1.5 h-8"
                  title="सभी ऑर्डर्स को सुरक्षित CSV स्प्रेडशीट में एक्सपोर्ट करें"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>CSV एक्सपोर्ट</span>
                </Button>

                <div className="flex items-center gap-1.5 bg-secondary/60 border border-border rounded-xl px-2.5 py-1">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="all">सभी स्थितियां ({activeOrders.length})</option>
                    <option value="Order Received">Order Received</option>
                    <option value="Pending Confirmation">Pending Confirmation</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
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
                              <option value="Order Received">Order Received</option>
                              <option value="Pending Confirmation">Pending Confirmation</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Out for Delivery">Out for Delivery</option>
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
        {/* TAB: CUSTOMER REVIEWS MODERATION */}
        {/* ================================================================= */}
        {activeTab === "reviews" && (
          <div className="space-y-6">
            {/* Reviews Header Banner */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>समीक्षा मॉडरेशन एवं प्रामाणिकता नियंत्रण</span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-foreground">
                    ग्राहक समीक्षाएं एवं रेटिंग मॉडरेशन
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
                    समीक्षाओं की प्रामाणिकता जांचें, अनुचित अथवा स्पैम सामग्री रोकें एवं हकीम जी की ओर से उत्तर दर्ज करें। 
                    <strong className="text-foreground"> ग्राहक के मूल शब्दों, अनुभव या रेटिंग में कभी चुपचाप बदलाव न करें।</strong>
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAdminReviews()}
                  disabled={isLoadingReviews}
                  className="rounded-xl text-xs self-start sm:self-auto shrink-0"
                >
                  {isLoadingReviews ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  <span>ताज़ा करें (Refresh)</span>
                </Button>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/60">
                  <span className="text-[11px] text-muted-foreground block font-medium">कुल दर्ज समीक्षाएं</span>
                  <span className="font-serif text-2xl font-bold text-foreground">
                    {adminReviews?.length ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-medium">सत्यापित खरीदार</span>
                  <span className="font-serif text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                    {adminReviews?.filter((r) => r.isVerifiedPurchase).length ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 block font-medium">समीक्षाधीन (Pending)</span>
                  <span className="font-serif text-2xl font-bold text-amber-900 dark:text-amber-200">
                    {adminReviews?.filter((r) => r.status === "pending").length ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                  <span className="text-[11px] text-rose-800 dark:text-rose-300 block font-medium">अस्वीकृत (Rejected)</span>
                  <span className="font-serif text-2xl font-bold text-rose-900 dark:text-rose-200">
                    {adminReviews?.filter((r) => r.status === "rejected").length ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground mr-1">स्थिति:</span>
                {(["all", "approved", "pending", "rejected"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setReviewStatusFilter(st);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      reviewStatusFilter === st
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "all"
                      ? "सभी"
                      : st === "approved"
                      ? "स्वीकृत (Live)"
                      : st === "pending"
                      ? "लंबित (Pending)"
                      : "अस्वीकृत (Hidden)"}
                  </button>
                ))}

                <label className="flex items-center gap-1.5 ml-2 text-xs font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reviewVerifiedOnly}
                    onChange={(e) => setReviewVerifiedOnly(e.target.checked)}
                    className="rounded-md border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>केवल सत्यापित खरीद (Verified)</span>
                </label>
              </div>

              {/* Product selector filter */}
              <div className="flex items-center gap-2">
                <Label htmlFor="review-product-filter" className="text-xs text-muted-foreground shrink-0 font-semibold">
                  उत्पाद:
                </Label>
                <select
                  id="review-product-filter"
                  value={reviewProductFilter}
                  onChange={(e) => setReviewProductFilter(e.target.value)}
                  className="text-xs rounded-xl bg-secondary border border-border px-3 py-1.5 focus:outline-hidden"
                >
                  <option value="all">सभी उत्पाद (All Products)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reviews Table / Cards */}
            {isLoadingReviews ? (
              <div className="p-12 text-center bg-card border border-border rounded-3xl space-y-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">समीक्षाएं लोड हो रही हैं...</p>
              </div>
            ) : filteredAdminReviews.length === 0 ? (
              <div className="p-12 text-center bg-card border border-dashed border-border rounded-3xl space-y-3">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                <h4 className="font-serif text-lg font-bold text-foreground">कोई समीक्षा नहीं मिली</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  वर्तमान फ़िल्टर के अनुसार कोई समीक्षा मौजूद नहीं है। ग्राहक जब उत्पाद पृष्ठ से समीक्षा सबमिट करेंगे तो वह यहाँ प्रदर्शित होगी।
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAdminReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
                  >
                    {/* Top Row: Review ID, Product, Verified badge, Date, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-foreground bg-secondary px-2.5 py-1 rounded-lg">
                          {rev.id}
                        </span>
                        <Link
                          to="/product/$id"
                          params={{ id: rev.productId }}
                          target="_blank"
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          {rev.productName || rev.productId} ↗
                        </Link>
                        {rev.isVerifiedPurchase ? (
                          <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>सत्यापित खरीद (Order: {rev.verifiedOrderId || rev.verifiedOrderIdMasked})</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            सामान्य समीक्षा
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(rev.createdAt).toLocaleDateString("hi-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <Badge
                          className={`text-[10px] font-bold ${
                            rev.status === "approved"
                              ? "bg-emerald-700 text-white"
                              : rev.status === "pending"
                              ? "bg-amber-600 text-white"
                              : "bg-rose-700 text-white"
                          }`}
                        >
                          {rev.status === "approved"
                            ? "✓ स्वीकृत (Live)"
                            : rev.status === "pending"
                            ? "⏳ समीक्षाधीन"
                            : "✕ अस्वीकृत (Hidden)"}
                        </Badge>
                      </div>
                    </div>

                    {/* Customer & Rating details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-secondary/30 p-3 rounded-2xl">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">ग्राहक का नाम (Admin View):</span>
                        <span className="font-bold text-foreground">{rev.authorName}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          सार्वजनिक प्रदर्शन: {rev.authorMasked}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">स्थान / मोबाइल (सुरक्षित):</span>
                        <span className="font-medium text-foreground">{rev.city || "उल्लेखित नहीं"}</span>
                        {rev.customerPhoneMasked && (
                          <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">
                            फ़ोन: {rev.customerPhoneMasked}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">ग्राहक रेटिंग:</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                          <span className="font-bold ml-1 text-foreground">{rev.rating}★</span>
                        </div>
                      </div>
                    </div>

                    {/* Review Title & Content (Read-only, preserving customer voice) */}
                    <div className="space-y-1.5">
                      <h4 className="font-serif text-base font-bold text-foreground">
                        "{rev.title}"
                      </h4>
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed bg-card p-3 rounded-xl border border-border/50">
                        {rev.comment}
                      </p>
                    </div>

                    {/* Admin Response Section (if exists) */}
                    {rev.adminReply && (
                      <div className="p-3 rounded-2xl bg-secondary/70 border border-border/80 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary flex items-center gap-1">
                            <span>हकीम जी / Shifa A Hayat का उत्तर:</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {rev.adminReplyAt ? new Date(rev.adminReplyAt).toLocaleDateString("hi-IN") : ""}
                          </span>
                        </div>
                        <p className="text-stone-800 dark:text-stone-200 leading-relaxed">
                          {rev.adminReply}
                        </p>
                      </div>
                    )}

                    {/* Moderation Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        {rev.status !== "approved" && (
                          <Button
                            size="sm"
                            disabled={isUpdatingReview}
                            onClick={() => handleModerateReview(rev.id, "approved")}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs h-8 px-3"
                          >
                            ✓ स्वीकृत करें (Approve)
                          </Button>
                        )}
                        {rev.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isUpdatingReview}
                            onClick={() => handleModerateReview(rev.id, "rejected")}
                            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 border-rose-300 dark:border-rose-900 rounded-xl text-xs h-8 px-3"
                          >
                            ✕ अस्वीकृत करें (Reject)
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdatingReview}
                          onClick={() => {
                            setReplyModalReview(rev);
                            setAdminReplyText(rev.adminReply || "");
                          }}
                          className="rounded-xl text-xs h-8 px-3"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          <span>{rev.adminReply ? "उत्तर संपादित करें" : "हकीम जी का उत्तर जोड़ें"}</span>
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isUpdatingReview}
                        onClick={() => handleDeleteReview(rev.id)}
                        className="text-muted-foreground hover:text-rose-600 rounded-xl text-xs h-8 px-2"
                        title="स्पैम या अश्लील समीक्षा स्थायी रूप से हटाएं"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span>हटाएं (Delete)</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                type="password"
                autoComplete="new-password"
                value={settingsForm.adminPin || "9586"}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, adminPin: e.target.value })
                }
                className={`text-xs font-mono font-bold max-w-xs ${
                  settingsErrors.adminPin ? "border-rose-500" : ""
                }`}
              />
              <p className="text-[10px] text-muted-foreground">
                एडमिन पोर्टल अनलॉक करने के लिए आवश्यक 4-अंकीय पिन (डिफ़ॉल्ट: 9586)। नोट: यह केवल इस डिवाइस के स्थानीय गेट को सुरक्षित करता है।
              </p>
              {settingsErrors.adminPin && (
                <p className="text-[10px] text-rose-600 font-medium">{settingsErrors.adminPin}</p>
              )}
            </div>

            <Button type="submit" className="rounded-xl text-xs font-bold px-6">
              <Save className="w-4 h-4 mr-1.5" />
              <span>सेटिंग्स सुरक्षित करें (Save Settings)</span>
            </Button>

            {/* DATA BACKUP & RECOVERY SECTION (Part 14) */}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <h4 className="font-serif text-sm font-bold text-foreground">
                  डेटा बैकअप, एक्सपोर्ट एवं पुनर्स्थापना (Data Backup & Recovery)
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ब्राउज़र लोकल स्टोरेज डिवाइस-विशिष्ट होता है। कैश साफ़ होने से बचाने या अन्य डिवाइस पर डेटा ले जाने के लिए बैकअप JSON या ऑर्डर्स CSV डाउनलोड करें।
              </p>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                <strong>डेटा सुरक्षा एवं गोपनीयता गारंटी:</strong> बैकअप फ़ाइलों में कोई भी पासवर्ड, एडमिन पिन, या गुप्त टोकन कभी भी एक्सपोर्ट नहीं होता है। किसी भी बैकअप को लोड करने पर आपका स्थानीय एडमिन पिन हमेशा सुरक्षित और अपरिवर्तित रहता है।
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Export Full JSON Backup */}
                <div className="p-3 rounded-2xl border border-border bg-card/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>पूर्ण स्टोर बैकअप (JSON)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    सभी 21 उत्पाद, इन्वेंट्री संख्या, ऑर्डर्स और वर्तमान सेटिंग्स।
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const payload = createBackupPayload(products, orders, settings);
                      downloadBackupJson(payload);
                      toast.success("स्टोर बैकअप JSON फ़ाइल डाउनलोड हो गई!");
                    }}
                    className="w-full text-xs rounded-xl"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>JSON डाउनलोड</span>
                  </Button>
                </div>

                {/* Export Orders CSV */}
                <div className="p-3 rounded-2xl border border-border bg-card/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>ऑर्डर्स स्प्रेडशीट (CSV)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    एक्सेल व गूगल शीट्स हेतु {orders.length} ग्राहक ऑर्डर्स का ब्योरा।
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      downloadOrdersCsv(orders);
                      toast.success("ऑर्डर्स CSV डाउनलोड हो गई!");
                    }}
                    className="w-full text-xs rounded-xl"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    <span>CSV एक्सपोर्ट</span>
                  </Button>
                </div>

                {/* Restore From JSON */}
                <div className="p-3 rounded-2xl border border-border bg-card/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>बैकअप से पुनर्स्थापित करें</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    पूर्व में डाउनलोड की गई Shifa A Hayat JSON बैकअप फ़ाइल चुनें।
                  </p>
                  <label className="block">
                    <span className="sr-only">Choose backup file</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleBackupFileSelect}
                      className="block w-full text-[11px] text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                    />
                  </label>
                  {importFileError && (
                    <p className="text-[10px] text-rose-600 font-medium">{importFileError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* ADMIN SECURITY & PASSWORD ROTATION CARD */}
            {/* ============================================================= */}
            <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm sm:text-base font-bold text-foreground">
                      सुरक्षा एवं पासवर्ड रोटेशन (Admin Credentials)
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      अधिकृत व्यवस्थापक ईमेल: <span className="font-mono font-semibold text-emerald-600">{adminEmail || "inaytchaudhri@gmail.com"}</span>
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  <Shield className="w-3 h-3 mr-1 inline" /> सर्वर द्वारा सुरक्षित
                </Badge>
              </div>

              <div className="bg-secondary/40 border border-border/60 rounded-xl p-3 text-[11px] text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  <span>उत्पादन सुरक्षा नीति (Production Security Notice)</span>
                </div>
                <p>
                  नया पासवर्ड बदलते ही सर्वर पर पुराना क्रेडेंशियल तुरंत निष्क्रिय हो जाएगा और अन्य सभी सक्रिय सत्र सुरक्षा कारणों से लॉगआउट हो जाएंगे।
                </p>
              </div>

              {pwdChangeSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pwdChangeSuccess}</span>
                </div>
              )}

              {pwdChangeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{pwdChangeError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">वर्तमान पासवर्ड *</Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPwd ? "text" : "password"}
                        value={currentPwdInput}
                        onChange={(e) => setCurrentPwdInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="text-xs pr-9 rounded-xl font-mono"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">नया सुरक्षित पासवर्ड *</Label>
                    <div className="relative">
                      <Input
                        type={showNewPwd ? "text" : "password"}
                        value={newPwdInput}
                        onChange={(e) => setNewPwdInput(e.target.value)}
                        placeholder="न्यूनतम 10 अक्षर (A-Z, 0-9, @#$)"
                        className="text-xs pr-9 rounded-xl font-mono"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">नया पासवर्ड पुनः दर्ज करें *</Label>
                    <Input
                      type={showNewPwd ? "text" : "password"}
                      value={confirmPwdInput}
                      onChange={(e) => setConfirmPwdInput(e.target.value)}
                      placeholder="नया पासवर्ड पुनः दर्ज करें"
                      className="text-xs rounded-xl font-mono"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p className="font-medium">पासवर्ड नीति आवश्यकताएं:</p>
                    <p>• न्यूनतम 10 अक्षर • बड़ा व छोटा अक्षर (A-Z, a-z) • अंक व विशेष वर्ण</p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isChangingPwd || !currentPwdInput || !newPwdInput || !confirmPwdInput}
                    className="text-xs rounded-xl shrink-0"
                  >
                    {isChangingPwd ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        <span>सत्यापित व अपडेट हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                        <span>पासवर्ड अपडेट करें</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Reply Modal */}
        {replyModalReview && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    हकीम जी / स्टोर का उत्तर जोड़ें
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    समीक्षक: {replyModalReview.authorName} ({replyModalReview.productName})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyModalReview(null)}
                  className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-reply-input" className="text-xs font-semibold">
                  उत्तर सामग्री (Official Store Reply) *
                </Label>
                <Textarea
                  id="admin-reply-input"
                  rows={4}
                  maxLength={1000}
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  placeholder="उदा. आपके विश्वास एवं स्वास्थ्य सुधार की जानकारी के लिए शुक्रिया। आगे भी परहेज़ का पालन करते रहें..."
                  className="text-xs rounded-xl bg-secondary/50 resize-none"
                />
                <span className="text-[10px] text-muted-foreground block text-right">
                  {adminReplyText.length} / 1000 अक्षर
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReplyModalReview(null)}
                  disabled={isUpdatingReview}
                  className="rounded-xl text-xs"
                >
                  रद्द करें
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveAdminReply}
                  disabled={isUpdatingReview}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                >
                  {isUpdatingReview ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>सहेजा जा रहा है...</span>
                    </span>
                  ) : (
                    <span>उत्तर सहेजें (Save Reply)</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
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
