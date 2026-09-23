import { apiClient } from "./apiClient";

export const procurementService = {
  // ==================== VENDOR APIS ====================

  /**
   * Fetch all active vendors
   * Endpoint: GET /api/admin/procurement/vendors
   */
  getAllVendors: async () => {
    return await apiClient.get("/admin/procurement/vendors");
  },

  /**
   * Fetch vendor by ID
   * Endpoint: GET /api/admin/procurement/vendors/{id}
   */
  getVendorById: async (id) => {
    return await apiClient.get(`/admin/procurement/vendors/${id}`);
  },

  /**
   * Create a new vendor
   * Endpoint: POST /api/admin/procurement/vendors
   */
  createVendor: async (vendorData) => {
    return await apiClient.post("/admin/procurement/vendors", vendorData);
  },

  // ==================== PURCHASE ORDER APIS ====================

  /**
   * Fetch all purchase orders
   * Endpoint: GET /api/admin/procurement/purchase-orders
   */
  getAllPurchaseOrders: async () => {
    return await apiClient.get("/admin/procurement/purchase-orders");
  },

  /**
   * Fetch purchase order by ID
   * Endpoint: GET /api/admin/procurement/purchase-orders/{id}
   */
  getPurchaseOrderById: async (id) => {
    return await apiClient.get(`/admin/procurement/purchase-orders/${id}`);
  },

  /**
   * Fetch purchase orders for a specific vendor
   * Endpoint: GET /api/admin/procurement/purchase-orders/vendor/{vendorId}
   */
  getPurchaseOrdersByVendorId: async (vendorId) => {
    return await apiClient.get(`/admin/procurement/purchase-orders/vendor/${vendorId}`);
  },

  /**
   * Create a new purchase order
   * Endpoint: POST /api/admin/procurement/purchase-orders
   */
  createPurchaseOrder: async (poData) => {
    return await apiClient.post("/admin/procurement/purchase-orders", poData);
  },

  /**
   * Approve a draft purchase order
   * Endpoint: PUT /api/admin/procurement/purchase-orders/{id}/approve
   */
  approvePurchaseOrder: async (id) => {
    return await apiClient.put(`/admin/procurement/purchase-orders/${id}/approve`, {});
  },
};
