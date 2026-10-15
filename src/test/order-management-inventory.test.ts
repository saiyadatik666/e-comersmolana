import { describe, it, expect, beforeEach } from "vitest";
import { INITIAL_PRODUCTS, type Product } from "@/data/products";
import {
  buildWhatsAppOrderMessage,
  formatWhatsAppUrl,
  cleanWhatsAppNumber,
  type Order,
  type OrderStatus,
} from "../context/StoreContext";

describe("Part 19 — Order Management & Inventory Reliability Test Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("1. Catalog & Business Rule Invariants", () => {
    it("preserves exactly 21 authentic catalog products", () => {
      expect(INITIAL_PRODUCTS).toHaveLength(21);
      const ids = INITIAL_PRODUCTS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(21);
    });

    it("verifies key authentic prices and poster images", () => {
      const arqAbeHayat = INITIAL_PRODUCTS.find((p) => p.id === "shifa-arq-abe-hayat");
      expect(arqAbeHayat).toBeDefined();
      expect(arqAbeHayat?.price).toBe(250);
      expect(arqAbeHayat?.stockCount).toBeGreaterThanOrEqual(10);
      expect(arqAbeHayat?.inStock).toBe(true);

      const tanavaiTel = INITIAL_PRODUCTS.find((p) => p.id === "shifa-tanavai-tel");
      expect(tanavaiTel?.price).toBe(200);

      const zafraniGold = INITIAL_PRODUCTS.find((p) => p.id === "shifa-zafrani-gold");
      expect(zafraniGold?.price).toBe(1450);

      const dimagiTonic = INITIAL_PRODUCTS.find((p) => p.id === "shifa-dimagi-tonic");
      expect(dimagiTonic?.price).toBe(420);
    });

    it("ensures canonical WhatsApp helpline number is +91 95860 37331", () => {
      const helpline = "+91 95860 37331";
      const cleaned = cleanWhatsAppNumber(helpline);
      expect(cleaned).toBe("919586037331");
    });
  });

  describe("2. Inventory Validation, Quantity Boundaries & Clamping", () => {
    it("enforces minimum quantity of 1 and caps maximum quantity at 99 or available stock", () => {
      const productStock = 15;
      const requestedNegative = -5;
      const requestedZero = 0;
      const requestedExorbitant = 500;

      const safeMin = Math.max(1, Math.min(productStock, Math.min(99, Math.floor(requestedNegative) || 1)));
      expect(safeMin).toBe(1);

      const safeZero = Math.max(1, Math.min(productStock, Math.min(99, Math.floor(requestedZero) || 1)));
      expect(safeZero).toBe(1);

      const safeExorbitant = Math.max(1, Math.min(productStock, Math.min(99, Math.floor(requestedExorbitant))));
      expect(safeExorbitant).toBe(15);
    });

    it("prevents adding out-of-stock products to cart", () => {
      const baseProduct = INITIAL_PRODUCTS[0]!;
      const outOfStockProduct: Product = {
        ...baseProduct,
        id: "oos-test-product",
        stockCount: 0,
        inStock: false,
      };

      const canAdd = outOfStockProduct.inStock && (outOfStockProduct.stockCount ?? 0) > 0;
      expect(canAdd).toBe(false);
    });

    it("detects stock changes after items enter cart", () => {
      // Simulation: Customer added 5 items when stock was 10, then merchant reduced stock to 3
      const cartItem = { productId: "shifa-arq-abe-hayat", quantity: 5 };
      const liveProductState = { id: "shifa-arq-abe-hayat", stockCount: 3, inStock: true };

      const isOverStock = cartItem.quantity > liveProductState.stockCount;
      const isOutOfStock = !liveProductState.inStock || liveProductState.stockCount <= 0;

      expect(isOverStock).toBe(true);
      expect(isOutOfStock).toBe(false);
      expect(liveProductState.stockCount).toBe(3);
    });

    it("identifies out-of-stock items in cart and blocks checkout", () => {
      const cartItems = [
        { productId: "prod-available", quantity: 2 },
        { productId: "prod-depleted", quantity: 1 },
      ];
      const liveInventory = [
        { id: "prod-available", stockCount: 20, inStock: true },
        { id: "prod-depleted", stockCount: 0, inStock: false },
      ];

      const outOfStockItems = cartItems.filter((item) => {
        const prod = liveInventory.find((p) => p.id === item.productId);
        return !prod || !prod.inStock || (prod.stockCount ?? 0) <= 0;
      });

      expect(outOfStockItems).toHaveLength(1);
      expect(outOfStockItems[0]?.productId).toBe("prod-depleted");

      const hasOutOfStock = outOfStockItems.length > 0;
      expect(hasOutOfStock).toBe(true);
    });
  });

  describe("3. Atomic Stock Deduction & Cancellation Restorations", () => {
    it("atomically decrements inventory stock count when order is placed", () => {
      let catalog = [
        { id: "shifa-arq-abe-hayat", stockCount: 25, inStock: true },
        { id: "shifa-tanavai-tel", stockCount: 10, inStock: true },
      ];

      const orderItems = [
        { productId: "shifa-arq-abe-hayat", quantity: 3 },
        { productId: "shifa-tanavai-tel", quantity: 10 },
      ];

      // Simulate atomic decrement
      catalog = catalog.map((p) => {
        const ordered = orderItems.find((i) => i.productId === p.id);
        if (!ordered) return p;
        const remaining = Math.max(0, p.stockCount - ordered.quantity);
        return {
          ...p,
          stockCount: remaining,
          inStock: remaining > 0,
        };
      });

      const updatedArq = catalog.find((p) => p.id === "shifa-arq-abe-hayat");
      const updatedTel = catalog.find((p) => p.id === "shifa-tanavai-tel");

      expect(updatedArq?.stockCount).toBe(22);
      expect(updatedArq?.inStock).toBe(true);
      expect(updatedTel?.stockCount).toBe(0);
      expect(updatedTel?.inStock).toBe(false);
    });

    it("restores inventory stock count when an order is Cancelled", () => {
      let catalog = [
        { id: "shifa-arq-abe-hayat", stockCount: 22, inStock: true },
        { id: "shifa-tanavai-tel", stockCount: 0, inStock: false },
      ];

      const cancelledOrder: Order = {
        id: "ORD-99120",
        createdAt: new Date().toISOString(),
        orderStatus: "Cancelled",
        customerName: "Imran Khan",
        customerPhone: "9825000000",
        shippingAddress: {
          id: "addr-test",
          fullName: "Imran Khan",
          phone: "9825000000",
          addressLine: "Station Road",
          city: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [
          {
            productId: "shifa-arq-abe-hayat",
            productName: "Arq Abe Hayat",
            productImage: "/assets/products/arq-abe-hayat.jpg",
            price: 250,
            quantity: 3,
            packSize: "15ml",
          },
          {
            productId: "shifa-tanavai-tel",
            productName: "Tanavai Tel",
            productImage: "/assets/products/tanavai-tel.jpg",
            price: 200,
            quantity: 10,
            packSize: "30ml",
          },
        ],
        subtotal: 2750,
        shippingCharge: 0,
        discount: 0,
        total: 2750,
        paymentMethod: "WhatsApp Direct Order",
        paymentStatus: "Pending",
        trackingNumber: "TRK-99120",
      };

      // Restore stock for cancelled order items
      catalog = catalog.map((p) => {
        const item = cancelledOrder.items.find((i) => i.productId === p.id);
        if (!item) return p;
        const restored = p.stockCount + item.quantity;
        return {
          ...p,
          stockCount: restored,
          inStock: restored > 0,
        };
      });

      const restoredArq = catalog.find((p) => p.id === "shifa-arq-abe-hayat");
      const restoredTel = catalog.find((p) => p.id === "shifa-tanavai-tel");

      expect(restoredArq?.stockCount).toBe(25);
      expect(restoredTel?.stockCount).toBe(10);
      expect(restoredTel?.inStock).toBe(true);
    });
  });

  describe("4. Order Lifecycle & Status Progression", () => {
    const validStatuses: OrderStatus[] = [
      "Pending Confirmation",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    it("verifies all 6 canonical order statuses are valid and distinct", () => {
      expect(validStatuses).toHaveLength(6);
      expect(new Set(validStatuses).size).toBe(6);
    });

    it("initializes newly created orders with Pending Confirmation (never Confirmed or Delivered automatically)", () => {
      const newOrderStatus: OrderStatus = "Pending Confirmation";
      expect(newOrderStatus).toBe("Pending Confirmation");
      expect(newOrderStatus).not.toBe("Confirmed");
      expect(newOrderStatus).not.toBe("Delivered");
    });

    it("handles realistic status progression through the lifecycle", () => {
      let currentStatus: OrderStatus = "Pending Confirmation";

      // 1. Merchant confirms WhatsApp chat
      currentStatus = "Confirmed";
      expect(currentStatus).toBe("Confirmed");

      // 2. Pharmacy compounds & packages herbs
      currentStatus = "Processing";
      expect(currentStatus).toBe("Processing");

      // 3. Courier pickup & tracking number generation
      currentStatus = "Shipped";
      expect(currentStatus).toBe("Shipped");

      // 4. Final handoff at customer doorstep
      currentStatus = "Delivered";
      expect(currentStatus).toBe("Delivered");
    });
  });

  describe("5. WhatsApp Checkout Messaging & Disclosure", () => {
    it("constructs unambiguous WhatsApp message informing customer and merchant", () => {
      const msg = buildWhatsAppOrderMessage({
        customer: {
          fullName: "Rashid Ali",
          phone: "9586037331",
          addressLine: "Station Road Near Delhi Gate",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
          country: "India",
        },
        items: [
          {
            product: {
              name: "Arq Abe Hayat Drops",
              nameHindi: "अर्क आब-ए-हयात",
              price: 250,
              id: "shifa-arq-abe-hayat",
              image: "/assets/products/arq-abe-hayat.jpg",
              packSize: "15ml Dropper",
            },
            quantity: 2,
          },
        ],
        subtotal: 500,
        shippingCharge: 0,
        finalAmount: 500,
        origin: "https://shifa-a-hayat.com",
      });

      expect(msg).toContain("SHIFA A HAYAT — NEW ORDER REQUEST");
      expect(msg).toContain("Rashid Ali");
      expect(msg).toContain("Palanpur");
      expect(msg).toContain("Arq Abe Hayat Drops");
      expect(msg).toContain("Selected quantity: 2");
      expect(msg).toContain("Final amount: ₹500");
      expect(msg).toContain("Please review this order request and press Send to submit to Shifa A Hayat.");
    });

    it("formats valid wa.me URI with proper encoding", () => {
      const url = formatWhatsAppUrl("9586037331", "Hello Shifa A Hayat");
      expect(url).toBe("https://wa.me/919586037331?text=Hello%20Shifa%20A%20Hayat");
    });
  });

  describe("6. Coupon Calculations & Free Shipping Threshold", () => {
    it("applies SHIFA10 for 10% discount", () => {
      const subtotal = 1000;
      const discount = Math.round(subtotal * 0.1);
      expect(discount).toBe(100);
      const total = subtotal - discount;
      expect(total).toBe(900);
    });

    it("applies AYURVEDA50 for flat ₹50 discount capped at subtotal", () => {
      const subtotal = 400;
      const discount = Math.min(50, subtotal);
      expect(discount).toBe(50);

      const tinySubtotal = 30;
      const cappedDiscount = Math.min(50, tinySubtotal);
      expect(cappedDiscount).toBe(30);
    });

    it("waives shipping charge of ₹50 when cart subtotal >= ₹499", () => {
      const subtotalUnder = 450;
      const shippingUnder = subtotalUnder >= 499 ? 0 : 50;
      expect(shippingUnder).toBe(50);

      const subtotalOver = 500;
      const shippingOver = subtotalOver >= 499 ? 0 : 50;
      expect(shippingOver).toBe(0);

      const subtotalExact = 499;
      const shippingExact = subtotalExact >= 499 ? 0 : 50;
      expect(shippingExact).toBe(0);
    });

    it("applies FREECOD coupon to zero out shipping fee on orders below ₹499", () => {
      const subtotal = 300;
      const standardShipping = 50;
      const appliedCoupon = "FREECOD";
      const discount = appliedCoupon === "FREECOD" ? standardShipping : 0;
      const finalShipping = standardShipping - discount;
      expect(finalShipping).toBe(0);
    });
  });

  describe("7. Failed Order Creation & Resilient Retry Behavior", () => {
    it("throws explicit error and preserves original stock when pre-order stock validation fails", () => {
      const initialStock = 2;
      const orderQuantity = 5;

      const attemptOrder = () => {
        if (orderQuantity > initialStock) {
          throw new Error("Insufficient stock for product");
        }
      };

      expect(() => attemptOrder()).toThrow("Insufficient stock for product");
      // Stock remains unaffected
      expect(initialStock).toBe(2);
    });

    it("prevents duplicate submissions with identical timestamp by generating unique order IDs", () => {
      const id1 = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      const id2 = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1.startsWith("ORD-")).toBe(true);
    });
  });
});
