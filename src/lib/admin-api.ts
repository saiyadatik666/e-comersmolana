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
  .validator(
    (data: {
      orderId: string;
      status: string;
      adminToken?: string | undefined;
      notes?: string | undefined;
      trackingNumber?: string | undefined;
    }) => data
  )
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { updateOrderStatusSecure } = await import("@/server/store-functions");
    return updateOrderStatusSecure(
      data.orderId,
      data.status,
      data.adminToken || cookieToken,
      "admin-client",
      data.notes,
      data.trackingNumber
    );
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

export const adminGetSettingsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getStoreSettingsSecure } = await import("@/server/store-functions");
    return getStoreSettingsSecure();
  });

export const adminUpdateSettingsServerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      settings: Partial<import("@/server/order-store").ServerStoreSettings>;
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
    const { updateStoreSettingsSecure } = await import("@/server/store-functions");
    return updateStoreSettingsSecure(data.settings, data?.adminToken || cookieToken);
  });

export const adminGetProductsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getStoreProductsSecure } = await import("@/server/store-functions");
    return getStoreProductsSecure();
  });

export const adminUpdateProductServerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      product: Partial<import("@/data/products").Product> & { id: string };
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
    const { updateStoreProductSecure } = await import("@/server/store-functions");
    return updateStoreProductSecure(data.product, data?.adminToken || cookieToken);
  });

export type ReviewStatus = "approved" | "pending" | "rejected";

export interface StoredReview {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  title: string;
  comment: string;
  authorName: string;
  authorMasked: string;
  city?: string | undefined;
  isVerifiedPurchase: boolean;
  verifiedOrderId?: string | undefined;
  verifiedOrderIdMasked?: string | undefined;
  customerPhoneMasked?: string | undefined;
  status: ReviewStatus;
  adminReply?: string | undefined;
  adminReplyAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
  ipHash?: string | undefined;
}

export const adminListReviewsServerFn = createServerFn({ method: "POST" })
  .validator((data: { filter?: import("@/server/review-store").AdminReviewFilter; adminToken?: string } = {}) => data)
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { adminListReviewsServer } = await import("@/server/review-store");
    return adminListReviewsServer(data?.filter || {}, data?.adminToken || cookieToken);
  });

export const adminModerateReviewServerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      reviewId: string;
      status: import("@/server/review-store").ReviewStatus;
      adminReply?: string;
      adminToken?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { adminModerateReviewServer } = await import("@/server/review-store");
    return adminModerateReviewServer(
      {
        reviewId: data.reviewId,
        status: data.status,
        adminReply: data.adminReply,
      },
      data?.adminToken || cookieToken
    );
  });

export const adminDeleteReviewServerFn = createServerFn({ method: "POST" })
  .validator((data: { reviewId: string; adminToken?: string }) => data)
  .handler(async ({ data }) => {
    let cookieToken: string | null = null;
    try {
      cookieToken = getCookie("shifa_admin_session") || null;
    } catch (err) {
      void err;
    }
    const { adminDeleteReviewServer } = await import("@/server/review-store");
    return adminDeleteReviewServer(data.reviewId, data?.adminToken || cookieToken);
  });



