import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export interface PublicProductReview {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  title: string;
  comment: string;
  authorMasked: string;
  city?: string | undefined;
  isVerifiedPurchase: boolean;
  verifiedOrderIdMasked?: string | undefined;
  createdAt: string;
  adminReply?: string | undefined;
  adminReplyAt?: string | undefined;
}

export interface ProductReviewStats {
  averageRating: number;
  totalReviews: number;
  verifiedCount: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  ratingPercentages: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface PublicProductReviewsPayload {
  productId: string;
  reviews: PublicProductReview[];
  stats: ProductReviewStats;
}

export interface SubmitReviewInput {
  productId: string;
  rating: number;
  title: string;
  comment: string;
  authorName: string;
  city?: string | undefined;
  orderId?: string | undefined;
  phone?: string | undefined;
  botField?: string | undefined;
}

export const getProductReviewsServerFn = createServerFn({ method: "GET" })
  .validator((data: { productId: string }) => data)
  .handler(async ({ data }): Promise<PublicProductReviewsPayload> => {
    const { getProductReviewsServer } = await import("@/server/review-store");
    return getProductReviewsServer(data.productId);
  });

export const submitProductReviewServerFn = createServerFn({ method: "POST" })
  .validator((data: SubmitReviewInput) => data)
  .handler(async ({ data }) => {
    let clientIp = "127.0.0.1";
    try {
      const req = getRequest();
      clientIp =
        req?.headers?.get("cf-connecting-ip") ||
        req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "127.0.0.1";
    } catch {
      clientIp = "127.0.0.1";
    }
    const { submitProductReviewServer } = await import("@/server/review-store");
    return submitProductReviewServer(data, clientIp);
  });
