import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrderServer,
  trackOrderCustomerServer,
  updateOrderStatusAdminServer,
  resetServerStoreForTesting,
  ServerOrderStatus,
} from "@/server/order-store";
import {
  createAdminSession,
  AUTHORIZED_ADMIN_EMAIL,
} from "@/server/admin-auth";

describe("Shifa A Hayat — Real Customer Order Tracking & Fulfillment Verification Suite", () => {
  let adminToken: string;

  beforeEach(() => {
    resetServerStoreForTesting();
    adminToken = createAdminSession(AUTHORIZED_ADMIN_EMAIL, "admin-test-ip");
  });

  describe("1. Unique Order ID Generation & Persistence", () => {
    it("generates a high-entropy, unique order ID prefixed with ORD- for every order", () => {
      const order1 = createOrderServer({
        customer: {
          fullName: "Mohammad Rafiq Palanpuri",
          phone: "9825012345",
          addressLine: "Station Road, Near Post Office",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      const order2 = createOrderServer({
        customer: {
          fullName: "Abdul Hameed",
          phone: "9825098765",
          addressLine: "Delhi Gate",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-pehlwan-capsule", quantity: 1 }],
      });

      expect(order1.order.id).toMatch(/^ORD-\d{6}-\d{4}$/);
      expect(order2.order.id).toMatch(/^ORD-\d{6}-\d{4}$/);
      expect(order1.order.id).not.toBe(order2.order.id);
    });

    it("initializes every order with an initial audit history entry and honest pending status", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Sanjay Kumar",
          phone: "9876543210",
          addressLine: "Main Bazaar",
          cityVillage: "Ahmedabad",
          state: "Gujarat",
          pincode: "380001",
        },
        items: [{ productId: "shifa-zafrani-gold", quantity: 1 }],
      });

      expect(created.order.statusHistory).toBeDefined();
      expect(created.order.statusHistory.length).toBeGreaterThanOrEqual(1);
      expect(created.order.statusHistory[0]!.status).toBe("Pending Confirmation");
      expect(created.order.statusHistory[0]!.timestamp).toBeDefined();
      expect(created.order.statusHistory[0]!.updatedBy).toBe("System");
    });
  });

  describe("2. Customer Order Tracking & Verification", () => {
    it("allows a customer to track their order when Order ID and matching 10-digit Phone are provided", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Zubair Ahmad",
          phone: "9586037331",
          addressLine: "Madina Masjid Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [
          { productId: "shifa-arq-abe-hayat", quantity: 2 },
          { productId: "shifa-tanavai-tel", quantity: 1 },
        ],
      });

      const tracking = trackOrderCustomerServer(created.order.id, "9586037331");

      expect(tracking.id).toBe(created.order.id);
      expect(tracking.orderStatus).toBe("Pending Confirmation");
      expect(tracking.deliveryCity).toBe("Palanpur");
      expect(tracking.deliveryState).toBe("Gujarat");
      expect(tracking.deliveryPincode).toBe("385001");
      expect(tracking.items.length).toBe(2);
      expect(tracking.items[0]!.productName).toBe("Arq Abe Hayat Drops");
      expect(tracking.items[0]!.quantity).toBe(2);
      expect(tracking.items[0]!.price).toBe(250);
      expect(tracking.total).toBe(250 * 2 + 200); // ₹700 (Free shipping >= ₹500)
    });

    it("supports case-insensitive order ID lookup with leading/trailing spaces trimmed", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Tariq Mansuri",
          phone: "9123456789",
          addressLine: "College Road",
          cityVillage: "Vadodara",
          state: "Gujarat",
          pincode: "390001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      // Lowercase and padded with whitespace
      const tracking = trackOrderCustomerServer(
        `  ${created.order.id.toLowerCase()}  `,
        "+91 91234 56789"
      );
      expect(tracking.id).toBe(created.order.id);
    });

    it("rejects lookup if Order ID is blank or missing", () => {
      expect(() => trackOrderCustomerServer("", "9586037331")).toThrow(
        /Order ID is required/
      );
    });

    it("rejects lookup if mobile number is shorter than 10 digits", () => {
      expect(() => trackOrderCustomerServer("ORD-123456-7890", "9825")).toThrow(
        /Valid 10-digit mobile number is required/
      );
    });
  });

  describe("3. Customer Privacy Protection & Anti-IDOR Security", () => {
    it("returns identical error message when phone number does not match to prevent enumeration", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Private Customer",
          phone: "9825011111",
          addressLine: "Confidential Villa",
          cityVillage: "Surat",
          state: "Gujarat",
          pincode: "395001",
        },
        items: [{ productId: "shifa-zafrani-gold", quantity: 1 }],
      });

      // Attacker tries to guess phone
      expect(() =>
        trackOrderCustomerServer(created.order.id, "9999999999")
      ).toThrow("No matching order found with provided ID and mobile number");

      // Attacker tries non-existent order ID
      expect(() =>
        trackOrderCustomerServer("ORD-000000-0000", "9825011111")
      ).toThrow("No matching order found with provided ID and mobile number");
    });

    it("masks customer name and phone in public tracking response to protect customer identity", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Inayat Ahmadi Palanpuri",
          phone: "9586037331",
          addressLine: "Station Road Clinic",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      const tracking = trackOrderCustomerServer(created.order.id, "9586037331");

      // Verify name is masked (e.g. "I*** A*** P***")
      expect(tracking.customerNameMasked).not.toContain("Inayat");
      expect(tracking.customerNameMasked).toMatch(/^[A-Z\u0900-\u097F]\*+/);

      // Verify phone is masked (shows only last 4 digits)
      expect(tracking.customerPhoneMasked).toBe("******7331");
      expect(tracking.customerPhoneMasked).not.toContain("958603");

      // Raw street address is never exposed in the tracking response
      expect((tracking as unknown as Record<string, unknown>)["shippingAddress"]).toBeUndefined();
      expect((tracking as unknown as Record<string, unknown>)["customerEmail"]).toBeUndefined();
    });
  });

  describe("4. Defined Fulfillment Statuses & Status Transitions", () => {
    const ALL_STATUSES: ServerOrderStatus[] = [
      "Order Received",
      "Pending Confirmation",
      "Confirmed",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
    ];

    it.each(ALL_STATUSES)(
      "allows administrator to transition order to status '%s' with audit logging",
      (targetStatus) => {
        const created = createOrderServer({
          customer: {
            fullName: "Status Transition Test",
            phone: "9825022222",
            addressLine: "Court Road",
            cityVillage: "Palanpur",
            state: "Gujarat",
            pincode: "385001",
          },
          items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
        });

        const updated = updateOrderStatusAdminServer(
          created.order.id,
          targetStatus,
          adminToken,
          "admin-test-ip",
          `Status updated to ${targetStatus}`,
          targetStatus === "Shipped" ? "SP-GJ-98214" : undefined
        );

        expect(updated.success).toBe(true);
        expect(updated.order.orderStatus).toBe(targetStatus);

        // Verify status history audit
        const history = updated.order.statusHistory;
        expect(history.length).toBeGreaterThanOrEqual(2);
        const lastEntry = history[history.length - 1]!;
        expect(lastEntry.status).toBe(targetStatus);
        expect(lastEntry.updatedBy).toBe(AUTHORIZED_ADMIN_EMAIL);

        // Verify customer tracking reflects the updated status
        const customerView = trackOrderCustomerServer(
          created.order.id,
          "9825022222"
        );
        expect(customerView.orderStatus).toBe(targetStatus);
      }
    );

    it("rejects invalid or fabricated status strings", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Invalid Status Test",
          phone: "9825033333",
          addressLine: "Station Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(() =>
        updateOrderStatusAdminServer(
          created.order.id,
          "Fake Flying Drone Status" as ServerOrderStatus,
          adminToken
        )
      ).toThrow(/Invalid status/);
    });

    it("blocks unauthenticated users from changing order statuses", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Security Status Test",
          phone: "9825044444",
          addressLine: "Highway Road",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(() =>
        updateOrderStatusAdminServer(
          created.order.id,
          "Confirmed",
          "invalid-tampered-token"
        )
      ).toThrow(/Unauthorized/);
    });
  });

  describe("5. Courier Tracking & Honest Customer Information", () => {
    it("reports honest status when courier tracking code is not yet assigned", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Pending Dispatch Customer",
          phone: "9825055555",
          addressLine: "Old Palanpur",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-pehlwan-capsule", quantity: 1 }],
      });

      const tracking = trackOrderCustomerServer(created.order.id, "9825055555");
      expect(tracking.hasTrackingNumber).toBe(false);
      expect(tracking.trackingNumber).toBe("");
      expect(tracking.carrierNotes).toContain("समीक्षा उपरांत पुष्टि की जाएगी");
      expect(tracking.estimatedDeliveryWindow).toBe("पुष्टि उपरांत 4-7 कार्यदिवस");
    });

    it("returns real consignment code and courier notes when order is Shipped with Speed Post docket", () => {
      const created = createOrderServer({
        customer: {
          fullName: "Shipped Dispatch Customer",
          phone: "9825066666",
          addressLine: "New Ganj Bazaar",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-zafrani-gold", quantity: 1 }],
      });

      updateOrderStatusAdminServer(
        created.order.id,
        "Shipped",
        adminToken,
        "admin-test-ip",
        "Dispatched via Speed Post",
        "EK948210345IN"
      );

      const tracking = trackOrderCustomerServer(created.order.id, "9825066666");
      expect(tracking.hasTrackingNumber).toBe(true);
      expect(tracking.trackingNumber).toBe("EK948210345IN");
      expect(tracking.carrierNotes).toContain("EK948210345IN");
      expect(tracking.estimatedDeliveryWindow).toBe("2-4 कार्यदिवस");
    });
  });

  describe("6. WhatsApp Ordering Workflow Invariants", () => {
    it("clearly indicates order is pending confirmation and not auto-confirmed simply because WhatsApp was opened", () => {
      const created = createOrderServer({
        customer: {
          fullName: "WhatsApp Customer",
          phone: "9825077777",
          addressLine: "Railway Colony",
          cityVillage: "Palanpur",
          state: "Gujarat",
          pincode: "385001",
        },
        items: [{ productId: "shifa-arq-abe-hayat", quantity: 1 }],
      });

      expect(created.order.paymentMethod).toBe("WhatsApp Direct Order");
      expect(created.order.isWhatsAppConfirmedByCustomer).toBe(false);
      expect(created.order.orderStatus).toBe("Pending Confirmation");
      expect(created.order.notes).toContain("Pending WhatsApp customer transmission & merchant confirmation");

      const tracking = trackOrderCustomerServer(created.order.id, "9825077777");
      expect(tracking.isWhatsAppConfirmedByCustomer).toBe(false);
    });
  });
});
