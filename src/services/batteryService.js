import { apiClient } from "./apiClient";

export const batteryService = {
  getAllBatteries: async () => {
    return await apiClient.get("/battery-data/admin/all");
  },

  registerBattery: async (batteryData) => {
    return await apiClient.post("/battery-data/admin/register", batteryData);
  },

  updateBattery: async (id, batteryData) => {
    return await apiClient.put(`/battery-data/admin/update/${id}`, batteryData);
  },

  deleteBattery: async (id) => {
    return await apiClient.delete(`/battery-data/admin/delete/${id}`);
  },

  updateWarrantyStatus: async (id, statusData) => {
    return await apiClient.put(`/battery-data/admin/update-warranty-status/${id}`, statusData);
  },

  uploadBatteriesCsv: async (formData) => {
    return await apiClient.upload("/battery-data/admin/register/upload", formData);
  }
};

