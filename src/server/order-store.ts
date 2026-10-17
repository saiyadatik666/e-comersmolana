import fs from "node:fs";
import path from "node:path";
import { INITIAL_PRODUCTS, Product } from "@/data/products";
import {
  validateAndCalculateOrder,
  ServerCustomerInput,
  ServerOrderItemInput,
  ValidatedOrderCalculation,
} from "./order-validator";
import {
  AUTHORIZED_ADMIN_EMAIL,
  verifyServerAdminToken,
  logAdminAudit,
  adminRateLimiter,
} from "./admin-auth";

export interface StoredOrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  packSize: string;
  lineTotal: number;
}

export type ServerOrderStatus =
  | "Order Received"
  | "Pending Confirmation"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export interface OrderStatusHistoryItem {
  status: ServerOrderStatus;
  timestamp: string;
  notes?: string | undefined;
  updatedBy: string;
}

export interface StoredOrder {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | undefined;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine: string;
    cityVillage: string;
    state: string;
    pincode: string;
    country: string;
    landmark?: string | undefined;
  };
  items: StoredOrderItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  appliedCoupon?: string | null | undefined;
  total: number;
  paymentMethod: "WhatsApp Direct Order" | "COD" | "ONLINE_UPI";
  paymentStatus: "Pending Confirmation" | "Pending" | "Paid" | "Failed";
  orderStatus: ServerOrderStatus;
  trackingNumber: string;
  notes: string;
  wasPriceTampered: boolean;
  tamperingDetails?: string | undefined;
  isWhatsAppConfirmedByCustomer: boolean;
  statusHistory: OrderStatusHistoryItem[];
}

export interface InventoryItem {
  id: string;
  stockCount: number;
  inStock: boolean;
  updatedAt: string;
}

// =============================================================================
// SERVER-SIDE PERSISTENT STORAGE ENGINE
// =============================================================================

const STORAGE_DIR = path.resolve(process.cwd(), "server-data");
const ORDERS_FILE = path.join(STORAGE_DIR, "orders.json");
const INVENTORY_FILE = path.join(STORAGE_DIR, "inventory.json");
const SETTINGS_FILE = path.join(STORAGE_DIR, "settings.json");
const PRODUCTS_FILE = path.join(STORAGE_DIR, "products.json");

export interface ServerStoreSettings {
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

export const DEFAULT_SERVER_SETTINGS: ServerStoreSettings = {
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
  codAvailable: false,
  onlinePaymentAvailable: true,
  upiId: "9586037331@upi",
  adminPin: "9586",
};

function ensureStorageDir(): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[OrderStore] Warning: Could not create server-data directory", err);
  }
}

// In-Memory Authority Cache (Thread-Safe within Node process)
export let memoryOrders: StoredOrder[] = [];
const memoryInventory: Map<string, InventoryItem> = new Map();
let memorySettings: ServerStoreSettings = { ...DEFAULT_SERVER_SETTINGS };
let memoryProducts: Product[] = [...INITIAL_PRODUCTS];
let isInitialized = false;

export function initializeStore(): void {
  if (isInitialized) return;
  ensureStorageDir();

  // Initialize Inventory from INITIAL_PRODUCTS
  INITIAL_PRODUCTS.forEach((p) => {
    memoryInventory.set(p.id, {
      id: p.id,
      stockCount: p.stockCount !== undefined ? p.stockCount : 50,
      inStock: p.inStock !== false && (p.stockCount === undefined || p.stockCount > 0),
      updatedAt: new Date().toISOString(),
    });
  });

  // Load Inventory from disk if available
  try {
    if (fs.existsSync(INVENTORY_FILE)) {
      const raw = fs.readFileSync(INVENTORY_FILE, "utf-8");
      const parsed: InventoryItem[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item && item.id) {
            memoryInventory.set(item.id, {
              id: item.id,
              stockCount: Math.max(0, Math.floor(item.stockCount) || 0),
              inStock: Boolean(item.inStock && item.stockCount > 0),
              updatedAt: item.updatedAt || new Date().toISOString(),
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn("[OrderStore] Could not load persisted inventory, using catalog defaults", err);
  }

  // Load Orders from disk if available
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = fs.readFileSync(ORDERS_FILE, "utf-8");
      const parsed: StoredOrder[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryOrders = parsed.map((ord) => ({
          ...ord,
          statusHistory:
            Array.isArray(ord.statusHistory) && ord.statusHistory.length > 0
              ? ord.statusHistory
              : [
                  {
                    status: ord.orderStatus || "Pending Confirmation",
                    timestamp: ord.createdAt || new Date().toISOString(),
                    notes: "Order recorded in Shifa A Hayat backend",
                    updatedBy: "System",
                  },
                ],
        }));
      }
    }
  } catch (err) {
    console.warn("[OrderStore] Could not load persisted orders, initializing empty", err);
  }

  // Load Settings from disk if available
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        memorySettings = { ...DEFAULT_SERVER_SETTINGS, ...parsed };
      }
    }
  } catch (err) {
    console.warn("[OrderStore] Could not load persisted settings, using defaults", err);
  }

  // Load Products from disk if available
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const raw = fs.readFileSync(PRODUCTS_FILE, "utf-8");
      const parsed: Product[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryProducts = INITIAL_PRODUCTS.map((initP) => {
          const customP = parsed.find((p) => p.id === initP.id);
          return customP ? { ...initP, ...customP } : initP;
        });
      }
    }
  } catch (err) {
    console.warn("[OrderStore] Could not load persisted products, using catalog defaults", err);
  }

  isInitialized = true;
}

function persistOrdersToDisk(): void {
  try {
    ensureStorageDir();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(memoryOrders, null, 2), "utf-8");
  } catch (err) {
    console.warn("[OrderStore] Could not persist orders to disk", err);
  }
}

function persistInventoryToDisk(): void {
  try {
    ensureStorageDir();
    const list = Array.from(memoryInventory.values());
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("[OrderStore] Could not persist inventory to disk", err);
  }
}

function persistSettingsToDisk(): void {
  try {
    ensureStorageDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(memorySettings, null, 2), "utf-8");
  } catch (err) {
    console.warn("[OrderStore] Could not persist settings to disk", err);
  }
}

function persistProductsToDisk(): void {
  try {
    ensureStorageDir();
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(memoryProducts, null, 2), "utf-8");
  } catch (err) {
    console.warn("[OrderStore] Could not persist products to disk", err);
  }
}

// Reset store state (used for testing and explicit admin catalog resets)
export function resetServerStoreForTesting(): void {
  memoryOrders = [];
  memoryInventory.clear();
  memorySettings = { ...DEFAULT_SERVER_SETTINGS };
  memoryProducts = [...INITIAL_PRODUCTS];
  INITIAL_PRODUCTS.forEach((p) => {
    memoryInventory.set(p.id, {
      id: p.id,
      stockCount: p.stockCount !== undefined ? p.stockCount : 50,
      inStock: p.inStock !== false && (p.stockCount === undefined || p.stockCount > 0),
      updatedAt: new Date().toISOString(),
    });
  });
  isInitialized = true;
}

// =============================================================================
// BUSINESS LOGIC: SERVER-SIDE ORDER CREATION WITH ATOMIC STOCK DEDUCTION
// =============================================================================

export interface CreateOrderPayload {
  customer: ServerCustomerInput;
  items: ServerOrderItemInput[];
  couponCode?: string | null | undefined;
  paymentMethod?: "WhatsApp Direct Order" | "ONLINE_UPI" | undefined;
  clientClaimedSubtotal?: number | undefined;
  clientClaimedTotal?: number | undefined;
  origin?: string | undefined;
}

export function createOrderServer(payload: CreateOrderPayload): {
  success: boolean;
  order: StoredOrder;
  calculation: ValidatedOrderCalculation;
} {
  initializeStore();

  // Reject Cash on Delivery (COD) orders unconditionally
  const requestedPayment = (payload.paymentMethod || "").toUpperCase();
  if (
    requestedPayment === "COD" ||
    requestedPayment.includes("COD") ||
    requestedPayment.includes("CASH ON DELIVERY")
  ) {
    throw new Error(
      "Cash on Delivery (COD) is disabled and not accepted on Shifa A Hayat. Please select a valid online payment method."
    );
  }

  // 1. Validate customer and recalculate prices strictly from authentic catalog
  const calculation = validateAndCalculateOrder({
    customer: payload.customer,
    items: payload.items,
    couponCode: payload.couponCode,
    clientClaimedSubtotal: payload.clientClaimedSubtotal,
    clientClaimedTotal: payload.clientClaimedTotal,
    origin: payload.origin,
  });

  if (!calculation.isValid) {
    throw new Error(`Order validation failed: ${calculation.errors.join(", ")}`);
  }

  // 2. Transactional Stock Verification (Mutex Check)
  // Check that all ordered items have sufficient stock available
  for (const item of calculation.items) {
    const inv = memoryInventory.get(item.productId);
    const available = inv ? inv.stockCount : 0;
    const inStock = inv ? inv.inStock : false;

    if (!inStock || available < item.quantity) {
      throw new Error(
        `Insufficient stock for product "${item.productName}" (Available: ${available}, Requested: ${item.quantity})`
      );
    }
  }

  // 3. Atomic Stock Deduction (Cannot produce negative stock)
  for (const item of calculation.items) {
    const inv = memoryInventory.get(item.productId)!;
    const newStock = Math.max(0, inv.stockCount - item.quantity);
    inv.stockCount = newStock;
    inv.inStock = newStock > 0;
    inv.updatedAt = new Date().toISOString();
  }
  persistInventoryToDisk();

  // 4. Generate Unique Order ID with high-entropy timestamp and random suffix
  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const orderId = `ORD-${timestampPart}-${randomPart}`;

  const nowIso = new Date().toISOString();
  const newOrder: StoredOrder = {
    id: orderId,
    createdAt: nowIso,
    updatedAt: nowIso,
    customerName: calculation.customer.fullName,
    customerPhone: calculation.customer.phone,
    customerEmail: calculation.customer.email,
    shippingAddress: {
      fullName: calculation.customer.fullName,
      phone: calculation.customer.phone,
      addressLine: calculation.customer.addressLine,
      cityVillage: calculation.customer.cityVillage,
      state: calculation.customer.state,
      pincode: calculation.customer.pincode,
      country: calculation.customer.country,
      landmark: calculation.customer.landmark,
    },
    items: calculation.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      productImage: i.productImage,
      price: i.price,
      quantity: i.quantity,
      packSize: i.packSize,
      lineTotal: i.lineTotal,
    })),
    subtotal: calculation.subtotal,
    shippingCharge: calculation.shippingCharge,
    discount: calculation.discount,
    appliedCoupon: calculation.appliedCoupon,
    total: calculation.total,
    paymentMethod: payload.paymentMethod || "WhatsApp Direct Order",
    paymentStatus: "Pending Confirmation",
    orderStatus: "Pending Confirmation",
    trackingNumber: "",
    notes: "Order recorded in Shifa A Hayat backend (Pending WhatsApp customer transmission & merchant confirmation)",
    wasPriceTampered: calculation.wasPriceTampered,
    tamperingDetails: calculation.tamperingDetails,
    isWhatsAppConfirmedByCustomer: false,
    statusHistory: [
      {
        status: "Pending Confirmation",
        timestamp: nowIso,
        notes: "ऑर्डर Shifa A Hayat बैकएंड में दर्ज हुआ (WhatsApp ग्राहक संदेश एवं हकीम जी की समीक्षा प्रतीक्षारत)",
        updatedBy: "System",
      },
    ],
  };

  memoryOrders.unshift(newOrder);
  persistOrdersToDisk();

  // 5. Audit Trail for Security Monitoring
  logAdminAudit({
    adminEmail: "storefront-system@shifa-a-hayat.com",
    action: "ORDER_CREATED",
    entityType: "ORDER",
    entityId: orderId,
    details: {
      itemsCount: newOrder.items.length,
      total: newOrder.total,
      wasPriceTampered: newOrder.wasPriceTampered,
    },
    ipAddress: "customer-checkout",
  });

  return {
    success: true,
    order: newOrder,
    calculation,
  };
}

// =============================================================================
// BUSINESS LOGIC: ADMIN ORDER RETRIEVAL & MANAGEMENT
// =============================================================================

export function listOrdersAdminServer(token?: string | null): StoredOrder[] {
  initializeStore();
  const authCheck = verifyServerAdminToken(token);
  if (!authCheck.authorized) {
    throw new Error(authCheck.error || "Unauthorized: Administrator session required to view orders");
  }

  return [...memoryOrders];
}

export function getOrderByIdAdminServer(orderId: string, token?: string | null): StoredOrder {
  initializeStore();
  const authCheck = verifyServerAdminToken(token);
  if (!authCheck.authorized) {
    throw new Error(authCheck.error || "Unauthorized: Administrator session required");
  }

  const order = memoryOrders.find((o) => o.id === orderId);
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  return order;
}

export function updateOrderStatusAdminServer(
  orderId: string,
  newStatus: ServerOrderStatus,
  token?: string | null,
  clientIp = "admin-client",
  notes?: string | undefined,
  trackingNumber?: string | undefined
): { success: boolean; order: StoredOrder } {
  initializeStore();
  const authCheck = verifyServerAdminToken(token);
  if (!authCheck.authorized) {
    throw new Error(authCheck.error || "Unauthorized: Administrator session required to update orders");
  }

  const validStatuses: ServerOrderStatus[] = [
    "Order Received",
    "Pending Confirmation",
    "Confirmed",
    "Processing",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
  ];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const orderIndex = memoryOrders.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (orderIndex === -1) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const order = memoryOrders[orderIndex]!;
  const prevStatus = order.orderStatus;

  // Safe inventory restoration if order transitions to Cancelled
  if (prevStatus !== "Cancelled" && newStatus === "Cancelled") {
    for (const item of order.items) {
      const inv = memoryInventory.get(item.productId);
      if (inv) {
        inv.stockCount = inv.stockCount + item.quantity;
        inv.inStock = inv.stockCount > 0;
        inv.updatedAt = new Date().toISOString();
      }
    }
    persistInventoryToDisk();
  }

  const nowIso = new Date().toISOString();
  order.orderStatus = newStatus;
  order.updatedAt = nowIso;
  if (trackingNumber !== undefined) {
    order.trackingNumber = trackingNumber.trim();
  }
  if (notes) {
    order.notes = notes;
  }

  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [
      {
        status: prevStatus,
        timestamp: order.createdAt,
        notes: "Order recorded",
        updatedBy: "System",
      },
    ];
  }

  order.statusHistory.push({
    status: newStatus,
    timestamp: nowIso,
    notes: notes || undefined,
    updatedBy: authCheck.adminEmail || AUTHORIZED_ADMIN_EMAIL,
  });

  persistOrdersToDisk();

  const auditDetails: Record<string, string | number | boolean | null> = {
    previousStatus: prevStatus,
    newStatus,
  };
  if (notes) auditDetails["notes"] = notes;
  if (trackingNumber) auditDetails["trackingNumber"] = trackingNumber;

  logAdminAudit({
    adminEmail: authCheck.adminEmail || AUTHORIZED_ADMIN_EMAIL,
    action: "UPDATE_ORDER_STATUS",
    entityType: "ORDER",
    entityId: orderId,
    details: auditDetails,
    ipAddress: clientIp,
  });

  return {
    success: true,
    order,
  };
}

// =============================================================================
// BUSINESS LOGIC: INVENTORY RETRIEVAL & UPDATE
// =============================================================================

export function getInventoryServer(): InventoryItem[] {
  initializeStore();
  return Array.from(memoryInventory.values());
}

export function updateProductStockServer(
  productId: string,
  newStockCount: number,
  token?: string | null,
  clientIp = "admin-client"
): { success: boolean; item: InventoryItem } {
  initializeStore();
  const authCheck = verifyServerAdminToken(token);
  if (!authCheck.authorized) {
    throw new Error(authCheck.error || "Unauthorized: Administrator session required to update stock");
  }

  if (typeof newStockCount !== "number" || isNaN(newStockCount) || newStockCount < 0) {
    throw new Error("Stock count cannot be negative");
  }

  const safeCount = Math.floor(newStockCount);
  let inv = memoryInventory.get(productId);

  if (!inv) {
    // If not yet in inventory map, create it from catalog
    const catalogItem = INITIAL_PRODUCTS.find((p) => p.id === productId);
    if (!catalogItem) {
      throw new Error(`Product not found: ${productId}`);
    }
    inv = {
      id: productId,
      stockCount: safeCount,
      inStock: safeCount > 0,
      updatedAt: new Date().toISOString(),
    };
    memoryInventory.set(productId, inv);
  } else {
    inv.stockCount = safeCount;
    inv.inStock = safeCount > 0;
    inv.updatedAt = new Date().toISOString();
  }

  persistInventoryToDisk();

  const prodIdx = memoryProducts.findIndex((p) => p.id === productId);
  if (prodIdx !== -1) {
    memoryProducts[prodIdx] = {
      ...memoryProducts[prodIdx]!,
      stockCount: safeCount,
      inStock: safeCount > 0,
    };
    persistProductsToDisk();
  }

  logAdminAudit({
    adminEmail: authCheck.adminEmail || AUTHORIZED_ADMIN_EMAIL,
    action: "UPDATE_PRODUCT_STOCK",
    entityType: "PRODUCT",
    entityId: productId,
    details: { newStockCount: safeCount },
    ipAddress: clientIp,
  });

  return {
    success: true,
    item: inv,
  };
}

// =============================================================================
// BUSINESS LOGIC: SECURE ORDER EXPORT (ADMIN ONLY, FORMULA INJECTION PROTECTED)
// =============================================================================

export function exportOrdersAdminServer(
  format: "csv" | "json",
  token?: string | null
): { mimeType: string; filename: string; data: string } {
  initializeStore();
  const authCheck = verifyServerAdminToken(token);
  if (!authCheck.authorized) {
    throw new Error("Unauthorized: Administrator session required to export orders");
  }

  if (format === "json") {
    // Strip internal debug fields, return clean array
    const sanitized = memoryOrders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail || "",
      addressLine: o.shippingAddress.addressLine,
      cityVillage: o.shippingAddress.cityVillage,
      state: o.shippingAddress.state,
      pincode: o.shippingAddress.pincode,
      itemsCount: o.items.length,
      itemsSummary: o.items.map((i) => `${i.productName} (x${i.quantity})`).join("; "),
      subtotal: o.subtotal,
      shippingCharge: o.shippingCharge,
      discount: o.discount,
      total: o.total,
      paymentMethod: o.paymentMethod,
      orderStatus: o.orderStatus,
      trackingNumber: o.trackingNumber,
    }));

    return {
      mimeType: "application/json",
      filename: `shifa_orders_export_${Date.now()}.json`,
      data: JSON.stringify(sanitized, null, 2),
    };
  }

  // CSV Export with Formula Injection Mitigation (RFC 4180 + leading character sanitization)
  const headers = [
    "Order ID",
    "Created At",
    "Customer Name",
    "Phone Number",
    "Email",
    "Address",
    "City/Village",
    "State",
    "PIN Code",
    "Items",
    "Subtotal (INR)",
    "Shipping (INR)",
    "Discount (INR)",
    "Total (INR)",
    "Payment Method",
    "Status",
    "Tracking Number",
  ];

  const escapeCsv = (val: unknown): string => {
    let str = String(val ?? "").replace(/"/g, '""');
    // Prevent Excel formula execution: prepend tab/apostrophe if starts with =, +, -, @
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const rows = memoryOrders.map((o) => [
    escapeCsv(o.id),
    escapeCsv(o.createdAt),
    escapeCsv(o.customerName),
    escapeCsv(o.customerPhone),
    escapeCsv(o.customerEmail || ""),
    escapeCsv(o.shippingAddress.addressLine),
    escapeCsv(o.shippingAddress.cityVillage),
    escapeCsv(o.shippingAddress.state),
    escapeCsv(o.shippingAddress.pincode),
    escapeCsv(o.items.map((i) => `${i.productName} x${i.quantity}`).join("; ")),
    escapeCsv(o.subtotal),
    escapeCsv(o.shippingCharge),
    escapeCsv(o.discount),
    escapeCsv(o.total),
    escapeCsv(o.paymentMethod),
    escapeCsv(o.orderStatus),
    escapeCsv(o.trackingNumber),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  return {
    mimeType: "text/csv; charset=utf-8",
    filename: `shifa_orders_export_${Date.now()}.csv`,
    data: csvContent,
  };
}

// =============================================================================
// CUSTOMER ORDER STATUS LOOKUP (REQUIRES BOTH ORDER ID AND MATCHING PHONE)
// Prevents enumeration / IDOR attacks while allowing customers to verify status
// =============================================================================

export interface CustomerTrackingItem {
  productId: string;
  productName: string;
  productImage: string;
  packSize: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface CustomerTrackingResponse {
  id: string;
  orderStatus: ServerOrderStatus;
  createdAt: string;
  updatedAt: string;
  customerNameMasked: string;
  customerPhoneMasked: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryPincode: string;
  items: CustomerTrackingItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
  itemsCount: number;
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber: string;
  hasTrackingNumber: boolean;
  statusHistory: OrderStatusHistoryItem[];
  carrierNotes: string;
  isWhatsAppConfirmedByCustomer: boolean;
  estimatedDeliveryWindow: string;
}

function maskCustomerName(name: string): string {
  if (!name) return "ग्राहक (Customer)";
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => {
      if (p.length <= 1) return p;
      return p[0] + "*".repeat(Math.min(3, p.length - 1));
    })
    .join(" ");
}

function maskCustomerPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length <= 4) return "******";
  return "******" + digits.slice(-4);
}

export function trackOrderCustomerServer(orderId: string, phoneInput: string): CustomerTrackingResponse {
  initializeStore();
  const cleanId = (orderId || "").trim();
  const cleanPhone = (phoneInput || "").replace(/[^0-9]/g, "");

  if (!cleanId) {
    throw new Error("Order ID is required (ऑर्डर संदर्भ आईडी आवश्यक है)");
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error("Valid 10-digit mobile number is required to look up your order (मान्य 10-अंकीय मोबाइल नंबर आवश्यक है)");
  }

  const order = memoryOrders.find((o) => o.id.toLowerCase() === cleanId.toLowerCase());
  if (!order) {
    throw new Error("No matching order found with provided ID and mobile number (इस ऑर्डर आईडी और मोबाइल नंबर से मेल खाता कोई ऑर्डर नहीं मिला)");
  }

  const orderPhoneClean = order.customerPhone.replace(/[^0-9]/g, "");
  // Compare last 10 digits
  if (!orderPhoneClean.endsWith(cleanPhone.slice(-10))) {
    throw new Error("No matching order found with provided ID and mobile number (इस ऑर्डर आईडी और मोबाइल नंबर से मेल खाता कोई ऑर्डर नहीं मिला)");
  }

  let carrierNotes = "पार्सल स्पीड पोस्ट अथवा स्थानीय कूरियर द्वारा प्रेषित किया जाता है।";
  let estimatedDeliveryWindow = "3-5 कार्यदिवस";

  if (order.orderStatus === "Order Received" || order.orderStatus === "Pending Confirmation") {
    carrierNotes = "आपका ऑर्डर अनुरोध सिस्टम में दर्ज है। हकीम जी द्वारा उत्पाद उपलब्धता और पते की समीक्षा उपरांत पुष्टि की जाएगी।";
    estimatedDeliveryWindow = "पुष्टि उपरांत 4-7 कार्यदिवस";
  } else if (order.orderStatus === "Confirmed") {
    carrierNotes = "हकीम जी द्वारा आपके ऑर्डर की पुष्टि कर दी गई है। दवाइयां तैयार करने की प्रक्रिया शुरू हो चुकी है।";
    estimatedDeliveryWindow = "पुष्टि से 3-6 कार्यदिवस";
  } else if (order.orderStatus === "Processing") {
    carrierNotes = "दवाइयों का शुद्ध आयुर्वेदिक फार्मूलेशन तैयार कर सुरक्षित एवं गोपनीय (Discreet) पैकेजिंग की जा रही है।";
    estimatedDeliveryWindow = "डिस्पैच उपरांत 3-5 कार्यदिवस";
  } else if (order.orderStatus === "Shipped") {
    carrierNotes = order.trackingNumber
      ? `पार्सल स्पीड पोस्ट / कूरियर द्वारा डिस्पैच किया जा चुका है। डाक/कूरियर संदर्भ: ${order.trackingNumber}`
      : "पार्सल डाक सेवा / कूरियर को सुपुर्द कर दिया गया है। सामान्यतः 3-5 कार्यदिवसों में सुपुर्दगी होती है।";
    estimatedDeliveryWindow = "2-4 कार्यदिवस";
  } else if (order.orderStatus === "Out for Delivery") {
    carrierNotes = "पार्सल आपके निकटतम डाकघर/कूरियर वितरण केंद्र से सुपुर्दगी हेतु निकल चुका है।";
    estimatedDeliveryWindow = "आज अथवा 24 घंटे के भीतर";
  } else if (order.orderStatus === "Delivered") {
    carrierNotes = "पार्सल सफलतापूर्वक सुपुर्द हो चुका है। किसी भी स्वास्थ्य परामर्श या प्रश्न हेतु हकीम जी से संपर्क करें।";
    estimatedDeliveryWindow = "डिलीवर हो चुका है";
  } else if (order.orderStatus === "Cancelled") {
    carrierNotes = "यह ऑर्डर निरस्त/रद्द किया जा चुका है।" + (order.notes ? ` (विवरण: ${order.notes})` : "");
    estimatedDeliveryWindow = "लागू नहीं";
  }

  const statusHistory =
    Array.isArray(order.statusHistory) && order.statusHistory.length > 0
      ? order.statusHistory
      : [
          {
            status: order.orderStatus,
            timestamp: order.createdAt,
            notes: "Order recorded in Shifa A Hayat backend",
            updatedBy: "System",
          },
        ];

  return {
    id: order.id,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerNameMasked: maskCustomerName(order.customerName),
    customerPhoneMasked: maskCustomerPhone(order.customerPhone),
    deliveryCity: order.shippingAddress.cityVillage,
    deliveryState: order.shippingAddress.state,
    deliveryPincode: order.shippingAddress.pincode,
    items: order.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      productImage: i.productImage,
      packSize: i.packSize,
      quantity: i.quantity,
      price: i.price,
      lineTotal: i.lineTotal,
    })),
    subtotal: order.subtotal,
    shippingCharge: order.shippingCharge,
    discount: order.discount,
    total: order.total,
    itemsCount: order.items.length,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    trackingNumber: order.trackingNumber || "",
    hasTrackingNumber: Boolean(order.trackingNumber && order.trackingNumber.trim().length > 0),
    statusHistory,
    carrierNotes,
    isWhatsAppConfirmedByCustomer: order.isWhatsAppConfirmedByCustomer,
    estimatedDeliveryWindow,
  };
}

// =============================================================================
// BUSINESS LOGIC: STORE SETTINGS RETRIEVAL & ADMIN MUTATION
// =============================================================================

export function getSettingsServer(): ServerStoreSettings {
  initializeStore();
  return { ...memorySettings };
}

export function updateSettingsAdminServer(
  newSettings: Partial<ServerStoreSettings>,
  token?: string | null,
  clientIp = "admin-client"
): ServerStoreSettings {
  initializeStore();
  const authCheck = verifyServerAdminToken(token);
  if (!authCheck.authorized) {
    throw new Error(authCheck.error || "Unauthorized: Administrator session required to update store settings");
  }

  // Input validation
  if (newSettings.storeName !== undefined && newSettings.storeName.trim().length < 2) {
    throw new Error("Store name must be at least 2 characters");
  }
  if (newSettings.phone !== undefined) {
    const clean = newSettings.phone.replace(/[^0-9]/g, "");
    if (clean.length < 10) throw new Error("Phone number must have at least 10 digits");
  }
  if (newSettings.whatsapp !== undefined) {
    const clean = newSettings.whatsapp.replace(/[^0-9]/g, "");
    if (clean.length < 10) throw new Error("WhatsApp number must have at least 10 digits");
  }
  if (
    newSettings.freeShippingThreshold !== undefined &&
    (typeof newSettings.freeShippingThreshold !== "number" || newSettings.freeShippingThreshold < 0)
  ) {
    throw new Error("Free shipping threshold cannot be negative");
  }
  if (
    newSettings.standardShippingFee !== undefined &&
    (typeof newSettings.standardShippingFee !== "number" || newSettings.standardShippingFee < 0)
  ) {
    throw new Error("Standard shipping fee cannot be negative");
  }

  memorySettings = {
    ...memorySettings,
    ...newSettings,
    adminPin: memorySettings.adminPin || "9586", // Protect server admin PIN
  };

  persistSettingsToDisk();

  logAdminAudit({
    adminEmail: authCheck.adminEmail || AUTHORIZED_ADMIN_EMAIL,
    action: "UPDATE_STORE_SETTINGS",
    entityType: "SETTINGS",
    entityId: "STORE",
    details: {
      storeName: memorySettings.storeName,
      freeShippingThreshold: memorySettings.freeShippingThreshold,
      standardShippingFee: memorySettings.standardShippingFee,
    },
    ipAddress: clientIp,
  });

  return { ...memorySettings };
}

// =============================================================================
// BUSINESS LOGIC: PRODUCT CATALOG RETRIEVAL & ADMIN MUTATION
// =============================================================================

export function getProductsServer(): Product[] {
  initializeStore();
  return [...memoryProducts];
}

export function updateProductAdminServer(
  updated: Partial<Product> & { id: string },
  token?: string | null,
  clientIp = "admin-client"
): Product {
  initializeStore();
  const authCheck = verifyServerAdminToken(token);
  if (!authCheck.authorized) {
    throw new Error(authCheck.error || "Unauthorized: Administrator session required to update product catalog");
  }

  const idx = memoryProducts.findIndex((p) => p.id === updated.id);
  if (idx === -1) {
    throw new Error(`Product not found: ${updated.id}`);
  }

  if (updated.price !== undefined && (typeof updated.price !== "number" || updated.price < 1)) {
    throw new Error("Product price must be at least ₹1");
  }
  if (updated.stockCount !== undefined && (typeof updated.stockCount !== "number" || updated.stockCount < 0)) {
    throw new Error("Stock count cannot be negative");
  }

  const existing = memoryProducts[idx]!;
  const merged: Product = {
    ...existing,
    ...updated,
    price: updated.price !== undefined ? Math.max(1, Math.floor(updated.price)) : existing.price,
    stockCount: updated.stockCount !== undefined ? Math.max(0, Math.floor(updated.stockCount)) : existing.stockCount,
  };
  merged.inStock = (merged.stockCount ?? 0) > 0 && merged.inStock !== false;

  memoryProducts[idx] = merged;
  persistProductsToDisk();

  // Also update memoryInventory
  let inv = memoryInventory.get(merged.id);
  if (inv) {
    inv.stockCount = merged.stockCount ?? 0;
    inv.inStock = merged.inStock;
    inv.updatedAt = new Date().toISOString();
  } else {
    inv = {
      id: merged.id,
      stockCount: merged.stockCount ?? 0,
      inStock: merged.inStock,
      updatedAt: new Date().toISOString(),
    };
    memoryInventory.set(merged.id, inv);
  }
  persistInventoryToDisk();

  logAdminAudit({
    adminEmail: authCheck.adminEmail || AUTHORIZED_ADMIN_EMAIL,
    action: "UPDATE_PRODUCT",
    entityType: "PRODUCT",
    entityId: merged.id,
    details: {
      name: merged.name,
      price: merged.price,
      stockCount: merged.stockCount ?? 0,
    },
    ipAddress: clientIp,
  });

  return merged;
}

