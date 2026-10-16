import { createServerFn } from "@tanstack/react-start";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";

export const adminCheckEmailServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const { validateAdminEmail } = await import("@/server/store-functions");
    return validateAdminEmail(data.email);
  });

export const adminLoginServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { authenticateAdminCredentials } = await import("@/server/store-functions");
    const { setCookie } = await import("@tanstack/react-start/server");
    const result = authenticateAdminCredentials(data.email, data.password);

    try {
      setCookie("shifa_admin_session", result.sessionToken, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60,
      });
    } catch (err) {
      void err;
    }

    return result;
  });

export const adminGetSessionServerFn = createServerFn({ method: "POST" })
  .validator((data: { adminToken?: string | undefined } = {}) => data)
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { getAdminSessionStatus } = await import("@/server/store-functions");
    const token = data?.adminToken || cookieToken;
    return getAdminSessionStatus(token);
  });

export const adminLogoutServerFn = createServerFn({ method: "POST" })
  .validator((data: { adminToken?: string | undefined } = {}) => data)
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
      deleteCookie("shifa_admin_session", { path: "/" });
    } catch (err) {
      void err;
    }
    const { logoutAdminSession } = await import("@/server/store-functions");
    const token = data?.adminToken || cookieToken;
    return logoutAdminSession(token);
  });

export const adminUpdateProductStockServerFn = createServerFn({ method: "POST" })
  .validator((data: { productId: string; newStockCount: number; adminToken?: string | undefined }) => data)
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { updateProductStockSecure } = await import("@/server/store-functions");
    return updateProductStockSecure(data.productId, data.newStockCount, data.adminToken || cookieToken);
  });

export const adminUpdateOrderStatusServerFn = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; status: string; adminToken?: string | undefined }) => data)
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { updateOrderStatusSecure } = await import("@/server/store-functions");
    return updateOrderStatusSecure(data.orderId, data.status, data.adminToken || cookieToken);
  });

export const adminChangePasswordServerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      currentPassword: string;
      newPassword: string;
      adminToken?: string | undefined;
    }) => data
  )
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { changeAdminPasswordSecure } = await import("@/server/store-functions");
    return changeAdminPasswordSecure(
      data.currentPassword,
      data.newPassword,
      data.adminToken || cookieToken
    );
  });

export const adminListOrdersServerFn = createServerFn({ method: "POST" })
  .validator((data: { adminToken?: string | undefined } = {}) => data)
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { listOrdersAdminSecure } = await import("@/server/store-functions");
    return listOrdersAdminSecure(data?.adminToken || cookieToken);
  });

export const adminGetOrderDetailsServerFn = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; adminToken?: string | undefined }) => data)
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { getOrderDetailsAdminSecure } = await import("@/server/store-functions");
    return getOrderDetailsAdminSecure(data.orderId, data?.adminToken || cookieToken);
  });

export const adminExportOrdersServerFn = createServerFn({ method: "POST" })
  .validator((data: { format: "csv" | "json"; adminToken?: string | undefined }) => data)
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { exportOrdersAdminSecure } = await import("@/server/store-functions");
    return exportOrdersAdminSecure(data.format, data?.adminToken || cookieToken);
  });

export const createOrderServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof import("@/server/store-functions")["submitStorefrontOrderSecure"]>[0]) => data)
  .handler(async ({ data }) => {
    const { submitStorefrontOrderSecure } = await import("@/server/store-functions");
    return submitStorefrontOrderSecure(data);
  });

export const trackOrderServerFn = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; phone: string }) => data)
  .handler(async ({ data }) => {
    const { trackCustomerOrderSecure } = await import("@/server/store-functions");
    return trackCustomerOrderSecure(data.orderId, data.phone);
  });

