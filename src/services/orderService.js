import { apiClient } from "./apiClient";

export const orderService = {
  // ==================== SALES ADMIN ====================
  salesCreateOrder: async (orderData) => {
    return await apiClient.post("/orders/sales/create", orderData);
  },

  salesGetMyOrders: async () => {
    return await apiClient.get("/orders/sales/my-orders");
  },

  salesGetOrderDetail: async (id) => {
    return await apiClient.get(`/orders/sales/${id}`);
  },

  salesUpdateOrder: async (id, orderData) => {
    return await apiClient.put(`/orders/sales/${id}/update`, orderData);
  },

  salesRecordPayment: async (id, amount) => {
    return await apiClient.put(`/orders/sales/${id}/record-payment`, { amount });
  },

  // ==================== PRODUCTION ADMIN ====================
  productionGetOrders: async () => {
    return await apiClient.get("/orders/production/orders");
  },

  productionGetOrderDetail: async (id) => {
    return await apiClient.get(`/orders/production/${id}`);
  },

  productionUpdateStatus: async (id, statusData) => {
    return await apiClient.put(`/orders/production/${id}/status`, statusData);
  },

  // ==================== SCM ADMIN ====================
  scmGetOrders: async () => {
    return await apiClient.get("/orders/scm/orders");
  },

  scmGetOrderDetail: async (id) => {
    return await apiClient.get(`/orders/scm/${id}`);
  },

  scmUpdateDetails: async (id, scmData) => {
    return await apiClient.put(`/orders/scm/${id}/complete`, scmData);
  },

  scmDispatchOrder: async (id) => {
    return await apiClient.put(`/orders/scm/${id}/dispatch`, {});
  },

  // ==================== SUPER ADMIN ====================
  adminGetAllOrders: async () => {
    return await apiClient.get("/orders/admin/all");
  },

  adminGetOrderDetail: async (id) => {
    return await apiClient.get(`/orders/admin/${id}`);
  },

  getPendingCount: async (role) => {
    try {
      let data = [];
      if (role === "SCM_ADMIN") data = await apiClient.get("/orders/scm/orders");
      else if (role === "PRODUCTION_ADMIN") data = await apiClient.get("/orders/production/orders");
      else if (role === "SALES_ADMIN") data = await apiClient.get("/orders/sales/my-orders");
      else data = await apiClient.get("/orders/admin/all");

      return Array.isArray(data)
        ? data.filter((o) => o.orderStatus === "sales_registered" || o.orderStatus === "in_production").length
        : 0;
    } catch {
      return 0;
    }
  }
};
