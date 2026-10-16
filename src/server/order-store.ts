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
let memoryOrders: StoredOrder[] = [];
const memoryInventory: Map<string, InventoryItem> = new Map();
let isInitialized = false;

function initializeStore(): void {
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

// Reset store state (used for testing and explicit admin catalog resets)
export function resetServerStoreForTesting(): void {
  memoryOrders = [];
  memoryInventory.clear();
  isInitialized = false;
  initializeStore();
}

// =============================================================================
// BUSINESS LOGIC: SERVER-SIDE ORDER CREATION WITH ATOMIC STOCK DEDUCTION
// =============================================================================

export interface CreateOrderPayload {
  customer: ServerCustomerInput;
  items: ServerOrderItemInput[];
  couponCode?: string | null | undefined;
  paymentMethod?: "WhatsApp Direct Order" | "COD" | "ONLINE_UPI" | undefined;
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

  logAdminAudit({
    adminEmail: authCheck.adminEmail || AUTHORIZED_ADMIN_EMAIL,
    action: "UPDATE_ORDER_STATUS",
    entityType: "ORDER",
    entityId: orderId,
    details: { previousStatus: prevStatus, newStatus, notes, trackingNumber },
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

export function trackOrderCustomerServer(orderId: string, phoneInput: string): {
  id: string;
  orderStatus: ServerOrderStatus;
  createdAt: string;
  total: number;
  itemsCount: number;
  trackingNumber: string;
  deliveryCity: string;
} {
  initializeStore();
  const cleanId = (orderId || "").trim();
  const cleanPhone = (phoneInput || "").replace(/[^0-9]/g, "");

  if (!cleanId) {
    throw new Error("Order ID is required");
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error("Valid 10-digit mobile number is required to look up your order");
  }

  const order = memoryOrders.find((o) => o.id.toLowerCase() === cleanId.toLowerCase());
  if (!order) {
    throw new Error("No matching order found with provided ID and mobile number");
  }

  const orderPhoneClean = order.customerPhone.replace(/[^0-9]/g, "");
  // Compare last 10 digits
  if (!orderPhoneClean.endsWith(cleanPhone.slice(-10))) {
    throw new Error("No matching order found with provided ID and mobile number");
  }

  return {
    id: order.id,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
    total: order.total,
    itemsCount: order.items.length,
    trackingNumber: order.trackingNumber,
    deliveryCity: order.shippingAddress.cityVillage,
  };
}
