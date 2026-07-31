import { apiClient } from "./apiClient";

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
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  isAuthenticated: () => {
    return Boolean(localStorage.getItem("token"));
  }
};
