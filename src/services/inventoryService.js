import { apiClient } from "./apiClient";

export const inventoryService = {
  // ==================== MATERIAL IN APIS ====================

  /**
   * Fetch all Material IN receipts
   * Endpoint: GET /api/admin/inventory/material-in
   */
  getAllMaterialIn: async () => {
    return await apiClient.get("/admin/inventory/material-in");
  },

  /**
   * Process and submit a Material IN receipt
   * Endpoint: POST /api/admin/inventory/material-in
   */
  processMaterialIn: async (receiptData) => {
    return await apiClient.post("/admin/inventory/material-in", receiptData);
  },

  // ==================== MATERIAL OUT APIS ====================

  /**
   * Fetch all Material OUT issuances
   * Endpoint: GET /api/admin/inventory/material-out
   */
  getAllMaterialOut: async () => {
    return await apiClient.get("/admin/inventory/material-out");
  },

  /**
   * Process and submit a Material OUT issuance
   * Endpoint: POST /api/admin/inventory/material-out
   */
  processMaterialOut: async (issueData) => {
    return await apiClient.post("/admin/inventory/material-out", issueData);
  },

  // ==================== INVENTORY STOCK APIS ====================

  /**
   * Fetch all inventory stocks across products
   * Endpoint: GET /api/admin/inventory/stock
   */
  getAllStock: async () => {
    return await apiClient.get("/admin/inventory/stock");
  },

  /**
   * Fetch stock overview for a specific product
   * Endpoint: GET /api/admin/inventory/stock/{productId}
   */
  getStockOverview: async (productId) => {
    return await apiClient.get(`/admin/inventory/stock/${productId}`);
  },

  // ==================== BARCODE LOOKUP API ====================

  /**
   * Lookup a product by barcode
   * Endpoint: GET /api/admin/inventory/products/lookup?code={barcode}
   */
  lookupProductByBarcode: async (barcode) => {
    return await apiClient.get(`/admin/inventory/products/lookup?code=${encodeURIComponent(barcode)}`);
  },
};
