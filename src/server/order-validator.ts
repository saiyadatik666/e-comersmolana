import { INITIAL_PRODUCTS, Product } from "@/data/products";

export interface ServerOrderItemInput {
  productId: string;
  quantity: number;
  packSize?: string | undefined;
}

export interface ServerCustomerInput {
  fullName: string;
  phone: string;
  addressLine: string;
  cityVillage: string;
  state: string;
  pincode: string;
  country?: string | undefined;
  landmark?: string | undefined;
  email?: string | undefined;
}

export interface ValidatedOrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  packSize: string;
  lineTotal: number;
}

export interface ValidatedOrderCalculation {
  isValid: boolean;
  errors: string[];
  customer: {
    fullName: string;
    phone: string;
    addressLine: string;
    cityVillage: string;
    state: string;
    pincode: string;
    country: string;
    landmark?: string | undefined;
    email?: string | undefined;
  };
  items: ValidatedOrderItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  appliedCoupon: string | null;
  total: number;
  wasPriceTampered: boolean;
  tamperingDetails?: string | undefined;
  whatsAppMessage: string;
  whatsAppUrl: string;
}

export const FREE_SHIPPING_THRESHOLD = 499;
export const STANDARD_SHIPPING_FEE = 50;
export const STORE_WHATSAPP_NUMBER = "+91 95860 37331";

/**
 * Validates and recalculates an order entirely on the server.
 * Never trusts prices, subtotal, shipping charge, or discounts sent from the client.
 */
export function validateAndCalculateOrder(payload: {
  customer: ServerCustomerInput;
  items: ServerOrderItemInput[];
  couponCode?: string | null | undefined;
  clientClaimedSubtotal?: number | undefined;
  clientClaimedTotal?: number | undefined;
  origin?: string | undefined;
}): ValidatedOrderCalculation {
  const errors: string[] = [];
  const rawCustomer = payload.customer || {};

  // Helper to strip control characters and normalize whitespace
  const sanitizeText = (val: unknown, maxLen: number): string => {
    if (typeof val !== "string") return "";
    return (
      val
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Strip non-printable control characters
        .trim()
        .slice(0, maxLen)
    );
  };

  // 1. Sanitize Customer Data with strict bounds
  const fullName = sanitizeText(rawCustomer.fullName, 100);
  const rawPhone = (rawCustomer.phone || "").replace(/[^0-9]/g, "");
  const phone = rawPhone.slice(0, 15);
  const addressLine = sanitizeText(rawCustomer.addressLine, 250);
  const cityVillage = sanitizeText(rawCustomer.cityVillage, 80);
  const state = sanitizeText(rawCustomer.state, 80);
  const pincode = (rawCustomer.pincode || "").replace(/[^0-9]/g, "").slice(0, 6);
  const country = sanitizeText(rawCustomer.country || "India", 60);
  const landmark = rawCustomer.landmark ? sanitizeText(rawCustomer.landmark, 100) : undefined;
  const email = rawCustomer.email ? sanitizeText(rawCustomer.email, 100) : undefined;

  if (!fullName || fullName.length < 2) {
    errors.push("कृपया अपना पूरा नाम लिखें (Full name must be at least 2 characters)");
  }
  if (!phone || phone.length < 10) {
    errors.push("कृपया मान्य 10 अंकों का मोबाइल नंबर भरें (Valid 10-digit phone number is required)");
  } else if (phone.length > 13) {
    errors.push("मोबाइल नंबर 13 अंकों से अधिक नहीं हो सकता (Phone number exceeds maximum length)");
  }
  if (!addressLine || addressLine.length < 5) {
    errors.push("कृपया पूरा डिलीवरी पता लिखें (Delivery address must be at least 5 characters)");
  }
  if (!cityVillage || cityVillage.length < 2) {
    errors.push("कृपया शहर या गाँव का नाम लिखें (City or Village is required)");
  }
  if (!state) {
    errors.push("कृपया राज्य का नाम लिखें (State is required)");
  }
  if (!pincode || pincode.length !== 6) {
    errors.push("कृपया 6 अंकों का सही पिनकोड भरें (6-digit PIN code is required)");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("कृपया मान्य ईमेल पता लिखें (Invalid email address format)");
  }

  // 2. Validate Items & Recalculate Prices from Catalog
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push("ऑर्डर में कम से कम एक उत्पाद होना चाहिए (Order must contain at least one item)");
  }

  const validatedItems: ValidatedOrderItem[] = [];
  let computedSubtotal = 0;

  if (Array.isArray(payload.items)) {
    for (const rawItem of payload.items) {
      if (!rawItem || !rawItem.productId) {
        errors.push("अमान्य उत्पाद ID (Invalid product ID)");
        continue;
      }

      const catalogProduct = INITIAL_PRODUCTS.find((p) => p.id === rawItem.productId);
      if (!catalogProduct) {
        errors.push(`उत्पाद "${rawItem.productId}" कैटलॉग में नहीं मिला (Product not found)`);
        continue;
      }

      const rawQty = typeof rawItem.quantity === "number" ? Math.floor(rawItem.quantity) : 1;
      const quantity = Math.max(1, Math.min(99, rawQty));
      const authenticPrice = catalogProduct.price;
      const lineTotal = authenticPrice * quantity;

      computedSubtotal += lineTotal;
      validatedItems.push({
        productId: catalogProduct.id,
        productName: catalogProduct.name,
        productImage: catalogProduct.image,
        price: authenticPrice,
        quantity,
        packSize: rawItem.packSize || catalogProduct.packSize,
        lineTotal,
      });
    }
  }

  // 3. Compute Server-Side Shipping Charge
  const shippingCharge =
    computedSubtotal >= FREE_SHIPPING_THRESHOLD || computedSubtotal === 0
      ? 0
      : STANDARD_SHIPPING_FEE;

  // 4. Compute Server-Side Coupon Discount
  let discount = 0;
  let appliedCoupon: string | null = null;
  const cleanCoupon = (payload.couponCode || "").trim().toUpperCase();

  if (cleanCoupon === "SHIFA10") {
    discount = Math.round(computedSubtotal * 0.1);
    appliedCoupon = "SHIFA10";
  } else if (cleanCoupon === "AYURVEDA50") {
    discount = Math.min(50, computedSubtotal);
    appliedCoupon = "AYURVEDA50";
  } else if (cleanCoupon === "FREECOD") {
    discount = shippingCharge;
    appliedCoupon = "FREECOD";
  } else if (cleanCoupon.length > 0) {
    errors.push(`कूपन कोड "${cleanCoupon}" अमान्य है (Invalid coupon code)`);
  }

  const computedTotal = Math.max(0, computedSubtotal + shippingCharge - discount);

  // 5. Tampering Detection
  let wasPriceTampered = false;
  let tamperingDetails: string | undefined;

  if (
    payload.clientClaimedSubtotal !== undefined &&
    payload.clientClaimedSubtotal !== computedSubtotal
  ) {
    wasPriceTampered = true;
    tamperingDetails = `Client claimed subtotal ₹${payload.clientClaimedSubtotal}, server verified ₹${computedSubtotal}`;
  }
  if (
    payload.clientClaimedTotal !== undefined &&
    payload.clientClaimedTotal !== computedTotal
  ) {
    wasPriceTampered = true;
    tamperingDetails = (tamperingDetails ? tamperingDetails + " | " : "") +
      `Client claimed total ₹${payload.clientClaimedTotal}, server verified ₹${computedTotal}`;
  }

  // 6. Build WhatsApp Message & Direct Order URL
  const origin =
    payload.origin &&
    (payload.origin.startsWith("https://") || payload.origin.startsWith("http://localhost"))
      ? payload.origin.replace(/[\r\n\t]/g, "").trim()
      : "https://shifa-a-hayat.com";
  let msg = "SHIFA A HAYAT — NEW ORDER REQUEST\n\n";
  msg += "CUSTOMER DETAILS\n";
  msg += `- Full name: ${fullName}\n`;
  msg += `- Mobile number: ${phone}\n`;
  msg += `- Complete delivery address: ${addressLine}\n`;
  msg += `- City or village: ${cityVillage}\n`;
  msg += `- State: ${state}\n`;
  msg += `- PIN code: ${pincode}\n`;
  msg += `- Country: ${country}\n`;
  if (landmark) {
    msg += `- Landmark: ${landmark}\n`;
  }
  if (email) {
    msg += `- Email: ${email}\n`;
  }

  msg += "\nPRODUCT DETAILS\n";
  validatedItems.forEach((item, index) => {
    const itemPrefix = validatedItems.length > 1 ? `[Product #${index + 1}] ` : "";
    const catalogItem = INITIAL_PRODUCTS.find((p) => p.id === item.productId);
    const hindiName = catalogItem ? ` (${catalogItem.nameHindi})` : "";
    msg += `${itemPrefix}- Product name: ${item.productName}${hindiName}\n`;
    msg += `  Quantity: ${item.quantity}\n`;
    msg += `  Pack size: ${item.packSize}\n`;
    msg += `  Price per unit: ₹${item.price}\n`;
    msg += `  Item total: ₹${item.lineTotal}\n`;
    msg += `  Product link: ${origin}/product/${item.productId}\n\n`;
  });

  msg += "BILLING & ORDER SUMMARY\n";
  msg += `- Subtotal (सामग्री मूल्य): ₹${computedSubtotal}\n`;
  msg += `- Delivery fee (डिलीवरी शुल्क): ${shippingCharge === 0 ? "FREE (मुफ्त - ऑर्डर ₹499 से अधिक)" : `₹${shippingCharge}`}\n`;
  if (discount > 0) {
    msg += `- Discount (${appliedCoupon}): -₹${discount}\n`;
  }
  msg += `- Total amount payable (कुल देय राशि): ₹${computedTotal}\n`;
  msg += "- Payment method: Cash on Delivery / UPI upon merchant confirmation\n";
  msg += "\nNote: This order request has been verified by the Shifa A Hayat security server.";

  const cleanWaNumber = STORE_WHATSAPP_NUMBER.replace(/[^0-9]/g, "");
  const encodedMsg = encodeURIComponent(msg);
  const whatsAppUrl = `https://wa.me/${cleanWaNumber}?text=${encodedMsg}`;

  return {
    isValid: errors.length === 0,
    errors,
    customer: {
      fullName,
      phone,
      addressLine,
      cityVillage,
      state,
      pincode,
      country,
      landmark,
      email,
    },
    items: validatedItems,
    subtotal: computedSubtotal,
    shippingCharge,
    discount,
    appliedCoupon,
    total: computedTotal,
    wasPriceTampered,
    tamperingDetails,
    whatsAppMessage: msg,
    whatsAppUrl,
  };
}
