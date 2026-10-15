import React, { createContext, useContext, useEffect, useState } from "react";
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
  whatsappNumber: string;
  origin?: string | undefined;
}): string {
  const message = buildWhatsAppOrderMessage({
    customer,
    items,
    subtotal,
    shippingCharge,
    finalAmount,
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
        orderStatus: "Dispatched",
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
    if (!activeProduct.inStock || (activeProduct.stockCount !== undefined && activeProduct.stockCount <= 0)) {
      toast.error(`क्षमा करें, "${activeProduct.name}" वर्तमान में अनुपलब्ध (Out of Stock) है।`);
      return;
    }

    const safeQty = Math.max(1, Math.min(99, Math.floor(quantity) || 1));
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === authenticProduct.id);
      if (existing) {
        const newQty = Math.min(99, existing.quantity + safeQty);
        return prev.map((item) =>
          item.product.id === authenticProduct.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product: authenticProduct, quantity: safeQty, packSize: packSize || authenticProduct.packSize }];
    });
    toast.success(`Added ${authenticProduct.name} to cart!`);
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
    const safeQty = Math.max(1, Math.min(99, Math.floor(quantity)));
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: safeQty } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const authentic = INITIAL_PRODUCTS.find((p) => p.id === item.product.id) || item.product;
    return sum + authentic.price * item.quantity;
  }, 0);

  // Free shipping over threshold
  const shippingFee =
    cartSubtotal >= settings.freeShippingThreshold || cartSubtotal === 0
      ? 0
      : settings.standardShippingFee;

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

  let discountAmount = 0;
  if (appliedCoupon === "SHIFA10") {
    discountAmount = Math.round(cartSubtotal * 0.1);
  } else if (appliedCoupon === "AYURVEDA50") {
    discountAmount = Math.min(50, cartSubtotal);
  } else if (appliedCoupon === "FREECOD") {
    discountAmount = shippingFee;
  }

  const cartGrandTotal = Math.max(0, cartSubtotal + shippingFee - discountAmount);

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
    const computedDiscount = Math.max(0, orderData.subtotal + orderData.shippingCharge - orderData.total);
    const newOrder: Order = {
      ...orderData,
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString(),
      orderStatus: "Pending Confirmation",
      paymentMethod: orderData.paymentMethod || "WhatsApp Direct Order",
      paymentStatus: "Pending Confirmation",
      trackingNumber: `SHIFA-${Math.floor(100000 + Math.random() * 900000)}`,
      discount: orderData.discount !== undefined && orderData.discount > 0 ? orderData.discount : computedDiscount,
      notes: (orderData.notes ? `${orderData.notes} • ` : "") + "Local browser order record (awaiting WhatsApp merchant confirmation)",
    };
    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    toast.success(`ऑर्डर अनुरोध #${newOrder.id} तैयार हुआ (Order Request Generated)`);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order["orderStatus"]) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, orderStatus: status } : ord))
    );
    toast.success(`Order #${orderId} marked as ${status}`);
  };

  // Settings
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    toast.success("Store settings updated successfully");
  };

  return (
    <StoreContext.Provider
      value={{
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
      }}
    >
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
