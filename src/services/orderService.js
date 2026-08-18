import { apiClient } from "./apiClient";

export const orderService = {
  // ==================== LOCAL ORDER CACHE HELPERS ====================
  saveCachedOrders: (ordersToCache) => {
    try {
      if (!ordersToCache) return;
      const list = Array.isArray(ordersToCache) ? ordersToCache : [ordersToCache];
      const existing = JSON.parse(localStorage.getItem("app_all_cached_orders") || "[]");
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
          const localStatus = localStorage.getItem(`order_status_${o.id || o.orderNumber}`);
          const merged = { ...existingItem, ...o };
          if (localStatus) merged.orderStatus = localStatus;
          map.set(key, merged);
        }
      });
      localStorage.setItem("app_all_cached_orders", JSON.stringify(Array.from(map.values())));
    } catch (err) {
      console.warn("Failed to cache orders:", err);
    }
  },

  getCachedOrders: () => {
    try {
      const cached = JSON.parse(localStorage.getItem("app_all_cached_orders") || "[]");
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  },

  // ==================== SALES ADMIN ====================
  salesCreateOrder: async (orderData) => {
    const res = await apiClient.post("/orders/sales/create", orderData);
    if (res) orderService.saveCachedOrders([res]);
    return res;
  },

  salesGetMyOrders: async () => {
    try {
      const res = await apiClient.get("/orders/sales/my-orders");
      const arr = Array.isArray(res) ? res : Array.isArray(res?.orders) ? res.orders : [];
      orderService.saveCachedOrders(arr);

      const cached = orderService.getCachedOrders();
      const map = new Map();
      cached.forEach((item) => {
        if (item && (item.id || item.orderNumber || item.piNumber)) {
          map.set(String(item.id || item.orderNumber || item.piNumber), item);
        }
      });
      arr.forEach((item) => {
        if (item && (item.id || item.orderNumber || item.piNumber)) {
          const key = String(item.id || item.orderNumber || item.piNumber);
          const existing = map.get(key) || {};
          map.set(key, { ...existing, ...item });
        }
      });
      return Array.from(map.values());
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

      orderService.saveCachedOrders([...activeArr, ...completedArr]);

      const cached = orderService.getCachedOrders();
      const map = new Map();
      cached.forEach((item) => {
        if (item && (item.id || item.orderNumber || item.piNumber)) {
          map.set(String(item.id || item.orderNumber || item.piNumber), item);
        }
      });

      [...activeArr, ...completedArr].forEach((item) => {
        if (item && (item.id || item.orderNumber || item.piNumber)) {
          const key = String(item.id || item.orderNumber || item.piNumber);
          const existing = map.get(key) || {};
          map.set(key, { ...existing, ...item });
        }
      });
      return Array.from(map.values());
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
      const isSuperAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);

      const scmPromise = apiClient.get("/orders/scm/orders").catch(() => []);
      const adminPromise = isSuperAdmin ? apiClient.get("/orders/admin/all").catch(() => []) : Promise.resolve([]);

      const [scmRes, adminRes] = await Promise.all([scmPromise, adminPromise]);

      const scmArr = Array.isArray(scmRes) ? scmRes : Array.isArray(scmRes?.orders) ? scmRes.orders : [];
      const adminArr = Array.isArray(adminRes) ? adminRes : Array.isArray(adminRes?.orders) ? adminRes.orders : [];

      orderService.saveCachedOrders([...scmArr, ...adminArr]);

      const cached = orderService.getCachedOrders();
      const map = new Map();

      // Include cached orders that belong to SCM stage or finished stages
      cached.forEach((item) => {
        if (item && (item.id || item.orderNumber || item.piNumber)) {
          const status = (item.orderStatus || "").toLowerCase();
          const prodStatus = (item.productionStatus || "").toLowerCase();
          const localStatus = (localStorage.getItem(`order_status_${item.id || item.orderNumber}`) || "").toLowerCase();
          const effectiveStatus = localStatus || status;

          if (
            ["production_complete", "scm_complete", "dispatched", "delivered", "completed"].includes(effectiveStatus) ||
            prodStatus === "completed"
          ) {
            const key = String(item.id || item.orderNumber || item.piNumber);
            map.set(key, item);
          }
        }
      });

      // Merge live responses
      [...scmArr, ...adminArr].forEach((item) => {
        if (item && (item.id || item.orderNumber || item.piNumber)) {
          const key = String(item.id || item.orderNumber || item.piNumber);
          const existing = map.get(key) || {};
          map.set(key, { ...existing, ...item });
        }
      });

      return Array.from(map.values());
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

  // ==================== SUPER ADMIN ====================
  adminGetAllOrders: async () => {
    try {
      const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
      if (!["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
        return orderService.getCachedOrders();
      }
      const res = await apiClient.get("/orders/admin/all");
      const arr = Array.isArray(res) ? res : Array.isArray(res?.orders) ? res.orders : [];
      orderService.saveCachedOrders(arr);
      return res;
    } catch {
      return orderService.getCachedOrders();
    }
  },

  adminGetOrderDetail: async (id) => {
    return await apiClient.get(`/orders/admin/${id}`);
  },

  getPendingCount: async (role) => {
    try {
      let data = [];
      if (role === "SCM_ADMIN") data = await orderService.scmGetOrders();
      else if (role === "PRODUCTION_ADMIN") data = await orderService.productionGetOrders();
      else if (role === "SALES_ADMIN") data = await orderService.salesGetMyOrders();
      else data = await orderService.adminGetAllOrders();

      return Array.isArray(data)
        ? data.filter((o) => o.orderStatus === "sales_registered" || o.orderStatus === "in_production").length
        : 0;
    } catch {
      return 0;
    }
  }
};
