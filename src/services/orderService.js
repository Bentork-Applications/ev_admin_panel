import axios from "axios";

const getBaseUrl = () => import.meta.env.VITE_API_URL || "";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };
};

const handleResponseError = (error) => {
  if (error.response) {
    const data = error.response.data;
    if (typeof data === "string") {
      throw new Error(data);
    }
    if (data && data.message) {
      throw new Error(data.message);
    }
    if (data && typeof data === "object") {
      const messages = Object.values(data).join(", ");
      if (messages) throw new Error(messages);
    }
    throw new Error(`Server error (${error.response.status})`);
  } else if (error.request) {
    throw new Error("Unable to connect to backend server. Please check network.");
  } else {
    throw new Error(error.message || "An unexpected error occurred.");
  }
};

export const orderService = {
  // ==================== SALES ADMIN ====================
  salesCreateOrder: async (orderData) => {
    try {
      const res = await axios.post(`${getBaseUrl()}/orders/sales/create`, orderData, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  salesGetMyOrders: async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/orders/sales/my-orders`, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  salesGetOrderDetail: async (id) => {
    try {
      const res = await axios.get(`${getBaseUrl()}/orders/sales/${id}`, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  salesUpdateOrder: async (id, orderData) => {
    try {
      const res = await axios.put(`${getBaseUrl()}/orders/sales/${id}/update`, orderData, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  salesRecordPayment: async (id, amount) => {
    try {
      const res = await axios.put(`${getBaseUrl()}/orders/sales/${id}/record-payment`, { amount }, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  // ==================== PRODUCTION ADMIN ====================
  productionGetOrders: async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/orders/production/orders`, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  productionGetOrderDetail: async (id) => {
    try {
      const res = await axios.get(`${getBaseUrl()}/orders/production/${id}`, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  productionUpdateStatus: async (id, statusData) => {
    try {
      const res = await axios.put(`${getBaseUrl()}/orders/production/${id}/status`, statusData, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  // ==================== SCM ADMIN ====================
  scmGetOrders: async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/orders/scm/orders`, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  scmGetOrderDetail: async (id) => {
    try {
      const res = await axios.get(`${getBaseUrl()}/orders/scm/${id}`, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  scmUpdateDetails: async (id, scmData) => {
    try {
      const res = await axios.put(`${getBaseUrl()}/orders/scm/${id}/complete`, scmData, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  scmDispatchOrder: async (id) => {
    try {
      const res = await axios.put(`${getBaseUrl()}/orders/scm/${id}/dispatch`, {}, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  // ==================== SUPER ADMIN ====================
  adminGetAllOrders: async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/orders/admin/all`, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  },

  adminGetOrderDetail: async (id) => {
    try {
      const res = await axios.get(`${getBaseUrl()}/orders/admin/${id}`, getAuthHeaders());
      return res.data;
    } catch (err) {
      handleResponseError(err);
    }
  }
};
