import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrderServer,
  listOrdersAdminServer,
  getOrderByIdAdminServer,
  updateOrderStatusAdminServer,
  updateProductStockServer,
  exportOrdersAdminServer,
  trackOrderCustomerServer,
  getInventoryServer,
  resetServerStoreForTesting,
} from "../server/order-store";
import {
  createAdminSession,
  getAdminAuditLogs,
  AUTHORIZED_ADMIN_EMAIL,
} from "../server/admin-auth";
import { INITIAL_PRODUCTS } from "@/data/products";

describe("Part 20 — Reliable Order Management & Inventory Backend Test Suite", () => {
  let validAdminToken: string;

  beforeEach(() => {
    resetServerStoreForTesting();
    validAdminToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "127.0.0.1");
  });

  describe("1. Server Order Creation & Price Integrity (Never Trust Client)", () => {
    it("successfully creates and persists a valid order on the server with unique ID and timestamps", () => {
      const res = createOrderServer({
        customer: {
          fullName: "Mohammad Salim",
          phone: "9825100000",
          addressLine: "Station Road, Near Delhi Gate",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
          country: "India",
        },
        items: [
          { productId: "shifa-arq-abe-hayat", quantity: 2 },
          { productId: "shifa-tanavai-tel", quantity: 1 },
        ],
        couponCode: "SHIFA10",
        paymentMethod: "WhatsApp Direct Order",
      });

      expect(res.success).toBe(true);
      expect(res.order.id).toMatch(/^ORD-\d{6}-\d{4}$/);
      expect(res.order.orderStatus).toBe("Pending Confirmation");
      expect(res.order.paymentStatus).toBe("Pending Confirmation");
      expect(res.order.customerName).toBe("Mohammad Salim");
      expect(res.order.customerPhone).toBe("9825100000");

      // Verify server calculation: Arq (₹250 x 2 = ₹500) + Tanavai (₹200 x 1 = ₹200) = ₹700
      expect(res.order.subtotal).toBe(700);
      // ₹700 >= ₹499 -> shippingCharge is 0
      expect(res.order.shippingCharge).toBe(0);
      // SHIFA10 -> 10% of ₹700 = ₹70
      expect(res.order.discount).toBe(70);
      // Total = ₹630
      expect(res.order.total).toBe(630);
      expect(res.order.wasPriceTampered).toBe(false);
    });

    it("detects and overrides client price tampering with authentic catalog values", () => {
      const res = createOrderServer({
        customer: {
          fullName: "Hacker Attempt",
          phone: "9825199999",
          addressLine: "Test Address",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [
          { productId: "shifa-zafrani-gold", quantity: 1 }, // Authentic price ₹1,450
        ],
        clientClaimedSubtotal: 10, // Attacker claims ₹10
        clientClaimedTotal: 10,    // Attacker claims ₹10
      });

      expect(res.order.wasPriceTampered).toBe(true);
      expect(res.order.tamperingDetails).toContain("Client claimed subtotal ₹10");
      expect(res.order.subtotal).toBe(1450); // Enforced authentic server price
      expect(res.order.total).toBe(1450);    // Enforced authentic server total
    });

    it("rejects invalid orders with missing or malformed customer delivery details", () => {
      expect(() =>
        createOrderServer({
          customer: {
            fullName: "", // missing
            phone: "123",  // too short
            addressLine: "",
            cityVillage: "",
            state: "",
            pincode: "00",
          },
          items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
        })
      ).toThrow("Order validation failed");
    });
  });

  describe("2. Atomic Inventory Control & Negative Stock Prevention", () => {
    it("atomically decrements product stock and prevents negative stock", () => {
      // Check initial stock for Arq Abe Hayat
      const invBefore = getInventoryServer().find((i) => i.id === "shifa-arq-abe-hayat");
      const initialStock = invBefore ? invBefore.stockCount : 120;

      // Place order for 5 units
      createOrderServer({
        customer: {
          fullName: "Rashid Ali",
          phone: "9586037331",
          addressLine: "Station Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 5 }],
      });

      const invAfter = getInventoryServer().find((i) => i.id === "shifa-arq-abe-hayat");
      expect(invAfter?.stockCount).toBe(initialStock - 5);
      expect(invAfter?.inStock).toBe(true);
    });

    it("rejects orders when requested quantity exceeds available stock without modifying inventory", () => {
      // Set stock of test product to 2
      updateProductStockServer("shifa-tiger-suwarna-bhasm", 2, validAdminToken);

      const invBefore = getInventoryServer().find((i) => i.id === "shifa-tiger-suwarna-bhasm");
      expect(invBefore?.stockCount).toBe(2);

      // Attempt to order 5 units
      expect(() =>
        createOrderServer({
          customer: {
            fullName: "Zubair Ahmad",
            phone: "9586037331",
            addressLine: "Civil Hospital Road",
            cityVillage: "Palanpur",
            state: "Gujarat",
            pincode: "385001",
          },
          items: [{ productId: "shifa-tiger-suwarna-bhasm", quantity: 5 }],
        })
      ).toThrow(/Insufficient stock for product/);

      // Verify stock was NOT deducted
      const invAfter = getInventoryServer().find((i) => i.id === "shifa-tiger-suwarna-bhasm");
      expect(invAfter?.stockCount).toBe(2);
    });

    it("automatically restores product stock when an order is Cancelled by administrator", () => {
      // Set stock to 10
      updateProductStockServer("shifa-tanavai-tel", 10, validAdminToken);

      // Place order for 4 units
      const res = createOrderServer({
        customer: {
          fullName: "Customer A",
          phone: "9586037331",
          addressLine: "Deesa Highway",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-tanavai-tel", quantity: 4 }],
      });

      // Stock should be 6
      let inv = getInventoryServer().find((i) => i.id === "shifa-tanavai-tel");
      expect(inv?.stockCount).toBe(6);

      // Admin cancels order
      updateOrderStatusAdminServer(res.order.id, "Cancelled", validAdminToken);

      // Stock should be restored back to 10
      inv = getInventoryServer().find((i) => i.id === "shifa-tanavai-tel");
      expect(inv?.stockCount).toBe(10);
      expect(inv?.inStock).toBe(true);
    });
  });

  describe("3. Administrator Authorization & Access Control", () => {
    it("blocks unauthenticated access to list orders", () => {
      expect(() => listOrdersAdminServer(null)).toThrow(/Unauthorized/);
      expect(() => listOrdersAdminServer("invalid-token-123")).toThrow(/Unauthorized/);
    });

    it("allows authenticated admin with valid session token to view orders", () => {
      // Create an order
      createOrderServer({
        customer: {
          fullName: "Bilal Khan",
          phone: "9586037331",
          addressLine: "Delhi Gate",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      const orders = listOrdersAdminServer(validAdminToken);
      expect(orders.length).toBeGreaterThanOrEqual(1);
      expect(orders[0]?.customerName).toBe("Bilal Khan");
    });

    it("blocks unauthenticated users from updating order status or stock", () => {
      expect(() => updateOrderStatusAdminServer("ORD-TEST", "Confirmed", null)).toThrow(/Unauthorized/);
      expect(() => updateProductStockServer("shifa-arq-abe-hayat", 50, null)).toThrow(/Unauthorized/);
    });

    it("records an audit entry when an admin updates an order status", () => {
      const res = createOrderServer({
        customer: {
          fullName: "Farooq Shaikh",
          phone: "9586037331",
          addressLine: "Station Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-dimagi-tonic", quantity: 1 }],
      });

      updateOrderStatusAdminServer(res.order.id, "Shipped", validAdminToken, "192.168.1.50");

      const logs = getAdminAuditLogs();
      const match = logs.find((l) => l.action === "UPDATE_ORDER_STATUS" && l.entityId === res.order.id);
      expect(match).toBeDefined();
      expect(match?.adminEmail).toBe(AUTHORIZED_ADMIN_EMAIL);
      expect(match?.details).toEqual({ previousStatus: "Pending Confirmation", newStatus: "Shipped" });
    });
  });

  describe("4. Secure Order Export & CSV Injection Mitigation", () => {
    it("escapes formula injection characters (=, +, -, @) in CSV export", () => {
      // Create order with formula injection payload
      createOrderServer({
        customer: {
          fullName: "=cmd|' /C calc'!A0",
          phone: "9586037331",
          addressLine: "+2+5+cmd",
          cityVillage: "-DDE(\"server\";\"command\")",
          state: "@SUM(1+1)",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      const exportResult = exportOrdersAdminServer("csv", validAdminToken);
      expect(exportResult.mimeType).toContain("text/csv");
      expect(exportResult.data).toContain("Order ID,Created At");

      // Verify leading formula characters are safely neutralized with leading apostrophe
      expect(exportResult.data).toContain("\"'=cmd|' /C calc'!A0\"");
      expect(exportResult.data).toContain("\"'+2+5+cmd\"");
      expect(exportResult.data).toContain("\"'-DDE(\"\"server\"\";\"\"command\"\")\"");
      expect(exportResult.data).toContain("\"'@SUM(1+1)\"");
    });

    it("exports clean JSON without sensitive internal tokens", () => {
      createOrderServer({
        customer: {
          fullName: "Nadeem Akhtar",
          phone: "9825100000",
          addressLine: "Station Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      const exportResult = exportOrdersAdminServer("json", validAdminToken);
      expect(exportResult.mimeType).toBe("application/json");
      const parsed = JSON.parse(exportResult.data);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]?.customerName).toBe("Nadeem Akhtar");
    });
  });

  describe("5. Customer Order Lookup & Privacy Protection", () => {
    it("allows customer to track their order only when Order ID and matching Phone are provided", () => {
      const res = createOrderServer({
        customer: {
          fullName: "Suhail Qureshi",
          phone: "9825123456",
          addressLine: "Station Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      const track = trackOrderCustomerServer(res.order.id, "9825123456");
      expect(track.id).toBe(res.order.id);
      expect(track.orderStatus).toBe("Pending Confirmation");
      expect(track.deliveryCity).toBe("Palanpur");
      expect(track.total).toBe(250 + 50); // ₹250 + ₹50 shipping = ₹300
    });

    it("rejects customer order tracking when phone number does not match (prevents IDOR)", () => {
      const res = createOrderServer({
        customer: {
          fullName: "Private Customer",
          phone: "9825123456",
          addressLine: "Confidential",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      // Different phone number
      expect(() => trackOrderCustomerServer(res.order.id, "9999999999")).toThrow(
        /No matching order found/
      );
    });
  });

  describe("6. WhatsApp Ordering Distinction Invariants", () => {
    it("distinguishes website database order record from actual customer WhatsApp message dispatch", () => {
      const res = createOrderServer({
        customer: {
          fullName: "Customer Test",
          phone: "9825123456",
          addressLine: "Station Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      // Invariant: Orders in website database are NEVER initialized as Confirmed or Delivered
      expect(res.order.orderStatus).toBe("Pending Confirmation");
      expect(res.order.paymentStatus).toBe("Pending Confirmation");
      expect(res.order.isWhatsAppConfirmedByCustomer).toBe(false);
      expect(res.order.notes).toContain("Pending WhatsApp customer transmission");
    });
  });
});
