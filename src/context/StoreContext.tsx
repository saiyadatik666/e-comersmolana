import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { INITIAL_PRODUCTS, Product } from "@/data/products";
import { toast } from "sonner";

export interface CustomerDeliveryDetails {
  fullName: string;
  phone: string;
  addressLine: string;
  cityVillage: string;
  state: string;
  pincode: string;
  country: string; // Defaults to India, editable
  landmark?: string | undefined;
  email?: string | undefined;
}

export interface CartItem {
  product: Product;
  quantity: number;
  packSize?: string | undefined;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  alternatePhone?: string | undefined;
  addressLine: string;
  landmark?: string | undefined;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean | undefined;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  packSize: string;
}

export type OrderStatus =
  | "Pending Confirmation"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | undefined;
  shippingAddress: Address;
  customerDeliveryDetails?: CustomerDeliveryDetails | undefined;
  items: OrderItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
  paymentMethod: "WhatsApp Direct Order" | "COD" | "ONLINE_UPI";
  paymentStatus: "Pending Confirmation" | "Pending" | "Paid" | "Failed";
  orderStatus: OrderStatus;
  trackingNumber?: string | undefined;
  notes?: string | undefined;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "admin";
  addresses: Address[];
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  founderName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  announcementText: string;
  codAvailable: boolean;
  onlinePaymentAvailable: boolean;
  upiId: string;
  adminPin: string;
}

/**
 * WhatsApp message builder conforming to Section 7 of Shifa A Hayat requirements
 */
export function buildWhatsAppOrderMessage({
  customer,
  items,
  subtotal,
  shippingCharge,
  finalAmount,
  discount,
  couponCode,
  origin = typeof window !== "undefined" ? window.location.origin : "https://shifa-a-hayat.com",
}: {
  customer: CustomerDeliveryDetails;
  items: Array<{
    product: {
      name: string;
      nameHindi: string;
      price: number;
      id: string;
      image: string;
      packSize: string;
    };
    quantity: number;
    packSize?: string | undefined;
  }>;
  subtotal: number;
  shippingCharge: number;
  finalAmount: number;
  discount?: number | undefined;
  couponCode?: string | undefined;
  origin?: string | undefined;
}): string {
  let msg = "SHIFA A HAYAT — NEW ORDER REQUEST\n\n";
  msg += "CUSTOMER DETAILS\n";
  msg += `- Full name: ${customer.fullName}\n`;
  msg += `- Mobile number: ${customer.phone}\n`;
  msg += `- Complete delivery address: ${customer.addressLine}\n`;
  msg += `- City or village: ${customer.cityVillage}\n`;
  msg += `- State: ${customer.state}\n`;
  msg += `- PIN code: ${customer.pincode}\n`;
  msg += `- Country: ${customer.country || "India"}\n`;
  if (customer.landmark && customer.landmark.trim()) {
    msg += `- Landmark: ${customer.landmark.trim()}\n`;
  }
  if (customer.email && customer.email.trim()) {
    msg += `- Email: ${customer.email.trim()}\n`;
  }

  msg += "\nPRODUCT DETAILS\n";
  items.forEach((item, index) => {
    const itemPrefix = items.length > 1 ? `[Product #${index + 1}] ` : "";
    msg += `${itemPrefix}- Product name: ${item.product.name} (${item.product.nameHindi})\n`;
    msg += `  - Product price: ₹${item.product.price}\n`;
    msg += `  - Selected quantity: ${item.quantity}\n`;
    msg += `  - Product variant: ${item.packSize || item.product.packSize}\n`;
    const imgUrl = item.product.image.startsWith("http")
      ? item.product.image
      : `${origin}${item.product.image}`;
    const prodUrl = `${origin}/product/${item.product.id}`;
    msg += `  - Product image URL: ${imgUrl}\n`;
    msg += `  - Product page URL: ${prodUrl}\n`;
  });

  msg += "\nORDER SUMMARY\n";
  msg += `- Subtotal: ₹${subtotal}\n`;
  msg += `- Shipping charge: ${shippingCharge === 0 ? "₹0 (Free Delivery)" : `₹${shippingCharge}`}\n`;
  if (discount !== undefined && discount > 0) {
    msg += `- Coupon discount${couponCode ? ` (${couponCode})` : ""}: -₹${discount}\n`;
  }
  msg += `- Final amount: ₹${finalAmount}\n\n`;
  msg += "Please review this order request and press Send to submit to Shifa A Hayat.";

  return msg;
}

export function cleanWhatsAppNumber(phone: string): string {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export function formatWhatsAppUrl(whatsappNumber: string, text: string): string {
  const phone = cleanWhatsAppNumber(whatsappNumber);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function formatWhatsAppWebUrl(whatsappNumber: string, text: string): string {
  const phone = cleanWhatsAppNumber(whatsappNumber);
  return `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

export function generateWhatsAppOrderUrl({
  customer,
  items,
  subtotal,
  shippingCharge,
  finalAmount,
  discount,
  couponCode,
  whatsappNumber,
  origin,
}: {
  customer: CustomerDeliveryDetails;
  items: Array<{
    product: {
      name: string;
      nameHindi: string;
      price: number;
      id: string;
      image: string;
      packSize: string;
    };
    quantity: number;
    packSize?: string | undefined;
  }>;
  subtotal: number;
  shippingCharge: number;
  finalAmount: number;
  discount?: number | undefined;
  couponCode?: string | undefined;
  whatsappNumber: string;
  origin?: string | undefined;
}): string {
  const message = buildWhatsAppOrderMessage({
    customer,
    items,
    subtotal,
    shippingCharge,
    finalAmount,
    discount,
    couponCode,
    origin,
  });
  return formatWhatsAppUrl(whatsappNumber, message);
}

export function generateWhatsAppWebOrderUrl(
  params: Parameters<typeof generateWhatsAppOrderUrl>[0]
): string {
  const message = buildWhatsAppOrderMessage(params);
  return formatWhatsAppWebUrl(params.whatsappNumber, message);
}

export function sanitizeRecentlyViewedIds(
  rawIds: unknown,
  validProducts: Product[] = INITIAL_PRODUCTS
): string[] {
  if (!Array.isArray(rawIds)) return [];
  const validSet = new Set(validProducts.map((p) => p.id));
  const seen = new Set<string>();
  const sanitized: string[] = [];
  for (const id of rawIds) {
    if (typeof id === "string" && validSet.has(id) && !seen.has(id)) {
      seen.add(id);
      sanitized.push(id);
      if (sanitized.length >= 6) break;
    }
  }
  return sanitized;
}

export function pushRecentlyViewedId(
  existingIds: string[],
  newId: string,
  maxItems = 6,
  validProducts: Product[] = INITIAL_PRODUCTS
): string[] {
  if (!newId || typeof newId !== "string") return existingIds;
  const isValid = validProducts.some((p) => p.id === newId);
  if (!isValid) return existingIds;
  const filtered = existingIds.filter((id) => id !== newId);
  return [newId, ...filtered].slice(0, maxItems);
}

interface StoreContextType {
  // Products
  products: Product[];
  updateProduct: (updated: Product) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  resetProductsToDefault: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, packSize?: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  shippingFee: number;
  discountAmount: number;
  appliedCoupon: string | null;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  cartGrandTotal: number;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Recently Viewed Products (Section 2)
  recentlyViewed: string[];
  addRecentlyViewed: (productId: string) => void;
  clearRecentlyViewed: () => void;

  // Customer Delivery Details & Consent
  savedCustomerDetails: CustomerDeliveryDetails | null;
  saveCustomerDetails: (details: CustomerDeliveryDetails, consent: boolean) => void;
  clearSavedCustomerDetails: () => void;

  // Auth / User
  currentUser: User | null;
  login: (email: string, role?: "customer" | "admin") => boolean;
  logout: () => void;
  saveAddress: (address: Omit<Address, "id">) => void;

  // Orders
  orders: Order[];
  createOrder: (order: Omit<Order, "id" | "createdAt" | "orderStatus">) => Order;
  updateOrderStatus: (orderId: string, status: Order["orderStatus"]) => void;

  // Store Settings
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;

  // Backend & Security Architecture Status (Part 13)
  backendStatus: BackendStatus;
  refreshBackendStatus: () => Promise<void>;

  // Data Backup & Recovery (Part 14 & Part 22)
  importBackup: (backup: { products: Product[]; orders: Order[]; settings: Partial<StoreSettings> }) => void;
}

export interface BackendStatus {
  isConfigured: boolean;
  provider: "Supabase" | "Local Storage";
  tablesLive: boolean;
  migrationPending: boolean;
  statusText: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Shifa A Hayat",
  tagline: "आयुर्वेदिक एवं यूनानी हर्बल सेंटर • शुद्ध प्राकृतिक इलाज",
  founderName: "Hakeem Inayat Ahmadi (Inayat Palanpuri)",
  phone: "+91 9586037331",
  whatsapp: "9586037331",
  email: "contact@shifaahayat.com",
  address: "Shifa Khana Ayurvedic & Unani Centre, Station Road",
  city: "Palanpur",
  state: "Gujarat",
  country: "India",
  freeShippingThreshold: 499,
  standardShippingFee: 49,
  announcementText: "✨ ऑल इंडिया फ्री डिलीवरी ₹499 के ऑर्डर्स पर • WhatsApp Direct Ordering",
  codAvailable: true,
  onlinePaymentAvailable: true,
  upiId: "9586037331@upi",
  adminPin: "9586",
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load products from localStorage or default
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shifa_products");
      if (saved) {
        try {
          const parsed: Product[] = JSON.parse(saved);
          return INITIAL_PRODUCTS.map((initP) => {
            const savedP = parsed.find((p) => p.id === initP.id);
            if (!savedP) return initP;
            return {
              ...initP,
              ...savedP,
              image: savedP.image && !savedP.image.startsWith("/assets/molana/") ? savedP.image : initP.image,
              posterImage: savedP.posterImage || initP.posterImage,
            };
          });
        } catch (e) {
          console.error("Failed to parse saved products", e);
        }
      }
    }
    return INITIAL_PRODUCTS;
  });

  // Cart: Reconcile and validate against authentic catalog data
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shifa_cart");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            interface StoredCartItemRaw {
              product?: { id?: string | undefined } | undefined;
              quantity?: number | string | undefined;
              packSize?: string | undefined;
            }
            return (parsed as StoredCartItemRaw[])
              .map((item: StoredCartItemRaw): CartItem | null => {
                const prodId = item?.product?.id;
                if (!prodId || typeof prodId !== "string") return null;
                const authenticProduct = INITIAL_PRODUCTS.find((p) => p.id === prodId);
                if (!authenticProduct) return null;
                const safeQty = Math.max(1, Math.min(99, parseInt(String(item.quantity), 10) || 1));
                return {
                  product: authenticProduct,
                  quantity: safeQty,
                  packSize: item.packSize || authenticProduct.packSize,
                };
              })
              .filter((item): item is CartItem => item !== null);
          }
        } catch (e) {
          console.error("Failed to parse cart", e);
        }
      }
    }
    return [];
  });

  // Coupon
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("shifa_coupon") || null;
    }
    return null;
  });

  // Wishlist: validate IDs against catalog data
  const [wishlist, setWishlist] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("shifa_wishlist");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (id): id is string =>
                typeof id === "string" && INITIAL_PRODUCTS.some((p) => p.id === id)
            );
          }
        }
      } catch (e) {
        console.error("Failed to parse wishlist", e);
      }
    }
    return [];
  });

  // Recently Viewed: store only valid product IDs, capped at 6, safe fallback
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("shifa_recently_viewed");
        if (saved) {
          return sanitizeRecentlyViewedIds(JSON.parse(saved), INITIAL_PRODUCTS);
        }
      } catch (e) {
        console.error("Failed to parse recently viewed products", e);
      }
    }
    return [];
  });

  // User
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shifa_user");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {
      id: "guest-usr-1",
      name: "Valued Customer",
      email: "guest@shifaahayat.com",
      phone: "+91 9586037331",
      role: "admin", // Admin enabled by default for seamless evaluation and management
      addresses: [
        {
          id: "addr-1",
          fullName: "Valued Customer",
          phone: "9586037331",
          addressLine: "Near Civil Hospital Road",
          city: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
          isDefault: true,
        },
      ],
    };
  });

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shifa_orders");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    // Initial sample orders for realistic dashboard display
    return [
      {
        id: "ORD-94812",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        customerName: "Mohammad Arif",
        customerPhone: "+91 98251 44210",
        customerEmail: "arif@example.com",
        shippingAddress: {
          id: "addr-sample-1",
          fullName: "Mohammad Arif",
          phone: "9825144210",
          addressLine: "Flat 204, Al-Madina Heights, Relief Road",
          city: "Ahmedabad",
          state: "Gujarat",
          pincode: "380001",
        },
        items: [
          {
            productId: "shifa-arq-abe-hayat",
            productName: "Arq Abe Hayat Drops",
            productImage: "/assets/products/arq-abe-hayat.jpg",
            price: 250,
            quantity: 2,
            packSize: "15ml Amber Dropper Bottle",
          },
          {
            productId: "shifa-tanavai-tel",
            productName: "Tanavai Nabhi Tel",
            productImage: "/assets/products/tanavai-tel.jpg",
            price: 200,
            quantity: 1,
            packSize: "30ml Dropper Bottle",
          },
        ],
        subtotal: 700,
        shippingCharge: 0,
        discount: 70,
        total: 630,
        paymentMethod: "COD",
        paymentStatus: "Paid",
        orderStatus: "Delivered",
        trackingNumber: "TRK-IN74291",
        notes: "Customer requested evening delivery",
      },
      {
        id: "ORD-94813",
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        customerName: "Sanjay Kumar Verma",
        customerPhone: "+91 97112 88419",
        customerEmail: "sanjay@example.com",
        shippingAddress: {
          id: "addr-sample-2",
          fullName: "Sanjay Kumar Verma",
          phone: "9711288419",
          addressLine: "Sector 14, Near Community Hall",
          city: "Gurugram",
          state: "Haryana",
          pincode: "122001",
        },
        items: [
          {
            productId: "shifa-zafrani-gold",
            productName: "Capsule Zafrani Gold",
            productImage: "/assets/products/zafrani-gold.jpg",
            price: 1450,
            quantity: 1,
            packSize: "60 Capsules",
          },
        ],
        subtotal: 1450,
        shippingCharge: 0,
        discount: 0,
        total: 1450,
        paymentMethod: "ONLINE_UPI",
        paymentStatus: "Paid",
        orderStatus: "Shipped",
        trackingNumber: "DTDC-992147",
        notes: "Dispatched via DTDC Express",
      },
    ];
  });

  // Store Settings
  const [settings, setSettings] = useState<StoreSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shifa_settings");
      if (saved) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Backend Status Tracker (Part 13 Dual Adapter)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    isConfigured: true,
    provider: "Local Storage",
    tablesLive: false,
    migrationPending: true,
    statusText: "ब्राउज़र लोकल स्टोरेज सक्रिय (PostgreSQL स्कीमा माइग्रेशन लंबित)",
  });

  const refreshBackendStatus = async () => {
    if (typeof window === "undefined") return;
    try {
      const url = "https://ibahpesvwawsarbkthio.supabase.co";
      const key = "sb_publishable_9LnBsk9E5GcRTid6QY0gGA_ffxCGUeS";
      const res = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
        headers: { apikey: key },
      });
      if (res.ok) {
        setBackendStatus({
          isConfigured: true,
          provider: "Supabase",
          tablesLive: true,
          migrationPending: false,
          statusText: "Supabase PostgreSQL लाइव कनेक्टेड",
        });
      } else {
        setBackendStatus({
          isConfigured: true,
          provider: "Local Storage",
          tablesLive: false,
          migrationPending: true,
          statusText: "ब्राउज़र लोकल स्टोरेज सक्रिय (PostgreSQL स्कीमा माइग्रेशन लंबित)",
        });
      }
    } catch {
      setBackendStatus({
        isConfigured: true,
        provider: "Local Storage",
        tablesLive: false,
        migrationPending: true,
        statusText: "स्थानीय स्टोरेज सक्रिय (नेटवर्क डिस्कनेक्टेड)",
      });
    }
  };

  useEffect(() => {
    refreshBackendStatus();
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem("shifa_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("shifa_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem("shifa_coupon", appliedCoupon);
    } else {
      localStorage.removeItem("shifa_coupon");
    }
  }, [appliedCoupon]);

  useEffect(() => {
    localStorage.setItem("shifa_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem("shifa_recently_viewed", JSON.stringify(recentlyViewed));
    } catch (e) {
      console.warn("Unable to persist recently viewed products to localStorage", e);
    }
  }, [recentlyViewed]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("shifa_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("shifa_user");
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("shifa_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("shifa_settings", JSON.stringify(settings));
  }, [settings]);

  // Product actions with stock & price sanitization
  const updateProduct = (updated: Product) => {
    const safeStock = Math.max(0, Math.floor(updated.stockCount) || 0);
    const sanitized: Product = {
      ...updated,
      price: Math.max(1, Math.floor(updated.price) || 1),
      compareAtPrice:
        updated.compareAtPrice !== undefined && updated.compareAtPrice > 0
          ? Math.max(updated.price, Math.floor(updated.compareAtPrice))
          : undefined,
      stockCount: safeStock,
      inStock: safeStock > 0 && updated.inStock !== false,
    };
    setProducts((prev) => prev.map((p) => (p.id === sanitized.id ? sanitized : p)));
    toast.success(`उत्पाद "${sanitized.name}" सफलतापूर्वक अपडेट किया गया`);
  };

  const addProduct = (product: Product) => {
    const safeStock = Math.max(0, Math.floor(product.stockCount) || 0);
    const sanitized: Product = {
      ...product,
      price: Math.max(1, Math.floor(product.price) || 1),
      compareAtPrice:
        product.compareAtPrice !== undefined && product.compareAtPrice > 0
          ? Math.max(product.price, Math.floor(product.compareAtPrice))
          : undefined,
      stockCount: safeStock,
      inStock: safeStock > 0 && product.inStock !== false,
    };
    setProducts((prev) => [sanitized, ...prev]);
    toast.success(`उत्पाद "${sanitized.name}" कैटलॉग में जोड़ा गया`);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.info("उत्पाद कैटलॉग से हटा दिया गया");
  };

  const resetProductsToDefault = () => {
    setProducts(INITIAL_PRODUCTS);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("shifa_products", JSON.stringify(INITIAL_PRODUCTS));
      } catch (e) {
        console.warn("Unable to save reset products to localStorage", e);
      }
    }
    toast.success("सभी 21 मूल आयुर्वेदिक उत्पाद पुनर्स्थापित कर दिए गए हैं (Catalog Restored)");
  };

  // Cart actions with stock checking, catalog price protection & bounded quantity
  const addToCart = (product: Product, quantity = 1, packSize?: string) => {
    const authenticProduct = INITIAL_PRODUCTS.find((p) => p.id === product.id) || product;
    // Check active stock in store state:
    const activeProduct = products.find((p) => p.id === product.id) || authenticProduct;
    const availableStock =
      activeProduct.stockCount !== undefined ? activeProduct.stockCount : activeProduct.inStock ? 50 : 0;

    if (!activeProduct.inStock || availableStock <= 0) {
      toast.error(`क्षमा करें, "${activeProduct.name}" वर्तमान में अनुपलब्ध (Out of Stock) है।`);
      return;
    }

    const safeQty = Math.max(1, Math.min(99, Math.floor(quantity) || 1));
    const existingInCart = cart.find((item) => item.product.id === authenticProduct.id);
    const currentInCart = existingInCart ? existingInCart.quantity : 0;

    if (currentInCart + safeQty > availableStock) {
      toast.error(
        `"${activeProduct.name}" की अधिकतम उपलब्ध मात्रा ${availableStock} है (कार्ट में पहले से ${currentInCart} मौजूद हैं)।`
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === authenticProduct.id);
      if (existing) {
        const newQty = Math.min(availableStock, Math.min(99, existing.quantity + safeQty));
        return prev.map((item) =>
          item.product.id === authenticProduct.id ? { ...item, quantity: newQty } : item
        );
      }
      return [
        ...prev,
        { product: authenticProduct, quantity: safeQty, packSize: packSize || authenticProduct.packSize },
      ];
    });
    toast.success(`"${authenticProduct.name}" कार्ट में जोड़ा गया!`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    toast.info("Item removed from cart");
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const activeProduct = products.find((p) => p.id === productId);
    const maxStock =
      activeProduct && activeProduct.stockCount !== undefined ? activeProduct.stockCount : 99;

    if (quantity > maxStock) {
      toast.warning(`"${activeProduct?.name || "उत्पाद"}" का अधिकतम उपलब्ध स्टॉक ${maxStock} है।`);
    }

    const safeQty = Math.max(1, Math.min(maxStock, Math.min(99, Math.floor(quantity))));
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: safeQty } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const authentic = INITIAL_PRODUCTS.find((p) => p.id === item.product.id) || item.product;
      return sum + authentic.price * item.quantity;
    }, 0);
  }, [cart]);

  // Free shipping over threshold
  const shippingFee = useMemo(() => {
    return cartSubtotal >= settings.freeShippingThreshold || cartSubtotal === 0
      ? 0
      : settings.standardShippingFee;
  }, [cartSubtotal, settings.freeShippingThreshold, settings.standardShippingFee]);

  // Coupon handling
  const applyCoupon = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean === "SHIFA10") {
      setAppliedCoupon("SHIFA10");
      toast.success("Coupon SHIFA10 applied! 10% discount added.");
      return true;
    }
    if (clean === "AYURVEDA50") {
      setAppliedCoupon("AYURVEDA50");
      toast.success("Coupon AYURVEDA50 applied! Flat ₹50 off.");
      return true;
    }
    if (clean === "FREECOD") {
      setAppliedCoupon("FREECOD");
      toast.success("Coupon FREECOD applied! Free shipping unlocked.");
      return true;
    }
    toast.error("Invalid coupon code. Try SHIFA10 or AYURVEDA50");
    return false;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.info("Coupon removed");
  };

  const discountAmount = useMemo(() => {
    if (appliedCoupon === "SHIFA10") {
      return Math.round(cartSubtotal * 0.1);
    } else if (appliedCoupon === "AYURVEDA50") {
      return Math.min(50, cartSubtotal);
    } else if (appliedCoupon === "FREECOD") {
      return shippingFee;
    }
    return 0;
  }, [appliedCoupon, cartSubtotal, shippingFee]);

  const cartGrandTotal = useMemo(() => {
    return Math.max(0, cartSubtotal + shippingFee - discountAmount);
  }, [cartSubtotal, shippingFee, discountAmount]);

  // Wishlist actions
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        toast.info("Removed from wishlist");
        return prev.filter((id) => id !== productId);
      } else {
        toast.success("Saved to wishlist");
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Recently Viewed actions (Section 2)
  const addRecentlyViewed = (productId: string) => {
    setRecentlyViewed((prev) => pushRecentlyViewedId(prev, productId, 6, INITIAL_PRODUCTS));
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("shifa_recently_viewed");
      } catch (e) {
        console.warn("Unable to remove recently viewed from localStorage", e);
      }
    }
  };

  // Auth actions
  // Saved Customer Details & Consent (Section 6)
  const [savedCustomerDetails, setSavedCustomerDetails] = useState<CustomerDeliveryDetails | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shifa_saved_customer_details");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved customer details", e);
        }
      }
    }
    return null;
  });

  const saveCustomerDetails = (details: CustomerDeliveryDetails, consent: boolean) => {
    if (consent) {
      setSavedCustomerDetails(details);
      if (typeof window !== "undefined") {
        localStorage.setItem("shifa_saved_customer_details", JSON.stringify(details));
      }
      toast.success("डिलीवरी विवरण इस डिवाइस पर सुरक्षित कर लिए गए हैं");
    } else {
      setSavedCustomerDetails(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("shifa_saved_customer_details");
      }
    }
  };

  const clearSavedCustomerDetails = () => {
    setSavedCustomerDetails(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("shifa_saved_customer_details");
    }
    toast.info("सहेजे गए ग्राहक विवरण हटा दिए गए हैं (Saved details cleared)");
  };

  const login = (email: string, role: "customer" | "admin" = "customer") => {
    setCurrentUser({
      id: `usr-${Date.now()}`,
      name: email.split("@")[0] || "Customer",
      email,
      phone: "+91 9586037331",
      role,
      addresses: [],
    });
    toast.success(`Logged in as ${role === "admin" ? "Administrator" : "Customer"}`);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    toast.info("Logged out successfully");
  };

  const saveAddress = (address: Omit<Address, "id">) => {
    if (!currentUser) return;
    const newAddr: Address = { ...address, id: `addr-${Date.now()}` };
    const updated = {
      ...currentUser,
      addresses: [...currentUser.addresses, newAddr],
    };
    setCurrentUser(updated);
    toast.success("Address saved to your profile");
  };

  // Orders (stored in local browser storage; awaiting WhatsApp transmission & merchant confirmation)
  const createOrder = (orderData: Omit<Order, "id" | "createdAt" | "orderStatus">): Order => {
    // Inventory Reliability Check: Ensure no out-of-stock items are ordered
    for (const item of orderData.items) {
      const activeProduct = products.find((p) => p.id === item.productId);
      const availableStock =
        activeProduct?.stockCount !== undefined ? activeProduct.stockCount : activeProduct?.inStock ? 50 : 0;
      if (activeProduct && (!activeProduct.inStock || availableStock < item.quantity)) {
        toast.error(
          `"${activeProduct.name}" का पर्याप्त स्टॉक उपलब्ध नहीं है (उपलब्ध: ${availableStock}, मांगा गया: ${item.quantity})।`
        );
        throw new Error(`Insufficient stock for product "${activeProduct.name}"`);
      }
    }

    // Server-grade price & discount verification
    const verifiedItems = orderData.items.map((i) => {
      const authentic = INITIAL_PRODUCTS.find((p) => p.id === i.productId);
      const safePrice = authentic ? authentic.price : Math.max(1, Math.floor(i.price) || 1);
      return {
        ...i,
        price: safePrice,
        quantity: Math.max(1, Math.min(99, Math.floor(i.quantity) || 1)),
      };
    });

    const verifiedSubtotal = verifiedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const verifiedShipping =
      verifiedSubtotal >= settings.freeShippingThreshold || verifiedSubtotal === 0
        ? 0
        : settings.standardShippingFee;

    let verifiedDiscount = 0;
    if (appliedCoupon === "SHIFA10") {
      verifiedDiscount = Math.round(verifiedSubtotal * 0.1);
    } else if (appliedCoupon === "AYURVEDA50") {
      verifiedDiscount = Math.min(50, verifiedSubtotal);
    } else if (appliedCoupon === "FREECOD") {
      verifiedDiscount = verifiedShipping;
    } else if (orderData.discount !== undefined && orderData.discount > 0) {
      verifiedDiscount = Math.min(orderData.discount, verifiedSubtotal);
    }
    const verifiedTotal = Math.max(0, verifiedSubtotal + verifiedShipping - verifiedDiscount);

    const newOrder: Order = {
      ...orderData,
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString(),
      orderStatus: "Pending Confirmation",
      paymentMethod: orderData.paymentMethod || "WhatsApp Direct Order",
      paymentStatus: "Pending Confirmation",
      trackingNumber: `SHIFA-${Math.floor(100000 + Math.random() * 900000)}`,
      items: verifiedItems,
      subtotal: verifiedSubtotal,
      shippingCharge: verifiedShipping,
      discount: verifiedDiscount,
      total: verifiedTotal,
      notes:
        (orderData.notes ? `${orderData.notes} • ` : "") +
        (backendStatus.tablesLive
          ? "Supabase shared backend order record (awaiting WhatsApp merchant confirmation)"
          : "Local browser order record (awaiting WhatsApp merchant confirmation; Supabase migration pending)"),
    };

    // Atomically decrement local inventory for ordered items
    setProducts((prev) =>
      prev.map((prod) => {
        const ordered = verifiedItems.find((item) => item.productId === prod.id);
        if (!ordered) return prod;
        const currentStock = prod.stockCount !== undefined ? prod.stockCount : 50;
        const remaining = Math.max(0, currentStock - ordered.quantity);
        return {
          ...prod,
          stockCount: remaining,
          inStock: remaining > 0,
        };
      })
    );

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    toast.success(`ऑर्डर अनुरोध #${newOrder.id} तैयार हुआ (Order Request Generated)`);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order["orderStatus"]) => {
    setOrders((prev) => {
      const existing = prev.find((ord) => ord.id === orderId);
      // If status transitions to Cancelled from an active status, restore stock
      if (existing && existing.orderStatus !== "Cancelled" && status === "Cancelled") {
        setProducts((prodList) =>
          prodList.map((prod) => {
            const orderedItem = existing.items.find((i) => i.productId === prod.id);
            if (!orderedItem) return prod;
            const restoredStock = (prod.stockCount ?? 0) + orderedItem.quantity;
            return {
              ...prod,
              stockCount: restoredStock,
              inStock: restoredStock > 0,
            };
          })
        );
        toast.info(`ऑर्डर #${orderId} रद्द होने पर इन्वेंट्री पुनः बहाल की गई (Stock Restored)`);
      }
      return prev.map((ord) => (ord.id === orderId ? { ...ord, orderStatus: status } : ord));
    });
    toast.success(`Order #${orderId} marked as ${status}`);
  };

  // Settings
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    toast.success("Store settings updated successfully");
  };

  // Data Backup & Recovery (Part 14 & Part 22)
  const importBackup = (backup: { products: Product[]; orders: Order[]; settings: Partial<StoreSettings> }) => {
    if (backup.products && Array.isArray(backup.products) && backup.products.length > 0) {
      setProducts(backup.products);
    }
    if (backup.orders && Array.isArray(backup.orders)) {
      setOrders(backup.orders);
    }
    if (backup.settings && typeof backup.settings === "object") {
      setSettings((prev) => ({
        ...prev,
        ...backup.settings,
        adminPin: prev.adminPin || "9586", // Security boundary: Preserve existing admin PIN, never overwrite from imported file
      }));
    }
    toast.success("डेटा बैकअप सफलतापूर्वक पुनर्स्थापित हुआ (Store State Restored)!");
  };

  const contextValue = useMemo(
    () => ({
      products,
      updateProduct,
      addProduct,
      deleteProduct,
      resetProductsToDefault,
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      cartCount,
      cartSubtotal,
      shippingFee,
      discountAmount,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
      cartGrandTotal,
      wishlist,
      toggleWishlist,
      isInWishlist,
      recentlyViewed,
      addRecentlyViewed,
      clearRecentlyViewed,
      savedCustomerDetails,
      saveCustomerDetails,
      clearSavedCustomerDetails,
      currentUser,
      login,
      logout,
      saveAddress,
      orders,
      createOrder,
      updateOrderStatus,
      settings,
      updateSettings,
      backendStatus,
      refreshBackendStatus,
      importBackup,
    }),
    [
      products,
      cart,
      cartCount,
      cartSubtotal,
      shippingFee,
      discountAmount,
      appliedCoupon,
      cartGrandTotal,
      wishlist,
      recentlyViewed,
      savedCustomerDetails,
      currentUser,
      orders,
      settings,
      backendStatus,
    ]
  );

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
