import { apiClient } from "./apiClient";

export const orderService = {
  // ==================== ORDER CACHE HELPERS (Non-authoritative temporary cache) ====================
  saveCachedOrders: (ordersToCache) => {
    try {
      if (!ordersToCache) return;
      const list = Array.isArray(ordersToCache) ? ordersToCache : [ordersToCache];
      const existing = JSON.parse(sessionStorage.getItem("app_all_cached_orders") || "[]");
      const map = new Map();
      existing.forEach((o) => {
        if (o && (o.id || o.orderNumber || o.piNumber)) {
          const key = String(o.id || o.orderNumber || o.piNumber);
          map.set(key, o);
        }
      });
      list.forEach((o) => {
        if (o && (o.id || o.orderNumber || o.piNumber)) {
          const key = String(o.id || o.orderNumber || o.piNumber);
          const existingItem = map.get(key) || {};
          map.set(key, { ...existingItem, ...o });
        }
      });
      sessionStorage.setItem("app_all_cached_orders", JSON.stringify(Array.from(map.values())));
    } catch (err) {
      console.warn("Failed to cache orders:", err);
    }
  },

  getCachedOrders: () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem("app_all_cached_orders") || "[]");
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  },

  // ==================== SALES ADMIN ====================
  salesCreateOrder: async (orderData) => {
    try {
      const res = await apiClient.post("/orders/sales/create", orderData);
      if (res) orderService.saveCachedOrders([res]);
      return res;
    } catch (err) {
      if (err.status === 403 || err.status === 404) {
        try {
          const adminRes = await apiClient.post("/orders/admin/create", orderData);
          if (adminRes) orderService.saveCachedOrders([adminRes]);
          return adminRes;
        } catch {
          try {
            const rootRes = await apiClient.post("/orders/create", orderData);
            if (rootRes) orderService.saveCachedOrders([rootRes]);
            return rootRes;
          } catch {
            throw err;
          }
        }
      }
      throw err;
    }
  },


  salesGetMyOrders: async () => {
    try {
      const res = await apiClient.get("/orders/sales/my-orders");
      const arr = Array.isArray(res) ? res : Array.isArray(res?.orders) ? res.orders : [];
      orderService.saveCachedOrders(arr);
      return arr;
    } catch {
      return orderService.getCachedOrders();
    }
  },

  salesGetOrderDetail: async (id) => {
    return await apiClient.get(`/orders/sales/${id}`);
  },

  salesUpdateOrder: async (id, orderData) => {
    const res = await apiClient.put(`/orders/sales/${id}/update`, orderData);
    if (res) orderService.saveCachedOrders([res]);
    return res;
  },

  salesRecordPayment: async (id, amount) => {
    const res = await apiClient.put(`/orders/sales/${id}/record-payment`, { amount });
    if (res) orderService.saveCachedOrders([res]);
    return res;
  },

  // ==================== PRODUCTION ADMIN ====================
  productionGetOrders: async () => {
    try {
      const [activeRes, completedRes] = await Promise.all([
        apiClient.get("/orders/production/orders").catch(() => []),
        apiClient.get("/orders/production/completed-orders").catch(() => [])
      ]);

      const activeArr = Array.isArray(activeRes) ? activeRes : Array.isArray(activeRes?.orders) ? activeRes.orders : [];
      const completedArr = Array.isArray(completedRes) ? completedRes : Array.isArray(completedRes?.orders) ? completedRes.orders : [];
      const combined = [...activeArr, ...completedArr];

      orderService.saveCachedOrders(combined);
      return combined;
    } catch {
      return orderService.getCachedOrders();
    }
  },

  productionGetOrderDetail: async (id) => {
    return await apiClient.get(`/orders/production/${id}`);
  },

  productionUpdateStatus: async (id, statusData) => {
    const res = await apiClient.put(`/orders/production/${id}/status`, statusData);
    if (res) orderService.saveCachedOrders([res]);
    return res;
  },

  // ==================== SCM ADMIN ====================
  scmGetOrders: async () => {
    try {
      const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
      const isSuperAdmin = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR"].includes(userRole);

      const scmPromise = apiClient.get("/orders/scm/orders").catch(() => []);
      const adminPromise = isSuperAdmin ? apiClient.get("/orders/admin/all").catch(() => []) : Promise.resolve([]);

      const [scmRes, adminRes] = await Promise.all([scmPromise, adminPromise]);

      const scmArr = Array.isArray(scmRes) ? scmRes : Array.isArray(scmRes?.orders) ? scmRes.orders : [];
      const adminArr = Array.isArray(adminRes) ? adminRes : Array.isArray(adminRes?.orders) ? adminRes.orders : [];
      const combined = [...scmArr, ...adminArr];

      orderService.saveCachedOrders(combined);
      return combined;
    } catch {
      return orderService.getCachedOrders();
    }
  },

  scmGetOrderDetail: async (id) => {
    return await apiClient.get(`/orders/scm/${id}`);
  },

  scmUpdateDetails: async (id, scmData) => {
    const res = await apiClient.put(`/orders/scm/${id}/complete`, scmData);
    if (res) orderService.saveCachedOrders([res]);
    return res;
  },

  scmDispatchOrder: async (id) => {
    const res = await apiClient.put(`/orders/scm/${id}/dispatch`, {});
    if (res) orderService.saveCachedOrders([res]);
    return res;
  },

  scmDeliverOrder: async (id, deliveryData = {}) => {
    const payload = {};
    if (deliveryData && typeof deliveryData === "object" && deliveryData.adminNotes) {
      payload.adminNotes = deliveryData.adminNotes.trim();
    }
    const res = await apiClient.put(`/orders/scm/${id}/deliver`, payload);
    if (res) orderService.saveCachedOrders([res]);
    return res;
  },

  // ==================== SUPER ADMIN ====================
  adminGetAllOrders: async () => {
    try {
      const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
      if (!["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR"].includes(userRole)) {
        return orderService.getCachedOrders();
      }
      const res = await apiClient.get("/orders/admin/all");
      const arr = Array.isArray(res) ? res : Array.isArray(res?.orders) ? res.orders : [];
      orderService.saveCachedOrders(arr);
      return arr;
    } catch {
      return orderService.getCachedOrders();
    }
  },

  adminGetOrderDetail: async (id) => {
    return await apiClient.get(`/orders/admin/${id}`);
  },

  // ==================== ORDER TRACKING (FULL ADMIN CRUD) ====================
  getOrderTracking: async (orderId) => {
    return await apiClient.get(`/orders/${orderId}/tracking`);
  },

  addOrderTracking: async (orderId, trackingData) => {
    return await apiClient.post(`/orders/${orderId}/tracking`, trackingData);
  },

  updateOrderTracking: async (trackingId, trackingData) => {
    return await apiClient.put(`/orders/tracking/${trackingId}`, trackingData);
  },

  deleteOrderTracking: async (trackingId) => {
    return await apiClient.delete(`/orders/tracking/${trackingId}`);
  },

  getUserOrderTracking: async (orderId) => {
    return await apiClient.get(`/orders/user/${orderId}/tracking`);
  },

  getPendingCount: async (role) => {
    try {
      const normalizedRole = (role || "").toUpperCase();
      let data = [];
      if (normalizedRole === "SCM_ADMIN" || normalizedRole === "SCM") data = await orderService.scmGetOrders();
      else if (normalizedRole === "PRODUCTION_ADMIN" || normalizedRole === "PRODUCTION") data = await orderService.productionGetOrders();
      else if (normalizedRole === "SALES_ADMIN" || normalizedRole === "SALES") data = await orderService.salesGetMyOrders();
      else data = await orderService.adminGetAllOrders();

      return Array.isArray(data)
        ? data.filter((o) => o.orderStatus === "sales_registered" || o.orderStatus === "in_production").length
        : 0;
    } catch {
      return 0;
    }
  }
};

