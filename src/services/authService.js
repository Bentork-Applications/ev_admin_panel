import { apiClient } from "./apiClient";
import { pageCache } from "../utils/pageCache";

export const authService = {
  login: async (credentials) => {
    const data = await apiClient.post("/admin/login", credentials);
    if (data && data.token) {
      localStorage.setItem("token", data.token);
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("userRole");
    localStorage.removeItem("auth");
    pageCache.invalidate();
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  isAuthenticated: () => {
    const token = localStorage.getItem("token");
    return Boolean(token && token !== "null" && token !== "undefined" && token.trim() !== "");
  }
};
