import { apiClient } from "./apiClient";

export const batteryService = {
  getAllBatteries: async () => {
    return await apiClient.get("/battery-data/admin/all");
  },

  registerBattery: async (batteryData) => {
    return await apiClient.post("/battery-data/admin/register", batteryData);
  },

  uploadBatteriesCsv: async (formData) => {
    const token = localStorage.getItem("token");
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const response = await fetch(`${baseUrl}/battery-data/admin/register/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Server error (${response.status})`);
    }
    return await response.json();
  }
};
