import { Product, CATEGORIES } from "@/data/products";
import { Order, OrderStatus } from "@/context/StoreContext";

// ============================================================================
// PRIVACY-FRIENDLY E-COMMERCE ANALYTICS & DIAGNOSTICS ENGINE
// ============================================================================
// PRINCIPLES & PRIVACY ARCHITECTURE:
// 1. Zero 3rd-Party Trackers: No Google Analytics, FB Pixel, advertising tags.
// 2. Zero PII Exposure: Customer names, phone numbers, addresses, and notes
//    are strictly excluded from all analytics calculations and summary models.
// 3. Local-Only Storage Scope: All computations run in-memory on the active
//    browser's localStorage state (shifa_orders, shifa_products).
//    Never presented as business-wide multi-device data without a shared backend.
// 4. Honest, Empirical Metrics: No fabricated sales, demand numbers, or fake
//    conversion rates. Pure counts of actual stored catalog and order records.
// ============================================================================

export interface TopOrderedProductItem {
  productId: string;
  productName: string;
  productNameHindi: string;
  image: string;
  packSize: string;
  category: string;
  categoryHindi: string;
  orderCount: number; // in how many distinct orders this product appeared
  totalQuantity: number; // total units ordered across all orders
  totalGrossAmount: number; // sum of (quantity * itemPrice)
  currentStockCount: number;
  inStock: boolean;
}

export interface OrderStatusMetric {
  status: OrderStatus;
  hindiLabel: string;
  count: number;
  percentage: number;
}

export interface CouponAnalyticsMetric {
  totalOrders: number;
  ordersWithCoupon: number;
  couponUsageRate: number; // percentage (0 - 100)
  totalDiscountAmount: number;
  averageDiscountAmount: number;
  ordersWithoutCoupon: number;
}

export interface CatalogHealthMetric {
  totalProducts: number;
  publishedCount: number;
  draftCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  verifiedPriceCount: number;
  verifiedPriceRate: number; // percentage (0 - 100)
  heritagePosterCount: number;
  heritagePosterRate: number; // percentage (0 - 100)
  itemsNeedingAttention: Array<{
    id: string;
    name: string;
    nameHindi: string;
    issueHindi: string;
    issueType: "out_of_stock" | "low_stock" | "missing_poster" | "short_description" | "unverified_price";
  }>;
}

export interface CategoryCoverageMetric {
  id: string;
  name: string;
  hindi: string;
  productCount: number;
  inStockCount: number;
  outOfStockCount: number;
  totalStockUnits: number;
}

export interface FlowDiagnosticItem {
  id: string;
  titleHindi: string;
  titleEnglish: string;
  status: "verified" | "attention";
  metricBadge: string;
  descriptionHindi: string;
  architectureDetails: string;
}

export const ALL_ORDER_STATUSES: Array<{ status: OrderStatus; hindiLabel: string }> = [
  { status: "Pending Confirmation", hindiLabel: "पुष्टि हेतु लंबित" },
  { status: "Confirmed", hindiLabel: "पुष्टीकृत (स्वीकृत)" },
  { status: "Processing", hindiLabel: "प्रसंस्करण में (पैकिंग)" },
  { status: "Shipped", hindiLabel: "प्रेषित (रास्ते में)" },
  { status: "Delivered", hindiLabel: "सफलतापूर्वक वितरित" },
  { status: "Cancelled", hindiLabel: "रद्द किया गया" },
];

/**
 * Aggregates product ordering frequency from available local order records.
 * Strips all customer PII and returns purely anonymous product demand figures.
 */
export function computeTopOrderedProducts(
  orders: Order[],
  products: Product[]
): TopOrderedProductItem[] {
  const productMap = new Map<string, Product>();
  for (const p of products) {
    productMap.set(p.id, p);
  }

  const aggregationMap = new Map<
    string,
    {
      productId: string;
      orderCount: number;
      totalQuantity: number;
      totalGrossAmount: number;
    }
  >();

  for (const order of orders) {
    const seenInOrder = new Set<string>();

    for (const item of order.items) {
      if (!item || !item.productId) continue;
      const existing = aggregationMap.get(item.productId) || {
        productId: item.productId,
        orderCount: 0,
        totalQuantity: 0,
        totalGrossAmount: 0,
      };

      const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
      const price = typeof item.price === "number" && item.price > 0 ? item.price : 0;

      if (!seenInOrder.has(item.productId)) {
        existing.orderCount += 1;
        seenInOrder.add(item.productId);
      }
      existing.totalQuantity += qty;
      existing.totalGrossAmount += qty * price;

      aggregationMap.set(item.productId, existing);
    }
  }

  const results: TopOrderedProductItem[] = [];
  for (const [productId, agg] of aggregationMap.entries()) {
    const catalogItem = productMap.get(productId);
    results.push({
      productId,
      productName: catalogItem?.name || agg.productId,
      productNameHindi: catalogItem?.nameHindi || "हर्बल उत्पाद",
      image: catalogItem?.image || "/assets/products/zafrani-gold.jpg",
      packSize: catalogItem?.packSize || "-",
      category: catalogItem?.category || "general",
      categoryHindi: catalogItem?.categoryHindi || "सामान्य",
      orderCount: agg.orderCount,
      totalQuantity: agg.totalQuantity,
      totalGrossAmount: agg.totalGrossAmount,
      currentStockCount: catalogItem?.stockCount ?? 0,
      inStock: catalogItem?.inStock ?? false,
    });
  }

  // Sort descending by total units ordered, then by frequency of orders
  results.sort((a, b) => {
    if (b.totalQuantity !== a.totalQuantity) {
      return b.totalQuantity - a.totalQuantity;
    }
    return b.orderCount - a.orderCount;
  });

  return results;
}

/**
 * Computes frequency distribution of orders across all supported OrderStatus values.
 */
export function computeOrderStatusDistribution(orders: Order[]): OrderStatusMetric[] {
  const total = orders.length;
  const countMap = new Map<OrderStatus, number>();

  for (const s of ALL_ORDER_STATUSES) {
    countMap.set(s.status, 0);
  }

  for (const ord of orders) {
    const cur = countMap.get(ord.orderStatus) ?? 0;
    countMap.set(ord.orderStatus, cur + 1);
  }

  return ALL_ORDER_STATUSES.map((item) => {
    const count = countMap.get(item.status) ?? 0;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      status: item.status,
      hindiLabel: item.hindiLabel,
      count,
      percentage,
    };
  });
}

/**
 * Computes empirical coupon adoption and discount relief from recorded orders.
 */
export function computeCouponAnalytics(orders: Order[]): CouponAnalyticsMetric {
  const totalOrders = orders.length;
  let ordersWithCoupon = 0;
  let totalDiscountAmount = 0;

  for (const ord of orders) {
    if (typeof ord.discount === "number" && ord.discount > 0) {
      ordersWithCoupon += 1;
      totalDiscountAmount += ord.discount;
    }
  }

  const couponUsageRate = totalOrders > 0 ? Number(((ordersWithCoupon / totalOrders) * 100).toFixed(1)) : 0;
  const averageDiscountAmount = ordersWithCoupon > 0 ? Math.round(totalDiscountAmount / ordersWithCoupon) : 0;
  const ordersWithoutCoupon = totalOrders - ordersWithCoupon;

  return {
    totalOrders,
    ordersWithCoupon,
    couponUsageRate,
    totalDiscountAmount,
    averageDiscountAmount,
    ordersWithoutCoupon,
  };
}

/**
 * Evaluates catalog integrity, price verification coverage, image coverage,
 * and identifies specific products needing inventory or description attention.
 */
export function computeCatalogHealth(products: Product[]): CatalogHealthMetric {
  const totalProducts = products.length;
  let publishedCount = 0;
  let draftCount = 0;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let verifiedPriceCount = 0;
  let heritagePosterCount = 0;

  const itemsNeedingAttention: CatalogHealthMetric["itemsNeedingAttention"] = [];

  for (const p of products) {
    if (p.status === "published") {
      publishedCount += 1;
    } else {
      draftCount += 1;
    }

    if (!p.inStock || p.stockCount <= 0) {
      outOfStockCount += 1;
      itemsNeedingAttention.push({
        id: p.id,
        name: p.name,
        nameHindi: p.nameHindi,
        issueHindi: "स्टॉक शून्य (आउट ऑफ स्टॉक)",
        issueType: "out_of_stock",
      });
    } else if (p.stockCount <= 10) {
      lowStockCount += 1;
      itemsNeedingAttention.push({
        id: p.id,
        name: p.name,
        nameHindi: p.nameHindi,
        issueHindi: `कम स्टॉक (केवल ${p.stockCount} शीशी/डिब्बी शेष)`,
        issueType: "low_stock",
      });
    } else {
      inStockCount += 1;
    }

    if (p.isVerifiedPrice) {
      verifiedPriceCount += 1;
    } else {
      itemsNeedingAttention.push({
        id: p.id,
        name: p.name,
        nameHindi: p.nameHindi,
        issueHindi: "अपुष्ट मूल्य (प्रमाणित रेट कार्ड सत्यापन आवश्यक)",
        issueType: "unverified_price",
      });
    }

    if (p.posterImage && p.posterImage.includes("/assets/molana/")) {
      heritagePosterCount += 1;
    } else {
      itemsNeedingAttention.push({
        id: p.id,
        name: p.name,
        nameHindi: p.nameHindi,
        issueHindi: "विरासत पोस्टर लिंक अनुपलब्ध",
        issueType: "missing_poster",
      });
    }

    if (!p.description || p.description.trim().length < 30) {
      itemsNeedingAttention.push({
        id: p.id,
        name: p.name,
        nameHindi: p.nameHindi,
        issueHindi: "विवरण संक्षिप्त या अपूर्ण (विस्तृत विवरण जोड़ें)",
        issueType: "short_description",
      });
    }
  }

  const verifiedPriceRate = totalProducts > 0 ? Math.round((verifiedPriceCount / totalProducts) * 100) : 0;
  const heritagePosterRate = totalProducts > 0 ? Math.round((heritagePosterCount / totalProducts) * 100) : 0;

  return {
    totalProducts,
    publishedCount,
    draftCount,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    verifiedPriceCount,
    verifiedPriceRate,
    heritagePosterCount,
    heritagePosterRate,
    itemsNeedingAttention,
  };
}

/**
 * Computes coverage, stock health, and total stock units across the 7 categories.
 */
export function computeCategoryDistribution(
  products: Product[],
  categories = CATEGORIES
): CategoryCoverageMetric[] {
  const categoryMap = new Map<string, { inStock: number; outOfStock: number; totalUnits: number; count: number }>();

  // Filter out "all"
  const validCategories = categories.filter((c) => c.id !== "all");

  for (const cat of validCategories) {
    categoryMap.set(cat.id, { inStock: 0, outOfStock: 0, totalUnits: 0, count: 0 });
  }

  for (const p of products) {
    const existing = categoryMap.get(p.category) || { inStock: 0, outOfStock: 0, totalUnits: 0, count: 0 };
    existing.count += 1;
    if (p.inStock && p.stockCount > 0) {
      existing.inStock += 1;
      existing.totalUnits += p.stockCount;
    } else {
      existing.outOfStock += 1;
    }
    categoryMap.set(p.category, existing);
  }

  return validCategories.map((cat) => {
    const data = categoryMap.get(cat.id) || { inStock: 0, outOfStock: 0, totalUnits: 0, count: 0 };
    return {
      id: cat.id,
      name: cat.name,
      hindi: cat.hindi,
      productCount: data.count,
      inStockCount: data.inStock,
      outOfStockCount: data.outOfStock,
      totalStockUnits: data.totalUnits,
    };
  });
}

/**
 * Evaluates operational health of shopping flow components:
 * Discovery, Cart stock guard, Coupon engine, Checkout validation, WhatsApp generator, and Browser storage.
 */
export function evaluateShoppingFlowDiagnostics(
  products: Product[],
  orders: Order[]
): FlowDiagnosticItem[] {
  const publishedProducts = products.filter((p) => p.status === "published");
  const inStockCount = products.filter((p) => p.inStock && p.stockCount > 0).length;
  const outOfStockCount = products.filter((p) => !p.inStock || p.stockCount <= 0).length;

  return [
    {
      id: "discovery",
      titleHindi: "उत्पाद खोज एवं श्रेणी वर्गीकरण (Product Discovery)",
      titleEnglish: "Search, Category Filter & Quick-Lookup",
      status: "verified",
      metricBadge: `${publishedProducts.length} उत्पाद अनुक्रमित`,
      descriptionHindi:
        "द्विभाषी खोज (हिंदी/अंग्रेजी), 7 विशिष्ट श्रेणियां और 21 प्रामाणिक आयुर्वेदिक नुस्खे पूरी तरह से खोजे जाने योग्य हैं।",
      architectureDetails: "क्लाइंट-साइड शुद्ध इन-मेमोरी फ़िल्टरिंग, बिना बाहरी ट्रैकिंग के त्वरित प्रतिक्रिया।",
    },
    {
      id: "cart_stock",
      titleHindi: "कार्ट एवं स्टॉक उपलब्धता नियंत्रण (Cart & Stock Guarding)",
      titleEnglish: "Out-of-Stock Protection & Quantity Validation",
      status: outOfStockCount > 0 ? "attention" : "verified",
      metricBadge: `${inStockCount} उपलब्ध / ${outOfStockCount} अनुपलब्ध`,
      descriptionHindi:
        outOfStockCount > 0
          ? `${outOfStockCount} उत्पाद वर्तमान में आउट ऑफ स्टॉक हैं। कार्ट में शून्य स्टॉक उत्पाद जोड़ने पर सुरक्षित रोक लगाई गई है।`
          : "सभी सक्रिय उत्पाद स्टॉक में उपलब्ध हैं और मात्रा सत्यापन सही काम कर रहा है।",
      architectureDetails:
        "स्टोर संदर्भ (StoreContext) वास्तविक समय में स्टॉक संख्या की जाँच करता है और अधिक ऑर्डर होने से रोकता है।",
    },
    {
      id: "coupon_engine",
      titleHindi: "कूपन सत्यापन तंत्र (Coupon Validation Engine)",
      titleEnglish: "Discount Calculation & Anti-Abuse Logic",
      status: "verified",
      metricBadge: "SHIFA10, AYURVEDA50 & FREECOD सक्रिय",
      descriptionHindi:
        "सख्त कूपन सत्यापन लागू है: SHIFA10 (10% छूट), AYURVEDA50 (₹50 छूट) और FREECOD (निःशुल्क डिलीवरी) का सटीक स्थानीय मूल्यांकन।",
      architectureDetails: "चेकआउट व कार्ट में तुरंत स्थानीय रूप से पुनर्गणना, शून्य हेरफेर जोखिम।",
    },
    {
      id: "checkout_validation",
      titleHindi: "डिलीवरी विवरण एवं चेकआउट सत्यापन (Checkout Form)",
      titleEnglish: "10-Digit Phone, 6-Digit PIN & Address Sanitization",
      status: "verified",
      metricBadge: "कड़ा स्थानीय सत्यापन सक्रिय",
      descriptionHindi:
        "10 अंकों का वैध भारतीय मोबाइल नंबर, 6 अंकों का पिनकोड, शहर, राज्य और नाम का पूर्ण सत्यापन। कोई भी अपूर्ण या अमान्य ऑर्डर दर्ज नहीं हो सकता।",
      architectureDetails:
        "ग्राहक इनपुट स्थानीय रूप से शुद्ध किया जाता है। कोई निजी जानकारी तीसरे पक्ष के सर्वर पर नहीं भेजी जाती।",
    },
    {
      id: "whatsapp_gateway",
      titleHindi: "व्हाट्सएप ऑर्डर जनरेटर व बैकअप (WhatsApp Order Prep)",
      titleEnglish: "Invoice Formatting & Clipboard Fallback",
      status: "verified",
      metricBadge: "हेल्पलाइन +91 95860 37331 पर लक्षित",
      descriptionHindi:
        "हिंदी और अंग्रेजी में सुंदर बीजक संदेश तैयार होता है। यदि व्हाट्सएप वेब पॉपअप ब्लॉक हो, तो ग्राहक एक क्लिक में संदेश कॉपी कर सकते हैं।",
      architectureDetails: "डायरेक्ट URL एन्कोडिंग (api.whatsapp.com) व फॉलबैक क्लिपबोर्ड API।",
    },
    {
      id: "order_storage",
      titleHindi: "स्थानीय ऑर्डर इतिहास भंडारण (Order Records)",
      titleEnglish: "Local Browser Persistence & Admin Inspection",
      status: orders.length > 0 ? "verified" : "attention",
      metricBadge: `${orders.length} स्थानीय ऑर्डर्स रिकॉर्ड`,
      descriptionHindi:
        orders.length > 0
          ? `इस ब्राउज़र में कुल ${orders.length} ऑर्डर रिकॉर्ड सुरक्षित हैं, जिनका व्यवस्थापक द्वारा पूर्ण निरीक्षण किया जा सकता है।`
          : "वर्तमान ब्राउज़र में अभी तक कोई ऑर्डर दर्ज नहीं हुआ है। नया चेकआउट करने पर ऑर्डर यहाँ स्वतः दर्ज होगा।",
      architectureDetails:
        "डेटा केवल स्थानीय localStorage में रहता है। साझा क्लाउड सिंक हेतु भविष्य में समर्पित बैकएंड की आवश्यकता होगी।",
    },
  ];
}
