import { Product } from "@/data/products";
import { Order, StoreSettings } from "@/context/StoreContext";

export type SafeStoreSettings = Omit<StoreSettings, "adminPin">;

export interface StoreBackupPayload {
  version: "1.0";
  exportedAt: string;
  source: string;
  summary: {
    productsCount: number;
    ordersCount: number;
    hasCustomSettings: boolean;
  };
  products: Product[];
  orders: Order[];
  settings: SafeStoreSettings;
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  payload?: StoreBackupPayload;
}

/**
 * Creates a structured, portable backup payload from current store state.
 * SECURITY: Never exports passwords, admin PINs, session tokens, or API secrets (Part 22 Rule 8).
 */
export function createBackupPayload(
  products: Product[],
  orders: Order[],
  settings: StoreSettings
): StoreBackupPayload {
  // Strip out admin PIN and any private credentials
  const { adminPin: _omittedPin, ...safeSettings } = settings;

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    source: "Shifa A Hayat Admin Portal",
    summary: {
      productsCount: products.length,
      ordersCount: orders.length,
      hasCustomSettings: true,
    },
    products: products.map((p) => ({
      ...p,
      price: Math.max(1, Math.floor(p.price) || 1),
      stockCount: Math.max(0, Math.floor(p.stockCount) || 0),
    })),
    orders,
    settings: safeSettings,
  };
}

/**
 * Validates an uploaded JSON backup payload before importing.
 * Strictly verifies schema structure and rejects malformed, negative, or injected records.
 */
export function validateBackupPayload(data: unknown): BackupValidationResult {
  if (!data || typeof data !== "object") {
    return { isValid: false, error: "बैकअप फ़ाइल अमान्य है (File is not a valid JSON object)" };
  }

  const payload = data as Partial<StoreBackupPayload>;

  if (payload.version !== "1.0") {
    return {
      isValid: false,
      error: "असमर्थित बैकअप संस्करण (Unsupported backup version. Expected '1.0')",
    };
  }

  if (!Array.isArray(payload.products)) {
    return { isValid: false, error: "उत्पाद सूची अनुपलब्ध है (Products array is missing)" };
  }

  if (payload.products.length > 500) {
    return {
      isValid: false,
      error: "उत्पाद सूची सीमा से अधिक है (Products array exceeds maximum limit of 500)",
    };
  }

  if (!Array.isArray(payload.orders)) {
    return { isValid: false, error: "ऑर्डर्स सूची अनुपलब्ध है (Orders array is missing)" };
  }

  if (payload.orders.length > 10000) {
    return {
      isValid: false,
      error: "ऑर्डर सूची सीमा से अधिक है (Orders array exceeds maximum limit of 10,000)",
    };
  }

  if (!payload.settings || typeof payload.settings !== "object") {
    return { isValid: false, error: "स्टोर सेटिंग्स अनुपलब्ध हैं (Settings object is missing)" };
  }

  // Deep validation of product records
  for (const prod of payload.products) {
    if (!prod || !prod.id || typeof prod.id !== "string" || !prod.name || typeof prod.name !== "string") {
      return {
        isValid: false,
        error: `उत्पाद रिकॉर्ड दूषित है (Corrupted product record: ${prod?.id || "unknown"})`,
      };
    }
    if (typeof prod.price !== "number" || isNaN(prod.price) || prod.price < 0) {
      return {
        isValid: false,
        error: `उत्पाद की कीमत अमान्य है (Invalid price for: ${prod.id})`,
      };
    }
    if (prod.stockCount !== undefined && (typeof prod.stockCount !== "number" || isNaN(prod.stockCount) || prod.stockCount < 0)) {
      return {
        isValid: false,
        error: `उत्पाद का स्टॉक अमान्य है (Invalid stock count for: ${prod.id})`,
      };
    }
  }

  // Deep validation of order records
  for (const ord of payload.orders) {
    if (!ord || !ord.id || typeof ord.id !== "string" || !ord.customerName || typeof ord.customerName !== "string") {
      return {
        isValid: false,
        error: `ऑर्डर रिकॉर्ड दूषित है (Corrupted order record: ${ord?.id || "unknown"})`,
      };
    }
    if (typeof ord.total !== "number" || isNaN(ord.total) || ord.total < 0) {
      return {
        isValid: false,
        error: `ऑर्डर की कुल राशि अमान्य है (Invalid total for order: ${ord.id})`,
      };
    }
  }

  // Sanitize incoming settings: strip any injected security properties
  const sanitizedSettings = { ...(payload.settings as Record<string, unknown>) };
  delete sanitizedSettings["adminPin"];
  delete sanitizedSettings["password"];
  delete sanitizedSettings["token"];
  delete sanitizedSettings["secret"];

  return {
    isValid: true,
    payload: {
      ...payload,
      settings: sanitizedSettings as SafeStoreSettings,
    } as StoreBackupPayload,
  };
}

/**
 * Triggers a secure browser file download for JSON backup.
 */
export function downloadBackupJson(payload: StoreBackupPayload, filename?: string): void {
  if (typeof window === "undefined") return;

  const dateStr = new Date().toISOString().split("T")[0] || "backup";
  const safeFilename = filename || `shifa-a-hayat-backup-${dateStr}.json`;

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts order records into RFC-4180 compliant CSV for offline spreadsheet recovery.
 */
export function convertOrdersToCSV(orders: Order[]): string {
  const headers = [
    "Order ID",
    "Date",
    "Customer Name",
    "Mobile Number",
    "Email",
    "Delivery Address",
    "City/Village",
    "State",
    "PIN Code",
    "Items Count",
    "Items Summary",
    "Subtotal (INR)",
    "Shipping (INR)",
    "Discount (INR)",
    "Total (INR)",
    "Payment Method",
    "Order Status",
    "Tracking Number",
  ];

  const escapeCsv = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = orders.map((ord) => {
    const itemsSummary = ord.items
      .map((i) => `${i.productName} (x${i.quantity})`)
      .join("; ");

    return [
      escapeCsv(ord.id),
      escapeCsv(new Date(ord.createdAt).toLocaleString("en-IN")),
      escapeCsv(ord.customerName),
      escapeCsv(ord.customerPhone),
      escapeCsv(ord.customerEmail || ""),
      escapeCsv(ord.shippingAddress?.addressLine || ""),
      escapeCsv(ord.shippingAddress?.city || ""),
      escapeCsv(ord.shippingAddress?.state || ""),
      escapeCsv(ord.shippingAddress?.pincode || ""),
      escapeCsv(ord.items.reduce((sum, i) => sum + i.quantity, 0)),
      escapeCsv(itemsSummary),
      escapeCsv(ord.subtotal),
      escapeCsv(ord.shippingCharge),
      escapeCsv(ord.discount),
      escapeCsv(ord.total),
      escapeCsv(ord.paymentMethod),
      escapeCsv(ord.orderStatus),
      escapeCsv(ord.trackingNumber || ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Triggers browser file download for orders CSV.
 */
export function downloadOrdersCsv(orders: Order[], filename?: string): void {
  if (typeof window === "undefined") return;

  const dateStr = new Date().toISOString().split("T")[0] || "orders";
  const safeFilename = filename || `shifa-orders-${dateStr}.csv`;

  const csv = convertOrdersToCSV(orders);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
