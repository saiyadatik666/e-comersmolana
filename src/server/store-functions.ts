import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  validateAndCalculateOrder,
  ServerCustomerInput,
  ServerOrderItemInput,
  ValidatedOrderCalculation,
} from "./order-validator";
import {
  adminRateLimiter,
  logAdminAudit,
  getAdminAuditLogs,
  sanitizeServerError,
  verifyServerAdminToken,
} from "./admin-auth";

export interface BackendStatusReport {
  supabaseConfigured: boolean;
  projectUrl: string;
  tablesLive: boolean;
  activeAdapter: "supabase" | "local_fallback";
  message: string;
}

/**
 * Public Server Function: Validates order submission and recalculates prices on the server.
 * Never trusts prices or totals sent by the browser.
 */
export const validateOrderServerFn = createServerFn({ method: "POST" })
  .validator((data: {
    customer: ServerCustomerInput;
    items: ServerOrderItemInput[];
    couponCode?: string | null;
    clientClaimedSubtotal?: number;
    clientClaimedTotal?: number;
    origin?: string;
  }) => data)
  .handler(async ({ data }): Promise<ValidatedOrderCalculation> => {
    return validateAndCalculateOrder(data);
  });

/**
 * Diagnostic Server Function: Tests whether the Supabase project has active database tables.
 */
export const checkBackendStatusServerFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<BackendStatusReport> => {
    const supabaseUrl = process.env['SUPABASE_URL'] || "https://ibahpesvwawsarbkthio.supabase.co";
    const publishableKey = process.env['SUPABASE_PUBLISHABLE_KEY'] || "sb_publishable_9LnBsk9E5GcRTid6QY0gGA_ffxCGUeS";

    try {
      const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/products?select=id&limit=1`, {
        headers: {
          apikey: publishableKey,
        },
      });

      if (response.ok) {
        return {
          supabaseConfigured: true,
          projectUrl: supabaseUrl,
          tablesLive: true,
          activeAdapter: "supabase",
          message: "Supabase PostgreSQL tables are active and connected.",
        };
      }

      return {
        supabaseConfigured: true,
        projectUrl: supabaseUrl,
        tablesLive: false,
        activeAdapter: "local_fallback",
        message: "Supabase project reachable, but database schema migration is pending (tables not yet created). Local adapter active.",
      };
    } catch {
      return {
        supabaseConfigured: !!supabaseUrl,
        projectUrl: supabaseUrl || "Not configured",
        tablesLive: false,
        activeAdapter: "local_fallback",
        message: "Unable to reach database server. Local browser storage adapter active.",
      };
    }
  });

/**
 * Protected Admin Server Function: Update product inventory with server-side authorization & audit trail.
 */
export const adminUpdateProductStockServerFn = createServerFn({ method: "POST" })
  .validator((data: { productId: string; newStockCount: number; adminToken?: string }) => data)
  .handler(async ({ data }) => {
    const req = getRequest();
    const token = data.adminToken || (req?.headers?.get("authorization") ?? "");

    // Rate Limiting Check
    const clientIp = req?.headers?.get("x-forwarded-for") || "admin-client";
    const rateCheck = adminRateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      throw new Error(`Too many attempts. Cooldown in effect: ${rateCheck.lockoutRemainingSeconds}s`);
    }

    // Verify Admin Authorization
    const authCheck = verifyServerAdminToken(token);
    if (!authCheck.authorized) {
      adminRateLimiter.recordFailure(clientIp);
      throw new Error(authCheck.error || "Unauthorized administrative action");
    }

    if (data.newStockCount < 0) {
      throw new Error("Stock count cannot be negative");
    }

    // Record in Audit Trail
    const audit = logAdminAudit({
      adminEmail: authCheck.adminEmail || "admin@shifa-a-hayat.com",
      action: "UPDATE_PRODUCT_STOCK",
      entityType: "PRODUCT",
      entityId: data.productId,
      details: { newStockCount: data.newStockCount },
      ipAddress: clientIp,
    });

    return {
      success: true,
      productId: data.productId,
      updatedStock: data.newStockCount,
      auditId: audit.id,
    };
  });

/**
 * Protected Admin Server Function: Update order status with server-side authorization & audit trail.
 */
export const adminUpdateOrderStatusServerFn = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; status: string; adminToken?: string }) => data)
  .handler(async ({ data }) => {
    const req = getRequest();
    const token = data.adminToken || (req?.headers?.get("authorization") ?? "");

    const clientIp = req?.headers?.get("x-forwarded-for") || "admin-client";
    const authCheck = verifyServerAdminToken(token);
    if (!authCheck.authorized) {
      adminRateLimiter.recordFailure(clientIp);
      throw new Error(authCheck.error || "Unauthorized administrative action");
    }

    const validStatuses = [
      "Pending Confirmation",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!validStatuses.includes(data.status)) {
      throw new Error(`Invalid status: ${data.status}`);
    }

    const audit = logAdminAudit({
      adminEmail: authCheck.adminEmail || "admin@shifa-a-hayat.com",
      action: "UPDATE_ORDER_STATUS",
      entityType: "ORDER",
      entityId: data.orderId,
      details: { newStatus: data.status },
      ipAddress: clientIp,
    });

    return {
      success: true,
      orderId: data.orderId,
      updatedStatus: data.status,
      auditId: audit.id,
    };
  });

/**
 * Protected Admin Server Function: Fetch audit logs.
 */
export const adminGetAuditLogsServerFn = createServerFn({ method: "POST" })
  .validator((data: { adminToken?: string }) => data)
  .handler(async ({ data }) => {
    const req = getRequest();
    const token = data.adminToken || (req?.headers?.get("authorization") ?? "");

    const authCheck = verifyServerAdminToken(token);
    if (!authCheck.authorized) {
      throw new Error("Unauthorized: Admin authorization required");
    }

    return {
      success: true,
      logs: getAdminAuditLogs(),
    };
  });
