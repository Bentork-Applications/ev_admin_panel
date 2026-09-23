import { apiClient } from "./apiClient";

export const productService = {
  /**
   * Fetch all active products for dropdowns
   * Endpoint: GET /api/products/active with fallbacks to /products/admin/all and /admin/inventory/stock
   */
  getActiveProducts: async () => {
    try {
      const res = await apiClient.get("/products/active");
      const list = Array.isArray(res) ? res : res?.data || res?.products || res?.content || [];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    } catch (err) {
      console.warn("productService.getActiveProducts [/products/active] failed:", err?.message || err);
    }

    try {
      const res = await apiClient.get("/products/admin/all");
      const list = Array.isArray(res) ? res : res?.data || res?.products || res?.content || [];
      if (Array.isArray(list) && list.length > 0) {
        return list.filter((p) => p && p.active !== false && p.isActive !== false && p.status !== "INACTIVE");
      }
    } catch (err) {
      console.warn("productService.getActiveProducts [/products/admin/all] failed:", err?.message || err);
    }

    try {
      const stockRes = await apiClient.get("/admin/inventory/stock");
      const stockList = Array.isArray(stockRes) ? stockRes : stockRes?.data || stockRes?.content || [];
      if (Array.isArray(stockList) && stockList.length > 0) {
        const extracted = stockList
          .map((item) => item.product || item)
          .filter((p) => p && (p.id !== undefined || p.productId !== undefined || p._id !== undefined));
        if (extracted.length > 0) {
          return extracted;
        }
      }
    } catch (err) {
      console.warn("productService.getActiveProducts [/admin/inventory/stock] failed:", err?.message || err);
    }

    return [];
  },

  /**
   * Fetch all products including inactive (Admin only)
   * Endpoint: GET /api/products/admin/all
   */
  getAllProducts: async () => {
    return await apiClient.get("/products/admin/all");
  },

  /**
   * Fetch a single product by ID
   * Endpoint: GET /api/products/{id}
   */
  getProductById: async (id) => {
    return await apiClient.get(`/products/${id}`);
  },

  /**
   * Filter products by category
   * Endpoint: GET /api/products/category/{category}
   */
  getProductsByCategory: async (category) => {
    return await apiClient.get(`/products/category/${encodeURIComponent(category)}`);
  },

  /**
   * Create a new product
   * Endpoint: POST /api/products/admin/create
   */
  createProduct: async (productData) => {
    return await apiClient.post("/products/admin/create", productData);
  },

  /**
   * Update an existing product
   * Endpoint: PUT /api/products/admin/update/{id}
   */
  updateProduct: async (id, productData) => {
    return await apiClient.put(`/products/admin/update/${id}`, productData);
  },

  /**
   * Toggle product active status
   * Endpoint: PUT /api/products/admin/{id}/toggle-status
   */
  toggleProductStatus: async (id) => {
    return await apiClient.put(`/products/admin/${id}/toggle-status`);
  }
};
